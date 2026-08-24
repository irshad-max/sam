//packages
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const connectDB = require("./data-base/db-starter");

//data-base models
const User = require("./data-base/user-module");
const Request = require("./data-base/db-request");
const Msg = require("./data-base/db-msg--collector");

//server intension
const app = express();

// CORS
const allowedOrigins = process.env.CLIENT_URL;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
const server = http.createServer(app);

// JWT
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET missing");
  process.exit(1);
}

// ========== IMAGE UPLOAD ==========
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error("Only image files are allowed"));
};
const upload = multer({
  storage,
  limits: { fileSize: 7 * 1024 * 1024 },
  fileFilter,
});
app.post("/upload-image", upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== OTP STORAGE (temporary) ==========
const otpStore = new Map();
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ========== USER ROUTES ==========  
app.post("/register", async (req, res) => {
  const { name, email, password, profileImage } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields required" });
  try {
    if (await User.findOne({ email }))
      return res.status(400).json({ error: "Email already registered" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      profileImage,
    });
    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({ message: "REGISTER SUCCESSFULLY", token});
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// =========== verification email ROUTES ===========
app.post("/verify/email", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: "Email not found" });
    }
    const otp = generateOTP();
    const expiry = Date.now() + 300000; // 5 minutes
    const Secure_Code = generateOTP();
    otpStore.set(Secure_Code, { otp, expiry });
    res.status(200).json({ message: "Email sent", Secure_Code, otp });
  } catch {
    res.status(500).json({ message: "validation failed" });
  }
});

// =========== verification otp ROUTES ===========
app.post("/verify-otp", async (req, res) => {
  const { code, otp } = req.body;
  if (!code || !otp)
    return res.status(400).json({ error: "Email and OTP required" });
  try {
    const storedData = otpStore.get(code);
    if (!storedData)
      return res.status(400).json({ error: "No OTP request found" });
    if (Date.now() > storedData.expiry) {
      otpStore.delete(code);
      return res.status(400).json({ error: "OTP expired" });
    }
    if (storedData.otp !== otp)
      return res.status(400).json({ error: "Invalid OTP" });
    res.status(200).json({
      message: "Verification successful",
    });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// =========== resend otp ROUTES ==========
app.post("/resend-otp", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Email required" });
  const storedData = otpStore.get(code);
  if (!storedData)
    return res
      .status(400)
      .json({ error: "No OTP request found for this email" });
  storedData.otp = generateOTP();
  storedData.expiry = Date.now() + 10 * 60 * 1000;
  otpStore.set(code, storedData);
  res.json({ message: "New OTP generated", otp: storedData.otp });
});

// =========== LOGIN ROUTES =========== 
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Email is wrong" });
  if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: "Password is wrong" });
  const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, name: user.name, profileImage: user.profileImage });
});

// =========== AUTH MIDDLEWARE ===========
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  const token = authHeader.split(" ")[1];
  try {
    req.userid = jwt.verify(token, JWT_SECRET)._id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// =========== VERIFY TOKEN ROUTES AUTO LOGIN ===========
app.post("/verify-token", auth, async (req, res) => {
  const user = await User.findById(req.userid);
  if (!user)
    return res.status(401).json({ error: "User not found", valid: false });
  res.json({ valid: true, userId: req.userid });
});

// =========== FETCH MSG ROUTES ===========
app.post("/fetchmsg", auth, async (req, res) => {
  const sender = req.userid;
  const { receiver } = req.body;
  const messages = await Msg.find({
    $or: [
      { sender, receiver },
      { sender: receiver, receiver: sender },
    ],
  }).sort({ createdAt: 1 });
  const formattedMessages = messages.map((msg) => ({
    _id: msg._id,
    text: msg.text,
    isOwn: msg.sender.toString() === sender.toString(),
    createdAt: msg.createdAt,
    delivered: msg.delivered,
    seen: msg.seen,
  }));
  res.json({ msg: formattedMessages, currentuser: req.userid });
});

// ===========GET USER ROUTES ===========
app.post("/users", async (req, res) => {
  res.send(await User.find({}, "_id name profileImage"));
});

// =========== REQUEST ROUTES ===========
app.post("/request", auth, async (req, res) => {
  const newRequest = await Request.create({
    sender: req.userid,
    receiver: req.body.receiver,
    status: "pending",
  });
  res.send({ requestId: newRequest._id });
});
app.post("/request-show", auth, async (req, res) => {
  const requests = await Request.find({
    receiver: req.userid,
    status: "pending",
  }).populate("sender", "name profileImage");
  res.send(requests);
});
app.post("/accept-request/:id", async (req, res) => {
  const accept = await Request.findByIdAndUpdate(
    req.params.id,
    { status: "accepted" },
    { returnDocument: "after" },
  );
  await User.findByIdAndUpdate(accept.sender, {
    $addToSet: { friend: accept.receiver },
  });
  await User.findByIdAndUpdate(accept.receiver, {
    $addToSet: { friend: accept.sender },
  });
  res.send(accept);
});
app.get("/friends", auth, async (req, res) => {
  const user = await User.findById(req.userid).populate(
    "friend",
    "_id name profileImage",
  );
  res.json(user.friend);
});

app.get("/unread-counts", auth, async (req, res) => {
  try {
    const userId = req.userid;
    const user = await User.findById(userId).populate("friend", "_id");
    const friendIds = user.friend.map((f) => f._id);
    const unreadCounts = await Msg.aggregate([
      { $match: { sender: { $in: friendIds }, receiver: userId, seen: false } },
      { $group: { _id: "$sender", count: { $sum: 1 } } },
    ]);
    const result = {};
    unreadCounts.forEach((item) => {
      result[item._id.toString()] = item.count;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== SOCKET.IO ==========
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});
const onlineUsers = new Map(); // userId -> socketId
const userCurrentChat = new Map(); // userId -> chatPartnerId

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));
  try {
    socket.userid = jwt.verify(token, JWT_SECRET)._id;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userid?.toString();
  if (!userId) return;
  onlineUsers.set(userId, socket.id);
  socket.join(userId);
  socket.broadcast.emit("user_online", userId);

  // ✅ NEW: Check online status of a specific user
  socket.on("check_online", ({ userId: targetUserId }) => {
    const isOnline = onlineUsers.has(targetUserId);
    socket.emit("online_status", { userId: targetUserId, isOnline });
  });

  socket.on("joinChat", async (receiverID) => {
    const receiverIdStr = receiverID.toString();
    userCurrentChat.set(userId, receiverIdStr);
    await Msg.updateMany(
      { sender: receiverIdStr, receiver: userId, delivered: false },
      { delivered: true },
    );
    await Msg.updateMany(
      { sender: receiverIdStr, receiver: userId, seen: false },
      { seen: true },
    );
    io.to(receiverIdStr).emit("messages_delivered", { by: userId });
    io.to(receiverIdStr).emit("messages_seen", { by: userId });
  });

  socket.on("leaveChat", (receiverID) => {
    if (userCurrentChat.get(userId) === receiverID?.toString())
      userCurrentChat.delete(userId);
  });

  socket.on("pass_indicator", ({ id }) => {
    if (id) io.to(id).emit("typing_indicator", { text: "typing" });
  });

  // ✅ NEW: Stop typing indicator
  socket.on("stop_typing", ({ id }) => {
    if (id) io.to(id).emit("stop_typing_indicator");
  });

  socket.on("send_message", async ({ text, id }) => {
    if (!text || !id) return;
    const senderId = userId,
      receiverId = id.toString();
    const newMsg = await Msg.create({
      sender: senderId,
      receiver: receiverId,
      text,
      delivered: false,
      seen: false,
    });
    const messageObj = {
      _id: newMsg._id,
      text,
      sender: senderId,
      createdAt: newMsg.createdAt,
      delivered: false,
      seen: false,
    };
    if (onlineUsers.has(receiverId)) {
      await Msg.findByIdAndUpdate(newMsg._id, { delivered: true });
      messageObj.delivered = true;
      io.to(receiverId).emit("receive_message", messageObj);
      socket.emit("message_sent", {
        _id: newMsg._id,
        text,
        receiver: receiverId,
        createdAt: newMsg.createdAt,
        delivered: true,
      });
      if (userCurrentChat.get(receiverId) !== senderId) {
        const unreadCount = await Msg.countDocuments({
          sender: senderId,
          receiver: receiverId,
          seen: false,
        });
        io.to(receiverId).emit("new_message_notification", {
          from: senderId,
          count: unreadCount,
        });
      }
    } else {
      socket.emit("message_sent", {
        _id: newMsg._id,
        text,
        receiver: receiverId,
        createdAt: newMsg.createdAt,
        delivered: false,
      });
    }
  });

  socket.on("mark_delivered", async ({ senderId }) => {
    const result = await Msg.updateMany(
      { sender: senderId, receiver: userId, delivered: false },
      { delivered: true },
    );
    if (result.modifiedCount > 0)
      io.to(senderId).emit("messages_delivered", { by: userId });
  });

  socket.on("mark_seen", async ({ senderId }) => {
    const result = await Msg.updateMany(
      { sender: senderId, receiver: userId, seen: false },
      { seen: true },
    );
    if (result.modifiedCount > 0)
      io.to(senderId).emit("messages_seen", { by: userId });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    userCurrentChat.delete(userId);
    socket.broadcast.emit("user_offline", userId);
  });
});

// Serve frontend build if exists
const frontendBuildPath = path.join(__dirname, "../client-side/dist");
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get("*", (req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path === "/upload-image" ||
      req.path === "/login" ||
      req.path === "/register" ||
      req.path === "/verify-otp" ||
      req.path === "/resend-otp" ||
      req.path === "/verify-token" ||
      req.path.startsWith("/uploads")
    )
      return next();
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
} else console.log("⚠️ Frontend build not found. API only.");

const PORT = process.env.PORT || 3001;
connectDB()
  .then(() =>
    server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`)),
  )
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });

// ========== IMPORTANT LIBRARIES ==========
require('dotenv').config();
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

// Data‑base schema
const User = require("./data-base/user-module");
const Request = require("./data-base/db-request");
const Msg = require("./data-base/db-msg--collector");

const app = express();

// ========== PRODUCTION CORS ==========
const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL] 
    : ["http://localhost:3000"];
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
const server = http.createServer(app);

// ========== JWT SECRET FROM ENV ==========
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
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
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only image files are allowed"));
};
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

app.post("/upload-image", upload.single("profileImage"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });
        res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const otpStore = new Map(); 

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ========== REGISTER – returns OTP in response (demo) ==========
app.post("/register", async (req, res) => {
    const { name, email, password, profileImage } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const otp = generateOTP();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        otpStore.set(email, {
            otp,
            expiry: otpExpiry,
            userData: {
                name,
                email,
                password: await bcrypt.hash(password, 10),
                profileImage: profileImage || null
            }
        });

        // ⚠️ In production, never return OTP in response. This is for demo only.
        res.status(200).json({
            message: "OTP generated successfully",
            email: email,
            otp: otp,
            expiresIn: "10 minutes"
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
});


app.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP are required" });
    }

    try {
        const storedData = otpStore.get(email);
        if (!storedData) {
            return res.status(400).json({ error: "OTP expired or not found. Please register again." });
        }
        if (Date.now() > storedData.expiry) {
            otpStore.delete(email);
            return res.status(400).json({ error: "OTP has expired. Please register again." });
        }
        if (storedData.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP. Please try again." });
        }

        const { userData } = storedData;
        const user = await User.create({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            friend: [],
            isVerified: true,
            profileImage: userData.profileImage
        });

        const token = jwt.sign(
            { _id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        otpStore.delete(email);

        res.json({
            message: "Email verified successfully! Registration complete.",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ error: "Verification failed" });
    }
});

// ========== RESEND OTP ==========
app.post("/resend-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        const storedData = otpStore.get(email);
        if (!storedData) {
            return res.status(400).json({ error: "No pending registration found" });
        }
        const newOtp = generateOTP();
        const newExpiry = Date.now() + 10 * 60 * 1000;
        storedData.otp = newOtp;
        storedData.expiry = newExpiry;
        otpStore.set(email, storedData);

        res.json({ message: "New OTP generated", otp: newOtp });
    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ error: "Failed to resend OTP" });
    }
});

// ========== LOGIN API ==========
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const verify = await User.findOne({ email });
    if (!verify) return res.status(401).json({ error: "Email is wrong" });
    const ismatch = await bcrypt.compare(password, verify.password);
    if (!ismatch) return res.status(401).json({ error: "Password is wrong" });
    const token = jwt.sign(
        { _id: verify._id },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
    res.json({ token, name: verify.name, profileImage: verify.profileImage });
});


// ========== AUTH MIDDLEWARE ==========
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(" ")[1];
    try {
        const decode = jwt.verify(token, JWT_SECRET);
        req.userid = decode._id;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};

app.post("/verify-token", auth, (req, res) => {
    // If we reach here, the token is valid
    res.json({ valid: true, userId: req.userid });
});
// ========== OTHER API ENDPOINTS ==========
app.post("/users", async (req, res) => {
    const alluser = await User.find({}, "_id name profileImage");
    res.send(alluser);
});

app.post("/fetchmsg", auth, async (req, res) => {
    const sender = req.userid;
    const { receiver } = req.body;
    const msg = await Msg.find({
        $or: [
            { sender, receiver },
            { sender: receiver, receiver: sender }
        ]
    }).sort({ createAt: 1 });
    const formattedMessages = msg.map(message => ({
        text: message.text,
        sender: message.sender,
        receiver: message.receiver,
        isOwn: message.sender.toString() === sender.toString()
    }));
    res.json({ msg: formattedMessages, currentuser: req.userid });
});

app.post("/request", auth, async (req, res) => {
    const { receiver } = req.body;
    const newRequest = await Request.create({ sender: req.userid, receiver, status: "pending" });
    res.send({ requestId: newRequest._id });
});

app.post("/request-show", auth, async (req, res) => {
    const find_request = await Request.find({ receiver: req.userid, status: "pending" }).populate("sender", "name profileImage");
    res.send(find_request);
});

app.post("/accept-request/:id", async (req, res) => {
    const accept = await Request.findByIdAndUpdate(req.params.id, { status: "accepted" }, { returnDocument: "after" });
    await User.findByIdAndUpdate(accept.sender, { $addToSet: { friend: accept.receiver } });
    await User.findByIdAndUpdate(accept.receiver, { $addToSet: { friend: accept.sender } });
    res.send(accept);
});

app.get("/friends", auth, async (req, res) => {
    const user = await User.findById(req.userid).populate("friend", "_id name profileImage");
    res.json(user.friend);
});

// ========== SERVE REACT FRONTEND (if built) ==========
// This must come AFTER all API routes, but BEFORE the catch‑all.
const frontendBuildPath = path.join(__dirname, "../client-side/dist");
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    // For any request that is NOT an API or file upload, send index.html
    app.get("*", (req, res, next) => {
        const requestPath = req.path;
        // Skip API routes, upload endpoints, and static files already handled
        if (requestPath.startsWith("/api") || 
            requestPath === "/upload-image" || 
            requestPath === "/login" || 
            requestPath === "/register" ||
            requestPath === "/verify-otp" ||
            requestPath === "/resend-otp" ||
            requestPath.startsWith("/uploads")) {
            return next();
        }
        res.sendFile(path.join(frontendBuildPath, "index.html"));
    });
} else {
    console.log("⚠️ Frontend build not found. Serving API only. If you have a React frontend, ensure it is built into ../client/build");
}

// ========== SOCKET.IO ==========
const io = new Server(server, { 
    cors: { 
        origin: allowedOrigins,
        credentials: true 
    } 
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    try {
        const decode = jwt.verify(token, JWT_SECRET);
        socket.userid = decode._id;
        next();
    } catch (err) {
        next(new Error("Invalid token"));
    }
});

const activeChat = {};
io.on("connection", (socket) => {
    const userId = socket.userid?.toString();
    if (!userId) return;
    socket.join(userId);
    socket.on("joinChat", (receiverID) => {
        const receiverIdStr = receiverID.toString();
        activeChat[userId] = receiverIdStr;
        activeChat[receiverIdStr] = userId;
    });
    socket.on("pass_indicator", ({ id, text }) => {
        if (id) io.to(id).emit("typing_indicator", { text: "typing" });
    });
    socket.on("send_message", async ({ text, id }) => {
        if (!text || !id) return;
        const senderId = userId;
        const receiverId = id.toString();
        await Msg.create({ sender: senderId, receiver: receiverId, text });
        io.to(receiverId).emit("receive_message", { text, sender: senderId, timestamp: new Date() });
    });
    socket.on("disconnect", () => {
        delete activeChat[userId];
        for (let key in activeChat) if (activeChat[key] === userId) delete activeChat[key];
    });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3001;
connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`✅ Database connected`);
            console.log(`🌍 CORS enabled for: ${allowedOrigins.join(", ")}`);
        });
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err);
        process.exit(1);
    });
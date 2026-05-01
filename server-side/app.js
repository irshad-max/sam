//important librarys
const express = require("express")
const brcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const http = require("http");
const { Server } = require("socket.io")
const mongoose = require("mongoose")
const nodemailer = require("nodemailer")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const env = require("dotenv")

//data-base schema
const User = require("./data-base/user-module")
const request = require("./data-base/db-request")
const Msg = require("./data-base/db-msg--collector")

//function
const app = express()
// Serve frontend
app.use(express.static(path.join(__dirname, "../client-side/dist")))

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client-side/dist/index.html"))
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

const server = http.createServer(app);

// ========== IMAGE UPLOAD CONFIGURATION (For file upload) ==========
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, "profile-" + uniqueSuffix + ext);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error("Only image files are allowed"));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter,
});

// ========== IMAGE UPLOAD ROUTE (For file upload) ==========
app.post("/upload-image", upload.single("profileImage"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            imageUrl: imageUrl
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== SENDING OTP ON EMAIL ==========
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER|| "irshadmustafa659@gmail.com",
        pass: process.env.EMAIL_PASS || "qhdylolhcjgpltav",
    },
});

const otpStore = new Map();

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp, name) {
    try {
        const info = await transporter.sendMail({
            from: '"Your TALK_ANY_TIME" <irshadmustafa659@gmail.com>',
            to: email,
            subject: "Verify Your Email - OTP Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Email Verification</h2>
                    <p>Hello ${name},</p>
                    <p>Thank you for registering! Please use the following OTP to verify your email address:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
                        ${otp}
                    </div>
                    <p>This OTP is valid for <strong>10 minutes</strong>.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr>
                    <small>This is an automated message, please do not reply.</small>
                </div>
            `,
            text: `Your OTP for email verification is: ${otp}\nValid for 10 minutes.`
        });
        return true;
    } catch (error) {
        console.error("Error sending OTP:", error);
        return false;
    }
}

// ========== REGISTER API - WITH PROFILE IMAGE (Base64) ==========
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
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        otpStore.set(email, {
            otp,
            expiry: otpExpiry,
            userData: {
                name,
                email,
                password: await brcrypt.hash(password, 10),
                profileImage: profileImage || null
            }
        });

        const emailSent = await sendOTPEmail(email, otp, name);

        if (!emailSent) {
            return res.status(500).json({ error: "Failed to send OTP email" });
        }

        res.status(200).json({
            message: "OTP sent to your email. Please verify to complete registration.",
            email: email
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
});

// ========== VERIFY OTP API - CREATE USER WITH IMAGE ==========
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

        // ✅ YAHAN USER CREATE HOGA WITH PROFILE IMAGE
        const { userData } = storedData;
        const user = await User.create({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            friend: [],
            isVerified: true,
            profileImage: userData.profileImage  // ✅ Image save ho rahi hai (null nahi)
        });

        const token = jwt.sign(
            { _id: user._id, email: user.email },
            process.env.JWT_SECRET || "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",
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

// ========== RESEND OTP API ==========
app.post("/resend-otp", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

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

        const emailSent = await sendOTPEmail(email, newOtp, storedData.userData.name);

        if (!emailSent) {
            return res.status(500).json({ error: "Failed to send OTP" });
        }

        res.json({ message: "New OTP sent to your email" });

    } catch (error) {
        console.error("Resend OTP error:", error);
        res.status(500).json({ error: "Failed to resend OTP" });
    }
});

// ========== LOGIN API ==========
app.post("/login", async (req, res) => {
    const { email, password } = req.body
    const verify = await User.findOne({ email })
    if (!verify) return res.status(401).json({ error: "Email is wrong" })
    const ismatch = await brcrypt.compare(password, verify.password)
    if (!ismatch) return res.status(401).json({ error: "Password is wrong" })
    const token = jwt.sign(
        { _id: verify._id },
        process.env.JWT_SECRET || "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",
        { expiresIn: "7d" }
    )

    res.json({ token, name: verify.name, profileImage: verify.profileImage })
})

// ========== AUTH MIDDLEWARE ==========
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send("No token");
    const token = authHeader.split(" ")[1];
    try {
        const decode = jwt.verify(
            token,
            process.env.JWT_SECRET || "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"
        );
        req.userid = decode._id;
        next();
    } catch (err) {
        return res.status(401).send("Invalid token");
    }
};

// ========== FETCH USER ==========
app.post("/users", async (req, res) => {
    const alluser = await User.find({}, "_id name profileImage")
    res.send(alluser)
})

// ========== FETCH MESSAGES ==========
app.post("/fetchmsg", auth, async (req, res) => {
    const sender = req.userid
    const { receiver } = req.body
    const msg = await Msg.find({
        $or: [
            { sender, receiver },
            { sender: receiver, receiver: sender }
        ]
    }).sort({ createAt: 1 })
    const formattedMessages = msg.map(message => ({
        text: message.text,
        sender: message.sender,
        receiver: message.receiver,
        isOwn: message.sender.toString() === sender.toString()
    }))

    res.json({
        msg: formattedMessages,
        currentuser: req.userid
    })
})

// ========== FRIEND REQUEST ==========
app.post("/request", auth, async (req, res) => {
    const { receiver } = req.body;
    const newRequest = await request.create({
        sender: req.userid,
        receiver: receiver,
        status: "pending"
    });
    res.send({ requestId: newRequest._id });
});

// ========== SHOW REQUESTS ==========
app.post("/request-show", auth, async (req, res) => {
    const find_request = await request.find({
        receiver: req.userid,
        status: "pending"
    }).populate("sender", "name profileImage")
    res.send(find_request)
})

// ========== ACCEPT REQUEST ==========
app.post("/accept-request/:id", async (req, res) => {
    const accept = await request.findByIdAndUpdate(
        req.params.id,
        { status: "accepted" },
        { returnDocument: "after" }
    )
    await User.findByIdAndUpdate(
        accept.sender,
        { $addToSet: { friend: accept.receiver } }
    )
    await User.findByIdAndUpdate(
        accept.receiver,
        { $addToSet: { friend: accept.sender } }
    )
    res.send(accept)
})

// ========== GET FRIENDS ==========
app.get("/friends", auth, async (req, res) => {
    const user = await User.findById(req.userid).populate("friend", "_id name profileImage");
    res.json(user.friend);
});

// ========== SOCKET.IO ==========
const io = new Server(server, {
    cors: { origin: "*" }
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET || "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");
        socket.userid = decode._id;
        next();
    } catch (err) {
        next(new Error("Invalid token"));
    }
});

const activeChat = {};

io.on("connection", (socket) => {
    const userId = socket.userid?.toString();
    socket.join(userId);

    socket.on("joinChat", (receiverID) => {
        const receiverIdStr = receiverID.toString();
        activeChat[userId] = receiverIdStr;
        activeChat[receiverIdStr] = userId;
    });

    socket.on("pass_indicator", ({ id, text }) => {
        try {
            if (id) {
                io.to(id).emit("typing_indicator", { text: "typing" })
            }
        }
        catch (err) {
            console.log(err)
        }
    })

    socket.on("send_message", async ({ text, id }) => {
        try {
            if (!text || !id) return;
            const senderId = userId;
            const receiverId = id.toString();

            await Msg.create({
                sender: senderId,
                receiver: receiverId,
                text
            });

            io.to(receiverId).emit("receive_message", {
                text,
                sender: senderId,
                timestamp: new Date()
            });

        } catch (err) {
            console.error("Message error:", err);
        }
    });

    socket.on("disconnect", () => {
        delete activeChat[userId];
        for (let key in activeChat) {
            if (activeChat[key] === userId) {
                delete activeChat[key];
            }
        }
    });
});

module.exports = server;
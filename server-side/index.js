// ========== IMPORTANT LIBRARIES ==========
require('dotenv').config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const connectdDB = require("./data-base/db-starter");

// Data-base schema
const User = require("./data-base/user-module");
const request = require("./data-base/db-request");
const Msg = require("./data-base/db-msg--collector");

const app = express();

// ========== ENVIRONMENT VARIABLES ==========
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "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";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173"; // Vite default port
const EMAIL_USER = process.env.EMAIL_USER || "irshadmustafa659@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "zjyg ncsf ujvn jlqu";
const NODE_ENV = process.env.NODE_ENV || "development";

// ========== CORS CONFIGURATION ==========
app.use(cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const server = http.createServer(app);

// ========== SOCKET.IO WITH PRODUCTION CONFIG ==========
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        credentials: true,
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

// ========== IMAGE UPLOAD CONFIGURATION ==========
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

// ========== SERVE FRONTEND BUILD FILES ==========
// Try multiple possible paths
const possiblePaths = [
    path.join(__dirname, '../client-side/dist'),
    path.join(__dirname, '../dist'),
    path.join(__dirname, 'public'),
    path.join(process.cwd(), 'client-side/dist')
];

let distPath = null;
for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
        distPath = testPath;
        console.log(`✅ Found frontend build at: ${distPath}`);
        break;
    }
}

if (distPath) {
    // Serve static files
    app.use(express.static(distPath));
    
    // Special handling for JS and CSS files
    app.get(/\.(js|css)$/, (req, res, next) => {
        const filePath = path.join(distPath, req.path);
        if (fs.existsSync(filePath)) {
            if (req.path.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            } else if (req.path.endsWith('.css')) {
                res.setHeader('Content-Type', 'text/css');
            }
            res.sendFile(filePath);
        } else {
            next();
        }
    });
    
    // For all other routes (client-side routing), serve index.html
    app.get('*', (req, res, next) => {
        // Skip API routes
        const apiRoutes = ['/api', '/health', '/login', '/register', '/verify-otp', 
                          '/resend-otp', '/users', '/fetchmsg', '/request', 
                          '/request-show', '/friends', '/accept-request', '/upload-image'];
        
        if (apiRoutes.some(route => req.path.startsWith(route))) {
            return next();
        }
        
        // Don't serve index.html for asset files that don't exist
        if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|webp)$/)) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        
        // Serve index.html for client-side routing
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).json({ error: 'Frontend not found' });
        }
    });
} else {
    console.error('❌ No frontend build found!');
    app.get('*', (req, res) => {
        res.status(404).json({ 
            error: 'Frontend not found. Please build the frontend first.',
            path: req.path
        });
    });
}
// ========== EMAIL CONFIGURATION ==========
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

const otpStore = new Map();

function generateOTP() {
    return Math.floor(100000 + Math.random()  * 900000).toString();
}

async function sendOTPEmail(email, otp, name) {
    try {
        const info = await transporter.sendMail({
            from: `"TALK_ANY_TIME" <${EMAIL_USER}>`,
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

// ========== REGISTER API ==========
app.post("/register", async (req, res) => {
    const { name, email, password, profileImage } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Validate email format
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
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
                password: await bcrypt.hash(password, 10),
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

// ========== VERIFY OTP API ==========
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
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const verify = await User.findOne({ email });
        if (!verify) return res.status(401).json({ error: "Email is wrong" });
        
        const ismatch = await bcrypt.compare(password, verify.password);
        if (!ismatch) return res.status(401).json({ error: "Password is wrong" });
        
        const token = jwt.sign(
            { _id: verify._id, email: verify.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ 
            token, 
            name: verify.name, 
            profileImage: verify.profileImage,
            id: verify._id
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// ========== AUTH MIDDLEWARE ==========
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Invalid token format" });
    
    try {
        const decode = jwt.verify(token, JWT_SECRET);
        req.userid = decode._id;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

// ========== FETCH ALL USERS ==========
app.get("/users", auth, async (req, res) => {
    try {
        const alluser = await User.find({ _id: { $ne: req.userid } }, "_id name profileImage");
        res.json(alluser);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// ========== FETCH MESSAGES ==========
app.post("/fetchmsg", auth, async (req, res) => {
    const sender = req.userid;
    const { receiver } = req.body;
    
    if (!receiver) {
        return res.status(400).json({ error: "Receiver ID required" });
    }
    
    try {
        const msg = await Msg.find({
            $or: [
                { sender, receiver },
                { sender: receiver, receiver: sender }
            ]
        }).sort({ createdAt: 1 });
        
        const formattedMessages = msg.map(message => ({
            text: message.text,
            sender: message.sender,
            receiver: message.receiver,
            isOwn: message.sender.toString() === sender.toString(),
            timestamp: message.createdAt
        }));

        res.json({
            msg: formattedMessages,
            currentuser: req.userid
        });
    } catch (error) {
        console.error("Fetch messages error:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// ========== SEND FRIEND REQUEST ==========
app.post("/request", auth, async (req, res) => {
    const { receiver } = req.body;
    
    if (!receiver) {
        return res.status(400).json({ error: "Receiver ID required" });
    }
    
    try {
        // Check if request already exists
        const existingRequest = await request.findOne({
            sender: req.userid,
            receiver: receiver,
            status: "pending"
        });
        
        if (existingRequest) {
            return res.status(400).json({ error: "Friend request already sent" });
        }
        
        const newRequest = await request.create({
            sender: req.userid,
            receiver: receiver,
            status: "pending"
        });
        
        res.json({ requestId: newRequest._id, message: "Friend request sent" });
    } catch (error) {
        console.error("Send request error:", error);
        res.status(500).json({ error: "Failed to send friend request" });
    }
});

// ========== SHOW PENDING REQUESTS ==========
app.get("/request-show", auth, async (req, res) => {
    try {
        const find_request = await request.find({
            receiver: req.userid,
            status: "pending"
        }).populate("sender", "name profileImage");
        
        res.json(find_request);
    } catch (error) {
        console.error("Show requests error:", error);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

// ========== ACCEPT FRIEND REQUEST ==========
app.post("/accept-request/:id", auth, async (req, res) => {
    try {
        const accept = await request.findByIdAndUpdate(
            req.params.id,
            { status: "accepted" },
            { new: true }
        );
        
        if (!accept) {
            return res.status(404).json({ error: "Request not found" });
        }
        
        await User.findByIdAndUpdate(
            accept.sender,
            { $addToSet: { friend: accept.receiver } }
        );
        await User.findByIdAndUpdate(
            accept.receiver,
            { $addToSet: { friend: accept.sender } }
        );
        
        res.json(accept);
    } catch (error) {
        console.error("Accept request error:", error);
        res.status(500).json({ error: "Failed to accept request" });
    }
});

// ========== GET FRIENDS LIST ==========
app.get("/friends", auth, async (req, res) => {
    try {
        const user = await User.findById(req.userid).populate("friend", "_id name profileImage");
        res.json(user.friend);
    } catch (error) {
        console.error("Fetch friends error:", error);
        res.status(500).json({ error: "Failed to fetch friends" });
    }
});

// ========== HEALTH CHECK ENDPOINT ==========
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK", 
        timestamp: new Date(),
        environment: NODE_ENV 
    });
});

// ========== API ROOT ENDPOINT ==========
app.get("/api", (req, res) => {
    res.json({
        name: "Chat App API",
        version: "1.0.0",
        endpoints: {
            auth: "/login, /register, /verify-otp",
            users: "/users, /friends",
            messages: "/fetchmsg",
            requests: "/request, /request-show, /accept-request/:id"
        }
    });
});

// ========== SOCKET.IO AUTHENTICATION ==========
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

// ========== SOCKET.IO CONNECTION HANDLER ==========
io.on("connection", (socket) => {
    const userId = socket.userid?.toString();
    socket.join(userId);
    console.log(`User connected: ${userId}`);

    socket.on("joinChat", (receiverID) => {
        const receiverIdStr = receiverID.toString();
        activeChat[userId] = receiverIdStr;
        activeChat[receiverIdStr] = userId;
    });

    socket.on("pass_indicator", ({ id, text }) => {
        try {
            if (id) {
                io.to(id).emit("typing_indicator", { text: "typing" });
            }
        } catch (err) {
            console.log("Typing indicator error:", err);
        }
    });

    socket.on("send_message", async ({ text, id }) => {
        try {
            if (!text || !id) return;
            const senderId = userId;
            const receiverId = id.toString();

            const message = await Msg.create({
                sender: senderId,
                receiver: receiverId,
                text
            });

            io.to(receiverId).emit("receive_message", {
                text,
                sender: senderId,
                timestamp: message.createdAt,
                messageId: message._id
            });

            // Send confirmation back to sender
            socket.emit("message_sent", {
                text,
                receiver: receiverId,
                timestamp: message.createdAt
            });

        } catch (err) {
            console.error("Message error:", err);
            socket.emit("message_error", { error: "Failed to send message" });
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${userId}`);
        delete activeChat[userId];
        for (let key in activeChat) {
            if (activeChat[key] === userId) {
                delete activeChat[key];
            }
        }
    });
});

// ========== ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
    console.error("Error:", err.stack);
    res.status(500).json({ 
        error: "Something went wrong!",
        message: NODE_ENV === 'development' ? err.message : undefined
    });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
    if (NODE_ENV === 'production' && !req.path.startsWith('/api')) {
        // Try to serve index.html for client-side routing
        const distPath = path.join(__dirname, '../client-side/dist');
        if (fs.existsSync(distPath)) {
            return res.sendFile(path.join(distPath, 'index.html'));
        }
    }
    res.status(404).json({ error: "Route not found" });
});

// ========== DATABASE CONNECTION & SERVER START ==========
connectdDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📁 Socket.IO ready`);
            console.log(`✅ Database connected`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log(`🔗 Client URL: ${CLIENT_URL}`);
            if (NODE_ENV === 'production') {
                const distPath = path.join(__dirname, '../client-side/dist');
                if (fs.existsSync(distPath)) {
                    console.log(`🎨 Serving frontend from: ${distPath}`);
                } else {
                    console.log(`⚠️ Frontend build not found. Run "npm run build" in client-side folder.`);
                }
            }
        });
    })
    .catch(err => {
        console.error("❌ Database connection failed:", err);
        process.exit(1);
    });

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
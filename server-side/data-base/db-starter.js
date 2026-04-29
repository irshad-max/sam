const mongoose = require("mongoose")

const connectdDB = async() => {
    try {
        // ⭐ Env variable use karo, fallback bhi rakho
        const mongoURI = process.env.MONGODB_URI || "mongodb+srv://yt:STm9Jodd1jMIkOD5@cluster0.yk6bt33.mongodb.net/chat-app"
        
        await mongoose.connect(mongoURI)
        console.log("✅ MongoDB connected successfully")
    } catch (error) {
        console.error("❌ MongoDB connection error:", error)
        process.exit(1)
    }
}

module.exports = connectdDB
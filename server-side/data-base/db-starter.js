const mongoose = require("mongoose")
const ENV = require("dotenv")
const connectdDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://yt:STm9Jodd1jMIkOD5@cluster0.yk6bt33.mongodb.net/chat-app")
    console.log("connected db")
}
module.exports = connectdDB
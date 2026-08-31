const mongoose = require("mongoose")
const ENV = require("dotenv")
const connectdDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("connected db")
}
module.exports = connectdDB
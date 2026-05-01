const mongoose = require("mongoose")
const msgSchema = new mongoose.Schema({
    sender: {
        type:mongoose.Schema.Types.ObjectId,
    },
    receiver: {
        type:mongoose.Schema.Types.ObjectId,
    },
    text: {
        type:String,
    }
})
module.exports = mongoose.model("msg", msgSchema)
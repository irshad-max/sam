const mongoose = require("mongoose")
const requestschema = new mongoose.Schema({

    sender: {
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"

    },
    receiver: {
        type:mongoose.Schema.Types.ObjectId,
        ref:"User" 

    },
    status: {
        type: String,
        enum:["pending","accepted","rejected"],
        default:"pending"

    }
})
module.exports = mongoose.model("request", requestschema)
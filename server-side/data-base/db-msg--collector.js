const mongoose = require('mongoose');

const msgSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  delivered: { type: Boolean, default: false },  
  seen: { type: Boolean, default: false },       
}, { timestamps: true }); 

module.exports = mongoose.model("msg", msgSchema);
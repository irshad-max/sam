const mongoose=require("mongoose")
const connectdDB=async()=>{
    await mongoose.connect("mongodb+srv://yt:STm9Jodd1jMIkOD5@cluster0.yk6bt33.mongodb.net/chat-app")
}
module.exports=connectdDB
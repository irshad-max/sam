const connectdDB=require('./data-base/db-starter')
const ENV=require("dotenv")
const app=require("./app")
connectdDB()
const PORT=process.env.PORT ||3001
app.listen(PORT,()=>{
 console.log("Server running on port 3001");
})
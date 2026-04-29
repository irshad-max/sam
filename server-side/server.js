const app=require("./app")
const connectdDB=require("./data-base/db-starter")
connectdDB()
app.listen(3001,()=>{
})
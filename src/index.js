import dotevn from "dotenv"
import express from "express"
import connectDB from "./db/index.js";
// import { app } from "./app.js";

dotevn.config({
    path: './.env'
})

connectDB().then(()=>{
    // app.listen(process.env.PORT || 8000, ()=>{
    //     console.log(` server runnig at port : ${process.env.PORT}`);
    // })
})
.catch((err) => {
    console.log("mongo db connection failed", err);
});

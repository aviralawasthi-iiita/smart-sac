import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();
app.use(cors({
    origin: process.env.CorsOrigin,
    credentials: true
}));
app.use(express.json()); 
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js"
import adminRouter from "./routes/admin.routes.js"

app.use("/api/v1/users",userRouter);
app.use("/api/v1/admin",adminRouter);

export {app}; 
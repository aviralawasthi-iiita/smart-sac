import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import {Admin} from "../models/admin.model.js"

export const verifyJWT = asyncHandler(async (req,res,next) => {
    try {
        const token = req.cookies?.accessToken|| req.header("Authorization")?.replace("Bearer ","");
        if(!token){
            throw new ApiError(401,"unaothorize request");
        }
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await Admin.findById(decodedToken?._id).select("-refreshToken");
    
        if(!user){
            throw new ApiError(401,"invalid Acces TOken");
        }
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid acces toekn");
    }
})


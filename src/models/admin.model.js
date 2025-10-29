import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"

const adminSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    refreshToken:{
        type: String,
    },
},{timestamps:true}
)
adminSchema.methods.generateAccessToken =function(){
    return jwt.sign(
        {
            _id : this._id,
            email:this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
};
adminSchema.methods.generateRefreshToken= function () {
    return jwt.sign(
        {
            _id : this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}

export const Admin = mongoose.model("Admin", adminSchema);
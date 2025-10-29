import mongoose, { Schema } from "mongoose";

const equipmentSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    status:{
        type: String,
        required: true,
        enum: ["available", "in-use" , "broken"],
        default :"available",
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
    duration:{
        type: String
    }, 
},{timestamps:true}
)



export const Equipment = mongoose.model("Equipment",equipmentSchema);  
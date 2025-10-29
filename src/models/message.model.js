import mongoose, { Schema } from "mongoose";
const messageSchema = new mongoose.Schema({
    id:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    status:{
        type: String,
        enum: ["read", "sent" , "received", "unsent"],
        default :"unsent",
        required: true,
        index: true,
    },
    sender:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required: true,
        index: true,
    },
    receiver:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required: true,
        index: true,
    },
    content:{
        type: String,
        required: true,
    }
},{timestamps:true}
)



export const Message = mongoose.model("Message",messageSchema);   
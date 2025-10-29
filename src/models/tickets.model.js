import mongoose, { Schema } from "mongoose";

const ticketSchema = new mongoose.Schema({
    id:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    heading:{
        type: String,
        required: true,
    },
    content:{
        type: String,
        required: true,
    },
    footer:{
        type: String,
    },
    equipment:{
        type: Schema.Types.ObjectId,
        ref:"Equipment",
        required:true,
    },
    sender:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required: true,
        index: true,
    },
    status:{
        type: String,
        enum: ["in-process", "open" , "closed"],
        default :"open",
        required: true,
        index: true,
    },
},{timestamps:true}
)



export const Ticket = mongoose.model("Ticket",ticketSchema);  
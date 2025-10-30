import mongoose, { Schema } from "mongoose";

const announcementSchema = new mongoose.Schema({
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
    }
},{timestamps:true}
)



export const Announcement = mongoose.model("Announcement",announcementSchema);  
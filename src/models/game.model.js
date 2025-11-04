import mongoose, { Schema } from "mongoose";

const gameSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    equipment:[{
        type: Schema.Types.ObjectId,
        ref: "Equipment"
    }]
},{timestamps:true}
)



export const Game = mongoose.model("Game",gameSchema);   
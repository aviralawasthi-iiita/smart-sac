import mongoose, { Schema } from "mongoose";

const equipmentHistorySchema = new mongoose.Schema({
  equipment: { 
    type: Schema.Types.ObjectId, 
    ref: "Equipment", 
    required: true 
  },
  status: { 
    type: String, 
    required: true 
  },
  user: {
    type: Schema.Types.ObjectId, 
    ref: "User", 
    default: null 
  },
  roll_no: { 
    type: String 
  },
  duration: { 
    type: Number,
    default: null
  },
  changedAt: { 
    type: Date, 
    default: Date.now 
  },
  expireAt: {
    type: Date,
    default: function () {
      const now = new Date();
      now.setMonth(now.getMonth() + 3); // 3 months from creation
      return now;
    },
  },
});

// TTL index — automatically deletes document when expireAt is reached
equipmentHistorySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const EquipmentHistory = mongoose.model("EquipmentHistory", equipmentHistorySchema);

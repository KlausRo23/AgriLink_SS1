// model/Archive.js
import mongoose from "mongoose"

const archiveSchema = new mongoose.Schema({
    itemType: { 
      type: String, 
      enum: ["Crop", "Inventory"], 
      required: true 
    },
    originalId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true 
    },
    snapshot: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true 
    },
    reason: { 
      type: String, 
      maxlength: 200, 
      default: "" 
    },
    owner: { 
      type: String, 
      required: true, 
      immutable: true, 
      index: true 
    }
}, { timestamps: true })

archiveSchema.index({ owner: 1, itemType: 1, createdAt: -1 })

export default mongoose.model("Archive", archiveSchema)
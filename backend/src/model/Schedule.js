import mongoose from "mongoose";


//This is for calendar whre the user can select date and action and will be reflected in crops and lisitng
const scheduleSchema = new mongoose.Schema({
    crop: {
        type: mongoose.Types.ObjectId.Schema,
        ref: "Schedule"
    },
    time: {
        type: Date,
        required: true
    },
    action: {
        type: String,
        enum: ["watered", "fertilized", "pesticide", "harvested"]
    },
    photo: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ["growing", "ripe"],
        default: "growing"
    },
    description: {
        type: String,
        trim: true,
        maxLength: 200,
        required: false
    }
}, {timestamps: true})

const Schedule = mongoose.model("Schedule", scheduleSchema)

export default Schedule
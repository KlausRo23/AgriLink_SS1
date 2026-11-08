import mongoose from "mongoose";


//This will be set by user manually where they will have reminder upon setting it
const reminderSchema = new mongoose.Schema({
    inventory: {
        type: mongoose.Types.ObjectId.Schema,
        ref: "Inventory"
    },
    setDay: Date, //Before expiration
    stockLevel: {
        type: Number,
        trim: true
    }
}, {timestamps: true})

const Reminder = mongoose.model("Reminder", reminderSchema)

export default Reminder
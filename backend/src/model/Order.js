import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    order: {
        type: mongoose.Types.ObjectId.Types,
        ref: "Customer"
    },
    status: {
        type: String,
        enum: ["preparing", "delivering", "delievered"]
    },
    date: Date
}, {timestamps: true})
    
const Order = mongoose.model("Order", orderSchema)

export default Order
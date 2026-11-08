import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    buyer: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    }
}, {timestamps: true})

const Customer = mongoose.model("Customer", customerSchema)

export default Customer
import mongoose from "mongoose";


//This are the record of the approved or rejected order
const recordSchema = new mongoose.model({
    record: {
        type: mongoose.Types.ObjectId.Schema,
        ref: Customer
    },
    reason: {
        type: String,
        maxLength: 200,
        required: false
    }
}, {timestamps: true})

const Record = mongoose.model("Record", recordSchema)

export default Record
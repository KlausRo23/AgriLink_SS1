import mongoose from "mongoose";

const conDB = async () => {
    try {
        const res = await mongoose.connect(process.env.MONGO_URI)
        console.log("Connected to DB")
    } catch (error) {
        console.log("Failed to connect to DB", error)
        process.exit(1)
    }
}

export default conDB
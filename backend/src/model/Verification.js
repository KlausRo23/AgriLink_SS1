import mongoose from "mongoose"


//This is for verification of Farmer
const verificationSchema = new mongoose.Schema({
	ssoUserId: {
		type: String,
		required: true,
		unique: true,
		sparse: true,
		index: true,
		immutable: true
	},
lastName: {
	type: String, 
	required: true, 
	maxLength: 30,
	minLength: 2,
	trim: true
},
firstName: {
	type: String, 
	required: true, 
	maxLength: 30,
	minLength: 2,
	trim: true
},
middleName: {
	type: String, 
	required: true, 
	maxLength: 30,
	minLength: 2,
	trim: true
},
suffix: {
	type: String,
	enum: ["Jr", "Sr", "I", "II", "III"],
	required: false
},
Age: {
	type: Number, 
	required: true, 
	min: 18,
	max: 99,
},
rsbsaRegistration: {
    type: String,
    required: true
},
supportingDocuments: {
    type: String,
    required: true
},
facePhoto: {
    type: String,
    required: true
},
status: {
    type: String,
    enum: ["rejected", "approved", "pending"],
    default: "pending",
    required: true
},
reviewedBy: {
  userId: {
    type: String
  },
  name: String,
  role: {
    type: String,
    enum: ["admin", "super_admin"]
  }
},
remarks: {
	type: String,
	required: false,
	trim: true,
	maxLength: 200
},
reviewAt: Date
}, {timestamps: true}) 

const Verification = mongoose.model("Verification", verificationSchema)

export default Verification
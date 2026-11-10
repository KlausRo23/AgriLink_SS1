import Farmer from "../model/Farmer.js"
import Farm from "../model/Farm.js"
import Verification from "../model/Verification.js"

export async function getOnboardingStatus(req, res) {
    try {
        const farmer = await Farmer.findOne({ ssoUserId: req.user.id }).select("_id").lean()
        const farm = farmer ? await Farm.findOne({ owner: farmer._id }).select("_id").lean() : null
        const verification = farm
            ? await Verification.findOne({ ssoUserId: req.user.id }).select("status").lean()
            : null
        const verificationSubmitted = Boolean(verification && verification.status !== "rejected")

        return res.status(200).json({
            success: true,
            data: {
                farmer: Boolean(farmer),
                farm: Boolean(farm),
                verificationSubmitted,
                verificationStatus: verification?.status ?? null
            }
        })
    } catch (error) {
        console.error("Onboarding status error:", error)
        return res.status(500).json({ success: false, message: "Could not load onboarding status" })
    }
}

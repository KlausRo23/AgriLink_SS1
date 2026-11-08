export function toPublicUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        region: user.region ?? null
    }
}
// Change these strings if SS1 uses different role names in the token
export const ROLES = Object.freeze({
    SUPERADMIN: "superadmin",
    ADMIN: "admin",
    FARMER: "farmer",
    BUYER: "buyer",
    USER: "user" // registered, not yet verified as farmer or buyer
})

export const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.ADMIN]
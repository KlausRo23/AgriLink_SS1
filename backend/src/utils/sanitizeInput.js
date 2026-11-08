const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

//This is to validate inputs preventing injection
export function validateEmail(email) {
    if (!email || typeof email !== 'string')
        return false

    const trimmed = email.trim().toLowerCase()
    return EMAIL_REGEX.test(trimmed) && trimmed.length <= 100
}

export function validatePassword(password) {
    if (!password || typeof password !== 'string')
        return false

    if (password.length < 8 || password.length > 100)
        return false

    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)

    return hasUpper && hasLower && hasNumber && hasSpecial
}

export function sanitizeInput(input) {
    if (typeof input !== 'string')
        return ''
    return input.trim().slice(0, 1000)
}
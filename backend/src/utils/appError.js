export default class AppError extends Error {
    constructor(message, statusCode = 400, errors = null) {
        super(message)
        this.name = "AppError"
        this.statusCode = statusCode
        this.errors = errors // optional per-field details, e.g. { age: "..." }
        Error.captureStackTrace?.(this, this.constructor)
    }
}
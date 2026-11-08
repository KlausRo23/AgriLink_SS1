export function buildVerificationEmail(name, verificationCode) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #2e7d32; margin-top: 0;">Here's your new code, ${name}</h2>
        <p style="color: #333; font-size: 14px; line-height: 1.5;">
            You requested a new verification code for your AgriLink account. Use the code below to verify your account:
        </p>
        <div style="background: #f4f4f4; padding: 12px 16px; border-radius: 6px; text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 4px; color: #2e7d32;">
            ${verificationCode}
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
            This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.
        </p>
    </div>
    `
}

export function buildPasswordResetEmail(name, resetCode) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #2e7d32; margin-top: 0;">Reset your password, ${name}</h2>
        <p style="color: #333; font-size: 14px; line-height: 1.5;">
            We received a request to reset your AgriLink account password. Use the code below to continue:
        </p>
        <div style="background: #f4f4f4; padding: 12px 16px; border-radius: 6px; text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 4px; color: #2e7d32;">
            ${resetCode}
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
            This code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email — your password won't be changed.
        </p>
    </div>
    `
}

export function buildWelcomeEmail(name, verificationCode) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
        <h2 style="color: #2e7d32; margin-top: 0;">Welcome to AgriLink, ${name}!</h2>
        <p style="color: #333; font-size: 14px; line-height: 1.5;">
            Your account has been created successfully. We're glad to have you on board.
        </p>
        <p style="color: #333; font-size: 14px; line-height: 1.5;">
            To finish setting up your account, use this verification code:
        </p>
        <div style="background: #f4f4f4; padding: 12px 16px; border-radius: 6px; text-align: center; font-size: 22px; font-weight: bold; letter-spacing: 4px; color: #2e7d32;">
            ${verificationCode}
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">
            This code expires in 15 minutes. If you didn't sign up for AgriLink, you can safely ignore this email.
        </p>
    </div>
    `
}
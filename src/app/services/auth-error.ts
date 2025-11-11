export class AuthError extends Error {
    code: string;
    
    constructor(message: string, code: string) {
        super(message);
        this.name = 'AuthError';
        this.code = code;
    }
}

export const AUTH_ERROR_CODES = {
    NOT_AUTHENTICATED: 'not_authenticated',
    NOT_ADMIN: 'not_admin',
    USER_NOT_FOUND: 'user_not_found',
    INVALID_ROLE: 'invalid_role',
    EMAIL_ALREADY_EXISTS: 'email_already_exists',
    REQUIRES_RECENT_LOGIN: 'requires_recent_login',
    INVALID_PASSWORD: 'invalid_password',
    NETWORK_ERROR: 'network_error'
};
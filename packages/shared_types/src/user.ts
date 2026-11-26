export type UserRole = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'VIEWER';

export type Capability =
  | 'content:create'
  | 'content:edit:own'
  | 'content:edit:any'
  | 'content:publish'
  | 'media:upload'
  | 'media:delete'
  | 'taxonomy:manage'
  | 'menu:manage'
  | 'users:manage'
  | 'plugins:install'
  | 'settings:manage'
  | 'comment:moderate';

export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
}

export interface UserDetail extends UserPublic {
  capabilities: Capability[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

/** Payload for requesting a password reset email. */
export interface ForgotPasswordInput {
  email: string;
}

/** Payload for resetting a password with a one-time token. */
export interface ResetPasswordInput {
  token: string;
  password: string;
}

/** Payload for verifying an email address with a one-time token. */
export interface VerifyEmailInput {
  token: string;
}

/** Payload for requesting a new verification email. */
export interface ResendVerificationInput {
  email: string;
}

/** Minimal auth response payload returned by auth endpoints. */
export interface AuthUser {
  user_id: string;
  email: string;
  name: string | null;
  role: UserRole;
  email_verified: boolean;
}

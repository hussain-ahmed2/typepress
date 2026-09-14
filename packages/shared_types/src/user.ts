export type UserRole = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'VIEWER';

export type Capability =
  | 'content:create'
  | 'content:edit:own'
  | 'content:edit:any'
  | 'content:publish'
  | 'media:upload'
  | 'media:delete'
  | 'users:manage'
  | 'plugins:install'
  | 'settings:manage';

export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
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

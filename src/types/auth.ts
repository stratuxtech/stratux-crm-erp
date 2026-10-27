export type UserRole = "admin" | "member";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  status: "activo" | "inactivo";
  createdAt: string;
  lastLoginAt?: string;
}

export type SafeUser = Omit<User, "passwordHash" | "salt">;

export interface Invitation {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: "pendiente" | "aceptada" | "expirada";
}

export interface PasswordReset {
  id: string;
  userId: string;
  email: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  exp: number; // Unix timestamp in seconds
}

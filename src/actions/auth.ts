"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  createSessionToken,
  verifySessionToken
} from "@/lib/auth-crypto";
import { User, SafeUser, Invitation, PasswordReset, UserRole } from "@/types/auth";
import {
  sendNotificationEmail,
  generateInvitationEmailHtml,
  generatePasswordResetEmailHtml
} from "@/lib/email-service";

const SESSION_COOKIE_NAME = "stratux_session";

function toSafeUser(user: User): SafeUser {
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

/**
 * Log in with email and password
 */
export async function loginAction(formData: { email: string; password: string; redirectTo?: string }) {
  try {
    const email = formData.email?.toLowerCase().trim();
    const password = formData.password;

    if (!email || !password) {
      return { success: false, error: "Por favor ingresa tu correo y contraseña." };
    }

    const user = await db.users.findByEmail(email);
    if (!user) {
      return { success: false, error: "Credenciales incorrectas. Verifica tu correo y contraseña." };
    }

    if (user.status !== "activo") {
      return { success: false, error: "Esta cuenta se encuentra inactiva. Contacta al administrador." };
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return { success: false, error: "Credenciales incorrectas. Verifica tu correo y contraseña." };
    }

    // Update last login
    await db.users.update(user.id, { lastLoginAt: new Date().toISOString() });

    // Create session token
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return {
      success: true,
      redirect: formData.redirectTo || "/dashboard/negocio",
      user: toSafeUser(user)
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return { success: false, error: error.message || "Error interno al iniciar sesión." };
  }
}

/**
 * Log out current user
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}

/**
 * Get current session user
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!tokenCookie?.value) return null;

    const session = verifySessionToken(tokenCookie.value);
    if (!session) return null;

    const user = await db.users.findById(session.userId);
    if (!user || user.status !== "activo") return null;

    return toSafeUser(user);
  } catch {
    return null;
  }
}

/**
 * Request password reset
 */
export async function requestPasswordResetAction(email: string, origin: string) {
  try {
    const safeEmail = email?.toLowerCase().trim();
    if (!safeEmail) {
      return { success: false, error: "Ingresa un correo electrónico válido." };
    }

    const user = await db.users.findByEmail(safeEmail);
    if (!user) {
      // Don't leak user existence, return friendly generic message
      return {
        success: true,
        message: "Si la cuenta existe, recibirás un enlace de recuperación en breve."
      };
    }

    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour

    const resetRecord: PasswordReset = {
      id: `reset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      email: user.email,
      token,
      createdAt: new Date().toISOString(),
      expiresAt,
      used: false,
    };

    await db.passwordResets.append(resetRecord);

    const resetUrl = `${origin}/restablecer-contrasena/${token}`;
    const emailHtml = generatePasswordResetEmailHtml(user.email, resetUrl);

    await sendNotificationEmail({
      to: user.email,
      subject: "Restablecer tu contraseña - Stratux ERP-CRM",
      htmlContent: emailHtml,
      actionUrl: resetUrl,
    });

    return {
      success: true,
      link: resetUrl,
      message: "Enlace de recuperación generado correctamente."
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al solicitar recuperación." };
  }
}

/**
 * Verify if a password reset token is valid
 */
export async function verifyPasswordResetToken(token: string) {
  try {
    const record = await db.passwordResets.findByToken(token);
    if (!record || record.used) {
      return { valid: false, error: "El enlace es inválido o ya ha sido utilizado." };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: "El enlace de recuperación ha expirado. Solicita uno nuevo." };
    }

    return { valid: true, email: record.email };
  } catch {
    return { valid: false, error: "Error al verificar token." };
  }
}

/**
 * Reset password using token
 */
export async function resetPasswordAction(token: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
    }

    const record = await db.passwordResets.findByToken(token);
    if (!record || record.used || new Date(record.expiresAt).getTime() < Date.now()) {
      return { success: false, error: "El enlace de recuperación no es válido o ya expiró." };
    }

    const { hash, salt } = hashPassword(newPassword);
    await db.users.update(record.userId, {
      passwordHash: hash,
      salt: salt,
    });

    await db.passwordResets.update(record.id, { used: true });

    return { success: true, message: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión." };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar contraseña." };
  }
}

/**
 * Create Admin invitation
 */
export async function createInvitationAction(formData: {
  email: string;
  name?: string;
  role?: UserRole;
  origin: string;
}) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return { success: false, error: "No tienes permisos de Administrador para invitar usuarios." };
    }

    const email = formData.email?.toLowerCase().trim();
    if (!email || !email.includes("@")) {
      return { success: false, error: "Ingresa un correo electrónico válido." };
    }

    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      return { success: false, error: "Ya existe un usuario registrado con este correo." };
    }

    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(); // 48 hours

    const invitation: Invitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email,
      name: formData.name || "",
      role: formData.role || "admin",
      token,
      invitedBy: currentUser.email,
      createdAt: new Date().toISOString(),
      expiresAt,
      status: "pendiente",
    };

    await db.invitations.append(invitation);

    const inviteUrl = `${formData.origin}/invitacion/${token}`;
    const emailHtml = generateInvitationEmailHtml(formData.name || "", currentUser.email, inviteUrl);

    await sendNotificationEmail({
      to: email,
      subject: "Invitación para unirte como Administrador a Stratux ERP-CRM",
      htmlContent: emailHtml,
      actionUrl: inviteUrl,
    });

    return {
      success: true,
      link: inviteUrl,
      invitation,
      message: `Invitación creada exitosamente para ${email}`
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al generar invitación." };
  }
}

/**
 * Get invitation details by token
 */
export async function getInvitationAction(token: string) {
  try {
    const invitation = await db.invitations.findByToken(token);
    if (!invitation || invitation.status !== "pendiente") {
      return { valid: false, error: "Esta invitación no existe o ya ha sido aceptada." };
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: "Esta invitación ha expirado. Solicita una nueva invitación." };
    }

    return {
      valid: true,
      invitation: {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        invitedBy: invitation.invitedBy
      }
    };
  } catch {
    return { valid: false, error: "Error al verificar invitación." };
  }
}

/**
 * Accept invitation and register new user
 */
export async function acceptInvitationAction(formData: {
  token: string;
  name: string;
  password: string;
}) {
  try {
    const { token, name, password } = formData;
    if (!name || name.trim().length < 2) {
      return { success: false, error: "Por favor ingresa tu nombre completo." };
    }
    if (!password || password.length < 8) {
      return { success: false, error: "La contraseña debe tener al menos 8 caracteres." };
    }

    const invitation = await db.invitations.findByToken(token);
    if (!invitation || invitation.status !== "pendiente") {
      return { success: false, error: "La invitación no es válida o ya fue utilizada." };
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      return { success: false, error: "La invitación ha expirado." };
    }

    // Check if email already used in the meantime
    const existing = await db.users.findByEmail(invitation.email);
    if (existing) {
      return { success: false, error: "Este correo ya se encuentra registrado." };
    }

    const { hash, salt } = hashPassword(password);
    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: invitation.email,
      name: name.trim(),
      role: invitation.role,
      passwordHash: hash,
      salt: salt,
      status: "activo",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await db.users.append(newUser);
    await db.invitations.update(invitation.id, { status: "aceptada" });

    // Auto login
    const sessionToken = createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return {
      success: true,
      redirect: "/dashboard/negocio",
      message: "¡Cuenta creada exitosamente! Bienvenido a Stratux ERP-CRM."
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al completar registro." };
  }
}

/**
 * Get users and pending invitations for Admin Management
 */
export async function getUsersListAction() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return { success: false, error: "No autorizado." };
    }

    const allUsers = await db.users.findMany();
    const safeUsers = allUsers.map(toSafeUser);
    const invitations = await db.invitations.findMany();

    return {
      success: true,
      users: safeUsers,
      invitations: invitations.filter((i) => i.status === "pendiente"),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete user action
 */
export async function deleteUserAction(userId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      return { success: false, error: "No autorizado." };
    }

    const targetUser = await db.users.findById(userId);
    if (!targetUser) {
      return { success: false, error: "Usuario no encontrado." };
    }

    // Protect master admin
    if (targetUser.email.toLowerCase() === "stratux.tech@gmail.com") {
      return { success: false, error: "El usuario administrador principal no puede ser eliminado." };
    }

    // Protect self-deletion
    if (targetUser.id === currentUser.id) {
      return { success: false, error: "No puedes eliminar tu propia cuenta de usuario." };
    }

    await db.users.delete(userId);
    return { success: true, message: "Usuario eliminado correctamente." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

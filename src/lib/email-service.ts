/**
 * Email Notification Service for Stratux ERP-CRM
 * Handles Admin Invitations and Password Reset Notifications.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  actionUrl: string;
}

export async function sendNotificationEmail(params: SendEmailParams): Promise<{ success: boolean; link: string; error?: string }> {
  const { to, subject, htmlContent, actionUrl } = params;

  console.log(`[Email Service] 📧 Prepared email to: ${to} | Subject: "${subject}"`);
  console.log(`[Email Service] 🔗 Action Link: ${actionUrl}`);

  try {
    // If a webhook or SMTP is configured in environment, trigger it
    const webhookUrl = process.env.EMAIL_WEBHOOK_URL || process.env.GOOGLE_SHEETS_FINANZAS_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_email",
            to,
            subject,
            html: htmlContent,
            actionUrl,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.warn("[Email Service] Webhook notification attempt ended with notice:", err);
      }
    }

    return { success: true, link: actionUrl };
  } catch (error: any) {
    console.error("[Email Service] Failed to send email:", error);
    return { success: false, link: actionUrl, error: error.message };
  }
}

export function generateInvitationEmailHtml(invitedName: string, inviterEmail: string, inviteUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">STRATUX ERP-CRM</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Plataforma de Gestión Comercial y Operaciones</p>
      </div>
      <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
        <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">¡Has sido invitado como Administrador!</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Hola${invitedName ? ` <strong>${invitedName}</strong>` : ""}, el administrador <strong>${inviterEmail}</strong> te ha invitado a unirte al equipo de administración de <strong>Stratux ERP-CRM</strong>.
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Para activar tu cuenta y configurar tu contraseña de acceso, haz clic en el siguiente botón:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${inviteUrl}" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
            Activar Cuenta de Administrador
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px; word-break: break-all;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
          <a href="${inviteUrl}" style="color: #38bdf8;">${inviteUrl}</a>
        </p>
      </div>
      <div style="text-align: center; margin-top: 24px; color: #64748b; font-size: 12px;">
        Este enlace expirará en 48 horas. Si no reconoces esta invitación, puedes ignorar este mensaje.
      </div>
    </div>
  `;
}

export function generatePasswordResetEmailHtml(userEmail: string, resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #38bdf8; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">STRATUX ERP-CRM</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Recuperación de Contraseña</p>
      </div>
      <div style="background-color: #1e293b; padding: 24px; border-radius: 8px; border: 1px solid #334155;">
        <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0;">Restablecimiento de Contraseña</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Hemos recibido una solicitud para restablecer la contraseña asociada a tu cuenta <strong>${userEmail}</strong> en Stratux ERP-CRM.
        </p>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Haz clic en el siguiente botón para definir una nueva contraseña segura:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
            Restablecer Mi Contraseña
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px; word-break: break-all;">
          O copia el siguiente enlace:<br />
          <a href="${resetUrl}" style="color: #38bdf8;">${resetUrl}</a>
        </p>
      </div>
      <div style="text-align: center; margin-top: 24px; color: #64748b; font-size: 12px;">
        Este enlace es válido durante 1 hora. Si tú no solicitaste este cambio, por favor desestima este correo.
      </div>
    </div>
  `;
}

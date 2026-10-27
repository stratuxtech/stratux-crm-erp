"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { verifyPasswordResetToken, resetPasswordAction } from "@/actions/auth";

export default function RestablecerContrasenaPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifyError("Enlace de recuperación inválido.");
      setIsVerifying(false);
      return;
    }

    verifyPasswordResetToken(token).then((res) => {
      setIsVerifying(false);
      if (res.valid) {
        setTokenValid(true);
        setTokenEmail(res.email || null);
      } else {
        setVerifyError(res.error || "El enlace no es válido o ya ha expirado.");
      }
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword.length < 8) {
      setSubmitError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError("Las contraseñas ingresadas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPasswordAction(token, newPassword);
      if (!res.success) {
        setSubmitError(res.error || "No se pudo actualizar la contraseña.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
    } catch (err: any) {
      setSubmitError(err.message || "Error al actualizar contraseña.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-background to-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-border/80 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <KeyRound className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-heading font-bold tracking-wide text-foreground">
              Nueva Contraseña
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-1">
              {tokenEmail ? `Para la cuenta ${tokenEmail}` : "Define tu nueva contraseña de acceso"}
            </CardDescription>
          </div>
        </CardHeader>

        {isVerifying ? (
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verificando enlace de seguridad...</p>
          </CardContent>
        ) : !tokenValid ? (
          <CardContent className="space-y-5 text-center">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto" />
              <p className="font-semibold text-base">Enlace no válido</p>
              <p className="text-xs leading-relaxed">{verifyError}</p>
            </div>
            <Link href="/recuperar-contrasena" className="w-full block">
              <Button variant="outline" className="w-full">
                Solicitar un nuevo enlace
              </Button>
            </Link>
          </CardContent>
        ) : isSuccess ? (
          <CardContent className="space-y-5 text-center">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto" />
              <p className="font-semibold text-base">¡Contraseña Actualizada!</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tu contraseña ha sido modificada con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.
              </p>
            </div>
            <Link href="/login" className="w-full block pt-2">
              <Button className="w-full h-11 font-semibold text-base bg-primary text-primary-foreground">
                Ir al Inicio de Sesión
              </Button>
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {submitError && (
                <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="pr-10 h-11 bg-background/50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="h-11 bg-background/50"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 font-semibold text-base shadow-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando contraseña...
                  </>
                ) : (
                  "Guardar Contraseña"
                )}
              </Button>

              <Link href="/login" className="w-full text-center">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancelar y volver al inicio
                </Button>
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

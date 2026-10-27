"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, UserPlus, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { getInvitationAction, acceptInvitationAction } from "@/actions/auth";

export default function InvitacionPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [isVerifying, setIsVerifying] = useState(true);
  const [invitationData, setInvitationData] = useState<{
    email: string;
    name?: string;
    role: string;
    invitedBy: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setVerifyError("Enlace de invitación no válido.");
      setIsVerifying(false);
      return;
    }

    getInvitationAction(token).then((res) => {
      setIsVerifying(false);
      if (res.valid && res.invitation) {
        setInvitationData(res.invitation);
        if (res.invitation.name) {
          setName(res.invitation.name);
        }
      } else {
        setVerifyError(res.error || "Esta invitación no es válida o ya ha expirado.");
      }
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim() || name.trim().length < 2) {
      setSubmitError("Por favor ingresa tu nombre completo.");
      return;
    }

    if (password.length < 8) {
      setSubmitError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await acceptInvitationAction({
        token,
        name,
        password,
      });

      if (!res.success) {
        setSubmitError(res.error || "Error al completar el registro.");
        setIsSubmitting(false);
        return;
      }

      // Automatically logged in by server action, redirect to dashboard
      router.push(res.redirect || "/dashboard/negocio");
      router.refresh();
    } catch (err: any) {
      setSubmitError(err.message || "Error inesperado al crear cuenta.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-background to-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-border/80 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <UserPlus className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-heading font-bold tracking-wide text-foreground">
              Invitación de Administrador
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-1">
              Únete al equipo administrativo de Stratux ERP-CRM
            </CardDescription>
          </div>
        </CardHeader>

        {isVerifying ? (
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validando invitación de seguridad...</p>
          </CardContent>
        ) : !invitationData ? (
          <CardContent className="space-y-5 text-center">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto" />
              <p className="font-semibold text-base">Invitación inválida</p>
              <p className="text-xs leading-relaxed">{verifyError}</p>
            </div>
            <Link href="/login" className="w-full block">
              <Button variant="outline" className="w-full">
                Ir al Inicio de Sesión
              </Button>
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Invitado por: <strong className="text-foreground">{invitationData.invitedBy}</strong>
                </span>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitationData.email}
                  disabled
                  className="h-11 bg-muted/50 cursor-not-allowed font-medium text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="h-11 bg-background/50"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Crear Contraseña *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="pr-10 h-11 bg-background/50"
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
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repite tu contraseña"
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
                    Creando cuenta...
                  </>
                ) : (
                  "Activar Cuenta y Entrar"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Al activar tu cuenta, aceptas los términos de confidencialidad de Stratux.
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

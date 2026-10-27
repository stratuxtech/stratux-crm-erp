"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { requestPasswordResetAction } from "@/actions/auth";

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; link?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const origin = window.location.origin;
      const res = await requestPasswordResetAction(email, origin);

      if (!res.success) {
        setErrorMessage(res.error || "Error al procesar la solicitud.");
        setIsLoading(false);
        return;
      }

      setSuccessInfo({
        message: res.message || "Se ha generado el enlace de restablecimiento.",
        link: res.link,
      });
      setIsLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Error inesperado.");
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (successInfo?.link) {
      navigator.clipboard.writeText(successInfo.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-background to-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-border/80 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <Mail className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-heading font-bold tracking-wide text-foreground">
              Recuperar Contraseña
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-1">
              Ingresa tu correo institucional para enviarte las instrucciones
            </CardDescription>
          </div>
        </CardHeader>

        {successInfo ? (
          <CardContent className="space-y-5 text-center">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto" />
              <p className="font-semibold text-base">{successInfo.message}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Revisa tu bandeja de entrada en <strong>{email}</strong> para completar el restablecimiento.
              </p>
            </div>

            {successInfo.link && (
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border text-left space-y-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Enlace de restablecimiento generado:
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={successInfo.link}
                    className="h-9 text-xs font-mono bg-background select-all"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="shrink-0 h-9"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link href="/login" className="w-full block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Inicio de Sesión
                </Button>
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu-correo@stratux.tech"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="pl-10 h-11 bg-background/50 border-input focus-visible:ring-primary"
                    autoFocus
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-semibold text-base shadow-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando solicitud...
                  </>
                ) : (
                  "Enviar Enlace de Recuperación"
                )}
              </Button>

              <Link href="/login" className="w-full text-center">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Users, 
  UserPlus, 
  Mail, 
  ShieldCheck, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  AlertCircle 
} from "lucide-react";
import { SafeUser, Invitation } from "@/types/auth";
import { getUsersListAction, createInvitationAction, deleteUserAction } from "@/actions/auth";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: SafeUser | null;
}

export function UserManagementModal({ isOpen, onClose, currentUser }: UserManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"users" | "invite">("users");
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Delete User State
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await getUsersListAction();
      if (res.success && res.users) {
        setUsers(res.users);
        setInvitations(res.invitations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setGeneratedLink(null);
      setInviteError(null);
      setInviteEmail("");
      setInviteName("");
    }
  }, [isOpen]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setGeneratedLink(null);

    if (!inviteEmail || !inviteEmail.includes("@")) {
      setInviteError("Ingresa un correo electrónico válido.");
      return;
    }

    setIsInviting(true);

    try {
      const origin = window.location.origin;
      const res = await createInvitationAction({
        email: inviteEmail,
        name: inviteName,
        role: "admin",
        origin,
      });

      if (!res.success) {
        setInviteError(res.error || "Error al generar invitación.");
        setIsInviting(false);
        return;
      }

      setGeneratedLink(res.link || null);
      setInviteEmail("");
      setInviteName("");
      fetchUsers();
      setIsInviting(false);
    } catch (err: any) {
      setInviteError(err.message || "Error al invitar usuario.");
      setIsInviting(false);
    }
  };

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDeleteUser = async (user: SafeUser) => {
    if (user.email === "stratux.tech@gmail.com") {
      alert("El administrador principal no puede ser eliminado.");
      return;
    }
    if (user.id === currentUser?.id) {
      alert("No puedes eliminar tu propia cuenta.");
      return;
    }

    const confirmed = confirm(`¿Estás seguro de que deseas eliminar al administrador ${user.name} (${user.email})?`);
    if (!confirmed) return;

    setDeletingUserId(user.id);
    try {
      const res = await deleteUserAction(user.id);
      if (!res.success) {
        alert(res.error || "No se pudo eliminar al usuario.");
      } else {
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.message || "Error al eliminar.");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-heading font-bold text-foreground">
                Gestión de Usuarios y Administradores
              </DialogTitle>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant={activeTab === "users" ? "default" : "outline"}
              onClick={() => setActiveTab("users")}
              className="text-xs font-semibold"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Usuarios Activos ({users.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "invite" ? "default" : "outline"}
              onClick={() => setActiveTab("invite")}
              className="text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              + Invitar Administrador
            </Button>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pr-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full">
          {activeTab === "users" ? (
            <div className="space-y-6">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Cargando usuarios...</p>
                </div>
              ) : (
                <>
                  {/* Active Users Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Administradores Registrados
                    </h3>
                    <div className="space-y-2.5">
                      {users.map((u) => {
                        const isMaster = u.email.toLowerCase() === "stratux.tech@gmail.com";
                        const isMe = u.id === currentUser?.id;

                        return (
                          <div
                            key={u.id}
                            className="p-3.5 rounded-lg border border-border bg-muted/10 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-foreground truncate">
                                    {u.name || "Sin nombre"}
                                  </span>
                                  {isMaster && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                      Principal
                                    </span>
                                  )}
                                  {isMe && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                                      Tú
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {u.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </Badge>

                              {!isMaster && !isMe && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={deletingUserId === u.id}
                                  onClick={() => handleDeleteUser(u)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Eliminar administrador"
                                >
                                  {deletingUserId === u.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pending Invitations Table */}
                  {invitations.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Invitaciones Pendientes ({invitations.length})
                      </h3>
                      <div className="space-y-2">
                        {invitations.map((inv) => {
                          const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/invitacion/${inv.token}` : "";

                          return (
                            <div
                              key={inv.id}
                              className="p-3 rounded-lg border border-border/80 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-foreground truncate">
                                  {inv.email}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Invitado por {inv.invitedBy} • Expira: {new Date(inv.expiresAt).toLocaleDateString()}
                                </div>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(inviteUrl)}
                                className="shrink-0 h-8 text-xs font-medium"
                              >
                                {copiedLink ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 mr-1" />
                                    Copiar Enlace
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Invite New Admin Form */
            <form onSubmit={handleSendInvite} className="space-y-4 w-full max-w-full overflow-hidden">
              {inviteError && (
                <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{inviteError}</span>
                </div>
              )}

              {generatedLink && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <ShieldCheck className="h-4 w-4" />
                    ¡Invitación generada exitosamente!
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se envió una notificación al correo y puedes copiar el enlace directo para compartirlo por chat:
                  </p>
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <Input
                      readOnly
                      value={generatedLink}
                      className="h-9 text-xs font-mono bg-background select-all flex-1 min-w-0 truncate"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(generatedLink)}
                      className="shrink-0 h-9"
                    >
                      {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Correo Electrónico del Nuevo Administrador *</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder="nuevo.admin@stratux.tech"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isInviting}
                    required
                    className="pl-10 h-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="inviteName">Nombre o Cargo (Opcional)</Label>
                <Input
                  id="inviteName"
                  type="text"
                  placeholder="Ej. Carlos Mendoza"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  disabled={isInviting}
                  className="h-10"
                />
              </div>

              <div className="p-3.5 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground space-y-1 leading-relaxed">
                <p>
                  <strong>Rol:</strong> Se le otorgará el rol de <strong>Administrador (Admin)</strong>.
                </p>
                <p>
                  El invitado recibirá un enlace seguro válido por <strong>48 horas</strong> donde podrá definir su contraseña de acceso.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("users")}
                  disabled={isInviting}
                >
                  Volver a la Lista
                </Button>
                <Button
                  type="submit"
                  disabled={isInviting}
                  className="font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando invitación...
                    </>
                  ) : (
                    "Enviar Invitación"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

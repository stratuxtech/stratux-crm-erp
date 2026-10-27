"use client";

import { useState, useEffect } from "react";
import { Search, Phone, Mail, Users, UserRoundPlus, RefreshCw, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getReferrers, addReferrer, updateReferrer, deleteReferrer, syncReferrers } from "@/actions/referidores";
import { useLayoutStore } from "@/store/use-layout-store";
import { EmptyState } from "@/components/ui/empty-state";

export default function ReferidoresPage() {
  const { lastSyncTime, triggerSync } = useLayoutStore();
  const [referidores, setReferidores] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Estado para el modal de nuevo referidor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newRef, setNewRef] = useState({
    nombre: "",
    apodo: "",
    telefono: "",
    email: "",
  });

  // Estado para modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editingRef, setEditingRef] = useState<{
    id: string;
    nombre: string;
    apodo: string;
    telefono: string;
    email: string;
  } | null>(null);

  // Estado para confirmación de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingRef, setDeletingRef] = useState<{ id: string; nombre: string } | null>(null);

  const sortReferrers = (data: any[]) => {
    return [...data].sort((a, b) => {
      const dateA = a.joinDate || a.createdAt ? new Date(a.joinDate || a.createdAt).getTime() : 0;
      const dateB = b.joinDate || b.createdAt ? new Date(b.joinDate || b.createdAt).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return (b.id || "").localeCompare(a.id || "", undefined, { numeric: true });
    });
  };

  useEffect(() => {
    getReferrers().then(data => setReferidores(sortReferrers(data)));
  }, [lastSyncTime]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await syncReferrers();
      if (res.success) {
        toast.success("Sincronización completada", { description: res.message });
        const updated = await getReferrers(true);
        setReferidores(sortReferrers(updated));
        triggerSync();
      } else {
        toast.info("Sin datos nuevos en Sheets");
      }
    } catch (e) {
      toast.error("Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredReferidores = referidores.filter((ref) => {
    const name = ref.name || ref.nombre || "";
    const id = ref.id || "";
    const contact = ref.whatsapp || ref.email || ref.telefono || "";

    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleCreateReferidor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRef.nombre.trim()) {
      toast.error("El nombre completo es obligatorio");
      return;
    }
    
    setIsSubmittingNew(true);
    try {
      const referidorData = {
        name: newRef.nombre.trim(),
        nickname: newRef.apodo?.trim() || undefined,
        whatsapp: newRef.telefono?.trim() || undefined,
        email: newRef.email?.trim() || undefined,
        projectsCount: 0,
        totalEarned: 0,
      };

      const res = await addReferrer(referidorData);
      if (res.success && res.referrer) {
        setReferidores(sortReferrers([res.referrer, ...referidores]));
        setIsModalOpen(false);
        setNewRef({ nombre: "", apodo: "", telefono: "", email: "" });
        if (res.sheetSync) {
          toast.success("Referidor registrado y sincronizado en Google Sheets");
        } else {
          toast.success("Referidor guardado localmente", {
            description: "Configura GOOGLE_SHEETS_REFERIDORES_WEBHOOK_URL para guardarlo automáticamente en tu Google Sheet."
          });
        }
      } else {
        toast.error("Error al registrar referidor");
      }
    } catch (err: any) {
      toast.error("Error al procesar", { description: err.message });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleEditReferidor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRef) return;

    setIsSubmittingEdit(true);
    try {
      const res = await updateReferrer(editingRef.id, {
        name: editingRef.nombre.trim(),
        nickname: editingRef.apodo?.trim() || undefined,
        whatsapp: editingRef.telefono?.trim() || undefined,
        email: editingRef.email?.trim() || undefined,
      });

      if (res.success && res.referrer) {
        setReferidores(sortReferrers(referidores.map((r) => r.id === editingRef.id ? { ...r, ...res.referrer } : r)));
        setIsEditModalOpen(false);
        setEditingRef(null);
        toast.success("Referidor actualizado exitosamente");
      } else {
        toast.error("Error al actualizar referidor", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Error al actualizar", { description: err.message });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteReferidor = async () => {
    if (!deletingRef) return;

    setIsDeleting(true);
    try {
      const res = await deleteReferrer(deletingRef.id);
      if (res.success) {
        setReferidores(referidores.filter((r) => r.id !== deletingRef.id));
        setIsDeleteModalOpen(false);
        setDeletingRef(null);
        toast.success("Referidor eliminado del directorio");
      } else {
        toast.error("Error al eliminar referidor", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Error al eliminar", { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col bg-background min-h-screen">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* TOP BAR LOCAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Directorio de Referidores
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Buscar por Nombre, ID o Contacto..." 
                className="pl-9 bg-card w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger render={<Button className="w-full sm:w-auto gap-2 font-semibold shadow-sm" />}>
                <UserRoundPlus className="w-4 h-4" />
                Nuevo Referidor
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px]">
                <form onSubmit={handleCreateReferidor}>
                  <DialogHeader>
                    <DialogTitle>Nuevo Referidor</DialogTitle>
                    <DialogDescription>
                      Añade los datos del nuevo contacto comercial al directorio.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 w-full">
                    <div className="space-y-2 w-full">
                      <Label htmlFor="nombre">
                        Nombre Completo *
                      </Label>
                      <Input
                        id="nombre"
                        required
                        value={newRef.nombre}
                        onChange={(e) => setNewRef({...newRef, nombre: e.target.value})}
                        placeholder="Ej. Carlos Mendoza"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2 w-full">
                      <Label htmlFor="apodo">
                        Apodo / Alias (Opcional)
                      </Label>
                      <Input
                        id="apodo"
                        value={newRef.apodo}
                        onChange={(e) => setNewRef({...newRef, apodo: e.target.value})}
                        placeholder="Ej. Charlie"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2 w-full">
                      <Label htmlFor="telefono">
                        WhatsApp
                      </Label>
                      <Input
                        id="telefono"
                        type="tel"
                        value={newRef.telefono}
                        onChange={(e) => setNewRef({...newRef, telefono: e.target.value})}
                        placeholder="+591 7XXXXXXX"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2 w-full">
                      <Label htmlFor="email">
                        Correo Electrónico
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={newRef.email}
                        onChange={(e) => setNewRef({...newRef, email: e.target.value})}
                        placeholder="correo@ejemplo.com"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmittingNew}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmittingNew} className="gap-2 bg-primary text-primary-foreground">
                      {isSubmittingNew && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSubmittingNew ? "Guardando..." : "Guardar Referidor"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

          </div>
        </div>

        {/* CONTENT AREA: LISTA HORIZONTAL APILADA */}
        <div className="flex flex-col gap-4 w-full">
          {referidores.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No hay referidores registrados en el directorio"
              description="Los referidores son socios comerciales o contactos que refieren oportunidades a Stratux y perciben comisiones por proyectos cerrados."
              actionLabel="Nuevo Referidor"
              onAction={() => setIsModalOpen(true)}
              size="lg"
            />
          ) : filteredReferidores.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin resultados de búsqueda"
              description={`No encontramos referidores que coincidan con "${searchTerm}".`}
              actionLabel="Limpiar Búsqueda"
              onAction={() => setSearchTerm("")}
              size="default"
            />
          ) : (
            filteredReferidores.map((ref) => (
              <Card key={ref.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-6">
                  
                  {/* BLOQUE 1: IDENTIDAD */}
                  <div className="flex flex-col gap-1 w-full md:w-[260px] shrink-0">
                    <Badge variant="outline" className="w-fit font-mono text-xs text-muted-foreground bg-muted/20">
                      {ref.id}
                    </Badge>
                    <h2 className="text-lg font-semibold text-foreground leading-tight line-clamp-1 mt-0.5">
                      {ref.name || ref.nombre || (ref.nickname ? `Alias: ${ref.nickname}` : "Referidor")}
                    </h2>
                    {ref.nickname && (
                      <span className="text-xs text-muted-foreground">Apodo: {ref.nickname}</span>
                    )}
                  </div>

                  {/* BLOQUE 2: CONTACTO */}
                  <div className="flex flex-col gap-1 w-full md:w-[220px] shrink-0 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{ref.whatsapp || ref.telefono || "No registrado"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{ref.email || "No registrado"}</span>
                    </div>
                  </div>

                  {/* BLOQUE 3: MÉTRICAS DE CONVERSIÓN Y FINANCIERAS */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto md:ml-auto">
                    
                    {/* Proyectos Referidos */}
                    <div className="flex flex-col items-center justify-center p-3 bg-muted/30 border border-border rounded-lg min-w-[90px] shrink-0">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Proyectos
                      </span>
                      <span className="text-lg font-bold text-foreground mt-0.5">
                        {ref.projectsCount ?? ref.proyectosCerrados ?? 0}
                      </span>
                    </div>

                    {/* Finanzas */}
                    <div className="flex flex-col w-full sm:w-[180px] bg-muted/40 border border-border rounded-lg p-3 shrink-0 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium">Total Ganado</span>
                        <span className="font-bold text-emerald-600">
                          {(ref.totalEarned ?? ref.comisionesPagadas ?? 0).toLocaleString()} Bs
                        </span>
                      </div>
                    </div>

                    {/* BLOQUE 4: ACCIONES */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingRef({
                            id: ref.id,
                            nombre: ref.name || ref.nombre || "",
                            apodo: ref.nickname || "",
                            telefono: ref.whatsapp || ref.telefono || "",
                            email: ref.email || "",
                          });
                          setIsEditModalOpen(true);
                        }}
                        title="Editar referidor"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setDeletingRef({
                            id: ref.id,
                            nombre: ref.name || ref.nombre || ref.id,
                          });
                          setIsDeleteModalOpen(true);
                        }}
                        title="Eliminar referidor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                  </div>

                </CardContent>
              </Card>
            ))
          )}
        </div>
        
      </main>

      {/* MODAL DE EDICIÓN */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          {editingRef && (
            <form onSubmit={handleEditReferidor}>
              <DialogHeader>
                <DialogTitle>Editar Referidor</DialogTitle>
                <DialogDescription>
                  Modifica los datos del referidor <strong>{editingRef.id}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 w-full">
                <div className="space-y-2 w-full">
                  <Label htmlFor="edit-nombre">Nombre Completo *</Label>
                  <Input
                    id="edit-nombre"
                    required
                    value={editingRef.nombre}
                    onChange={(e) => setEditingRef({ ...editingRef, nombre: e.target.value })}
                    placeholder="Ej. Carlos Mendoza"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="edit-apodo">Apodo / Alias (Opcional)</Label>
                  <Input
                    id="edit-apodo"
                    value={editingRef.apodo}
                    onChange={(e) => setEditingRef({ ...editingRef, apodo: e.target.value })}
                    placeholder="Ej. Charlie"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="edit-telefono">WhatsApp</Label>
                  <Input
                    id="edit-telefono"
                    type="tel"
                    value={editingRef.telefono}
                    onChange={(e) => setEditingRef({ ...editingRef, telefono: e.target.value })}
                    placeholder="+591 7XXXXXXX"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="edit-email">Correo Electrónico</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingRef.email}
                    onChange={(e) => setEditingRef({ ...editingRef, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="w-full"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmittingEdit}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmittingEdit} className="gap-2 bg-primary text-primary-foreground">
                  {isSubmittingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmittingEdit ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE ELIMINACIÓN */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          {deletingRef && (
            <div>
              <DialogHeader>
                <DialogTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  ¿Eliminar Referidor?
                </DialogTitle>
                <DialogDescription className="pt-2">
                  ¿Estás seguro de que deseas eliminar a <strong>{deletingRef.nombre}</strong> ({deletingRef.id}) del directorio? Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0 pt-6">
                <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" onClick={handleDeleteReferidor} disabled={isDeleting} className="gap-2">
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isDeleting ? "Eliminando..." : "Eliminar Referidor"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Users, Search, Phone, Mail, FolderKanban, RefreshCw, UserRoundPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getLeads, syncLeads, addLead } from "@/actions/leads";
import { getProjects } from "@/actions/proyectos";
import { useLayoutStore } from "@/store/use-layout-store";
import { EmptyState } from "@/components/ui/empty-state";

type StatusFilter = "todos" | "activos" | "historicos";

interface Client {
  id: string;
  empresa: string;
  rubro: string;
  contactoNombre: string;
  telefono: string;
  email: string;
  proyectosTotales: number;
  proyectosActivos: number;
  status: "activo" | "inactivo";
}

export default function DirectorioClientesPage() {
  const { lastSyncTime, triggerSync } = useLayoutStore();
  const [clientes, setClientes] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("todos");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState({
    empresa: "",
    nombre: "",
    apellido: "",
    rubro: "",
    whatsapp: "",
    email: "",
    presupuesto: "",
    calificacion: "3",
    problemas: "",
  });

  const loadData = async () => {
    const [leads, projects] = await Promise.all([getLeads(), getProjects()]);
    
    // Ordenar de más nuevo a más antiguo (LIFO por fecha y fallback por ID)
    const sortedLeads = [...leads].sort((a, b) => {
      const dateA = a.leadDate || a.createdAt ? new Date(a.leadDate || a.createdAt!).getTime() : 0;
      const dateB = b.leadDate || b.createdAt ? new Date(b.leadDate || b.createdAt!).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return (b.id || "").localeCompare(a.id || "", undefined, { numeric: true });
    });

    const mappedClients: Client[] = sortedLeads.map(lead => {
      const leadProjects = projects.filter(p => p.leadId === lead.id || p.companyName === lead.companyName);
      const activos = leadProjects.filter(p => p.status === 'Activo').length;
      
      let status: "activo" | "inactivo" = "inactivo";
      if (activos > 0) {
        status = "activo";
      }

      return {
        id: lead.id,
        empresa: lead.companyName || "Empresa Sin Nombre",
        rubro: lead.rubro || "General",
        status,
        contactoNombre: [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Sin Contacto",
        telefono: lead.whatsapp || "No registrado",
        email: lead.email || "No registrado",
        proyectosTotales: leadProjects.length,
        proyectosActivos: activos
      };
    });
    setClientes(mappedClients);
  };

  useEffect(() => {
    loadData();
  }, [lastSyncTime]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await syncLeads();
      if (res.success) {
        toast.success("Sincronización completada", { description: `${res.count} leads cargados.` });
        await loadData();
        triggerSync();
      } else {
        toast.info("Sin registros en Sheets", { description: "No se encontraron nuevos clientes." });
      }
    } catch (e) {
      toast.error("Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.empresa.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addLead({
        companyName: newLeadForm.empresa.trim(),
        firstName: newLeadForm.nombre.trim() || undefined,
        lastName: newLeadForm.apellido.trim() || undefined,
        rubro: newLeadForm.rubro.trim() || undefined,
        whatsapp: newLeadForm.whatsapp.trim() || undefined,
        email: newLeadForm.email.trim() || undefined,
        budget: newLeadForm.presupuesto ? Number(newLeadForm.presupuesto) : undefined,
        leadRating: newLeadForm.calificacion ? Number(newLeadForm.calificacion) : 3,
        businessProblems: newLeadForm.problemas.trim() || undefined,
        leadDate: new Date().toISOString(),
      });

      if (res.success && res.lead) {
        toast.success(`Lead ${res.lead.id} registrado con éxito`, {
          description: res.warning || "Sincronizado con Google Sheets.",
        });
        setIsModalOpen(false);
        setNewLeadForm({
          empresa: "",
          nombre: "",
          apellido: "",
          rubro: "",
          whatsapp: "",
          email: "",
          presupuesto: "",
          calificacion: "3",
          problemas: "",
        });
        await loadData();
        triggerSync();
      } else {
        toast.error("Error al registrar lead", { description: res.error });
      }
    } catch (err: any) {
      toast.error("Error inesperado", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado compuesto
  const filteredClients = clientes.filter((client) => {
    // Filtro por Búsqueda (Empresa o Contacto)
    const matchesSearch = 
      client.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por Estado de Proyectos
    let matchesStatus = true;
    if (filterStatus === "activos") {
      matchesStatus = client.proyectosActivos > 0;
    } else if (filterStatus === "historicos") {
      matchesStatus = client.proyectosActivos === 0;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col bg-background min-h-screen">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        
        {/* CABECERA Y NAVEGACIÓN LOCAL */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Directorio de Clientes
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Buscar cliente, empresa o ID..." 
                className="pl-9 bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as StatusFilter || "todos")}>
              <SelectTrigger className="w-full sm:w-[200px] bg-card">
                <SelectValue placeholder="Estado de Proyectos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Con proyectos activos</SelectItem>
                <SelectItem value="historicos">Históricos (Sin activos)</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-primary text-primary-foreground shadow-sm">
              <UserRoundPlus className="w-4 h-4" />
              Registrar Lead
            </Button>
          </div>
        </div>

        {/* MODAL REGISTRAR LEAD */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <UserRoundPlus className="w-5 h-5 text-primary" />
                Registrar Nuevo Lead
              </DialogTitle>
              <DialogDescription>
                Ingresa los datos del contacto comercial. Se sincronizará automáticamente con la hoja de Google Sheets.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateLead} className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="lead-empresa" className="text-xs font-semibold">
                    Empresa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lead-empresa"
                    placeholder="Ej. TechCorp Bolivia"
                    required
                    value={newLeadForm.empresa}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, empresa: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="lead-nombre" className="text-xs font-semibold">Nombre</Label>
                    <Input
                      id="lead-nombre"
                      placeholder="Ej. Carlos"
                      value={newLeadForm.nombre}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead-apellido" className="text-xs font-semibold">Apellido</Label>
                    <Input
                      id="lead-apellido"
                      placeholder="Ej. Mendez"
                      value={newLeadForm.apellido}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, apellido: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="lead-rubro" className="text-xs font-semibold">Rubro</Label>
                    <Input
                      id="lead-rubro"
                      placeholder="Ej. Tecnología, Retail..."
                      value={newLeadForm.rubro}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, rubro: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead-rating" className="text-xs font-semibold">Calificación (1-5)</Label>
                    <Select
                      value={newLeadForm.calificacion}
                      onValueChange={(val) => setNewLeadForm({ ...newLeadForm, calificacion: val || "3" })}
                    >
                      <SelectTrigger id="lead-rating">
                        <SelectValue placeholder="Calificación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">⭐⭐⭐⭐⭐ (5 - Excelente)</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ (4 - Bueno)</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ (3 - Regular)</SelectItem>
                        <SelectItem value="2">⭐⭐ (2 - Bajo)</SelectItem>
                        <SelectItem value="1">⭐ (1 - Muy bajo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="lead-whatsapp" className="text-xs font-semibold">WhatsApp / Teléfono</Label>
                    <Input
                      id="lead-whatsapp"
                      placeholder="Ej. 59177712345"
                      value={newLeadForm.whatsapp}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, whatsapp: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead-email" className="text-xs font-semibold">Correo Electrónico</Label>
                    <Input
                      id="lead-email"
                      type="email"
                      placeholder="contacto@empresa.com"
                      value={newLeadForm.email}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="lead-presupuesto" className="text-xs font-semibold">Presupuesto Estimado ($ USD)</Label>
                  <Input
                    id="lead-presupuesto"
                    type="number"
                    placeholder="Ej. 5000"
                    value={newLeadForm.presupuesto}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, presupuesto: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="lead-problemas" className="text-xs font-semibold">Problemas Empresariales / Necesidades</Label>
                  <Textarea
                    id="lead-problemas"
                    rows={3}
                    placeholder="Describe los problemas o requerimientos comerciales del cliente..."
                    value={newLeadForm.problemas}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, problemas: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-primary text-primary-foreground">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Guardando..." : "Registrar Lead"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CONTENT AREA: LISTA APILADA HORIZONTAL */}
        <div className="flex flex-col gap-4 w-full">
          {clientes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No hay clientes registrados en el CRM"
              description="Los clientes corresponden a los contactos comerciales y empresas interesadas. Puedes sincronizar los datos de captación desde Google Sheets."
              actionLabel={isSyncing ? "Sincronizando..." : "Sincronizar con Google Sheets"}
              onAction={handleSync}
              size="lg"
            />
          ) : filteredClients.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Sin coincidencias de búsqueda"
              description={`No encontramos ningún cliente que coincida con "${searchTerm}".`}
              actionLabel="Limpiar Filtros"
              onAction={() => {
                setSearchTerm("");
                setFilterStatus("todos");
              }}
              size="default"
            />
          ) : (
            filteredClients.map((client) => (
              <Card key={client.id} className="w-full hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row lg:items-center p-5 gap-6">
                    
                    {/* BLOQUE 1: IDENTIDAD Y EMPRESA */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-[280px] shrink-0 border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pb-0 lg:pr-6">
                      <Badge variant="outline" className="w-fit text-xs text-muted-foreground bg-muted/20">
                        {client.id}
                      </Badge>
                      <h2 className="text-lg font-semibold text-foreground leading-tight mt-1 line-clamp-1">
                        {client.empresa}
                      </h2>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {client.rubro}
                      </span>
                    </div>

                    {/* BLOQUE 2: CONTACTO PRINCIPAL */}
                    <div className="flex flex-col gap-1.5 w-full lg:w-[280px] shrink-0 text-sm border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pb-0 lg:pr-6">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Contacto Principal
                      </span>
                      <span className="font-medium text-foreground line-clamp-1">
                        {client.contactoNombre}
                      </span>
                      <div className="flex flex-col gap-1 text-muted-foreground text-xs">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{client.telefono}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* BLOQUE 3: HISTORIAL OPERATIVO */}
                    <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:ml-auto">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center p-2.5 bg-muted/40 rounded-lg border border-border min-w-[70px]">
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Totales
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {client.proyectosTotales}
                          </span>
                        </div>

                        <div className="flex flex-col items-center justify-center p-2.5 bg-muted/40 rounded-lg border border-border min-w-[70px]">
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Activos
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {client.proyectosActivos}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Badge 
                          variant={client.status === "activo" ? "default" : "secondary"}
                          className={client.status === "activo" ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/30" : ""}
                        >
                          {client.status === "activo" ? "Activo" : "Histórico"}
                        </Badge>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
      </main>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Project, Feedback } from "@/types/database";
import { createFeedback } from "@/actions/feedback";
import { toast } from "sonner";
import { MessageSquarePlus, Star, Loader2, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSuccess: (newFeedback: Feedback) => void;
}

export function CreateFeedbackModal({
  isOpen,
  onClose,
  projects,
  onSuccess,
}: CreateFeedbackModalProps) {
  const [projectId, setProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [csat, setCsat] = useState<number>(5);
  const [nps, setNps] = useState<number>(10);
  const [ces, setCes] = useState<number>(2);
  const [productQuality, setProductQuality] = useState<number>(5);
  const [customerService, setCustomerService] = useState<number>(5);
  const [responseTime, setResponseTime] = useState<number>(5);
  const [easeOfUse, setEaseOfUse] = useState<number>(5);
  const [valueForPrice, setValueForPrice] = useState<number>(5);
  const [openComment, setOpenComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProjects = projects.filter((p) => {
    if (!projectSearch.trim()) return true;
    const query = projectSearch.toLowerCase();
    const pName = (p.projectName || "").toLowerCase();
    const cName = (p.companyName || "").toLowerCase();
    const id = (p.id || "").toLowerCase();
    return pName.includes(query) || cName.includes(query) || id.includes(query);
  });

  const handleSelectProject = (p: Project) => {
    setProjectId(p.id);
    const cName = p.companyName || p.projectName || "";
    setCustomerName(cName);
    const autoClientId = p.leadId || ("CLI-" + p.id.replace(/\D/g, "").padStart(4, "0"));
    setCustomerId(autoClientId);
    setProjectSearch(`${p.projectName || p.companyName || 'Proyecto'} - ${p.companyName || 'Empresa'} (${p.id})`);
    setIsSearchOpen(false);
  };

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    const selected = projects.find((p) => p.id === id);
    if (selected) {
      setCustomerName(selected.companyName || selected.projectName || "");
      const autoClientId = selected.leadId || ("CLI-" + selected.id.replace(/\D/g, "").padStart(4, "0"));
      setCustomerId(autoClientId);
      setProjectSearch(`${selected.projectName || selected.companyName || 'Proyecto'} - ${selected.companyName || 'Empresa'} (${selected.id})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim()) {
      toast.error("El ID de Proyecto es obligatorio.");
      return;
    }
    if (!customerId.trim()) {
      toast.error("El ID de Cliente es obligatorio.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Por favor ingresa el nombre del cliente o empresa.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createFeedback({
        projectId: projectId.trim(),
        customerId: customerId.trim(),
        customerName: customerName.trim(),
        csat,
        nps,
        ces,
        productQuality,
        customerService,
        responseTime,
        easeOfUse,
        valueForPrice,
        openComment: openComment.trim(),
      });

      if (res.success && res.feedback) {
        toast.success("Evaluación de cliente registrada con éxito", {
          description: "Los datos se han guardado y sincronizado con Google Sheets.",
        });
        onSuccess(res.feedback);
        onClose();
        // Reset form
        setProjectId("");
        setCustomerId("");
        setCustomerName("");
        setCsat(5);
        setNps(10);
        setCes(2);
        setProductQuality(5);
        setCustomerService(5);
        setResponseTime(5);
        setEaseOfUse(5);
        setValueForPrice(5);
        setOpenComment("");
      } else {
        toast.error(res.error || "No se pudo registrar la evaluación.");
      }
    } catch (err: any) {
      console.error("Error al registrar feedback:", err);
      toast.error("Ocurrió un error al enviar el feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <MessageSquarePlus className="w-5 h-5" />
            <DialogTitle className="text-xl font-bold">Registrar Feedback de Cliente</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Ingresa la evaluación para registrarla en la hoja de Google Sheets de Feedback Clientes y actualizar los tableros en tiempo real.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* SELECCIÓN DE PROYECTO Y CLIENTE */}
          <div className="space-y-4">
            <div className="space-y-1.5 relative">
              <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                <span>Buscar Proyecto del CRM (Nombre - Empresa)</span>
                {projectId && (
                  <span className="text-emerald-500 font-normal normal-case text-xs">
                    ✓ Vinculado: {projectId}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={projectSearch}
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Escribe el nombre del proyecto o la empresa para buscar..."
                  className="pl-9 pr-8 bg-background"
                />
                {projectSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectSearch("");
                      setProjectId("");
                      setIsSearchOpen(false);
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Menú flotante de sugerencias */}
              {isSearchOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsSearchOpen(false)} 
                  />
                  <div className="absolute left-0 right-0 z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border border-border shadow-xl max-h-56 overflow-y-auto p-1">
                    {filteredProjects.length === 0 ? (
                      <div className="py-3 px-4 text-xs text-muted-foreground text-center">
                        No se encontraron proyectos con "{projectSearch}"
                      </div>
                    ) : (
                      filteredProjects.map((p) => {
                        const isSelected = p.id === projectId;
                        const pTitle = p.projectName || p.companyName || "Proyecto";
                        const cTitle = p.companyName || "Empresa";
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectProject(p)}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs rounded-sm flex items-center justify-between transition-colors",
                              isSelected
                                ? "bg-primary text-primary-foreground font-medium"
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            <div className="flex flex-col truncate pr-2">
                              <span className="truncate text-sm font-semibold">
                                {pTitle} <span className="font-normal text-muted-foreground">({cTitle})</span>
                              </span>
                              <span className={cn("text-[11px] font-mono", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                {p.id} • {cTitle} • {p.status || "Activo"}
                              </span>
                            </div>
                            {isSelected && <Check className="h-4 w-4 shrink-0 text-primary-foreground" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="projectIdInput" className="text-xs font-semibold text-muted-foreground uppercase">
                  ID Proyecto *
                </Label>
                <Input
                  id="projectIdInput"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="PR-1001"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customerIdInput" className="text-xs font-semibold text-muted-foreground uppercase">
                  ID Cliente *
                </Label>
                <Input
                  id="customerIdInput"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="CLI-0001 o L-001"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customerName" className="text-xs font-semibold text-muted-foreground uppercase">
                  Cliente / Empresa *
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre empresa"
                  required
                />
              </div>
            </div>
          </div>

          {/* MÉTRICAS PRINCIPALES: CSAT & NPS & CES */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Métricas Clave de Satisfacción
              </span>
            </div>

            {/* CSAT (1-5) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <Label className="font-medium">CSAT - Satisfacción General (1 a 5)</Label>
                <span className="font-bold text-primary">{csat} / 5</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCsat(val)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-1",
                      csat === val
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background hover:bg-muted text-muted-foreground border-input"
                    )}
                  >
                    <Star className={cn("w-3.5 h-3.5", csat >= val ? "fill-current" : "")} />
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* NPS (0-10) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <Label className="font-medium">NPS - Probabilidad de Recomendación (0 a 10)</Label>
                <span
                  className={cn(
                    "font-bold text-xs px-2 py-0.5 rounded",
                    nps >= 9 ? "bg-emerald-500/20 text-emerald-600" : nps >= 7 ? "bg-amber-500/20 text-amber-600" : "bg-red-500/20 text-red-600"
                  )}
                >
                  {nps} ({nps >= 9 ? "Promotor" : nps >= 7 ? "Pasivo" : "Detractor"})
                </span>
              </div>
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, i) => i).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNps(val)}
                    className={cn(
                      "py-1.5 rounded text-xs font-bold border transition-all",
                      nps === val
                        ? val >= 9
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : val >= 7
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-red-500 text-white border-red-500 shadow-sm"
                        : "bg-background hover:bg-muted text-muted-foreground border-input"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* CES (1-5) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <Label className="font-medium">CES - Índice de Esfuerzo (1 = Muy fácil, 5 = Muy difícil)</Label>
                <span className="font-bold text-foreground">{ces} / 5</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCes(val)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      ces === val
                        ? "bg-secondary text-secondary-foreground border-foreground/30 shadow-sm"
                        : "bg-background hover:bg-muted text-muted-foreground border-input"
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PILARES CUALITATIVOS (RADAR) */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground block border-b border-border/60 pb-2">
              Pilares de Servicio y Calidad (1 al 5)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Calidad del Producto", value: productQuality, set: setProductQuality },
                { label: "Servicio al Cliente", value: customerService, set: setCustomerService },
                { label: "Tiempo de Respuesta", value: responseTime, set: setResponseTime },
                { label: "Facilidad de Uso", value: easeOfUse, set: setEaseOfUse },
                { label: "Relación Valor / Precio", value: valueForPrice, set: setValueForPrice },
              ].map((pilar) => (
                <div key={pilar.label} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30">
                  <span className="text-xs font-medium text-foreground">{pilar.label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => pilar.set(val)}
                        className={cn(
                          "w-6 h-6 rounded text-xs font-bold flex items-center justify-center transition-all",
                          pilar.value === val
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-background text-muted-foreground hover:bg-muted border border-border"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMENTARIO ABIERTO */}
          <div className="space-y-1.5">
            <Label htmlFor="openComment" className="text-xs font-semibold text-muted-foreground uppercase">
              Comentario Abierto o Auditoría
            </Label>
            <Textarea
              id="openComment"
              value={openComment}
              onChange={(e) => setOpenComment(e.target.value)}
              placeholder="Escribe las impresiones del cliente, feedback directo o detalles cualitativos..."
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="pt-2 flex sm:justify-between items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 bg-primary text-primary-foreground font-semibold">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando en Google Sheets...
                </>
              ) : (
                <>
                  <MessageSquarePlus className="w-4 h-4" />
                  Registrar Evaluación
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

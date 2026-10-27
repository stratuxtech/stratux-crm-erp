"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Banknote, 
  CalendarIcon, 
  ChevronLeft, 
  ReceiptText, 
  ArrowRight, 
  Percent, 
  Users, 
  Coins,
  Loader2 
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";

import { getProjects } from "@/actions/proyectos";
import { addCollection } from "@/actions/finanzas";
import { Project } from "@/types/database";
import { getTaxBreakdownDescription, SCALE_RULES, ScaleType } from "@/lib/pricing-calculator";
import { useLayoutStore } from "@/store/use-layout-store";

const METODOS_COBRO = [
  "Transferencia Bancaria (Local)",
  "USDT / Cripto",
  "Efectivo",
  "Stripe / Tarjeta",
  "PayPal"
];

// --- ZOD SCHEMA ---
const formSchema = z.object({
  proyectoId: z.string().min(1, "Selecciona un proyecto."),
  concepto: z.string().min(2, "El concepto es obligatorio."),
  fecha: z.date(),
  metodoCobro: z.string().min(1, "Selecciona un método de cobro."),
  montoBruto: z.coerce.number().min(1, "El monto debe ser mayor a 0."),
  aplicarImpuestos: z.boolean().default(false),
  porcentajeImpuestos: z.coerce.number().min(0).max(100).optional(),
  sobrescribirReferidor: z.boolean().default(false),
  nuevoReferidorId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CrearCobroPage() {
  const router = useRouter();
  const { isSidebarCollapsed } = useLayoutStore();
  const [proyectosList, setProyectosList] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getProjects().then(data => {
      setProyectosList(data);
      setLoadingProjects(false);
    });
  }, []);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      concepto: "",
      montoBruto: 0,
      fecha: new Date(),
      metodoCobro: "Transferencia Bancaria (Local)",
      aplicarImpuestos: true,
      porcentajeImpuestos: 27,
      sobrescribirReferidor: false,
    }
  });

  const watchedValues = useWatch({ control });
  const montoBruto = Number(watchedValues.montoBruto) || 0;
  const aplicarImpuestos = watchedValues.aplicarImpuestos;
  const porcentajeImpuestos = Number(watchedValues.porcentajeImpuestos) || 0;
  const proyectoId = watchedValues.proyectoId;
  const sobrescribirReferidor = watchedValues.sobrescribirReferidor;
  const nuevoReferidorId = watchedValues.nuevoReferidorId;

  // Lógica Derivada del Proyecto
  const proyectoInfo = proyectosList.find(p => p.id === proyectoId);
  const costoManoObra = proyectoInfo?.laborCost || 0;
  const projectScale: ScaleType = (proyectoInfo?.scale as ScaleType) || "XP";

  // Al seleccionar un proyecto, autollenar datos sugeridos
  useEffect(() => {
    if (proyectoInfo) {
      const defaultTax = proyectoInfo.taxPercentage && proyectoInfo.taxPercentage > 0 
        ? proyectoInfo.taxPercentage 
        : (SCALE_RULES[projectScale]?.defaultTax || 27);

      setValue("concepto", `Cobro - ${proyectoInfo.companyName || proyectoInfo.projectName || 'Proyecto'}`);
      if (proyectoInfo.totalAmount && proyectoInfo.totalAmount > 0) {
        setValue("montoBruto", proyectoInfo.totalAmount);
      }
      setValue("aplicarImpuestos", proyectoInfo.taxesIncluded || (proyectoInfo.taxPercentage || 0) > 0);
      setValue("porcentajeImpuestos", defaultTax);
    }
  }, [proyectoId, proyectoInfo, setValue, projectScale]);

  // Referidor Final
  const referidorActivo = sobrescribirReferidor ? nuevoReferidorId : proyectoInfo?.referrerId;
  const comisionReferidor = referidorActivo
    ? (proyectoInfo?.referrerCommission || 0)
    : 0;

  // Cálculos del Ticket Matemático
  const impuestosCalculados = aplicarImpuestos ? (montoBruto * (porcentajeImpuestos / 100)) : 0;
  const montoPostImpuestos = montoBruto - impuestosCalculados;
  const stratuxMarginCalculated = Math.max(0, montoPostImpuestos - comisionReferidor - costoManoObra);
  const ingresoFinalStratux = stratuxMarginCalculated;

  const taxExplanation = getTaxBreakdownDescription(projectScale);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await addCollection({
        projectId: data.proyectoId,
        concept: data.concepto,
        date: data.fecha.toISOString(),
        method: data.metodoCobro,
        grossAmount: montoBruto,
        taxPercentage: aplicarImpuestos ? porcentajeImpuestos : 0,
        referrerId: referidorActivo || undefined,
        referrerCommission: comisionReferidor,
        laborCost: costoManoObra,
        stratuxCommission: ingresoFinalStratux,
        netAmount: ingresoFinalStratux,
        scale: projectScale,
      });

      if (res.success) {
        toast.success("¡Cobro y Pasivos Registrados!", {
          description: `Ingreso por Bs. ${montoBruto.toLocaleString()} asentado con éxito. Se generaron los egresos automáticos de impuestos y comisiones.`,
          duration: 5000,
        });
        router.push("/operaciones/cobros");
      } else {
        toast.error("Error al registrar cobro", { description: res.error });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado al procesar la transacción dual.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-background min-h-screen pb-28">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">

        {/* TOP BAR */}
        <div className="pb-6 border-b border-border">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Banknote className="w-8 h-8 text-emerald-600" />
            Registrar Cobro (Transaccionalidad Dual)
          </h1>
        </div>

        {!loadingProjects && proyectosList.length === 0 ? (
          <div className="max-w-2xl mx-auto py-8">
            <EmptyState
              icon={Banknote}
              title="No hay proyectos disponibles para registrar cobros"
              description="Todo cobro debe estar asociado a un proyecto dado de alta. Para comenzar, cotiza y aprueba una propuesta desde el módulo de operaciones."
              actionLabel="Ver Propuestas para dar de alta"
              actionHref="/operaciones/propuestas"
              secondaryLabel="Crear Nueva Propuesta"
              onSecondaryAction={() => router.push("/operaciones/propuestas/crear")}
              size="lg"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* COLUMNA IZQUIERDA: FORMULARIO */}
          <div className="lg:col-span-2 space-y-6">
            <form id="cobro-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* SECCIÓN 1: VINCULACIÓN A PROYECTO */}
              <Card className="p-6 space-y-4 border-border bg-card">
                <h3 className="font-heading font-bold text-lg text-foreground border-b border-border pb-2">
                  1. Selección del Proyecto
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="proyectoId">Proyecto Destino</Label>
                  <Controller
                    control={control}
                    name="proyectoId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccione un proyecto registrado" />
                        </SelectTrigger>
                        <SelectContent>
                          {proyectosList.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.id} - {p.companyName || p.projectName} (Escala {p.scale || 'XP'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.proyectoId && <p className="text-xs text-destructive">{errors.proyectoId.message}</p>}
                </div>
              </Card>

              {/* SECCIÓN 2: DETALLES DE LA OPERACIÓN */}
              <Card className="p-6 space-y-4 border-border bg-card">
                <h3 className="font-heading font-bold text-lg text-foreground border-b border-border pb-2">
                  2. Datos del Cobro
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="concepto">Concepto del Cobro</Label>
                    <Input 
                      id="concepto" 
                      {...register("concepto")} 
                      placeholder="Ej. Cobro 50% Anticipo Inicial" 
                    />
                    {errors.concepto && <p className="text-xs text-destructive">{errors.concepto.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha del Cobro</Label>
                    <Controller
                      control={control}
                      name="fecha"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger
                            render={
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                              </Button>
                            }
                          />
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metodoCobro">Método de Pago</Label>
                    <Controller
                      control={control}
                      name="metodoCobro"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione método" />
                          </SelectTrigger>
                          <SelectContent>
                            {METODOS_COBRO.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="montoBruto">Monto Bruto Ingresado (Bs)</Label>
                    <Input 
                      id="montoBruto" 
                      type="number" 
                      step="any"
                      min="0"
                      {...register("montoBruto")} 
                      placeholder="0.00"
                      className="text-lg font-bold"
                    />
                    {errors.montoBruto && <p className="text-xs text-destructive">{errors.montoBruto.message}</p>}
                  </div>
                </div>
              </Card>

              {/* SECCIÓN 3: IMPUESTOS Y COMISIONES */}
              <Card className="p-6 space-y-4 border-border bg-card">
                <h3 className="font-heading font-bold text-lg text-foreground border-b border-border pb-2">
                  3. Tratamiento Fiscal y Tercerización
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="aplicarImpuestos" className="text-base font-semibold">
                      Aplicar Retención de Impuestos
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Calcula la retención fiscal y crea el egreso respectivo para el tercerizador.
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name="aplicarImpuestos"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                {aplicarImpuestos && (
                  <div className="pt-2 space-y-2 animate-in fade-in">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="porcentajeImpuestos">Porcentaje de Impuestos Consolidado (%)</Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        Escala {projectScale}
                      </span>
                    </div>
                    <Input 
                      id="porcentajeImpuestos"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register("porcentajeImpuestos")}
                    />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border/60">
                      <span>💡</span>
                      <span><strong>Desglose:</strong> {taxExplanation}</span>
                    </div>
                  </div>
                )}
              </Card>

            </form>
          </div>

          {/* COLUMNA DERECHA: TICKET DINÁMICO (STICKY) */}
          <div className="lg:col-span-1 sticky top-6">
            <Card className="shadow-lg border-emerald-500/30 overflow-hidden bg-card">
              <div className="bg-emerald-600/10 p-4 border-b border-emerald-500/20 flex items-center gap-3">
                <ReceiptText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-600 tracking-wide uppercase text-sm">Desglose del Ticket Dual</h3>
              </div>

              <div className="p-5 space-y-5">
                {/* 1. Bruto */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Banknote className="w-4 h-4" /> Monto Bruto</span>
                  <span className="font-bold text-foreground">Bs. {montoBruto.toLocaleString()}</span>
                </div>

                <Separator />

                {/* 2. Impuestos */}
                <div className="flex justify-between items-center opacity-90">
                  <span className="text-sm font-medium text-amber-600 flex items-center gap-1.5"><Percent className="w-4 h-4" /> Impuestos ({aplicarImpuestos ? `${porcentajeImpuestos}%` : '0%'})</span>
                  <span className="font-medium text-amber-600">- Bs. {impuestosCalculados.toLocaleString()}</span>
                </div>

                {/* 3. Subtotal */}
                <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><ArrowRight className="w-3 h-3" /> Post Impuestos</span>
                  <span className="font-bold text-foreground text-sm">Bs. {montoPostImpuestos.toLocaleString()}</span>
                </div>

                {/* 4. Referidor */}
                {comisionReferidor > 0 && (
                  <div className="flex justify-between items-center opacity-90">
                    <span className="text-sm font-medium text-destructive flex items-center gap-1.5"><Users className="w-4 h-4" /> Com. Referidor ({referidorActivo})</span>
                    <span className="font-medium text-destructive">- Bs. {comisionReferidor.toLocaleString()}</span>
                  </div>
                )}

                {/* 5. Mano Obra */}
                {costoManoObra > 0 && (
                  <div className="flex justify-between items-center opacity-90">
                    <span className="text-sm font-medium text-destructive flex items-center gap-1.5"><Coins className="w-4 h-4" /> Mano de Obra</span>
                    <span className="font-medium text-destructive">- Bs. {costoManoObra.toLocaleString()}</span>
                  </div>
                )}

              </div>

              {/* 6. INGRESO FINAL */}
              <div className="bg-emerald-600 p-5 text-white flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-100/80">Ingreso Neto Stratux</span>
                <span className="text-3xl font-bold font-heading">
                  Bs. {ingresoFinalStratux.toLocaleString()}
                </span>
              </div>
            </Card>
          </div>

        </div>
        )}
      </main>

      {/* FOOTER ACCIONES */}
      {!loadingProjects && proyectosList.length > 0 && (
        <div className={`fixed bottom-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border shadow-sm p-4 transition-all duration-300 left-0 ${
          isSidebarCollapsed ? 'md:left-20' : 'md:left-64'
        }`}>
          <div className="w-full max-w-7xl mx-auto flex justify-between items-center px-4">
            <Button variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form="cobro-form" 
              disabled={isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-md"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Registrando Cobro..." : "Registrar Cobro Split"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

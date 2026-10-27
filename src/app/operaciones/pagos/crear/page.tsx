"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Banknote, CalendarIcon, ChevronLeft, Loader2 } from "lucide-react";
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
import { DownBar } from "@/components/layout/DownBar";

import { addPayment } from "@/actions/finanzas";

const CATEGORIAS = [
  "licencia",
  "administrativo",
  "equipo",
  "marketing",
  "pago impuestos",
  "pago referidor",
  "pago mano obra"
];

const METODOS_PAGO = [
  "Transferencia Bancaria",
  "USDT",
  "Efectivo",
  "Tarjeta de Crédito"
];

const formSchema = z.object({
  proveedor: z.string().min(2, "El proveedor es obligatorio."),
  categoria: z.string().min(1, "Selecciona una categoría."),
  concepto: z.string().min(2, "El concepto es obligatorio."),
  fecha: z.date(),
  metodoPago: z.string().min(1, "Selecciona un método de pago."),
  monto: z.coerce.number().min(1, "El monto debe ser mayor a 0.")
});

type FormValues = z.infer<typeof formSchema>;

export default function CrearPagoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: { proveedor: "", categoria: "", concepto: "", fecha: new Date(), metodoPago: "", monto: 0 }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitting(true);
      const res = await addPayment({
        receiverName: data.proveedor,
        category: data.categoria as any,
        concept: data.concepto,
        date: data.fecha.toISOString(),
        method: data.metodoPago,
        amount: data.monto
      });

      if (res.success) {
        toast.success("Pago registrado exitosamente", {
          description: `Se registró un pago por ${data.monto} Bs a ${data.proveedor}.`
        });
        router.push("/operaciones/pagos");
      } else {
        toast.error("Error al registrar el pago");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Error al procesar el pago");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-background min-h-screen pb-12">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* TOP BAR */}
        <div className="pb-6 border-b border-border">
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Banknote className="w-8 h-8 text-destructive" />
            Registrar Pago
          </h1>
        </div>

        <form id="pago-form" onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
          
          {/* SECCIÓN 1: OPERATIVA */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold border-b border-border pb-2">1. Detalles Operativos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-2">
                <Label htmlFor="proveedor">Proveedor / Beneficiario</Label>
                <Input id="proveedor" placeholder="Ej. Carlos Dev (Freelance)" {...register("proveedor")} />
                {errors.proveedor && <p className="text-xs text-destructive">{errors.proveedor.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Controller
                  control={control}
                  name="categoria"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map(cat => (
                          <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.categoria && <p className="text-xs text-destructive">{errors.categoria.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="concepto">Concepto</Label>
                <Input id="concepto" placeholder="Ej. Desarrollo Frontend Fase 2" {...register("concepto")} />
                {errors.concepto && <p className="text-xs text-destructive">{errors.concepto.message}</p>}
              </div>
            </div>
          </Card>

          {/* SECCIÓN 2: TRANSACCIÓN */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold border-b border-border pb-2">2. Transacción</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-2">
                <Label>Fecha de Pago</Label>
                <Controller
                  control={control}
                  name="fecha"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger render={<Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                         />}>
  
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                        
</PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Controller
                  control={control}
                  name="metodoPago"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        {METODOS_PAGO.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.metodoPago && <p className="text-xs text-destructive">{errors.metodoPago.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="monto">Monto (Bs)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">Bs</span>
                  <Input id="monto" type="number" step="0.01" className="pl-9 text-lg font-bold text-destructive" {...register("monto")} />
                </div>
                {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
              </div>
            </div>
          </Card>

          {/* ACCIONES DEL FORMULARIO */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()} 
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-white font-bold px-8 shadow-md gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Registrando Pago..." : "Registrar Pago"}
            </Button>
          </div>

        </form>
      </main>
    </div>
  );
}

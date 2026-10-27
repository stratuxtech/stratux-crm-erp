"use client";

import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Info, AlertTriangle, MessageSquarePlus } from 'lucide-react'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, subQuarters, subYears, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DateRange } from "react-day-picker"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ComposedChart, Line, RadialBarChart, RadialBar, PolarAngleAxis, RadarChart, PolarGrid, PolarRadiusAxis, Radar, LabelList, Cell
} from 'recharts'
import { cn } from "@/lib/utils"
import { getFeedback } from "@/actions/feedback"
import { getProjects } from "@/actions/proyectos"
import { useLayoutStore } from "@/store/use-layout-store"
import { Feedback, Project } from "@/types/database"
import { CreateFeedbackModal } from "@/components/dashboard/create-feedback-modal"

// --- CONSTANTS & COLORS ---
const COLORS = {
  promoters: '#10b981', // emerald-500
  passives: '#f59e0b',  // amber-500
  detractors: '#ef4444', // red-500
  neutral: '#64748b',
  quality: '#3b82f6',
  price: '#8b5cf6',
  ease: '#ec4899',
}

import { MetricInfo } from "@/components/ui/metric-info";

// --- REUSABLE COMPONENTS ---
const InfoTooltip = ({ text, title }: { text: string; title?: string }) => (
  <MetricInfo description={text} title={title} />
);


export default function CXDashboard() {
  const { lastSyncTime, triggerSync } = useLayoutStore()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)


  // --- STATE ---
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date())
  })

  useEffect(() => {
    Promise.all([getFeedback(), getProjects()]).then(([fbList, prjList]) => {
      setFeedbacks(fbList)
      setProjects(prjList)
      setLoading(false)
    }).catch(err => {
      console.error("Error loading CX data:", err)
      setLoading(false)
    })
  }, [lastSyncTime])

  // --- REAL DATA METRICS ---
  const cxMetrics = useMemo(() => {
    const list = feedbacks.filter(f => {
      if (!f.date) return true
      const d = new Date(f.date)
      if (isNaN(d.getTime())) return true
      if (date?.from && d < startOfDay(date.from)) return false
      if (date?.to && d > endOfDay(date.to)) return false
      return true
    })

    const totalReviews = list.length
    if (totalReviews === 0) {
      return {
        npsScore: 0,
        csatScore: "0.0",
        cesScore: "0.0",
        cesValue: 0,
        totalReviews: 0,
        npsData: [{ name: 'NPS', detractors: 0, passives: 0, promoters: 0 }],
        cesGaugeData: [{ name: 'CES', value: 0, fill: COLORS.neutral }],
        radarData: [
          { subject: 'Calidad Producto', A: 0, fullMark: 5 },
          { subject: 'Valor / Precio', A: 0, fullMark: 5 },
          { subject: 'Facilidad Uso', A: 0, fullMark: 5 },
        ],
        gapData: [],
        auditData: []
      }
    }

    const npsList = list.filter(f => f.nps !== null && f.nps !== undefined);
    const promoters = npsList.filter(f => (f.nps ?? 0) >= 9).length;
    const passives = npsList.filter(f => (f.nps ?? 0) >= 7 && (f.nps ?? 0) <= 8).length;
    const detractors = npsList.filter(f => (f.nps ?? 0) < 7).length;
    const npsScore = npsList.length > 0 ? Math.round(((promoters - detractors) / npsList.length) * 100) : 0;

    const csatList = list.filter(f => f.csat !== null && f.csat !== undefined && (f.csat ?? 0) > 0);
    const avgCsat = csatList.length > 0 ? (csatList.reduce((acc, f) => acc + (f.csat ?? 0), 0) / csatList.length).toFixed(1) : "0.0";

    const cesList = list.filter(f => f.ces !== null && f.ces !== undefined && (f.ces ?? 0) > 0);
    const avgCes = cesList.length > 0 ? (cesList.reduce((acc, f) => acc + (f.ces ?? 0), 0) / cesList.length).toFixed(1) : "0.0";
    const cesValue = parseFloat(avgCes);

    const npsData = [{
      name: 'NPS',
      detractors,
      passives,
      promoters
    }];

    const cesGaugeData = [{
      name: 'CES',
      value: cesValue,
      fill: cesValue <= 2 ? COLORS.promoters : cesValue <= 3.5 ? COLORS.passives : COLORS.detractors
    }];

    const avg = (field: keyof Feedback) => {
      const valid = list.filter(f => f[field] !== null && f[field] !== undefined && (f[field] as number) > 0);
      if (valid.length === 0) return 0;
      const sum = valid.reduce((acc, f) => acc + ((f[field] as number) ?? 0), 0);
      return parseFloat((sum / valid.length).toFixed(1));
    };

    const radarData = [
      { subject: 'Calidad Producto', A: avg('productQuality') || 0, fullMark: 5 },
      { subject: 'Valor / Precio', A: avg('valueForPrice') || 0, fullMark: 5 },
      { subject: 'Facilidad Uso', A: avg('easeOfUse') || 0, fullMark: 5 },
      { subject: 'Soporte', A: avg('customerService') || 0, fullMark: 5 },
      { subject: 'Innovación', A: avg('responseTime') || 0, fullMark: 5 },
    ];

    const frictionData = [
      { area: 'Onboarding', 'Servicio al Cliente': avg('customerService') || 0, 'Tiempo Respuesta': avg('responseTime') || 0 },
      { area: 'Soporte Técnico', 'Servicio al Cliente': avg('customerService') || 0, 'Tiempo Respuesta': avg('responseTime') || 0 },
      { area: 'Facturación', 'Servicio al Cliente': avg('customerService') || 0, 'Tiempo Respuesta': avg('responseTime') || 0 },
      { area: 'Renovaciones', 'Servicio al Cliente': avg('customerService') || 0, 'Tiempo Respuesta': avg('responseTime') || 0 },
    ];

    const gapData = list.map(f => {
      const prj = projects.find(p => p.id === f.projectId);
      return {
        mes: f.date ? format(new Date(f.date), 'MMM', { locale: es }) : (f.customerName || 'N/A'),
        diasRetraso: prj?.daysOverdue ?? 0,
        nota: f.csat ?? 0
      };
    });

    const auditData = list.map(f => ({
      id: f.id,
      empresa: f.customerName || 'Cliente',
      nps: f.nps !== null && f.nps !== undefined ? f.nps : null,
      comentario: f.openComment || 'Sin comentarios registrados',
      fecha: f.date ? format(new Date(f.date), 'dd/MM/yyyy') : '-'
    }));

    return {
      npsScore,
      csatScore: avgCsat,
      cesScore: avgCes,
      cesValue,
      totalReviews,
      npsData,
      cesGaugeData,
      radarData,
      frictionData,
      gapData,
      auditData
    };
  }, [feedbacks, projects, date])


  // --- HANDLERS ---
  const handleShortcut = (type: string) => {
    const today = new Date()
    switch (type) {
      case 'mes':
        setDate({ from: startOfMonth(today), to: endOfMonth(today) })
        break
      case 'trimestre':
        setDate({ from: startOfMonth(subQuarters(today, 1)), to: endOfMonth(today) })
        break
      case 'ano':
        setDate({ from: startOfMonth(subYears(today, 1)), to: endOfMonth(today) })
        break
      case 'historico':
        setDate({ from: new Date(2020, 0, 1), to: endOfMonth(today) })
        break
    }
  }

  // --- HELPERS ---
  const getNpsBadgeProps = (score: number | null | undefined) => {
    if (score === null || score === undefined) return { variant: "outline" as const, className: "text-muted-foreground", label: "Sin Evaluar" }
    if (score >= 9) return { variant: "default" as const, className: "bg-emerald-500 hover:bg-emerald-600", label: "Promotor" }
    if (score >= 7) return { variant: "secondary" as const, className: "bg-amber-500 text-white hover:bg-amber-600", label: "Pasivo" }
    return { variant: "destructive" as const, className: "bg-red-500 hover:bg-red-600", label: "Detractor" }
  }

  return (
    <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8 bg-background min-h-screen space-y-8 overflow-x-hidden">
      
      {/* 1. CABECERA Y CONTROLES GLOBALES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CX Dashboard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-sm"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Registrar Feedback
          </Button>

          <Popover>
            <PopoverTrigger render={<Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")} />}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                      {format(date.to, "LLL dd, y", { locale: es })}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y", { locale: es })
                  )
                ) : (
                  <span>Selecciona un rango</span>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex flex-col sm:flex-row">
                <div className="border-b sm:border-b-0 sm:border-r border-border p-3 space-y-2 flex flex-row sm:flex-col justify-between sm:justify-start min-w-[120px] overflow-x-auto">
                  <span className="text-xs font-semibold text-muted-foreground mb-1 uppercase hidden sm:block">Atajos</span>
                  <Button variant="ghost" size="sm" className="justify-start shrink-0" onClick={() => handleShortcut('mes')}>Mes Act.</Button>
                  <Button variant="ghost" size="sm" className="justify-start shrink-0" onClick={() => handleShortcut('trimestre')}>Trim.</Button>
                  <Button variant="ghost" size="sm" className="justify-start shrink-0" onClick={() => handleShortcut('ano')}>Año</Button>
                  <Button variant="ghost" size="sm" className="justify-start shrink-0" onClick={() => handleShortcut('historico')}>Hist.</Button>
                </div>
                <Calendar
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={1}
                  className="sm:hidden"
                  locale={es}
                />
                <Calendar
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  className="hidden sm:block"
                  locale={es}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 2. SCORECARDS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">NPS Score Global</p>
              <InfoTooltip text="Net Promoter Score: % Promotores - % Detractores (Rango: -100 a +100)." />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", cxMetrics.npsScore > 30 ? "text-emerald-500" : cxMetrics.npsScore > 0 ? "text-amber-500" : "text-red-500")}>
                {cxMetrics.npsScore > 0 ? '+' : ''}{cxMetrics.npsScore}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">CSAT Promedio</p>
              <InfoTooltip text="Customer Satisfaction Score: Satisfacción general promedio (Escala 1 a 5)." />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", parseFloat(cxMetrics.csatScore) >= 4 ? "text-emerald-500" : parseFloat(cxMetrics.csatScore) >= 3 ? "text-amber-500" : "text-red-500")}>
                {cxMetrics.csatScore}
              </span>
              <span className="text-sm text-muted-foreground">/ 5.0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">CES Promedio</p>
              <InfoTooltip text="Customer Effort Score: Facilidad percibida de interacción (Escala 1 a 5)." />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", parseFloat(cxMetrics.cesScore) >= 4 ? "text-emerald-500" : parseFloat(cxMetrics.cesScore) >= 3 ? "text-amber-500" : "text-red-500")}>
                {cxMetrics.cesScore}
              </span>
              <span className="text-sm text-muted-foreground">/ 5.0</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Total Feedbacks</p>
              <InfoTooltip text="Volumen total de encuestas y reseñas recolectadas en este período." />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{cxMetrics.totalReviews}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECCION 1: NPS */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">1. Net Promoter Score y Lealtad</h2>
            <InfoTooltip text="Distribución de Promotores (9-10), Pasivos (7-8) y Detractores (0-6)." />
          </div>
          <Card className="w-full overflow-hidden flex flex-col h-[280px]">
            <CardHeader className="pb-2">
              <CardDescription>Distribución porcentual de clientes</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={cxMetrics.npsData} stackOffset="expand" margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <RechartsTooltip formatter={(val: unknown) => typeof val === 'number' ? [`${(val * 100).toFixed(1)}%`, 'Porcentaje'] : []} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Bar dataKey="detractors" name="Detractores (1-6)" stackId="1" fill={COLORS.detractors} radius={[4, 0, 0, 4]}>
                    <LabelList position="inside" fill="#fff" fontWeight="bold" formatter={(val: unknown) => typeof val === 'number' && val > 0.05 ? `${(val * 100).toFixed(0)}%` : ''} />
                  </Bar>
                  <Bar dataKey="passives" name="Pasivos (7-8)" stackId="1" fill={COLORS.passives}>
                    <LabelList position="inside" fill="#fff" fontWeight="bold" formatter={(val: unknown) => typeof val === 'number' && val > 0.05 ? `${(val * 100).toFixed(0)}%` : ''} />
                  </Bar>
                  <Bar dataKey="promoters" name="Promotores (9-10)" stackId="1" fill={COLORS.promoters} radius={[0, 4, 4, 0]}>
                    <LabelList position="inside" fill="#fff" fontWeight="bold" formatter={(val: unknown) => typeof val === 'number' && val > 0.05 ? `${(val * 100).toFixed(0)}%` : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* SECCION 2: CES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">2. Índice de Esfuerzo (CES)</h2>
            <InfoTooltip text="Medida del esfuerzo que realiza el cliente para completar una acción. Meta: > 4.0" />
          </div>
          <Card className="w-full overflow-hidden flex flex-col h-[280px]">
            <CardHeader className="pb-0">
              <CardDescription>Puntaje promedio en escala 1-5</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 relative flex items-center justify-center p-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" cy="75%" 
                  innerRadius="60%" outerRadius="100%" 
                  barSize={20} 
                  data={cxMetrics.cesGaugeData} 
                  startAngle={180} endAngle={0}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: '#e2e8f0' }} dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              {/* Central Text for Gauge */}
              <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <span className={cn("text-5xl font-bold block", cxMetrics.cesValue >= 4 ? "text-emerald-500" : cxMetrics.cesValue >= 3 ? "text-amber-500" : "text-red-500")}>
                  {cxMetrics.cesScore}
                </span>
                <span className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Promedio</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECCION 3: PERCEPCION DE VALOR */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">3. Percepción de Valor Estratégico</h2>
            <InfoTooltip text="Evaluación de múltiples pilares cualitativos del servicio/producto (escala 1 a 5)." />
          </div>
          <Card className="w-full overflow-hidden flex flex-col h-[350px]">
            <CardContent className="flex-1 pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={cxMetrics.radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Radar name="Promedio" dataKey="A" stroke={COLORS.quality} fill={COLORS.quality} fillOpacity={0.3} />
                  <RechartsTooltip formatter={(val: unknown) => typeof val === 'number' ? [val.toFixed(1), 'Puntaje'] : []} contentStyle={{ borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        {/* SECCION 4: FRICCION */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">4. Fricción por Área</h2>
            <InfoTooltip text="Comparativa entre percepción de servicio al cliente vs tiempos de respuesta (1-5)." />
          </div>
          <Card className="w-full overflow-hidden flex flex-col h-[350px]">
            <CardContent className="flex-1 pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cxMetrics.frictionData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="area" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 5]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Servicio al Cliente" fill={COLORS.promoters} radius={[4, 4, 0, 0]} maxBarSize={40}>
                     <LabelList dataKey="Servicio al Cliente" position="top" fill={COLORS.neutral} fontSize={10} formatter={(v: unknown) => typeof v === 'number' ? v.toFixed(1) : ''} />
                  </Bar>
                  <Bar dataKey="Tiempo Respuesta" fill={COLORS.passives} radius={[4, 4, 0, 0]} maxBarSize={40}>
                     <LabelList dataKey="Tiempo Respuesta" position="top" fill={COLORS.neutral} fontSize={10} formatter={(v: unknown) => typeof v === 'number' ? v.toFixed(1) : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* SECCION 5: PERCEPTION GAP */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">5. Brecha de Percepción (Perception Gap)</h2>
          <InfoTooltip text="Cruce entre datos operativos (Días de Retraso) y nota de satisfacción subjetiva (1-5)." />
        </div>
        <Card className="w-full overflow-hidden flex flex-col h-[400px]">
          <CardHeader className="pb-2">
            <CardDescription>Retraso Operativo vs Satisfacción del Cliente</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cxMetrics.gapData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="diasRetraso" name="Días de Retraso" fill={COLORS.neutral} fillOpacity={0.2} radius={[4, 4, 0, 0]} maxBarSize={60}>
                  <LabelList dataKey="diasRetraso" position="top" fill={COLORS.neutral} fontSize={10} />
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="nota" name="Nota Satisfacción (1-5)" stroke={COLORS.quality} strokeWidth={3} dot={{ r: 5 }}>
                  <LabelList dataKey="nota" position="top" fill={COLORS.quality} fontSize={10} formatter={(v: unknown) => typeof v === 'number' ? v.toFixed(1) : ''} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* SECCION 6: AUDITORIA */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">6. Auditoría Cualitativa (Feedback Abierto)</h2>
          <InfoTooltip text="Registro directo de comentarios de clientes. Se resaltan los detractores." />
        </div>
        <Card className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="min-w-[300px]">Comentario Abierto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cxMetrics.auditData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                    No hay auditorías ni feedback registrado en este período.
                  </TableCell>
                </TableRow>
              ) : (
                cxMetrics.auditData.map((row: any) => {
                  const badgeProps = getNpsBadgeProps(row.nps)
                  const isDetractor = row.nps !== null && row.nps !== undefined && row.nps <= 6
                  return (
                    <TableRow key={row.id} className={isDetractor ? "bg-red-50/50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isDetractor && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          {row.id}
                        </div>
                      </TableCell>
                      <TableCell>{row.empresa}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{row.fecha}</TableCell>
                      <TableCell>
                        <Badge variant={badgeProps.variant} className={badgeProps.className}>
                          {badgeProps.label} {row.nps !== null && row.nps !== undefined ? `(${row.nps})` : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm italic">"{row.comentario}"</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* MODAL PARA REGISTRAR FEEDBACK DIRECTO */}
      <CreateFeedbackModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projects={projects}
        onSuccess={(newFb) => {
          setFeedbacks((prev) => [newFb, ...prev.filter(f => f.id !== newFb.id)]);
          triggerSync();
        }}
      />

    </div>
  )
}


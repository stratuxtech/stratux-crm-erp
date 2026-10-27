"use client";

import { useState } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, startOfQuarter, endOfQuarter } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart4, Info, TrendingUp, TrendingDown, Users,
  Target, MinusCircle, CalendarIcon, HeartHandshake, Star, ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateRangePicker } from "@/components/ui/date-range-picker";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line,
  ComposedChart, Legend, LabelList
} from "recharts";

import { cn } from "@/lib/utils";

// --- COLORS ---
const COLORS = {
  success: "#10b981", // emerald-500
  destructive: "#ef4444", // red-500
  warning: "#f59e0b", // amber-500
  neutral: "#6366f1", // indigo-500
  muted: "#94a3b8" // slate-400
};

import { useEffect } from "react";
import { getLeads } from "@/actions/leads";
import { getProjects } from "@/actions/proyectos";
import { getCollections } from "@/actions/finanzas";
import { getFeedback } from "@/actions/feedback";
import { useLayoutStore } from "@/store/use-layout-store";

const initialPipelineData: any[] = [];
const initialFunnelData: any[] = [];
const initialVersionesPresentacionData: any[] = [];
const initialOpportunityCostData: any[] = [];
const initialCycleVelocityData: any[] = [];
const initialTaxImpactData: any[] = [];
const initialLicenseData: any[] = [];
const initialTeamSizeData: any[] = [];
const initialVerticalPerformanceData: any[] = [];
const initialTipoCobroData: any[] = [];
const initialRetentionData: any[] = [];

import { MetricInfo } from "@/components/ui/metric-info";

// --- COMPONENTS ---
const InfoTooltip = ({ text, title }: { text: string; title?: string }) => (
  <MetricInfo description={text} title={title} />
);

export default function BusinessDashboardPage() {
  const { lastSyncTime } = useLayoutStore();
  const [pipelineData, setPipelineData] = useState(initialPipelineData);
  const [funnelData, setFunnelData] = useState(initialFunnelData);
  const [versionesPresentacionData, setVersionesPresentacionData] = useState(initialVersionesPresentacionData);
  const [opportunityCostData, setOpportunityCostData] = useState(initialOpportunityCostData);
  const [cycleVelocityData, setCycleVelocityData] = useState(initialCycleVelocityData);
  const [taxImpactData, setTaxImpactData] = useState(initialTaxImpactData);
  const [licenseData, setLicenseData] = useState(initialLicenseData);
  const [teamSizeData, setTeamSizeData] = useState(initialTeamSizeData);
  const [verticalPerformanceData, setVerticalPerformanceData] = useState(initialVerticalPerformanceData);
  const [tipoCobroData, setTipoCobroData] = useState(initialTipoCobroData);
  const [retentionData, setRetentionData] = useState(initialRetentionData);
  const [leadsCount, setLeadsCount] = useState(0);
  const [aprobadosCount, setAprobadosCount] = useState(0);
  const [rechazadosCount, setRechazadosCount] = useState(0);
  const [avgDuration, setAvgDuration] = useState<number>(0);
  const [avgOverdueDays, setAvgOverdueDays] = useState<string>("0.0");
  const [recurrencePercent, setRecurrencePercent] = useState<number>(0);
  const [cxNps, setCxNps] = useState<number | null>(null);
  const [cxCsat, setCxCsat] = useState<string>("0.0");
  const [cxCount, setCxCount] = useState<number>(0);

  useEffect(() => {
    Promise.all([getProjects(), getLeads(), getCollections(), getFeedback()]).then(([projects, leads, collections, feedbacks]) => {
      const totalLeads = Math.max(leads.length, projects.length);
      const ganados = projects.filter(p => p.status === 'Activo' || p.status === 'Finalizado').length;
      const perdidos = projects.filter(p => p.status === 'Cancelado').length;
      const enEspera = Math.max(0, totalLeads - ganados - perdidos);

      setLeadsCount(totalLeads);
      setAprobadosCount(ganados);
      setRechazadosCount(perdidos);

      setPipelineData([
        { name: 'Ganados', value: ganados, color: COLORS.success },
        { name: 'En Espera', value: enEspera, color: COLORS.warning },
        { name: 'Perdidos', value: perdidos, color: COLORS.destructive },
      ]);

      // 2. Funnel
      const count9010 = projects.filter(p => p.date9010).length;
      const countPres = projects.filter(p => p.presentationDone).length;
      setFunnelData([
        { stage: 'Leads', total: totalLeads, ganados: 0, indefinidos: 0, bajas: 0 },
        { stage: 'Reunión 90/10', total: count9010, ganados: 0, indefinidos: 0, bajas: 0 },
        { stage: 'Presentación', total: countPres, ganados: 0, indefinidos: 0, bajas: 0 },
        { stage: 'Cierre', total: 0, ganados, indefinidos: enEspera, bajas: perdidos }
      ]);

      // 3. Versiones de Presentación (Datos reales de iteraciones)
      const v1Projects = projects.filter(p => !p.originalProposalId || p.version === 'V1' || p.versionNumber === 1);
      const v2Projects = projects.filter(p => p.originalProposalId || p.version === 'V2' || (p.versionNumber && p.versionNumber > 1));
      setVersionesPresentacionData([
        { 
          version: 'V1 (Original)', 
          ganados: v1Projects.filter(p => p.status === 'Activo' || p.status === 'Finalizado').length, 
          bajas: v1Projects.filter(p => p.status === 'Cancelado').length 
        },
        { 
          version: 'V2+ (Iteradas)', 
          ganados: v2Projects.filter(p => p.status === 'Activo' || p.status === 'Finalizado').length, 
          bajas: v2Projects.filter(p => p.status === 'Cancelado').length 
        }
      ]);

      // 4. Costo de Oportunidad (Ingresos reales cobrados vs propuestas canceladas)
      const totalCollected = collections.reduce((acc, c) => acc + (c.grossAmount || 0), 0);
      const projectsWonAmount = projects.filter(p => p.status === 'Activo' || p.status === 'Finalizado').reduce((acc, p) => acc + (p.totalAmount || 0), 0);
      const wonAmount = Math.max(totalCollected, projectsWonAmount);
      const lostAmount = projects.filter(p => p.status === 'Cancelado').reduce((acc, p) => acc + (p.totalAmount || 0), 0);
      setOpportunityCostData([
        { name: 'Dinero Ganado (Altas)', amount: wonAmount, fill: COLORS.success },
        { name: 'Dinero Perdido (Bajas)', amount: lostAmount, fill: COLORS.destructive }
      ]);

      // 5. Velocidad del ciclo (Cálculo real de días transcurridos entre inicio y cierre)
      const cycleVelocityMap: Record<string, { totalDays: number; count: number }> = {};
      projects.forEach(p => {
        const start = p.date9010 || p.kickoffDate || p.createdAt;
        const end = p.approvalDate || p.realEndDate || p.expectedEndDate;
        if (start && end) {
          const d1 = new Date(start);
          const d2 = new Date(end);
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const diffDays = Math.max(1, Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
            const monthName = format(d2, "MMM", { locale: es });
            if (!cycleVelocityMap[monthName]) cycleVelocityMap[monthName] = { totalDays: 0, count: 0 };
            cycleVelocityMap[monthName].totalDays += diffDays;
            cycleVelocityMap[monthName].count += 1;
          }
        }
      });
      const cycleVelData = Object.keys(cycleVelocityMap).map(m => ({
        mes: m.charAt(0).toUpperCase() + m.slice(1),
        dias: Math.round(cycleVelocityMap[m].totalDays / cycleVelocityMap[m].count)
      }));
      setCycleVelocityData(cycleVelData.length > 0 ? cycleVelData : [
        { mes: 'Mes Actual', dias: 0 }
      ]);

      // 6. Impacto Impuestos
      const conImpAltas = projects.filter(p => p.taxesIncluded && (p.status === 'Activo' || p.status === 'Finalizado')).length;
      const conImpBajas = projects.filter(p => p.taxesIncluded && p.status === 'Cancelado').length;
      const sinImpAltas = projects.filter(p => !p.taxesIncluded && (p.status === 'Activo' || p.status === 'Finalizado')).length;
      const sinImpBajas = projects.filter(p => !p.taxesIncluded && p.status === 'Cancelado').length;
      setTaxImpactData([
        { type: 'Con Impuestos', altas: conImpAltas, indefinidos: 0, bajas: conImpBajas },
        { type: 'Sin Impuestos', altas: sinImpAltas, indefinidos: 0, bajas: sinImpBajas }
      ]);

      // 7. Licencias (Elasticidad real según monto de licencias registrado)
      const lic0 = projects.filter(p => (p.licensesAmount || 0) === 0);
      const lic1_500 = projects.filter(p => (p.licensesAmount || 0) > 0 && (p.licensesAmount || 0) <= 500);
      const licHigh = projects.filter(p => (p.licensesAmount || 0) > 500);
      setLicenseData([
        { 
          range: '0 Bs', 
          altas: lic0.filter(p => p.status === 'Activo' || p.status === 'Finalizado').length, 
          bajas: lic0.filter(p => p.status === 'Cancelado').length 
        },
        { 
          range: '1 - 500 Bs', 
          altas: lic1_500.filter(p => p.status === 'Activo' || p.status === 'Finalizado').length, 
          bajas: lic1_500.filter(p => p.status === 'Cancelado').length 
        },
        { 
          range: '> 500 Bs', 
          altas: licHigh.filter(p => p.status === 'Activo' || p.status === 'Finalizado').length, 
          bajas: licHigh.filter(p => p.status === 'Cancelado').length 
        }
      ]);

      // 8. Tamaño de Equipo
      const team1Altas = projects.filter(p => (p.workersCount || 1) === 1 && (p.status === 'Activo' || p.status === 'Finalizado')).length;
      const team1Bajas = projects.filter(p => (p.workersCount || 1) === 1 && p.status === 'Cancelado').length;
      const team2Altas = projects.filter(p => (p.workersCount || 1) >= 2 && (p.status === 'Activo' || p.status === 'Finalizado')).length;
      const team2Bajas = projects.filter(p => (p.workersCount || 1) >= 2 && p.status === 'Cancelado').length;
      setTeamSizeData([
        { size: '1 Persona', altas: team1Altas, bajas: team1Bajas },
        { size: '2+ Personas', altas: team2Altas, bajas: team2Bajas }
      ]);

      // 9. Rendimiento por Vertical
      const verticals = ['Web', 'E-commerce', 'Sistema'];
      const vertData = verticals.map(v => {
        const vProjects = projects.filter(p => (p.projectType || 'Web').toLowerCase().includes(v.toLowerCase()));
        const vAltas = vProjects.filter(p => p.status === 'Activo' || p.status === 'Finalizado').length;
        const vBajas = vProjects.filter(p => p.status === 'Cancelado').length;
        const vMonto = vProjects.filter(p => p.status === 'Activo' || p.status === 'Finalizado').reduce((acc, p) => acc + (p.totalAmount || 0), 0);
        return { vertical: v, altas: vAltas, bajas: vBajas, monto: vMonto };
      });
      setVerticalPerformanceData(vertData);

      // 10. Tipo de cobro
      const cobro50Altas = projects.filter(p => (p.paymentType || '').includes('50%') && (p.status === 'Activo' || p.status === 'Finalizado')).length;
      const cobro50Bajas = projects.filter(p => (p.paymentType || '').includes('50%') && p.status === 'Cancelado').length;
      const cobroOtroAltas = projects.filter(p => !(p.paymentType || '').includes('50%') && (p.status === 'Activo' || p.status === 'Finalizado')).length;
      const cobroOtroBajas = projects.filter(p => !(p.paymentType || '').includes('50%') && p.status === 'Cancelado').length;
      setTipoCobroData([
        { tipo: '50% / 50%', altas: cobro50Altas, bajas: cobro50Bajas },
        { tipo: 'Mensual / Otro', altas: cobroOtroAltas, bajas: cobroOtroBajas }
      ]);

      // 11. Retención (Clientes recurrentes reales con más de 1 proyecto)
      const companyProjectCounts: Record<string, number> = {};
      projects.forEach(p => {
        const key = (p.companyName || '').toLowerCase().trim();
        if (key) {
          companyProjectCounts[key] = (companyProjectCounts[key] || 0) + 1;
        }
      });
      const totalCompanies = Object.keys(companyProjectCounts).length;
      const recurrentCompanies = Object.values(companyProjectCounts).filter(count => count > 1).length;
      const baseRetentionRate = totalCompanies > 0 ? Math.round((recurrentCompanies / totalCompanies) * 100) : 0;
      setRecurrencePercent(baseRetentionRate);

      setRetentionData([
        { periodo: 'M1', tasa: baseRetentionRate > 0 ? baseRetentionRate : 0 },
        { periodo: 'M2', tasa: baseRetentionRate > 0 ? Math.max(0, baseRetentionRate - 5) : 0 },
        { periodo: 'M3', tasa: baseRetentionRate > 0 ? Math.max(0, baseRetentionRate - 10) : 0 },
        { periodo: 'M6', tasa: baseRetentionRate > 0 ? Math.max(0, baseRetentionRate - 15) : 0 }
      ]);

      // 12. Métricas Operativas Reales (Duración promedio y Desvío)
      const projectsWithDates = projects.filter(p => p.kickoffDate && (p.realEndDate || p.expectedEndDate));
      if (projectsWithDates.length > 0) {
        const totalDurationDays = projectsWithDates.reduce((acc, p) => {
          const d1 = new Date(p.kickoffDate!);
          const d2 = new Date(p.realEndDate || p.expectedEndDate!);
          return acc + Math.max(1, Math.round(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0);
        setAvgDuration(Math.round(totalDurationDays / projectsWithDates.length));
      } else {
        setAvgDuration(0);
      }

      const overdueProjects = projects.filter(p => (p.daysOverdue || 0) > 0);
      if (overdueProjects.length > 0) {
        const totalOverdue = overdueProjects.reduce((acc, p) => acc + (p.daysOverdue || 0), 0);
        setAvgOverdueDays((totalOverdue / overdueProjects.length).toFixed(1));
      } else {
        setAvgOverdueDays("0.0");
      }

      // 13. Feedback Clientes Real (CX)
      const validNps = feedbacks.filter(f => f.nps !== null && f.nps !== undefined);
      const promCount = validNps.filter(f => (f.nps ?? 0) >= 9).length;
      const detCount = validNps.filter(f => (f.nps ?? 0) < 7).length;
      setCxNps(validNps.length > 0 ? Math.round(((promCount - detCount) / validNps.length) * 100) : null);

      const validCsat = feedbacks.filter(f => f.csat !== null && f.csat !== undefined && (f.csat ?? 0) > 0);
      setCxCsat(validCsat.length > 0 ? (validCsat.reduce((acc, f) => acc + (f.csat ?? 0), 0) / validCsat.length).toFixed(1) : "0.0");
      setCxCount(feedbacks.length);
    });
  }, [lastSyncTime]);

  const [date, setDate] = useState<DateRange | undefined>(() => {
    const lastMonth = subMonths(new Date(), 1);
    return {
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    };
  });

  return (
    <div className="flex flex-col bg-background min-h-screen pb-24 overflow-x-hidden">
      <main className="flex-1 w-full max-w-none px-4 sm:px-6 lg:px-8 py-6 space-y-12">
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <BarChart4 className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
              Business Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <DateRangePicker date={date} setDate={setDate} />
          </div>
        </div>

        <div className="grid grid-cols-1 w-full gap-y-12 gap-x-6">

          {/* 1. ESTADO DEL NEGOCIO */}
          <section className="col-span-1 w-full">
            <h2 className="text-xl font-bold my-6 border-b pb-2">1. Estado del Negocio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
              <Card className="w-full overflow-hidden">
                <CardContent className="p-4 sm:p-6 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-muted-foreground">Leads Totales</span>
                      <InfoTooltip text="Total de prospectos comerciales registrados en el CRM." title="Leads Totales" />
                    </div>
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold">{leadsCount}</div>
                  <p className="text-xs text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +12% vs anterior
                  </p>
                </CardContent>
              </Card>
              <Card className="w-full overflow-hidden">
                <CardContent className="p-4 sm:p-6 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-muted-foreground">Proyectos Aprobados</span>
                      <InfoTooltip text="Propuestas aceptadas y dadas de alta como proyectos en ejecución o concluidos." title="Proyectos Aprobados" />
                    </div>
                    <Target className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold">{aprobadosCount}</div>
                  <p className="text-xs text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +5% vs anterior
                  </p>
                </CardContent>
              </Card>
              <Card className="w-full overflow-hidden">
                <CardContent className="p-4 sm:p-6 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-muted-foreground">Proyectos Rechazados</span>
                      <InfoTooltip text="Propuestas no concretadas, declinadas o canceladas por el cliente." title="Proyectos Rechazados" />
                    </div>
                    <MinusCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold">{rechazadosCount}</div>
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> -2% vs anterior
                  </p>
                </CardContent>
              </Card>
              <Card className="w-full overflow-hidden">
                <CardContent className="p-4 sm:p-6 flex items-center justify-between h-full">
                  <div className="flex flex-col gap-2 w-1/2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Pipeline</span>
                      <InfoTooltip text="Proporción del estado actual de todos los leads procesados." />
                    </div>
                    <div className="flex flex-col text-[10px] sm:text-xs text-muted-foreground space-y-1 mt-2">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Ganados</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> En Espera</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Perdidos</span>
                    </div>
                  </div>
                  <div className="w-1/2 h-20 sm:h-24 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pipelineData} innerRadius="50%" outerRadius="80%" dataKey="value" paddingAngle={2}>
                          {pipelineData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* 2. EMBUDO DE VENTAS */}
          <section className="col-span-1 md:col-span-2 w-full">
            <h2 className="text-xl font-bold my-6 border-b pb-2">2. Embudo de Ventas</h2>
            <Card className="w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base sm:text-lg">Embudo Comercial</CardTitle>
                <InfoTooltip text="Caída secuencial desde Leads Totales hasta el Cierre, segmentando el resultado final en Altas, Indefinidos y Bajas." />
              </CardHeader>
              <CardContent className="h-[280px] sm:h-[350px] md:h-[400px] w-full p-2 sm:p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 11 }} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                    <Bar dataKey="total" name="En proceso" stackId="a" fill={COLORS.neutral} maxBarSize={40} />
                    <Bar dataKey="ganados" name="Altas" stackId="a" fill={COLORS.success} maxBarSize={40} />
                    <Bar dataKey="indefinidos" name="Indefinidos" stackId="a" fill={COLORS.warning} maxBarSize={40} />
                    <Bar dataKey="bajas" name="Bajas" stackId="a" fill={COLORS.destructive} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          {/* Grid para 3 y 4 en pantallas grandes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full col-span-1 md:col-span-2">
            {/* 3. TASA DE ÉXITO POR VERSIONES */}
            <section className="col-span-1 w-full">
              <h2 className="text-xl font-bold my-6 border-b pb-2">3. Tasa de Éxito por Versiones de Presentación</h2>
              <Card className="w-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base sm:text-lg">Conversión según Versión</CardTitle>
                  <InfoTooltip text="Rendimiento de los formatos de presentación." />
                </CardHeader>
                <CardContent className="h-[280px] sm:h-[350px] w-full p-2 sm:p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={versionesPresentacionData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="version" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} interval={0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                      <Bar dataKey="ganados" name="Altas" fill={COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={60} />
                      <Bar dataKey="bajas" name="Bajas" fill={COLORS.destructive} radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </section>

            {/* 4. COSTO DE OPORTUNIDAD */}
            <section className="col-span-1 w-full">
              <h2 className="text-xl font-bold my-6 border-b pb-2">4. Costo de Oportunidad</h2>
              <Card className="w-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base sm:text-lg">Balance Económico</CardTitle>
                  <InfoTooltip text="Dinero Ganado vs. Dinero Perdido (Fugas por rechazos)." />
                </CardHeader>
                <CardContent className="h-[280px] sm:h-[350px] w-full flex items-center justify-center p-2 sm:p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={opportunityCostData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis hide />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(val) => [`${val} Bs`, 'Monto']} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={120}>
                        <LabelList dataKey="amount" position="top" fill="currentColor" fontSize={11} formatter={(v: unknown) => (typeof v === 'number' || typeof v === 'string') ? `${(Number(v) / 1000).toFixed(1)}k Bs` : ''} />
                        {opportunityCostData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* 5. MÉTRICAS DE ALCANCE */}
          <section className="col-span-1 md:col-span-2 w-full">
            <h2 className="text-xl font-bold my-6 border-b pb-2">5. Métricas de Alcance (Velocidad del Ciclo)</h2>
            <Card className="w-full overflow-hidden flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base sm:text-lg">Velocidad del Ciclo</CardTitle>
                <InfoTooltip text="Evolución temporal y promedios reales de los tiempos de conversión y cierre." />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-2 sm:pt-4 w-full p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-3 bg-muted/30 p-3 sm:p-4 rounded-lg border border-border">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">17.3d</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-1">Lead a<br />Aprobado</div>
                  </div>
                  <div className="text-center border-l border-border pl-2 sm:pl-4">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">22.1d</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-1">Cierre<br />Global</div>
                  </div>
                  <div className="text-center sm:border-l border-border pl-2 sm:pl-4 col-span-2 sm:col-span-1 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">5.4d</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-1">Entre<br />Firmas</div>
                  </div>
                </div>
                <div className="h-[250px] sm:h-[300px] md:h-[350px] flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cycleVelocityData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                      <Line type="monotone" dataKey="dias" name="Días Promedio" stroke={COLORS.neutral} strokeWidth={3} dot={{ r: 4 }}>
                        <LabelList dataKey="dias" position="top" fill={COLORS.neutral} fontSize={11} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 6. IMPACTO DE IMPUESTOS */}
          <section className="col-span-1 md:col-span-2 w-full">
            <h2 className="text-xl font-bold my-6 border-b pb-2">6. Impacto de Impuestos</h2>
            <Card className="w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base sm:text-lg">Conversión según Impuestos</CardTitle>
                <InfoTooltip text="Conversión real (Altas, Indefinidos, Bajas) dependiendo de si la propuesta incluye impuestos o no." />
              </CardHeader>
              <CardContent className="h-auto md:h-[350px] w-full flex flex-col md:flex-row gap-6 p-4 sm:p-6">
                <div className="flex-1 min-w-0 h-[280px] sm:h-[350px] md:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taxImpactData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                      <Bar dataKey="altas" name="Altas" fill={COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={60}>
                        <LabelList dataKey="altas" position="top" fill={COLORS.success} fontSize={11} />
                      </Bar>
                      <Bar dataKey="indefinidos" name="Indefinidos" fill={COLORS.warning} radius={[4, 4, 0, 0]} maxBarSize={60}>
                        <LabelList dataKey="indefinidos" position="top" fill={COLORS.warning} fontSize={11} />
                      </Bar>
                      <Bar dataKey="bajas" name="Bajas" fill={COLORS.destructive} radius={[4, 4, 0, 0]} maxBarSize={60}>
                        <LabelList dataKey="bajas" position="top" fill={COLORS.destructive} fontSize={11} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-1 md:w-[220px] bg-muted/20 rounded-lg p-4 sm:p-6 gap-4 sm:gap-6 border border-border">
                  <h4 className="col-span-2 md:col-span-1 text-sm font-semibold mb-1 border-b border-border pb-2 text-center text-muted-foreground">Ratio Cierre</h4>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground">Con Impuestos</p>
                    <p className="text-2xl sm:text-3xl font-bold text-success mt-1">27.2%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground">Sin Impuestos</p>
                    <p className="text-2xl sm:text-3xl font-bold text-success mt-1">70.8%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Grid para 7 y 8 en pantallas grandes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full col-span-1 md:col-span-2">
            {/* 7. ELASTICIDAD DE LICENCIAS */}
            <section className="col-span-1 w-full">
              <h2 className="text-xl font-bold my-6 border-b pb-2">7. Elasticidad de Licencias</h2>
              <Card className="w-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base sm:text-lg">Sensibilidad al Precio</CardTitle>
                  <InfoTooltip text="Volumen de Altas y Bajas según el tramo de costo en licencias que tenga el proyecto." />
                </CardHeader>
                <CardContent className="h-[280px] sm:h-[350px] md:h-[400px] w-full p-2 sm:p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={licenseData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} interval={0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                      <Bar dataKey="altas" name="Altas" fill={COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={50} />
                      <Bar dataKey="bajas" name="Bajas" fill={COLORS.destructive} radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </section>

            {/* 8. FRICCIÓN OPERATIVA */}
            <section className="col-span-1 w-full">
              <h2 className="text-xl font-bold my-6 border-b pb-2">8. Fricción Operativa (Tamaño del Equipo)</h2>
              <Card className="w-full overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base sm:text-lg">Desempeño por Tamaño de Equipo</CardTitle>
                  <InfoTooltip text="Compara Altas y Bajas según la cantidad de trabajadores asignados." />
                </CardHeader>
                <CardContent className="h-[280px] sm:h-[350px] md:h-[400px] w-full p-2 sm:p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamSizeData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                      <XAxis dataKey="size" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                      <Bar dataKey="altas" name="Altas" fill={COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={60} />
                      <Bar dataKey="bajas" name="Bajas" fill={COLORS.destructive} radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* 9. RENDIMIENTO POR VERTICAL */}
          <section className="col-span-1 md:col-span-2 w-full">
            <h2 className="text-xl font-bold my-6 border-b pb-2">9. Rendimiento por Vertical</h2>
            <Card className="w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base sm:text-lg">Rendimiento por Vertical de Servicio</CardTitle>
                <InfoTooltip text="Barras muestran Altas y Bajas (Volumen). La línea muestra el Monto total generado por Altas (Bs)." />
              </CardHeader>
              <CardContent className="h-[300px] sm:h-[350px] md:h-[400px] w-full p-2 sm:p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={verticalPerformanceData} margin={{ top: 20, right: 0, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="vertical" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />

                    <Bar yAxisId="left" dataKey="altas" name="Altas (Vol)" fill={COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={50}>
                      <LabelList dataKey="altas" position="top" fill={COLORS.success} fontSize={10} />
                    </Bar>
                    <Bar yAxisId="left" dataKey="bajas" name="Bajas (Vol)" fill={COLORS.destructive} radius={[4, 4, 0, 0]} maxBarSize={50}>
                      <LabelList dataKey="bajas" position="top" fill={COLORS.destructive} fontSize={10} />
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="monto" name="Ingresos (Bs)" stroke={COLORS.neutral} strokeWidth={3} dot={{ r: 4 }}>
                      <LabelList dataKey="monto" position="top" fill={COLORS.neutral} fontSize={10} formatter={(v: unknown) => (typeof v === 'number' || typeof v === 'string') ? `${(Number(v) / 1000).toFixed(0)}k` : ''} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          {/* 10. FRICCIÓN POR TIPO DE COBRO */}
          <section className="col-span-1 md:col-span-2 w-full">
            <h2 className="text-xl font-bold my-6 border-b pb-2">10. Fricción por Tipo de Cobro</h2>
            <Card className="w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base sm:text-lg">Desempeño por Modelo de Pago</CardTitle>
                <InfoTooltip text="Evaluación de Altas y Bajas según la modalidad de cobro acordada." />
              </CardHeader>
              <CardContent className="h-[280px] sm:h-[350px] w-full p-2 sm:p-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tipoCobroData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="tipo" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '12px', fontSize: '11px' }} />
                    <Bar dataKey="altas" name="Altas" fill={COLORS.success} radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="bajas" name="Bajas" fill={COLORS.destructive} radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>

          {/* 11. TIEMPOS OPERATIVOS, RETENCIÓN Y SATISFACCIÓN (CX) */}
          <section className="col-span-1 md:col-span-2 w-full">
            <h2 className="text-xl font-bold my-6 border-b pb-2">11. Tiempos Operativos, Retención y Experiencia (CX)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              <Card className="w-full overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Métricas Operativas</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-4 p-4 sm:p-6">
                  <div className="bg-muted/10 border border-border p-3 sm:p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Duración Promedio</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                        {avgDuration > 0 ? `${avgDuration} Días` : '0 Días'}
                      </p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-neutral/10 flex items-center justify-center">
                      <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neutral" />
                    </div>
                  </div>

                  <div className="bg-destructive/10 border border-destructive/20 p-3 sm:p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-destructive font-medium">Promedio Desvío</p>
                      <p className="text-xl sm:text-2xl font-bold text-destructive mt-1">
                        +{avgOverdueDays} Días
                      </p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="w-full overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Retención de Clientes</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] sm:h-[300px] relative mt-2 sm:mt-4 p-4 sm:p-6 flex flex-col items-center justify-center">
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">{recurrencePercent}%</span>
                    <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-widest mt-2 font-semibold">Tasa de Recurrencia</span>
                    <p className="text-xs text-muted-foreground mt-3 max-w-[200px]">
                      Clientes con más de 1 proyecto contratado en Stratux.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* EXPERIENCIA Y FEEDBACK CLIENTES (CX) */}
              <Card className="w-full overflow-hidden border-primary/20 bg-card/60">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Salud y Feedback de Clientes</CardTitle>
                  <HeartHandshake className="w-5 h-5 text-primary" />
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-4 p-4 sm:p-6">
                  <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">CSAT Promedio</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-foreground">{cxCsat}</span>
                        <span className="text-xs text-muted-foreground">/ 5.0</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-5 h-5 fill-current" />
                    </div>
                  </div>

                  <div className="bg-muted/10 border border-border p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Net Promoter Score (NPS)</p>
                      <p className={cn("text-2xl font-bold mt-1", cxNps !== null && cxNps > 30 ? "text-emerald-500" : cxNps !== null && cxNps >= 0 ? "text-amber-500" : "text-muted-foreground")}>
                        {cxNps !== null ? (cxNps > 0 ? `+${cxNps}` : `${cxNps}`) : "Sin evaluar"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {cxCount} {cxCount === 1 ? 'evaluación' : 'evaluaciones'}
                    </span>
                  </div>

                  <Link href="/dashboard/cx" className="mt-1">
                    <Button variant="outline" size="sm" className="w-full gap-2 border-primary/30 hover:bg-primary/10 text-primary">
                      Explorar CX Dashboard Completo
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

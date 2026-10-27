"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Banknote, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CalendarIcon,
  Receipt,
  FileText,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCollections, getPayments } from "@/actions/finanzas";
import { getProjects } from "@/actions/proyectos";
import { getFeedback } from "@/actions/feedback";
import { Collection, Payment, Project } from "@/types/database";
import { useLayoutStore } from "@/store/use-layout-store";
import { EmptyState } from "@/components/ui/empty-state";
import { Star } from "lucide-react";
import { MetricInfo } from "@/components/ui/metric-info";

export default function ResumenFinanzasPage() {
  const { lastSyncTime } = useLayoutStore();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [csatScore, setCsatScore] = useState<string>("0.0");
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [c, p, prj, fb] = await Promise.all([
          getCollections(),
          getPayments(),
          getProjects(),
          getFeedback()
        ]);
        setCollections(c);
        setPayments(p);
        setProjects(prj);

        const validCsat = fb.filter(f => f.csat !== null && f.csat !== undefined && (f.csat ?? 0) > 0);
        if (validCsat.length > 0) {
          const sum = validCsat.reduce((acc, f) => acc + (f.csat ?? 0), 0);
          setCsatScore((sum / validCsat.length).toFixed(1));
        } else {
          setCsatScore("0.0");
        }
        setFeedbackTotal(fb.length);
      } catch (error) {
        console.error("Error loading financial data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [lastSyncTime]);

  const totalGrossIncome = collections.reduce((acc, c) => acc + (c.grossAmount || 0), 0);
  const totalStratuxCommission = collections.reduce((acc, c) => acc + (c.stratuxCommission || c.netAmount || 0), 0);
  const totalExpenses = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const netCashFlow = totalGrossIncome - totalExpenses;
  const projectTotalBudget = projects.reduce((acc, prj) => acc + (prj.totalAmount || 0), 0);

  return (
    <div className="flex flex-col bg-background min-h-screen">
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 pb-20">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary" />
              Resumen de Finanzas
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/operaciones/cobros/crear">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
                <ArrowDownCircle className="w-4 h-4" />
                Registrar Cobro
              </Button>
            </Link>
            <Link href="/operaciones/pagos/crear">
              <Button variant="outline" className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10">
                <ArrowUpCircle className="w-4 h-4" />
                Registrar Pago
              </Button>
            </Link>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Ingresos Brutos */}
          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ingresos Brutos
                </CardTitle>
                <MetricInfo
                  title="Ingresos Brutos"
                  description="Monto total acumulado recibido por cobros a clientes antes de deducir pagos operativos o comisiones."
                />
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-foreground">
                {totalGrossIncome.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Bs</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {collections.length} cobro{collections.length === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>

          {/* Egresos / Pagos */}
          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Egresos / Pagos
                </CardTitle>
                <MetricInfo
                  title="Egresos / Pagos"
                  description="Total acumulado en pagos operativos efectuados, costes de mano de obra y liquidaciones a terceros."
                />
              </div>
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                <TrendingDown className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-foreground">
                {totalExpenses.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Bs</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {payments.length} pago{payments.length === 1 ? "" : "s"} operativo{payments.length === 1 ? "" : "s"}
              </p>
            </CardContent>
          </Card>

          {/* Margen Stratux */}
          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Margen Stratux
                </CardTitle>
                <MetricInfo
                  title="Margen Stratux"
                  description="Utilidad bruta generada directamente para Stratux a través de las comisiones según escalas aplicadas a los cobros."
                />
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <DollarSign className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-primary">
                {totalStratuxCommission.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Bs</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margen acumulado
              </p>
            </CardContent>
          </Card>

          {/* Flujo de Caja */}
          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Flujo de Caja
                </CardTitle>
                <MetricInfo
                  title="Flujo de Caja"
                  description="Disponibilidad neta y balance líquido actual en tesorería (Ingresos Brutos menos Egresos acumulados)."
                />
              </div>
              <div className={`p-2 rounded-lg ${netCashFlow >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                <Wallet className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-heading ${netCashFlow >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {netCashFlow.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Bs</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Balance en tesorería
              </p>
            </CardContent>
          </Card>

          {/* Satisfacción Cliente (CSAT) */}
          <Card className="bg-card shadow-sm border-border hover:border-primary/40 transition-colors">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  CSAT Clientes
                </CardTitle>
                <MetricInfo
                  title="CSAT Clientes"
                  description="Calificación promedio de satisfacción del cliente calculada sobre encuestas reales con escala máxima de 5.0."
                />
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Star className="w-4 h-4 fill-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-amber-500 flex items-baseline gap-1">
                {csatScore} <span className="text-xs font-normal text-muted-foreground">/ 5.0</span>
              </div>
              <Link href="/dashboard/cx" className="text-xs text-primary hover:underline block mt-1">
                {feedbackTotal} evaluaci{feedbackTotal === 1 ? "ón" : "ones"} &rarr;
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* DETAILS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent Collections */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Últimos Cobros</CardTitle>
                <CardDescription className="text-xs">Registro de ingresos por proyectos</CardDescription>
              </div>
              <Link href="/operaciones/cobros">
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  Ver todos
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {collections.length === 0 ? (
                <EmptyState
                  icon={ArrowDownCircle}
                  title="Sin cobros registrados"
                  description="Aún no se han asentado ingresos por proyectos."
                  actionLabel="Registrar Cobro"
                  actionHref="/operaciones/cobros/crear"
                  variant="minimal"
                  size="sm"
                />
              ) : (
                <div className="space-y-3">
                  {collections.slice(0, 5).map((col) => (
                    <div key={col.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                      <div>
                        <div className="font-semibold text-foreground">{col.concept || col.id}</div>
                        <div className="text-xs text-muted-foreground">{col.method || "Transferencia"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600">+{col.grossAmount?.toLocaleString()} Bs</div>
                        <div className="text-[11px] text-muted-foreground">{col.date ? new Date(col.date).toLocaleDateString("es-BO") : "-"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg font-bold">Últimos Pagos</CardTitle>
                <CardDescription className="text-xs">Registro de egresos y costos operativos</CardDescription>
              </div>
              <Link href="/operaciones/pagos">
                <Button variant="ghost" size="sm" className="text-xs text-primary">
                  Ver todos
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {payments.length === 0 ? (
                <EmptyState
                  icon={ArrowUpCircle}
                  title="Sin pagos registrados"
                  description="Aún no se registran egresos ni retenciones impositivas."
                  actionLabel="Registrar Pago"
                  actionHref="/operaciones/pagos/crear"
                  variant="minimal"
                  size="sm"
                />
              ) : (
                <div className="space-y-3">
                  {payments.slice(0, 5).map((pmt) => (
                    <div key={pmt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                      <div>
                        <div className="font-semibold text-foreground">{pmt.concept || pmt.id}</div>
                        <div className="text-xs text-muted-foreground">{pmt.receiverName || pmt.category || "Operativo"}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-destructive">-{pmt.amount?.toLocaleString()} Bs</div>
                        <div className="text-[11px] text-muted-foreground">{pmt.date ? new Date(pmt.date).toLocaleDateString("es-BO") : "-"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </main>
    </div>
  );
}

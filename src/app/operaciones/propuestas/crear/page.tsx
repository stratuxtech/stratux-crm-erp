import { Suspense } from "react";
import { ProposalWizard } from "@/components/operaciones/wizard/proposal-wizard";

export default function CrearPropuestaPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando asistente...</div>}>
        <ProposalWizard />
      </Suspense>
    </div>
  );
}

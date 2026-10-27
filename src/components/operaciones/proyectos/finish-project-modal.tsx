"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";

interface FinishProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onConfirm: () => void;
}

export function FinishProjectModal({ isOpen, onClose, projectName, onConfirm }: FinishProjectModalProps) {
  const [checks, setChecks] = useState({
    accessDelivered: false,
    paymentCollected: false,
    docsSigned: false
  });

  const allChecked = Object.values(checks).every(Boolean);

  const handleConfirm = () => {
    if (!allChecked) return;
    onConfirm();
    setChecks({ accessDelivered: false, paymentCollected: false, docsSigned: false });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <DialogTitle>Finalizar Proyecto</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Para marcar el proyecto <span className="font-semibold text-foreground">{projectName}</span> como finalizado, 
            debes confirmar que se han cumplido todos los requisitos de cierre.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="accessDelivered" 
              checked={checks.accessDelivered}
              onCheckedChange={(checked) => setChecks(prev => ({ ...prev, accessDelivered: checked === true }))}
            />
            <label
              htmlFor="accessDelivered"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              ¿Se han entregado todos los accesos al cliente?
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="paymentCollected" 
              checked={checks.paymentCollected}
              onCheckedChange={(checked) => setChecks(prev => ({ ...prev, paymentCollected: checked === true }))}
            />
            <label
              htmlFor="paymentCollected"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              ¿Se ha cobrado el 100% del monto acordado?
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="docsSigned" 
              checked={checks.docsSigned}
              onCheckedChange={(checked) => setChecks(prev => ({ ...prev, docsSigned: checked === true }))}
            />
            <label
              htmlFor="docsSigned"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              ¿Se ha firmado el acta de conformidad?
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Volver</Button>
          <Button 
            className="bg-emerald-500 hover:bg-emerald-600 text-white" 
            onClick={handleConfirm} 
            disabled={!allChecked}
          >
            Confirmar Finalización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

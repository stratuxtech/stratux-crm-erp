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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

interface CancelProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onConfirm: (reason: string) => void;
}

export function CancelProjectModal({ isOpen, onClose, projectName, onConfirm }: CancelProjectModalProps) {
  const [reason, setReason] = useState<string>("");

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason);
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border-destructive/20">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle>Cancelar Proyecto</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Estás a punto de cancelar el proyecto <span className="font-semibold text-foreground">{projectName}</span>.
            Esta acción es irreversible y afectará negativamente las métricas de retención de la empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason" className="text-foreground">Motivo de cancelación <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={(val) => setReason(val || "")} required>
              <SelectTrigger id="reason" className="w-full">
                <SelectValue placeholder="Selecciona un motivo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Falta de pago">Falta de pago</SelectItem>
                <SelectItem value="Cliente inactivo">Cliente inactivo</SelectItem>
                <SelectItem value="Mutuo acuerdo">Mutuo acuerdo</SelectItem>
                <SelectItem value="Problemas técnicos">Problemas técnicos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Volver</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason}>
            Confirmar Cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { useLayoutStore } from "@/store/use-layout-store";
import { Loader2 } from "lucide-react";

interface DownBarProps {
  currentStep?: number;
  steps?: { id: number; title: string }[];
  onNext?: () => void;
  onPrev?: () => void;
  onSave?: () => void;
  isNextDisabled?: boolean;
  isSaveDisabled?: boolean;
  isLoading?: boolean;
  showNext?: boolean;
  showSave?: boolean;
  nextLabel?: string;
  saveLabel?: string;
}

export function DownBar({
  currentStep = 1,
  steps = [],
  onNext,
  onPrev,
  onSave,
  isNextDisabled = false,
  isSaveDisabled = false,
  isLoading = false,
  showNext = true,
  showSave = false,
  nextLabel = "Siguiente",
  saveLabel = "Guardar y Emitir",
}: DownBarProps) {
  const { isSidebarCollapsed } = useLayoutStore();

  return (
    <div 
      className={`fixed bottom-0 right-0 h-20 border-t border-border bg-card flex items-center justify-between px-4 sm:px-8 z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] transition-all duration-300 left-0 ${
        isSidebarCollapsed ? 'md:left-20' : 'md:left-64'
      }`}
    >
      {/* Clean Stepper with Badges */}
      <div className="flex items-center gap-2 sm:gap-3">
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isPast = step.id < currentStep;
          
          return (
            <div
              key={step.id}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center justify-center min-w-[32px] ${
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : isPast 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted text-muted-foreground/50"
              }`}
            >
              <span className="sm:hidden">{step.id}</span>
              <span className="hidden sm:inline">{step.id}. {step.title}</span>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center gap-4">
        {showNext && (
          <Button onClick={onNext} disabled={isNextDisabled || isLoading} className="w-32">
            {nextLabel}
          </Button>
        )}

        {showSave && (
          <Button 
            onClick={() => {
              if (!isSaveDisabled && !isLoading && onSave) {
                onSave();
              }
            }} 
            disabled={isSaveDisabled || isLoading} 
            variant="default" 
            className="min-w-[200px] px-6 bg-secondary text-secondary-foreground hover:bg-secondary/90 flex items-center justify-center gap-2 font-semibold shadow-sm transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-secondary-foreground" />
                <span>Guardando en Sheets...</span>
              </>
            ) : (
              <span>{saveLabel}</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

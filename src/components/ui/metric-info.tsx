"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MetricInfoProps {
  title?: string;
  description: string;
  className?: string;
  iconClassName?: string;
}

export function MetricInfo({
  title,
  description,
  className,
  iconClassName,
}: MetricInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider delay={0}>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen((prev) => !prev);
              }}
              className={cn(
                "inline-flex items-center justify-center p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-help",
                className
              )}
              aria-label={title || "Información de la métrica"}
            >
              <Info className={cn("w-3.5 h-3.5", iconClassName)} />
            </button>
          }
        />
        <TooltipContent
          side="top"
          sideOffset={6}
          className="z-50 max-w-xs p-3 rounded-lg bg-white text-neutral-900 border border-neutral-200 shadow-xl text-left pointer-events-auto select-text"
        >
          {title && (
            <p className="font-bold text-xs text-neutral-950 mb-1 border-b border-neutral-100 pb-1">
              {title}
            </p>
          )}
          <p className="text-[12px] font-normal text-neutral-800 leading-relaxed whitespace-normal">
            {description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

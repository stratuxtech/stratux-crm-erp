"use client";

import React from "react";
import Link from "next/link";
import { LucideIcon, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  variant?: "default" | "card" | "minimal";
  size?: "sm" | "default" | "lg";
}

export function EmptyState({
  icon: Icon = HelpCircle,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryLabel,
  onSecondaryAction,
  className,
  variant = "card",
  size = "default"
}: EmptyStateProps) {
  const isMinimal = variant === "minimal";
  const isCard = variant === "card";

  const sizeClasses = {
    sm: "py-6 px-4 space-y-2",
    default: "py-10 px-6 space-y-4",
    lg: "py-16 px-8 space-y-6"
  };

  const iconSizes = {
    sm: "w-8 h-8",
    default: "w-12 h-12",
    lg: "w-16 h-16"
  };

  const iconWrapperSizes = {
    sm: "p-2.5",
    default: "p-4",
    lg: "p-5"
  };

  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center", sizeClasses[size], className)}>
      {/* Icon with glowing aura */}
      <div className="relative mb-1">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-60" />
        <div className={cn("relative rounded-2xl bg-muted/60 border border-border/80 text-muted-foreground flex items-center justify-center shadow-sm", iconWrapperSizes[size])}>
          <Icon className={cn("text-muted-foreground/80", iconSizes[size])} />
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-1.5 max-w-md">
        <h3 className={cn("font-heading font-bold text-foreground", size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base")}>
          {title}
        </h3>
        <p className={cn("text-muted-foreground leading-relaxed", size === "sm" ? "text-xs" : "text-sm")}>
          {description}
        </p>
      </div>

      {/* Actions */}
      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {actionLabel && (
            actionHref ? (
              <Link href={actionHref}>
                <Button size={size === "sm" ? "sm" : "default"} className="font-semibold shadow-sm">
                  {actionLabel}
                </Button>
              </Link>
            ) : (
              <Button onClick={onAction} size={size === "sm" ? "sm" : "default"} className="font-semibold shadow-sm">
                {actionLabel}
              </Button>
            )
          )}

          {secondaryLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction} size={size === "sm" ? "sm" : "default"}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (isCard) {
    return (
      <Card className="w-full border border-dashed border-border/80 bg-card/50 shadow-none overflow-hidden backdrop-blur-xs">
        {content}
      </Card>
    );
  }

  return content;
}

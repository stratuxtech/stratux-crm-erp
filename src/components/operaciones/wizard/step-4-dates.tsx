'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Info } from 'lucide-react';
import { useProposalStore } from '@/store/use-proposal-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function Step4Dates() {
  const { 
    presentationDate, 
    hasStartDate, startDate, 
    hasExpectedEndDate, expectedEndDate, 
    updateDates 
  } = useProposalStore();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-xl font-heading">Fechas Operativas del Proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Fecha de Presentación */}
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/10 h-full flex flex-col justify-start">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Fecha de Presentación</Label>
                <p className="text-xs text-muted-foreground">Obligatorio para presentar la propuesta al cliente.</p>
              </div>
              <Popover>
                <PopoverTrigger render={<Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !presentationDate && "text-muted-foreground"
                    )}
                   />}>
  
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {presentationDate ? format(presentationDate, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                  
</PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={presentationDate || undefined}
                    onSelect={(date) => updateDates({ presentationDate: date || null })}
                    
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Fecha Inicio */}
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/10 h-full flex flex-col justify-start">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Fecha de Inicio Estimada</Label>
                <Switch 
                  checked={hasStartDate} 
                  onCheckedChange={(c) => updateDates({ hasStartDate: c })} 
                />
              </div>
              
              {!hasStartDate ? (
                <div className="flex items-start gap-2 text-xs text-amber-500/80 bg-amber-500/10 p-3 rounded-md mt-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Si no se agrega esta información, la fecha de inicio del proyecto se tendrá que agregar obligatoriamente luego (al momento del Alta).</p>
                </div>
              ) : (
                <div className="pt-2">
                  <Popover>
                    <PopoverTrigger render={<Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                       />}>
  
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                      
</PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate || undefined}
                        onSelect={(date) => updateDates({ startDate: date || null })}
                        
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Fecha Fin Esperada */}
            <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/10 h-full flex flex-col justify-start">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Fecha Fin Esperada</Label>
                <Switch 
                  checked={hasExpectedEndDate} 
                  onCheckedChange={(c) => updateDates({ hasExpectedEndDate: c })} 
                />
              </div>

              {!hasExpectedEndDate ? (
                <div className="flex items-start gap-2 text-xs text-amber-500/80 bg-amber-500/10 p-3 rounded-md mt-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Si no se agrega esta información, la fecha de fin del proyecto se tendrá que agregar obligatoriamente luego.</p>
                </div>
              ) : (
                <div className="pt-2">
                  <Popover>
                    <PopoverTrigger render={<Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !expectedEndDate && "text-muted-foreground"
                        )}
                       />}>
  
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expectedEndDate ? format(expectedEndDate, "PPP", { locale: es }) : <span>Seleccione fecha</span>}
                      
</PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={expectedEndDate || undefined}
                        onSelect={(date) => updateDates({ expectedEndDate: date || null })}
                        
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

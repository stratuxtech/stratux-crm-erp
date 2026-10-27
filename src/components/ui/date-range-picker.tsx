"use client";


import { format, subDays, startOfMonth, endOfMonth, startOfYear, startOfQuarter, endOfQuarter } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ date, setDate, className }: DateRangePickerProps) {
  const handleShortcut = (type: string) => {
    const today = new Date();
    switch (type) {
      case 'mes':
        setDate({ from: startOfMonth(today), to: endOfMonth(today) });
        break;
      case 'trimestre':
        setDate({ from: startOfQuarter(today), to: endOfQuarter(today) });
        break;
      case 'ano':
        setDate({ from: startOfYear(today), to: today });
        break;
      case 'historico':
        setDate({ from: subDays(today, 365 * 5), to: today }); // last 5 years
        break;
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={
        <Button
          id="date"
          variant={"outline"}
          className={cn(
            "w-full sm:w-[300px] justify-start text-left font-normal bg-card",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date?.from ? (
            <span className="truncate">
              {date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: es })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: es })
              )}
            </span>
          ) : (
            <span>Selecciona un rango</span>
          )}
        </Button>
      } />
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="border-b sm:border-b-0 sm:border-r border-border p-3 space-y-2 flex flex-row sm:flex-col justify-between sm:justify-start min-w-[120px] overflow-x-auto">
            <span className="text-xs font-semibold text-muted-foreground mb-1 uppercase hidden sm:block">Atajos</span>
            <Button variant="ghost" size="sm" className="justify-start shrink-0" onClick={() => handleShortcut('mes')}>Mes</Button>
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
  );
}

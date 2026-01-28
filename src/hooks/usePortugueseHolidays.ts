import { useMemo } from "react";
import { isSameDay } from "date-fns";

// Portuguese national holidays - fixed dates
const getFixedHolidays = (year: number): Date[] => [
  new Date(year, 0, 1),   // Ano Novo
  new Date(year, 3, 25),  // Dia da Liberdade
  new Date(year, 4, 1),   // Dia do Trabalhador
  new Date(year, 5, 10),  // Dia de Portugal
  new Date(year, 7, 15),  // Assunção de Nossa Senhora
  new Date(year, 9, 5),   // Implantação da República
  new Date(year, 10, 1),  // Dia de Todos os Santos
  new Date(year, 11, 1),  // Restauração da Independência
  new Date(year, 11, 8),  // Imaculada Conceição
  new Date(year, 11, 25), // Natal
];

// Calculate Easter Sunday using Anonymous Gregorian algorithm
const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
};

// Get movable holidays based on Easter
const getMovableHolidays = (year: number): Date[] => {
  const easter = getEasterSunday(year);
  
  // Good Friday (Sexta-feira Santa) - 2 days before Easter
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  
  // Easter Sunday (Páscoa)
  const easterSunday = new Date(easter);
  
  // Corpus Christi - 60 days after Easter
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  
  return [goodFriday, easterSunday, corpusChristi];
};

// Get all Portuguese holidays for a given year
export const getPortugueseHolidays = (year: number): Date[] => {
  return [...getFixedHolidays(year), ...getMovableHolidays(year)];
};

// Hook to get holidays for next N months
export const usePortugueseHolidays = (monthsAhead: number = 12) => {
  return useMemo(() => {
    const holidays: Date[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get holidays for current year and next year to cover monthsAhead
    holidays.push(...getPortugueseHolidays(currentYear));
    holidays.push(...getPortugueseHolidays(currentYear + 1));
    
    // Filter to only include upcoming holidays
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    return holidays.filter(h => h >= startOfToday);
  }, [monthsAhead]);
};

// Check if a date is a Portuguese holiday
export const isPortugueseHoliday = (date: Date, holidays: Date[]): boolean => {
  return holidays.some(holiday => isSameDay(date, holiday));
};

// Get holiday name for display (optional)
export const getHolidayName = (date: Date): string | null => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Fixed holidays
  if (month === 0 && day === 1) return "Ano Novo";
  if (month === 3 && day === 25) return "Dia da Liberdade";
  if (month === 4 && day === 1) return "Dia do Trabalhador";
  if (month === 5 && day === 10) return "Dia de Portugal";
  if (month === 7 && day === 15) return "Assunção de Nossa Senhora";
  if (month === 9 && day === 5) return "Implantação da República";
  if (month === 10 && day === 1) return "Dia de Todos os Santos";
  if (month === 11 && day === 1) return "Restauração da Independência";
  if (month === 11 && day === 8) return "Imaculada Conceição";
  if (month === 11 && day === 25) return "Natal";
  
  // Movable holidays - check against Easter
  const easter = getEasterSunday(year);
  
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  if (isSameDay(date, goodFriday)) return "Sexta-feira Santa";
  
  if (isSameDay(date, easter)) return "Páscoa";
  
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  if (isSameDay(date, corpusChristi)) return "Corpo de Deus";
  
  return null;
};

import { HDate, getHolidaysOnDate, gematriya, flags } from '@hebcal/core';

/**
 * Strips Hebrew vowels (nikud) and cantillation marks from a string.
 */
export const stripNikud = (text: string): string => {
  return text.replace(/[\u0591-\u05C7]/g, '');
};

/**
 * Returns the Hebrew date (in gematriya, e.g., "ט״ו" or "א' בתמוז") and holiday labels
 * for a given Gregorian date string (YYYY-MM-DD).
 */
export const getHebrewDateAndHolidays = (dateStr: string): { hebrewDate: string; holiday?: string } => {
  // Set time to noon (12:00) to prevent timezone shifts from changing the day
  const d = new Date(dateStr);
  d.setHours(12, 0, 0, 0);

  const hdate = new HDate(d);
  const day = hdate.getDate();
  const dayGematriya = gematriya(day);

  // Formatting hebrew date:
  // On the first of the month, display "א' ב[חודש]" (e.g., "א' תמוז").
  // Otherwise, just show the day in gematriya (e.g., "ט״ו").
  let hebrewDate = dayGematriya;
  if (day === 1) {
    hebrewDate = hdate.renderGematriya(true, true);
  }

  // Retrieve holidays for this date
  const holidays = getHolidaysOnDate(hdate) || [];

  // Define mask of holidays we want to show on the calendar
  const holidayMask =
    flags.CHAG |
    flags.ROSH_CHODESH |
    flags.MINOR_FAST |
    flags.MAJOR_FAST |
    flags.MINOR_HOLIDAY |
    flags.CHOL_HAMOED |
    flags.MODERN_HOLIDAY;

  const relevantHolidays = holidays.filter((ev) => (ev.mask & holidayMask) !== 0);

  let holidayLabel: string | undefined = undefined;
  if (relevantHolidays.length > 0) {
    // Format holiday names in Hebrew and strip nikud
    holidayLabel = relevantHolidays.map((ev) => stripNikud(ev.render('he'))).join(', ');
  }

  return {
    hebrewDate,
    holiday: holidayLabel,
  };
};

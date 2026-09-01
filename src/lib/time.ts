/**
 * Returns true only if `value` is a real HH:MM clock time (e.g. "16:27" or
 * "08:00"). Returns false for anything else, including placeholder values
 * like "", "--", "--:--", null, or undefined.
 *
 * Attendance records use placeholder strings to mean "no time recorded",
 * but the placeholder text isn't always consistent (auto-generated records
 * use "--:--", while manual admin edits have used things like "--"). Rather
 * than checking for one exact placeholder string, this checks whether the
 * value actually looks like a clock time, which is safe against any
 * placeholder spelling.
 */
export function isValidClockTime(value?: string | null): boolean {
  if (!value) return false;
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

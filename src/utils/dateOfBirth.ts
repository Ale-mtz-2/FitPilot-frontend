export const calculateAgeFromDateOfBirth = (
  dateOfBirth?: string | null,
  now: Date = new Date(),
): number | undefined => {
  if (!dateOfBirth) return undefined;

  const normalized = dateOfBirth.trim();
  if (!normalized) return undefined;

  const dateOnly = normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const dob = new Date(year, month - 1, day);
  const isValidDob =
    dob.getFullYear() === year &&
    dob.getMonth() === month - 1 &&
    dob.getDate() === day;
  if (!isValidDob) return undefined;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const isFutureDate =
    year > currentYear ||
    (year === currentYear && month > currentMonth) ||
    (year === currentYear && month === currentMonth && day > currentDay);
  if (isFutureDate) return undefined;

  let age = currentYear - year;
  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1;
  }

  if (!Number.isFinite(age) || age < 0) return undefined;
  return age;
};

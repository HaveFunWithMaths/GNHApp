import { PrasadamCount, Expense, MonthlyLedger, Devotee, DevoteeMonthlySummary } from '../types';
import { getFamilyMemberNames } from './devoteeHelpers';

export const PRASADAM_RATES = {
  breakfast: 40,
  lunch: 80,
  dinner: 40,
} as const;

/**
 * Returns the total days in a given YYYY-MM month string
 */
export function getDaysInMonth(cycleMonth: string): number {
  const [yearStr, monthStr] = cycleMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed
  return new Date(year, month, 0).getDate();
}

/**
 * Returns an array of date strings 'YYYY-MM-DD' for the month
 */
export function getAllDatesInMonth(cycleMonth: string): string[] {
  const [yearStr, monthStr] = cycleMonth.split('-');
  const daysCount = getDaysInMonth(cycleMonth);
  const dates: string[] = [];
  for (let d = 1; d <= daysCount; d++) {
    const dayFormatted = d.toString().padStart(2, '0');
    dates.push(`${yearStr}-${monthStr}-${dayFormatted}`);
  }
  return dates;
}

/**
 * Calculates the Cutoff Date/Time:
 * 8:00 PM (20:00) on the last-but-one day of the given month.
 * e.g., for August (31 days) -> Aug 30 at 20:00:00.
 */
export function getCutoffDateTime(cycleMonth: string): Date {
  const [yearStr, monthStr] = cycleMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDays = new Date(year, month, 0).getDate();
  const lastButOneDay = totalDays - 1;

  // Month is 0-indexed in JS Date constructor
  return new Date(year, month - 1, lastButOneDay, 20, 0, 0, 0);
}

/**
 * Returns exact formatted Cutoff Date string, e.g. "30 Aug 2026, 8:00 PM"
 */
export function getCutoffFormattedDate(cycleMonth: string): string {
  const cutoff = getCutoffDateTime(cycleMonth);
  const day = cutoff.getDate();
  const monthName = cutoff.toLocaleDateString('en-US', { month: 'short' });
  const year = cutoff.getFullYear();
  return `${day} ${monthName} ${year}, 8:00 PM`;
}

/**
 * Checks if the cutoff has passed for a given month relative to a specific time
 */
export function isCutoffPassed(cycleMonth: string, now: Date = new Date()): boolean {
  const cutoff = getCutoffDateTime(cycleMonth);
  return now.getTime() >= cutoff.getTime();
}

/**
 * Calculates human-readable countdown to cutoff
 */
export function getCutoffCountdown(cycleMonth: string, now: Date = new Date()): {
  isPassed: boolean;
  text: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const cutoff = getCutoffDateTime(cycleMonth);
  const diffMs = cutoff.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      isPassed: true,
      text: 'Closed (Booking Closed)',
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const seconds = Math.floor((diffMs / 1000) % 60);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let text = '';
  if (days > 0) text += `${days}d `;
  text += `${hours}h ${minutes}m ${seconds}s`;

  return {
    isPassed: false,
    text: `Closes in ${text}`,
    days,
    hours,
    minutes,
    seconds,
  };
}

/**
 * Formats devotee name:
 * If 1 family member, doesn't mention "Group".
 */
export function formatDevoteeName(devotee: Devotee): string {
  const names = getFamilyMemberNames(devotee);
  if (names && names.length === 1) {
    return names[0];
  }
  return devotee.group_name;
}

export const DEFAULT_COMMUNITY_COST_PER_MEMBER = 500;

/**
 * Compute raw Meals cost for given counts (Breakfast, Lunch, Dinner)
 */
export function calculateMealsCost(breakfast: number, lunch: number, dinner: number): number {
  return (
    breakfast * PRASADAM_RATES.breakfast +
    lunch * PRASADAM_RATES.lunch +
    dinner * PRASADAM_RATES.dinner
  );
}

/**
 * Compute Total Prasadam cost including meals cost and family member community cost
 */
export function calculatePrasadamCost(
  breakfast: number,
  lunch: number,
  dinner: number,
  memberCount: number = 0,
  communityCostPerMember: number = DEFAULT_COMMUNITY_COST_PER_MEMBER
): number {
  const mealsCost = calculateMealsCost(breakfast, lunch, dinner);
  const communityCost = memberCount * communityCostPerMember;
  return mealsCost + communityCost;
}

/**
 * Compute auto-fill slots for a devotee in a given month:
 * Max entered B, Max entered L, Max entered D.
 * Default to 1 if no entered counts exist.
 */
export function calculateDevoteeMaxCounts(counts: PrasadamCount[]): {
  maxB: number;
  maxL: number;
  maxD: number;
} {
  const enteredCounts = counts.filter(c => !c.is_auto_filled && (c.breakfast_count > 0 || c.lunch_count > 0 || c.dinner_count > 0));
  
  if (enteredCounts.length === 0) {
    return { maxB: 1, maxL: 1, maxD: 1 };
  }

  const maxB = Math.max(...enteredCounts.map(c => c.breakfast_count), 0);
  const maxL = Math.max(...enteredCounts.map(c => c.lunch_count), 0);
  const maxD = Math.max(...enteredCounts.map(c => c.dinner_count), 0);

  return {
    maxB: maxB > 0 ? maxB : 1,
    maxL: maxL > 0 ? maxL : 1,
    maxD: maxD > 0 ? maxD : 1,
  };
}

/**
 * Computes full summary for a single devotee for the active month
 */
export function computeDevoteeMonthlySummary(
  devotee: Devotee,
  cycleMonth: string,
  allCounts: PrasadamCount[],
  allExpenses: Expense[],
  ledger?: MonthlyLedger | null,
  communityCostPerMember: number = DEFAULT_COMMUNITY_COST_PER_MEMBER,
  now: Date = new Date()
): DevoteeMonthlySummary {
  const devoteeCounts = allCounts.filter(
    c => c.devotee_id === devotee.id && c.date.startsWith(cycleMonth)
  );

  const monthDates = getAllDatesInMonth(cycleMonth);
  const countMap = new Map(devoteeCounts.map(c => [c.date, c]));

  let breakfast_total = 0;
  let lunch_total = 0;
  let dinner_total = 0;
  let unfilled_days = 0;

  monthDates.forEach(dateStr => {
    const entry = countMap.get(dateStr);
    if (entry) {
      breakfast_total += entry.breakfast_count || 0;
      lunch_total += entry.lunch_count || 0;
      dinner_total += entry.dinner_count || 0;
      if (entry.breakfast_count === 0 && entry.lunch_count === 0 && entry.dinner_count === 0 && !entry.is_auto_filled) {
        unfilled_days++;
      }
    } else {
      unfilled_days++;
    }
  });

  const total_meals = breakfast_total + lunch_total + dinner_total;
  const meals_cost = calculateMealsCost(breakfast_total, lunch_total, dinner_total);

  // Community cost calculation
  const memberNames = getFamilyMemberNames(devotee);
  const family_member_count = memberNames.length > 0 ? memberNames.length : 1;
  const community_cost = family_member_count * communityCostPerMember;
  const prasadam_cost = meals_cost + community_cost;

  // Filter regular expenses for this devotee and cycle month
  const devoteeRegularExpenses = allExpenses.filter(
    e => e.devotee_id === devotee.id && e.cycle_month === cycleMonth && e.type === 'REGULAR'
  );

  const approved_expenses = devoteeRegularExpenses
    .filter(e => e.status === 'APPROVED')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const rejected_expenses = devoteeRegularExpenses
    .filter(e => e.status === 'REJECTED')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const current_month_net = prasadam_cost - approved_expenses;
  const carried_forward = ledger ? Number(ledger.carried_forward_amount || 0) : 0;
  const settlement_reported = ledger && (ledger.settlement_status === 'SETTLED' || ledger.settlement_status === 'PENDING_VERIFICATION')
    ? Number(ledger.settlement_amount_reported || 0)
    : 0;

  const final_balance = current_month_net + carried_forward - settlement_reported;

  // Filter Janmashtami expenses
  const devoteeJanmashtamiExpenses = allExpenses.filter(
    e => e.devotee_id === devotee.id && e.type === 'JANMASHTAMI' && e.status === 'APPROVED'
  );
  const janmashtami_expenses = devoteeJanmashtamiExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const is_locked = isCutoffPassed(cycleMonth, now);

  return {
    devotee,
    cycle_month: cycleMonth,
    breakfast_total,
    lunch_total,
    dinner_total,
    total_meals,
    meals_cost,
    family_member_count,
    community_cost_per_member: communityCostPerMember,
    community_cost,
    prasadam_cost,
    approved_expenses,
    rejected_expenses,
    current_month_net,
    carried_forward,
    settlement_reported,
    settlement_status: ledger?.settlement_status || 'UNSETTLED',
    settlement_date_reported: ledger?.settlement_date_reported || null,
    final_balance,
    unfilled_days,
    is_locked,
    janmashtami_expenses,
  };
}

/**
 * Format currency with Indian rupee symbol
 */
export function formatRupee(amount: number): string {
  if (!amount || Math.abs(amount) < 0.001) {
    return '₹0';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Month string helper e.g. "2026-08" -> "August 2026"
 */
export function formatMonthName(cycleMonth: string): string {
  const [yearStr, monthStr] = cycleMonth.split('-');
  const date = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Get current cycle month formatted 'YYYY-MM'
 */
export function getCurrentCycleMonth(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${yyyy}-${mm}`;
}

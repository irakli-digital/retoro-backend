/**
 * Return logic utilities matching iOS app's ReturnLogic.swift
 */

export function calculateDeadline(
  purchaseDate: Date,
  returnWindowDays: number
): Date {
  if (returnWindowDays === 0) {
    // No deadline (like Nordstrom) - set to 10 years from purchase
    const deadline = new Date(purchaseDate);
    deadline.setFullYear(deadline.getFullYear() + 10);
    return deadline;
  }

  const deadline = new Date(purchaseDate);
  deadline.setDate(deadline.getDate() + returnWindowDays);
  return deadline;
}

export function getDaysRemaining(deadline: Date): number {
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export type UrgencyLevel = "overdue" | "urgent" | "due_soon" | "safe";

export function getUrgencyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining < 0) {
    return "overdue";
  } else if (daysRemaining <= 2) {
    return "urgent";
  } else if (daysRemaining <= 7) {
    return "due_soon";
  } else {
    return "safe";
  }
}

export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) {
    const absDays = Math.abs(daysRemaining);
    return `Overdue by ${absDays} ${absDays === 1 ? "day" : "days"}`;
  } else if (daysRemaining === 0) {
    return "Due today";
  } else if (daysRemaining === 1) {
    return "1 day left";
  } else {
    return `${daysRemaining} days left`;
  }
}

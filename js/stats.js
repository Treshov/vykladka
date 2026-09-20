import { addDaysISO, compareISO, todayISO } from "./dateUtils.js";

/**
 * Current streak of consecutive "done" days ending at the most recent
 * done/missed day (today or earlier). "off" days are skipped and don't
 * break the streak. A "missed" day or an unmarked past day stops it.
 */
export function computeStreak(channel, marks) {
  const today = todayISO();
  let cursor = compareISO(today, channel.start) < 0 ? null : today;
  if (!cursor) return 0;

  let streak = 0;
  while (compareISO(cursor, channel.start) >= 0) {
    const status = marks[cursor];
    if (status === "done" || status === "planned") {
      streak += 1;
    } else if (status === "off") {
      // day off does not break the streak, just skip it
    } else {
      break;
    }
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function computeAllTimeStats(channelMarks) {
  let done = 0;
  let missed = 0;
  for (const status of Object.values(channelMarks)) {
    if (status === "done") done += 1;
    else if (status === "missed") missed += 1;
  }
  return { done, missed };
}

export function computeMonthStats(channelMarks, year, monthIndex) {
  let done = 0;
  let missed = 0;
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  for (const [date, status] of Object.entries(channelMarks)) {
    if (!date.startsWith(prefix)) continue;
    if (status === "done") done += 1;
    else if (status === "missed") missed += 1;
  }
  return { done, missed };
}

export function computeTodaySummary(channels, marks) {
  const today = todayISO();
  const tracked = channels.filter((c) => compareISO(c.start, today) <= 0);
  const settled = tracked.filter((c) => {
    const status = (marks[c.id] || {})[today];
    return status === "done" || status === "missed" || status === "off";
  });
  const pending = tracked.filter((c) => !settled.includes(c));
  return { total: tracked.length, settled: settled.length, pending };
}

// Simplified SM-2 scheduler: fixed learning steps for the first review,
// then ease-based intervals once a card has graduated (reps > 0).

export type Grade = "again" | "hard" | "good" | "easy";

export interface SrsState {
  intervalDays: number;
  ease: number;
  reps: number;
}

export interface SrsResult extends SrsState {
  dueAt: Date;
}

const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function scheduleReview(
  state: SrsState,
  grade: Grade,
  now: Date = new Date()
): SrsResult {
  const { ease, reps } = state;

  if (reps === 0) {
    switch (grade) {
      case "again":
        return {
          intervalDays: 10 / 1440,
          ease,
          reps: 0,
          dueAt: new Date(now.getTime() + 10 * 60 * 1000),
        };
      case "hard":
      case "good":
        return { intervalDays: 1, ease, reps: 1, dueAt: addDays(now, 1) };
      case "easy":
        return { intervalDays: 4, ease, reps: 1, dueAt: addDays(now, 4) };
    }
  }

  let { intervalDays } = state;
  let nextEase = ease;
  let nextReps = reps;

  switch (grade) {
    case "again":
      nextReps = 0;
      nextEase = Math.max(MIN_EASE, ease - 0.2);
      intervalDays = 1;
      break;
    case "hard":
      nextEase = Math.max(MIN_EASE, ease - 0.15);
      intervalDays = Math.max(1, intervalDays * 1.2);
      nextReps = reps + 1;
      break;
    case "good":
      intervalDays = intervalDays * ease;
      nextReps = reps + 1;
      break;
    case "easy":
      nextEase = ease + 0.15;
      intervalDays = intervalDays * ease * 1.3;
      nextReps = reps + 1;
      break;
  }

  return { intervalDays, ease: nextEase, reps: nextReps, dueAt: addDays(now, intervalDays) };
}

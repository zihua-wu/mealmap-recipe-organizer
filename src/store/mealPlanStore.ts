import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealPlan, MealPlanEntry, MealSlot, DayOfWeek } from '@/types';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Returns "YYYY-MM-DD" for the Monday of the week containing `date` */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

interface MealPlanState {
  plans: MealPlan[];
  /** ISO week start ("YYYY-MM-DD") currently displayed in the planner */
  activeWeekStart: string;

  // Navigation
  setActiveWeek: (weekStart: string) => void;
  prevWeek: () => void;
  nextWeek: () => void;

  // Entry management
  setMealEntry: (
    weekStart: string,
    dayOfWeek: DayOfWeek,
    mealSlot: MealSlot,
    recipeId: string
  ) => void;
  removeMealEntry: (
    weekStart: string,
    dayOfWeek: DayOfWeek,
    mealSlot: MealSlot
  ) => void;

  /** Returns the plan for a given weekStart, or undefined */
  getPlan: (weekStart: string) => MealPlan | undefined;
  /** Returns the active plan (creates a stub if none exists yet) */
  getActivePlan: () => MealPlan;
}

function shiftWeek(weekStart: string, delta: number): string {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().slice(0, 10);
}

export const useMealPlanStore = create<MealPlanState>()(
  persist(
    (set, get) => ({
      plans: [],
      activeWeekStart: getWeekStart(),

      setActiveWeek: (weekStart) => set({ activeWeekStart: weekStart }),
      prevWeek: () =>
        set((s) => ({ activeWeekStart: shiftWeek(s.activeWeekStart, -1) })),
      nextWeek: () =>
        set((s) => ({ activeWeekStart: shiftWeek(s.activeWeekStart, 1) })),

      getPlan: (weekStart) => get().plans.find((p) => p.weekStart === weekStart),

      getActivePlan: () => {
        const { activeWeekStart, plans } = get();
        return (
          plans.find((p) => p.weekStart === activeWeekStart) ?? {
            id: '',
            weekStart: activeWeekStart,
            entries: [],
          }
        );
      },

      setMealEntry: (weekStart, dayOfWeek, mealSlot, recipeId) => {
        set((s) => {
          const existing = s.plans.find((p) => p.weekStart === weekStart);

          const newEntry: MealPlanEntry = {
            id: newId(),
            dayOfWeek,
            mealSlot,
            recipeId,
          };

          if (!existing) {
            // Create new plan for this week
            return {
              plans: [
                ...s.plans,
                { id: newId(), weekStart, entries: [newEntry] },
              ],
            };
          }

          // Update existing plan — replace if same slot exists
          const updatedEntries = [
            ...existing.entries.filter(
              (e) => !(e.dayOfWeek === dayOfWeek && e.mealSlot === mealSlot)
            ),
            newEntry,
          ];

          return {
            plans: s.plans.map((p) =>
              p.weekStart === weekStart ? { ...p, entries: updatedEntries } : p
            ),
          };
        });
      },

      removeMealEntry: (weekStart, dayOfWeek, mealSlot) => {
        set((s) => ({
          plans: s.plans.map((p) =>
            p.weekStart === weekStart
              ? {
                  ...p,
                  entries: p.entries.filter(
                    (e) =>
                      !(e.dayOfWeek === dayOfWeek && e.mealSlot === mealSlot)
                  ),
                }
              : p
          ),
        }));
      },
    }),
    {
      name: 'recipe-organizer:mealplans',
      partialize: (s) => ({ plans: s.plans, activeWeekStart: s.activeWeekStart }),
    }
  )
);

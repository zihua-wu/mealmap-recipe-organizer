import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '@/i18n';
import type { AppSettings, Language, UnitSystem } from '@/types';

const SPOONACULAR_DAILY_LIMIT = 150;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface SettingsState extends AppSettings {
  setLanguage: (lang: Language) => void;
  setUnitSystem: (system: UnitSystem) => void;
  toggleUnitSystem: () => void;

  /**
   * Call this BEFORE each Spoonacular request.
   * Returns true if the request is allowed, false if quota is exhausted.
   * Automatically resets the counter when a new day starts.
   */
  consumeSpoonacularRequest: () => boolean;

  remainingRequests: () => number;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'en',
      unitSystem: 'metric',
      spoonacularRequestsToday: 0,
      spoonacularLastResetDate: todayStr(),

      setLanguage: (lang) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },

      setUnitSystem: (system) => set({ unitSystem: system }),

      toggleUnitSystem: () =>
        set((s) => ({
          unitSystem: s.unitSystem === 'metric' ? 'imperial' : 'metric',
        })),

      consumeSpoonacularRequest: () => {
        const today = todayStr();
        const s = get();

        // Reset counter if it's a new day
        if (s.spoonacularLastResetDate !== today) {
          set({
            spoonacularRequestsToday: 1,
            spoonacularLastResetDate: today,
          });
          return true;
        }

        if (s.spoonacularRequestsToday >= SPOONACULAR_DAILY_LIMIT) {
          return false; // quota exhausted
        }

        set((prev) => ({
          spoonacularRequestsToday: prev.spoonacularRequestsToday + 1,
        }));
        return true;
      },

      remainingRequests: () => {
        const s = get();
        if (s.spoonacularLastResetDate !== todayStr()) {
          return SPOONACULAR_DAILY_LIMIT;
        }
        return Math.max(0, SPOONACULAR_DAILY_LIMIT - s.spoonacularRequestsToday);
      },
    }),
    {
      name: 'recipe-organizer:settings',
      partialize: (s) => ({
        language: s.language,
        unitSystem: s.unitSystem,
        spoonacularRequestsToday: s.spoonacularRequestsToday,
        spoonacularLastResetDate: s.spoonacularLastResetDate,
      }),
    }
  )
);

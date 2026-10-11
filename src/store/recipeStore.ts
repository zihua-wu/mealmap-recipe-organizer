import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Recipe, RecipeDraft, RecipeFilters } from '@/types';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// ─── Pure filter logic — exported so components can use with useMemo ─────────

export function applyRecipeFilters(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const q = filters.query.toLowerCase().trim();
  return recipes.filter((r) => {
    if (q) {
      const haystack = [
        r.title,
        r.description,
        ...r.ingredients.map((i) => i.name),
        ...r.tags.map((t) => t.name),
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.cuisines.length > 0 && !filters.cuisines.includes(r.cuisine)) return false;
    if (filters.tags.length > 0) {
      const rt = r.tags.map((t) => t.name);
      if (!filters.tags.every((ft) => rt.includes(ft))) return false;
    }
    if (filters.maxCookTimeMin !== null && r.cookTimeMin > filters.maxCookTimeMin) return false;
    if (filters.ingredientContains.trim()) {
      const needle = filters.ingredientContains.toLowerCase();
      if (!r.ingredients.some((i) => i.name.toLowerCase().includes(needle))) return false;
    }
    return true;
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: RecipeFilters = {
  query: '',
  cuisines: [],
  tags: [],
  maxCookTimeMin: null,
  ingredientContains: '',
};

interface RecipeState {
  recipes: Recipe[];
  filters: RecipeFilters;
  addRecipe: (draft: RecipeDraft) => Recipe;
  updateRecipe: (id: string, patch: Partial<RecipeDraft>) => void;
  deleteRecipe: (id: string) => void;
  getRecipeById: (id: string) => Recipe | undefined;
  setFilters: (filters: Partial<RecipeFilters>) => void;
  resetFilters: () => void;
}

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set, get) => ({
      recipes: [],
      filters: { ...DEFAULT_FILTERS },

      addRecipe: (draft) => {
        const now = new Date().toISOString();
        const recipe: Recipe = { ...draft, id: newId(), createdAt: now, updatedAt: now };
        set((s) => ({ recipes: [...s.recipes, recipe] }));
        return recipe;
      },

      updateRecipe: (id, patch) =>
        set((s) => ({
          recipes: s.recipes.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
          ),
        })),

      deleteRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      getRecipeById: (id) => get().recipes.find((r) => r.id === id),

      setFilters: (partial) =>
        set((s) => ({ filters: { ...s.filters, ...partial } })),

      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
    }),
    {
      name: 'recipe-organizer:recipes',
      partialize: (s) => ({ recipes: s.recipes, filters: s.filters }),
    }
  )
);

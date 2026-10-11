// ─── Nutrition ─────────────────────────────────────────────────────────────

export interface NutritionData {
  calories: number;   // kcal
  protein: number;    // g
  carbs: number;      // g
  fat: number;        // g
  /** ISO timestamp when data was fetched from API */
  fetchedAt: string;
}

// ─── Ingredient ────────────────────────────────────────────────────────────

export type UnitSystem = 'metric' | 'imperial';

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  order: number;
  /** Cached nutrition for this ingredient line (null = not yet fetched) */
  nutrition: NutritionData | null;
}

// ─── Instruction Step ──────────────────────────────────────────────────────

export interface InstructionStep {
  id: string;
  order: number;
  text: string;
}

// ─── Tag ───────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
}

// ─── Recipe ────────────────────────────────────────────────────────────────

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  cookTimeMin: number;
  servings: number;
  imageUrl: string;
  ingredients: Ingredient[];
  steps: InstructionStep[];
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

/** Shape used when creating or editing — id/timestamps omitted */
export type RecipeDraft = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Meal Plan ─────────────────────────────────────────────────────────────

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

/** 0 = Monday … 6 = Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface MealPlanEntry {
  id: string;
  dayOfWeek: DayOfWeek;
  mealSlot: MealSlot;
  recipeId: string;
}

export interface MealPlan {
  id: string;
  /** ISO date string for the Monday of this week, e.g. "2026-04-06" */
  weekStart: string;
  entries: MealPlanEntry[];
}

// ─── Grocery List ──────────────────────────────────────────────────────────

export type StoreAisle =
  | 'produce'
  | 'dairy'
  | 'meat & seafood'
  | 'bakery'
  | 'pantry'
  | 'frozen'
  | 'beverages'
  | 'spices & condiments'
  | 'other';

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  aisle: StoreAisle;
  /** Which recipe(s) this item comes from */
  sourceRecipeIds: string[];
  checked: boolean;
}

// ─── App Settings ──────────────────────────────────────────────────────────

export type Language = 'en' | 'zh' | 'es';

export interface AppSettings {
  unitSystem: UnitSystem;
  language: Language;
  /** Remaining Spoonacular requests today (updated after each call) */
  spoonacularRequestsToday: number;
  spoonacularLastResetDate: string; // "YYYY-MM-DD"
}

// ─── Search / Filter ───────────────────────────────────────────────────────

export interface RecipeFilters {
  query: string;
  cuisines: string[];
  tags: string[];
  maxCookTimeMin: number | null;
  ingredientContains: string;
}

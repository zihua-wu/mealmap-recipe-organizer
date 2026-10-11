import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, Users, Plus, Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { useRecipeStore, applyRecipeFilters } from '@/store/recipeStore';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CUISINES = [
  'American','Cantonese','Chinese','French','Indian','Italian',
  'Japanese','Korean','Mediterranean','Mexican','Sichuan','Thai','Other',
];

const MAX_COOK_TIME_STEPS = [15, 30, 45, 60, 90, 120];

// ─── Nutrition mini-bar on card ───────────────────────────────────────────────
function NutritionBar({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  const tracked = recipe.ingredients.filter((i) => i.nutrition);
  if (tracked.length === 0) return null;

  const totals = tracked.reduce(
    (acc, i) => ({
      calories: acc.calories + (i.nutrition?.calories ?? 0),
      protein:  acc.protein  + (i.nutrition?.protein  ?? 0),
      carbs:    acc.carbs    + (i.nutrition?.carbs    ?? 0),
      fat:      acc.fat      + (i.nutrition?.fat      ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-primary">
        {Math.round(totals.calories)} kcal
      </span>
      <span className="text-[10px] text-blue-500 font-medium">P {Math.round(totals.protein)}g</span>
      <span className="text-[10px] text-amber-500 font-medium">C {Math.round(totals.carbs)}g</span>
      <span className="text-[10px] text-rose-400 font-medium">F {Math.round(totals.fat)}g</span>
      {tracked.length < recipe.ingredients.length && (
        <span className="ml-auto text-[10px] text-muted-foreground">
          {t('recipe.tracked', { tracked: tracked.length, total: recipe.ingredients.length })}
        </span>
      )}
    </div>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────
function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block rounded-xl border border-border bg-background shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group"
    >
      {/* Image with gradient overlay */}
      <div className="relative h-44 overflow-hidden">
        {recipe.imageUrl ? (
          <img src={recipe.imageUrl} alt={recipe.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-5xl">
            🍽️
          </div>
        )}
        {/* Cuisine badge floated over image */}
        <span className="absolute top-3 left-3 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
          {t(`cuisine.${recipe.cuisine.toLowerCase()}`, recipe.cuisine)}
        </span>
        {/* Cook time floated over image */}
        <span className="absolute top-3 right-3 rounded-full bg-black/50 backdrop-blur-sm px-2 py-1 text-xs text-white flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {recipe.cookTimeMin}m
        </span>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{recipe.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {t('recipe.servingsCount', { count: recipe.servings })}
          </span>
          {recipe.tags.slice(0, 2).map((tag) => (
            <span key={tag.id}
              className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
              {t(`tags.${tag.name.toLowerCase().replace(/[\s-]+/g, '')}`, tag.name)}
            </span>
          ))}
          {recipe.tags.length > 2 && (
            <span className="text-muted-foreground">+{recipe.tags.length - 2}</span>
          )}
        </div>
        <NutritionBar recipe={recipe} />
      </div>
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <span className="text-5xl" role="img" aria-label="chef">
        {hasFilters ? '🔍' : '👨‍🍳'}
      </span>
      <h2 className="text-xl font-semibold">
        {hasFilters ? t('common.noResults') : t('recipe.empty.title')}
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        {hasFilters ? t('common.tryAdjustingFilters') : t('recipe.empty.description')}
      </p>
      {!hasFilters && (
        <Link
          to="/recipes/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('recipe.empty.action')}
        </Link>
      )}
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────
interface FilterPanelProps {
  allTags: string[];
}

function FilterPanel({ allTags }: FilterPanelProps) {
  const { t } = useTranslation();
  const filters = useRecipeStore((s) => s.filters);
  const { setFilters } = useRecipeStore();

  const toggleCuisine = (c: string) => {
    const next = filters.cuisines.includes(c)
      ? filters.cuisines.filter((x) => x !== c)
      : [...filters.cuisines, c];
    setFilters({ cuisines: next });
  };

  const toggleTag = (tag: string) => {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    setFilters({ tags: next });
  };

  const maxTime = filters.maxCookTimeMin;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-5">
      {/* Cuisine */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t('search.cuisineFilter')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CUISINES.map((c) => (
            <button
              key={c}
              onClick={() => toggleCuisine(c)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs transition-colors border',
                filters.cuisines.includes(c)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              )}
            >
              {t(`cuisine.${c.toLowerCase()}`, c)}
            </button>
          ))}
        </div>
      </div>

      {/* Tags (from existing recipes) */}
      {allTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('search.tagFilter')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs transition-colors border',
                  filters.tags.includes(tag)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                {t(`tags.${tag.toLowerCase().replace(/[\s-]+/g, '')}`, tag)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Max cook time */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {t('search.maxCookTime')}
          </p>
          <span className="text-xs text-muted-foreground">
            {maxTime ? t('search.maxCookTimeValue', { count: maxTime }) : t('search.anyTime')}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MAX_COOK_TIME_STEPS.map((mins) => (
            <button
              key={mins}
              onClick={() => setFilters({ maxCookTimeMin: maxTime === mins ? null : mins })}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs transition-colors border',
                maxTime === mins
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              )}
            >
              ≤ {t('search.maxCookTimeValue', { count: mins })}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredient contains */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t('search.ingredientFilter')}
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filters.ingredientContains}
            onChange={(e) => setFilters({ ingredientContains: e.target.value })}
            placeholder={t('search.ingredientPlaceholder')}
            className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}

// ─── RecipeLibrary ────────────────────────────────────────────────────────────
export function RecipeLibrary() {
  const { t } = useTranslation();
  const recipes = useRecipeStore((s) => s.recipes);
  const filters = useRecipeStore((s) => s.filters);
  const { setFilters, resetFilters } = useRecipeStore();
  const [showFilters, setShowFilters] = useState(false);

  const filteredRecipes = useMemo(
    () => applyRecipeFilters(recipes, filters),
    [recipes, filters]
  );

  // Collect unique tags across all recipes for the filter panel
  const allTags = useMemo(() => {
    const seen = new Set<string>();
    for (const r of recipes) {
      for (const t of r.tags) seen.add(t.name);
    }
    return Array.from(seen).sort();
  }, [recipes]);

  const activeFilterCount =
    filters.cuisines.length +
    filters.tags.length +
    (filters.maxCookTimeMin !== null ? 1 : 0) +
    (filters.ingredientContains.trim() ? 1 : 0);

  const hasActiveFilters = Boolean(filters.query) || activeFilterCount > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.recipes')}</h1>
          {filteredRecipes.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('search.results', { count: filteredRecipes.length })}
            </p>
          )}
        </div>
        <Link
          to="/recipes/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('recipe.create')}</span>
        </Link>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            placeholder={t('search.placeholder')}
            className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors',
            showFilters
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t('common.filter')}
          {activeFilterCount > 0 && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('search.resetFilters')}</span>
          </button>
        )}
      </div>

      {/* Expandable filter panel */}
      {showFilters && <FilterPanel allTags={allTags} />}

      {/* Grid or empty */}
      {filteredRecipes.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} />
      ) : (
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
        >
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}

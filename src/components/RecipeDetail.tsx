import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Clock, Users, Pencil, Trash2,
  ToggleLeft, ToggleRight, FlaskConical,
} from 'lucide-react';
import { useRecipeStore } from '@/store/recipeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { convertIngredient, formatAmount } from '@/lib/unitConverter';
import { cn } from '@/lib/utils';
import type { Ingredient } from '@/types';

// ─── Unit-converted ingredient display ────────────────────────────────────────
function IngredientLine({
  ing,
  unitSystem,
}: {
  ing: Ingredient;
  unitSystem: 'metric' | 'imperial';
}) {
  const converted = convertIngredient(ing.quantity, ing.unit, ing.name, unitSystem);
  const display = converted
    ? `${formatAmount(converted.amount)} ${converted.unit}`
    : `${formatAmount(ing.quantity)} ${ing.unit}`;

  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
        ✓
      </span>
      <span className="flex-1 text-sm">
        <span className="font-medium">{display}</span>{' '}
        <span className="text-muted-foreground">{ing.name}</span>
      </span>
      {ing.nutrition && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground flex items-center gap-1">
          <FlaskConical className="h-2.5 w-2.5" />
          {Math.round(ing.nutrition.calories)} kcal
        </span>
      )}
    </li>
  );
}

// ─── Nutrition summary card ────────────────────────────────────────────────────
function NutritionSummary({ ingredients }: { ingredients: Ingredient[] }) {
  const { t } = useTranslation();
  const withData = ingredients.filter((i) => i.nutrition);
  if (withData.length === 0) return null;

  const totals = useMemo(
    () => withData.reduce(
      (acc, i) => ({
        calories: acc.calories + (i.nutrition?.calories ?? 0),
        protein: acc.protein + (i.nutrition?.protein ?? 0),
        carbs: acc.carbs + (i.nutrition?.carbs ?? 0),
        fat: acc.fat + (i.nutrition?.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ),
    [withData]
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold mb-3">{t('nutrition.title')}</h2>
      <div className="grid grid-cols-4 gap-3 text-center">
        {(
          [
            { key: 'calories', label: t('nutrition.calories'), unit: 'kcal', color: 'text-primary' },
            { key: 'protein', label: t('nutrition.protein'), unit: 'g', color: 'text-blue-500' },
            { key: 'carbs', label: t('nutrition.carbs'), unit: 'g', color: 'text-amber-500' },
            { key: 'fat', label: t('nutrition.fat'), unit: 'g', color: 'text-rose-400' },
          ] as const
        ).map(({ key, label, unit, color }) => (
          <div key={key} className="space-y-0.5">
            <p className={cn('text-xl font-bold', color)}>
              {Math.round(totals[key])}
              <span className="text-xs font-normal ml-0.5">{unit}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        {t('nutrition.perServing')} · {t('nutrition.ingredientsTracked', { tracked: withData.length, total: ingredients.length })}
      </p>
    </div>
  );
}

// ─── RecipeDetail ─────────────────────────────────────────────────────────────
export function RecipeDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const recipe = useRecipeStore((s) => s.recipes.find((r) => r.id === id));
  const deleteRecipe = useRecipeStore((s) => s.deleteRecipe);
  const { unitSystem, toggleUnitSystem } = useSettingsStore();

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-muted-foreground">{t('common.noResults')}</p>
        <Link to="/" className="text-sm text-primary hover:underline">{t('common.back')}</Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(t('recipe.deleteConfirm'))) {
      deleteRecipe(recipe.id);
      navigate('/');
    }
  };

  const sortedIngredients = [...recipe.ingredients].sort((a, b) => a.order - b.order);
  const sortedSteps = [...recipe.steps].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-2xl mx-auto pb-16 space-y-6">
      {/* Back + actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t('common.edit')}
        </Link>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('common.delete')}
        </button>
      </div>

      {/* Hero image */}
      {recipe.imageUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-md">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center text-7xl">
          🍽️
        </div>
      )}

      {/* Title + meta */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {recipe.cuisine}
          </span>
          {recipe.tags.map((tag) => (
            <span key={tag.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {tag.name}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold leading-tight">{recipe.title}</h1>

        {recipe.description && (
          <p className="text-muted-foreground leading-relaxed">{recipe.description}</p>
        )}

        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {t('recipe.cookTimeMin', { count: recipe.cookTimeMin })}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {t('recipe.servingsCount', { count: recipe.servings })}
          </span>
        </div>
      </div>

      {/* Nutrition summary */}
      <NutritionSummary ingredients={sortedIngredients} />

      {/* Ingredients */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('recipe.ingredients')}</h2>
          {/* Unit system toggle */}
          <button
            onClick={toggleUnitSystem}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-accent transition-colors"
            title={t('unit.switchTo', { system: unitSystem === 'metric' ? 'imperial' : 'metric' })}
          >
            {unitSystem === 'metric'
              ? <ToggleLeft className="h-4 w-4 text-primary" />
              : <ToggleRight className="h-4 w-4 text-primary" />}
            {unitSystem === 'metric' ? t('unit.metric') : t('unit.imperial')}
          </button>
        </div>
        <ul className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden px-3">
          {sortedIngredients.map((ing) => (
            <IngredientLine key={ing.id} ing={ing} unitSystem={unitSystem} />
          ))}
        </ul>
      </section>

      {/* Steps */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('recipe.steps')}</h2>
        <ol className="space-y-4">
          {sortedSteps.map((step, i) => (
            <li key={step.id} className="flex gap-4">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-muted-foreground flex-1">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

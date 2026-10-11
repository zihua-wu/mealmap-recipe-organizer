import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, ChevronLeft, ChevronRight, X, Plus, Search, FlaskConical, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useRecipeStore } from '@/store/recipeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useMealPlanStore, getWeekStart } from '@/store/mealPlanStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/toast';
import type { DayOfWeek, MealSlot, NutritionData, Recipe } from '@/types';

const DAYS: { key: DayOfWeek; labelKey: string }[] = [
  { key: 0, labelKey: 'meal.days.mon' },
  { key: 1, labelKey: 'meal.days.tue' },
  { key: 2, labelKey: 'meal.days.wed' },
  { key: 3, labelKey: 'meal.days.thu' },
  { key: 4, labelKey: 'meal.days.fri' },
  { key: 5, labelKey: 'meal.days.sat' },
  { key: 6, labelKey: 'meal.days.sun' },
];
const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

function slotId(day: DayOfWeek, slot: MealSlot) { return `slot::${day}::${slot}`; }
function recipeId(id: string) { return `recipe::${id}`; }

// ─── Draggable recipe card (sidebar) ─────────────────────────────────────────
function DraggableRecipeChip({ recipe }: { recipe: Recipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: recipeId(recipe.id),
    data: { recipeId: recipe.id },
  });
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-md border border-border bg-background px-3 py-2 text-sm cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-40'
      )}
    >
      <p className="font-medium leading-tight line-clamp-1">{recipe.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{recipe.cuisine} · {recipe.cookTimeMin} min</p>
    </div>
  );
}

// ─── Droppable meal slot cell ─────────────────────────────────────────────────
interface MealSlotCellProps {
  day: DayOfWeek;
  slot: MealSlot;
  recipe: Recipe | undefined;
  onRemove: () => void;
  onPickerOpen: (day: DayOfWeek, slot: MealSlot) => void;
}

function MealSlotCell({ day, slot, recipe, onRemove, onPickerOpen }: MealSlotCellProps) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId(day, slot) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[76px] rounded-lg border border-dashed border-border transition-all p-1.5 relative group/cell',
        isOver && 'border-primary bg-primary/10 scale-[1.02]',
        recipe && 'border-solid border-primary/40 bg-primary/5'
      )}
    >
      {recipe ? (
        <div className="h-full flex flex-col gap-1">
          <p className="text-[11px] font-semibold leading-tight line-clamp-3 text-foreground pr-3">
            {recipe.title}
          </p>
          <p className="text-[10px] text-muted-foreground mt-auto">{recipe.cookTimeMin}min</p>
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            aria-label="Remove meal"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onPickerOpen(day, slot)}
          className="w-full h-full min-h-[60px] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 rounded transition-colors"
          aria-label="Assign meal"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Recipe Picker Modal ──────────────────────────────────────────────────────
interface PickerModalProps {
  onSelect: (recipeId: string) => void;
  onClose: () => void;
}

function RecipePickerModal({ onSelect, onClose }: PickerModalProps) {
  const { t } = useTranslation();
  const recipes = useRecipeStore((s) => s.recipes);
  const [q, setQ] = useState('');
  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(q.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 bg-background border border-border rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-72 overflow-y-auto divide-y divide-border">
          {filtered.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground text-center">{t('common.noResults')}</li>
          )}
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onSelect(r.id)}
                className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
              >
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.cuisine} · {r.cookTimeMin} min</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Weekly Nutrition Chart ────────────────────────────────────────────────────
interface DayNutrition {
  day: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionChartProps {
  chartData: DayNutrition[];
  hasAnyData: boolean;
  hasMeals: boolean;
  isFetching: boolean;
  fetchProgress: { done: number; total: number };
  onFetch: () => void;
}

function NutritionChart({ chartData, hasAnyData, hasMeals, isFetching, fetchProgress, onFetch }: NutritionChartProps) {
  const { t } = useTranslation();

  const FetchButton = () => (
    <Button
      size="sm"
      variant="outline"
      onClick={onFetch}
      disabled={isFetching || !hasMeals}
      className="gap-1.5"
    >
      {isFetching
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <FlaskConical className="h-3.5 w-3.5" />}
      {isFetching
        ? `${fetchProgress.done}/${fetchProgress.total} fetching…`
        : t('mealPlan.fetchNutrition')}
    </Button>
  );

  if (!hasAnyData) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <p className="text-sm font-semibold">{t('mealPlan.nutritionEmpty')}</p>
        <p className="text-xs text-muted-foreground">{t('mealPlan.nutritionEmptyDesc')}</p>
        <div className="flex justify-center">
          <FetchButton />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t('nutrition.weeklyChart')}</p>
        <FetchButton />
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(val, name) => [
              `${Math.round(Number(val))}${name === 'calories' ? ' kcal' : 'g'}`,
              String(name).charAt(0).toUpperCase() + String(name).slice(1),
            ]}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="calories" name="calories" fill="hsl(158 64% 32%)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="protein" name="protein" fill="hsl(213 94% 68%)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="carbs" name="carbs" fill="hsl(35 92% 65%)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="fat" name="fat" fill="hsl(352 75% 70%)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {/* Weekly totals */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => {
          const total = chartData.reduce((s, d) => s + d[key], 0);
          const isCalories = key === 'calories';
          const colors: Record<string, string> = {
            calories: 'text-primary',
            protein: 'text-blue-500',
            carbs: 'text-amber-500',
            fat: 'text-rose-400',
          };
          return (
            <div key={key} className="text-center">
              <p className={cn('text-lg font-bold', colors[key])}>
                {Math.round(total)}
                <span className="text-xs font-normal ml-0.5">{isCalories ? 'kcal' : 'g'}</span>
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">{key}{t('mealPlan.perWeek')}</p>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">{t('mealPlan.perServing')}</p>
    </div>
  );
}

// ─── MealPlanner ──────────────────────────────────────────────────────────────
export function MealPlanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recipes = useRecipeStore((s) => s.recipes);
  const { activeWeekStart, prevWeek, nextWeek, getActivePlan, setMealEntry, removeMealEntry } =
    useMealPlanStore();
  const { consumeSpoonacularRequest } = useSettingsStore();

  const plan = getActivePlan();
  const [draggedRecipeId, setDraggedRecipeId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<{ day: DayOfWeek; slot: MealSlot } | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isFetchingNutrition, setIsFetchingNutrition] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ done: 0, total: 0 });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const getEntryRecipe = useCallback(
    (day: DayOfWeek, slot: MealSlot): Recipe | undefined => {
      const entry = plan.entries.find((e) => e.dayOfWeek === day && e.mealSlot === slot);
      if (!entry) return undefined;
      return recipes.find((r) => r.id === entry.recipeId);
    },
    [plan.entries, recipes]
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const rId = String(e.active.id).replace('recipe::', '');
    setDraggedRecipeId(rId);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setDraggedRecipeId(null);
      if (!e.over) return;
      const overId = String(e.over.id);
      if (!overId.startsWith('slot::')) return;
      const [, dayStr, slot] = overId.split('::');
      const rId = (e.active.data.current as { recipeId: string }).recipeId;
      setMealEntry(activeWeekStart, parseInt(dayStr) as DayOfWeek, slot as MealSlot, rId);
    },
    [activeWeekStart, setMealEntry]
  );

  const sidebarRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const draggedRecipe = draggedRecipeId ? recipes.find((r) => r.id === draggedRecipeId) : null;

  // Format week label
  const weekDate = new Date(activeWeekStart + 'T00:00:00');
  const weekLabel = weekDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  // ── Fetch nutrition for all planned meals this week ────────────────────────
  const fetchWeekNutrition = useCallback(async () => {
    const { updateRecipe } = useRecipeStore.getState();

    // Collect all unique recipe IDs from this week's plan
    const recipeIds = [...new Set(plan.entries.map((e) => e.recipeId))];
    const planned = recipeIds
      .map((id) => recipes.find((r) => r.id === id))
      .filter(Boolean) as Recipe[];

    // Count how many ingredients still need fetching
    const toFetch = planned.flatMap((recipe) =>
      recipe.ingredients
        .filter((ing) => !ing.nutrition && ing.name.trim())
        .map((ing) => ({ recipe, ing }))
    );

    if (toFetch.length === 0) return;

    setIsFetchingNutrition(true);
    setFetchProgress({ done: 0, total: toFetch.length });

    let done = 0;
    // Group by recipe so we can batch-update each recipe once
    const pendingByRecipe = new Map<string, typeof toFetch>();
    for (const item of toFetch) {
      const arr = pendingByRecipe.get(item.recipe.id) ?? [];
      arr.push(item);
      pendingByRecipe.set(item.recipe.id, arr);
    }

    let quotaExhausted = false;
    let networkErrorShown = false;

    for (const [recipeId, items] of pendingByRecipe) {
      if (quotaExhausted) break;
      // Get the current recipe (may have been updated by previous iterations)
      const currentRecipe = useRecipeStore.getState().recipes.find((r) => r.id === recipeId);
      if (!currentRecipe) continue;

      const updatedIngredients = [...currentRecipe.ingredients];
      for (const { ing } of items) {
        if (!consumeSpoonacularRequest()) {
          notify.apiLimit();
          quotaExhausted = true;
          break;
        }

        try {
          const query = `${ing.quantity} ${ing.unit} ${ing.name}`;
          const res = await fetch(`/api/nutrition?query=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json() as NutritionData;
            const idx = updatedIngredients.findIndex((i) => i.id === ing.id);
            if (idx !== -1) updatedIngredients[idx] = { ...updatedIngredients[idx], nutrition: data };
          }
        } catch {
          if (!networkErrorShown) {
            notify.network();
            networkErrorShown = true;
          }
        }
        done++;
        setFetchProgress({ done, total: toFetch.length });
      }

      updateRecipe(recipeId, { ingredients: updatedIngredients });
    }

    setIsFetchingNutrition(false);
  }, [plan.entries, recipes, consumeSpoonacularRequest]);

  // ── Weekly nutrition chart data ────────────────────────────────────────────
  const { chartData, hasAnyData, hasMeals } = useMemo(() => {
    const data: DayNutrition[] = DAYS.map(({ key, labelKey }) => {
      const label = labelKey.split('.').pop() ?? String(key); // 'mon', 'tue', etc.
      let calories = 0, protein = 0, carbs = 0, fat = 0;

      for (const slot of MEAL_SLOTS) {
        const entry = plan.entries.find((e) => e.dayOfWeek === key && e.mealSlot === slot);
        if (!entry) continue;
        const recipe = recipes.find((r) => r.id === entry.recipeId);
        if (!recipe) continue;
        const servings = recipe.servings || 1;
        for (const ing of recipe.ingredients) {
          if (!ing.nutrition) continue;
          calories += ing.nutrition.calories / servings;
          protein  += ing.nutrition.protein  / servings;
          carbs    += ing.nutrition.carbs    / servings;
          fat      += ing.nutrition.fat      / servings;
        }
      }

      return {
        day: label.charAt(0).toUpperCase() + label.slice(1),
        calories: Math.round(calories * 10) / 10,
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
      };
    });

    const hasAny = data.some((d) => d.calories > 0 || d.protein > 0);
    const hasMeals = plan.entries.length > 0;
    return { chartData: data, hasAnyData: hasAny, hasMeals };
  }, [plan.entries, recipes]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('meal.planner')}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevWeek} aria-label={t('meal.prevWeek')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-28 text-center">
              {t('meal.weekOf', { date: weekLabel })}
            </span>
            <Button variant="outline" size="icon" onClick={nextWeek} aria-label={t('meal.nextWeek')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => useMealPlanStore.getState().setActiveWeek(getWeekStart())}
            >
              {t('mealPlan.today')}
            </Button>
          </div>
        </div>

        {plan.entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold">{t('mealPlan.emptyTitle')}</h2>
            <p className="text-sm text-muted-foreground max-w-md">{t('mealPlan.emptyDesc')}</p>
            <Button onClick={() => navigate('/recipes')}>
              <Plus className="h-4 w-4" />
              {t('mealPlan.addRecipe')}
            </Button>
            <p className="text-xs text-muted-foreground md:hidden">{t('mealPlan.mobileTip')}</p>
          </div>
        ) : (
          <>
            {/* Desktop grid */}
            <div className="hidden md:flex gap-4 pb-2">
              {/* Recipe sidebar */}
              <aside className="hidden lg:flex flex-col gap-2 w-44 shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('nav.recipes')}
                </p>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    placeholder={t('common.search')}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {sidebarRecipes.map((r) => <DraggableRecipeChip key={r.id} recipe={r} />)}
                </div>
              </aside>

              {/* Grid */}
              <div className="flex-1 overflow-x-auto">
                <div className="min-w-[560px] space-y-2">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map(({ key, labelKey }) => {
                      const d = new Date(activeWeekStart + 'T00:00:00');
                      d.setDate(d.getDate() + key);
                      return (
                        <div key={key} className="text-center py-1">
                          <p className="text-xs font-semibold text-muted-foreground">{t(labelKey)}</p>
                          <p className="text-sm font-bold">{d.getDate()}</p>
                        </div>
                      );
                    })}
                  </div>
                  {/* One row per meal slot */}
                  {MEAL_SLOTS.map((slot) => (
                    <div key={slot}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-0.5">
                        {t(`meal.${slot}`)}
                      </p>
                      <div className="grid grid-cols-7 gap-1.5">
                        {DAYS.map(({ key: day }) => (
                          <MealSlotCell
                            key={`${day}-${slot}`}
                            day={day}
                            slot={slot}
                            recipe={getEntryRecipe(day, slot)}
                            onRemove={() => removeMealEntry(activeWeekStart, day, slot)}
                            onPickerOpen={(d, s) => setPickerTarget({ day: d, slot: s })}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden space-y-3">
              {DAYS.map(({ key: day, labelKey }) => {
                const d = new Date(activeWeekStart + 'T00:00:00');
                d.setDate(d.getDate() + day);
                const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <div key={day} className="rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
                      <span className="text-sm font-semibold">{t(labelKey)}</span>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </div>
                    <div className="p-2 grid grid-cols-3 gap-2">
                      {MEAL_SLOTS.map((slot) => (
                        <div key={slot}>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            {t(`meal.${slot}`)}
                          </p>
                          <MealSlotCell
                            day={day}
                            slot={slot}
                            recipe={getEntryRecipe(day, slot)}
                            onRemove={() => removeMealEntry(activeWeekStart, day, slot)}
                            onPickerOpen={(d, s) => setPickerTarget({ day: d, slot: s })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly nutrition chart */}
            <NutritionChart
              chartData={chartData}
              hasAnyData={hasAnyData}
              hasMeals={hasMeals}
              isFetching={isFetchingNutrition}
              fetchProgress={fetchProgress}
              onFetch={fetchWeekNutrition}
            />
          </>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedRecipe && (
          <div className="rounded-md border border-primary bg-background px-3 py-2 text-sm shadow-lg opacity-90 rotate-1">
            <p className="font-medium">{draggedRecipe.title}</p>
          </div>
        )}
      </DragOverlay>

      {/* Picker modal */}
      {pickerTarget && (
        <RecipePickerModal
          onSelect={(rId) => {
            setMealEntry(activeWeekStart, pickerTarget.day, pickerTarget.slot, rId);
            setPickerTarget(null);
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </DndContext>
  );
}

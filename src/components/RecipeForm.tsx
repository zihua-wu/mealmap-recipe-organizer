import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext, closestCenter, type DragEndEvent,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, ChevronLeft, FlaskConical } from 'lucide-react';
import { useRecipeStore } from '@/store/recipeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { notify } from '@/lib/toast';
import type { Ingredient, InstructionStep, Tag, NutritionData } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CUISINES = [
  'American','Cantonese','Chinese','French','Indian','Italian',
  'Japanese','Korean','Mediterranean','Mexican','Sichuan','Thai','Other',
];

const UNITS = [
  'g','kg','oz','lb',
  'ml','l','tsp','tbsp','cup','fl oz',
  'piece','slice','clove','pinch','bunch','can',
];

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

// ─── Sortable Step ────────────────────────────────────────────────────────────

interface StepItemProps {
  step: InstructionStep;
  index: number;
  onChange: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
}

function SortableStepItem({ step, index, onChange, onDelete, placeholder }: StepItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
      <button
        type="button"
        className="mt-2 cursor-grab text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <span className="text-xs text-muted-foreground mb-1 block">{t('recipe.stepLabel', { number: index + 1 })}</span>
        <Textarea
          value={step.text}
          onChange={(e) => onChange(step.id, e.target.value)}
          placeholder={placeholder}
          rows={2}
        />
      </div>
      <button
        type="button"
        onClick={() => onDelete(step.id)}
        className="mt-2 text-muted-foreground hover:text-destructive"
        aria-label="Delete step"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Ingredient Row ───────────────────────────────────────────────────────────

interface IngredientRowProps {
  ing: Ingredient;
  onChange: (id: string, patch: Partial<Ingredient>) => void;
  onDelete: (id: string) => void;
  onFetchNutrition: (id: string) => void;
  fetchingId: string | null;
  t: (key: string) => string;
}

function IngredientRow({ ing, onChange, onDelete, onFetchNutrition, fetchingId, t }: IngredientRowProps) {
  const isFetching = fetchingId === ing.id;
  return (
    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
      <Input
        type="number"
        min={0}
        step="any"
        value={ing.quantity || ''}
        onChange={(e) => onChange(ing.id, { quantity: parseFloat(e.target.value) || 0 })}
        className="w-20 shrink-0"
        placeholder={t('recipe.ingredientQty')}
        aria-label="Quantity"
      />
      <select
        value={ing.unit}
        onChange={(e) => onChange(ing.id, { unit: e.target.value })}
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
        aria-label="Unit"
      >
        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <Input
        value={ing.name}
        onChange={(e) => onChange(ing.id, { name: e.target.value })}
        placeholder={t('recipe.ingredientName')}
        className="flex-1 min-w-[120px]"
        aria-label="Ingredient name"
      />
      {/* Nutrition badge if fetched */}
      {ing.nutrition && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {Math.round(ing.nutrition.calories)} kcal
        </span>
      )}
      {/* Manual "查营养" button — NEVER auto-fires, preserves quota */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onFetchNutrition(ing.id)}
        disabled={isFetching || !ing.name.trim()}
        title={t('recipe.fetchNutrition')}
        className="shrink-0"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{isFetching ? t('recipe.fetchingNutrition') : t('recipe.fetchNutrition')}</span>
      </Button>
      <button
        type="button"
        onClick={() => onDelete(ing.id)}
        className="text-muted-foreground hover:text-destructive shrink-0"
        aria-label="Delete ingredient"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── RecipeFormPage ───────────────────────────────────────────────────────────

export function RecipeFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const { addRecipe, updateRecipe, deleteRecipe, getRecipeById } = useRecipeStore();
  const { consumeSpoonacularRequest, remainingRequests } = useSettingsStore();

  // Form state
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cuisine, setCuisine] = useState(CUISINES[0]);
  const [cookTimeMin, setCookTimeMin] = useState(30);
  const [servings, setServings] = useState(4);
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: newId(), name: '', quantity: 1, unit: 'g', order: 0, nutrition: null },
  ]);
  const [steps, setSteps] = useState<InstructionStep[]>([
    { id: newId(), order: 0, text: '' },
  ]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [fetchingNutritionId, setFetchingNutritionId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing recipe when editing
  useEffect(() => {
    if (!id) return;
    const recipe = getRecipeById(id);
    if (!recipe) return;
    setTitle(recipe.title);
    setDescription(recipe.description);
    setCuisine(recipe.cuisine);
    setCookTimeMin(recipe.cookTimeMin);
    setServings(recipe.servings);
    setImageUrl(recipe.imageUrl);
    setIngredients(recipe.ingredients.length ? recipe.ingredients : [
      { id: newId(), name: '', quantity: 1, unit: 'g', order: 0, nutrition: null },
    ]);
    setSteps(recipe.steps.length ? recipe.steps : [{ id: newId(), order: 0, text: '' }]);
    setTags(recipe.tags);
  }, [id, getRecipeById]);

  // ── Ingredient handlers ────────────────────────────────────────────────────
  const addIngredient = useCallback(() =>
    setIngredients((prev) => [
      ...prev,
      { id: newId(), name: '', quantity: 1, unit: 'g', order: prev.length, nutrition: null },
    ]), []);

  const updateIngredient = useCallback((ingId: string, patch: Partial<Ingredient>) =>
    setIngredients((prev) => prev.map((i) => i.id === ingId ? { ...i, ...patch } : i)), []);

  const removeIngredient = useCallback((ingId: string) =>
    setIngredients((prev) => prev.filter((i) => i.id !== ingId)), []);

  // Manual nutrition fetch — only fires when user explicitly clicks the button.
  // Guards quota: checks remainingRequests() before calling the API.
  // Cache hit on server = no quota consumed.
  const fetchNutrition = useCallback(async (ingId: string) => {
    const ing = ingredients.find((i) => i.id === ingId);
    if (!ing || !ing.name.trim()) return;

    // Quota guard (client-side counter, resets daily)
    const allowed = consumeSpoonacularRequest();
    if (!allowed) {
      notify.apiLimit();
      return;
    }

    setNutritionError(null);
    setFetchingNutritionId(ingId);
    try {
      const query = `${ing.quantity} ${ing.unit} ${ing.name}`;
      const res = await fetch(`/api/nutrition?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json() as NutritionData;
        updateIngredient(ingId, { nutrition: data });
      } else {
        const err = await res.json() as { error?: string };
        setNutritionError(err.error ?? 'Failed to fetch nutrition data');
      }
    } catch {
      notify.network();
    } finally {
      setFetchingNutritionId(null);
    }
  }, [ingredients, updateIngredient, consumeSpoonacularRequest]);

  // ── Step handlers ──────────────────────────────────────────────────────────
  const addStep = useCallback(() =>
    setSteps((prev) => [...prev, { id: newId(), order: prev.length, text: '' }]), []);

  const updateStep = useCallback((stepId: string, text: string) =>
    setSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, text } : s)), []);

  const removeStep = useCallback((stepId: string) =>
    setSteps((prev) => prev.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i }))), []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleStepDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((prev) => {
        const oldIdx = prev.findIndex((s) => s.id === active.id);
        const newIdx = prev.findIndex((s) => s.id === over.id);
        return arrayMove(prev, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
      });
    }
  }, []);

  // ── Tag handlers ───────────────────────────────────────────────────────────
  const addTag = useCallback(() => {
    const name = tagInput.trim();
    if (!name || tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    setTags((prev) => [...prev, { id: newId(), name }]);
    setTagInput('');
  }, [tagInput, tags]);

  const removeTag = useCallback((tagId: string) =>
    setTags((prev) => prev.filter((t) => t.id !== tagId)), []);

  // ── Validation & submit ────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = t('recipe.errors.titleRequired');
    if (!cuisine) errs.cuisine = t('recipe.errors.cuisineRequired');
    if (cookTimeMin <= 0) errs.cookTimeMin = t('recipe.errors.cookTimeTooLow');
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const draft = {
      title: title.trim(),
      description: description.trim(),
      cuisine,
      cookTimeMin,
      servings,
      imageUrl: imageUrl.trim(),
      ingredients: ingredients.filter((i) => i.name.trim()).map((i, idx) => ({ ...i, order: idx })),
      steps: steps.filter((s) => s.text.trim()).map((s, idx) => ({ ...s, order: idx })),
      tags,
    };

    if (isEdit && id) {
      updateRecipe(id, draft);
    } else {
      addRecipe(draft);
    }
    notify.saved();
    navigate('/');
  };

  const handleDelete = () => {
    if (!id) return;
    if (window.confirm(t('recipe.deleteConfirm'))) {
      deleteRecipe(id);
      navigate('/');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? t('recipe.edit') : t('recipe.create')}</h1>
        {isEdit && (
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} className="ml-auto">
            <Trash2 className="h-4 w-4" /> {t('recipe.delete')}
          </Button>
        )}
      </div>

      {/* Basic fields */}
      <section className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">{t('recipe.title')} *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={t('recipe.titlePlaceholder')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">{t('recipe.description')}</Label>
          <Textarea id="description" value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('recipe.descriptionPlaceholder')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cuisine">{t('recipe.cuisine')} *</Label>
            <select id="cuisine" value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cookTimeMin">{t('recipe.cookTime')} (min) *</Label>
            <Input id="cookTimeMin" type="number" min={1} value={cookTimeMin}
              onChange={(e) => setCookTimeMin(parseInt(e.target.value) || 1)}
              placeholder={t('recipe.cookTimePlaceholder')} />
            {errors.cookTimeMin && <p className="text-xs text-destructive">{errors.cookTimeMin}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="servings">{t('recipe.servings')}</Label>
            <Input id="servings" type="number" min={1} value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imageUrl">{t('recipe.imageUrl')}</Label>
            <Input id="imageUrl" value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={t('recipe.imageUrlPlaceholder')} />
          </div>
        </div>
      </section>

      {/* Ingredients */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('recipe.ingredients')}</h2>
          <span className="text-xs text-muted-foreground">
            {t('nutrition.quotaWarning', { count: remainingRequests() })}
          </span>
        </div>
        {nutritionError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {nutritionError}
          </p>
        )}
        <div className="space-y-2">
          {ingredients.map((ing) => (
            <IngredientRow
              key={ing.id}
              ing={ing}
              onChange={updateIngredient}
              onDelete={removeIngredient}
              onFetchNutrition={fetchNutrition}
              fetchingId={fetchingNutritionId}
              t={t}
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
          <Plus className="h-4 w-4" /> {t('recipe.addIngredient')}
        </Button>
      </section>

      {/* Steps */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('recipe.steps')}</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  index={i}
                  onChange={updateStep}
                  onDelete={removeStep}
                  placeholder={t('recipe.stepPlaceholder')}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button type="button" variant="outline" size="sm" onClick={addStep}>
          <Plus className="h-4 w-4" /> {t('recipe.addStep')}
        </Button>
      </section>

      {/* Tags */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('recipe.tags')}</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 cursor-pointer"
              onClick={() => removeTag(tag.id)}>
              {tag.name} <span aria-hidden>×</span>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder={t('recipe.tagPlaceholder')}
            className="max-w-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>
            {t('recipe.addTag')}
          </Button>
        </div>
      </section>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button type="submit">{t('common.save')}</Button>
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

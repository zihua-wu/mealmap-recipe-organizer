import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { useMealPlanStore } from '@/store/mealPlanStore';
import { useRecipeStore } from '@/store/recipeStore';
import { generateGroceryList } from '@/lib/groceryUtils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GroceryItem, StoreAisle } from '@/types';

const AISLE_LABEL_KEYS: Record<StoreAisle, string> = {
  produce: 'grocery.aisles.produce',
  dairy: 'grocery.aisles.dairy',
  'meat & seafood': 'grocery.aisles.meat',
  bakery: 'grocery.aisles.bakery',
  pantry: 'grocery.aisles.pantry',
  frozen: 'grocery.aisles.frozen',
  beverages: 'grocery.aisles.beverages',
  'spices & condiments': 'grocery.aisles.spices',
  other: 'grocery.aisles.other',
};

function formatQty(qty: number): string {
  return qty % 1 === 0 ? String(qty) : qty.toFixed(1);
}

interface AisleSectionProps {
  aisle: StoreAisle;
  items: GroceryItem[];
  onToggle: (id: string) => void;
}

function AisleSection({ aisle, items, onToggle }: AisleSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="font-medium text-sm">{t(AISLE_LABEL_KEYS[aisle])}</span>
        </div>
        <span className="text-xs text-muted-foreground">{checkedCount}/{items.length}</span>
      </button>

      {open && (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onToggle(item.id)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className={cn('text-sm flex-1', item.checked && 'line-through text-muted-foreground')}>
                  {item.name}
                </span>
                <span className="text-sm text-muted-foreground shrink-0">
                  {formatQty(item.quantity)} {item.unit}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GroceryList() {
  const { t } = useTranslation();
  const recipes = useRecipeStore((s) => s.recipes);
  const { getActivePlan } = useMealPlanStore();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(() => {
    const plan = getActivePlan();
    const planRecipes = plan.entries
      .map((e) => recipes.find((r) => r.id === e.recipeId))
      .filter((r): r is NonNullable<typeof r> => r !== undefined);
    setItems(generateGroceryList(planRecipes));
    setGenerated(true);
  }, [getActivePlan, recipes]);

  const toggleItem = useCallback((id: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, checked: !i.checked } : i)), []);

  // Group items by aisle
  const byAisle = items.reduce<Partial<Record<StoreAisle, GroceryItem[]>>>((acc, item) => {
    if (!acc[item.aisle]) acc[item.aisle] = [];
    acc[item.aisle]!.push(item);
    return acc;
  }, {});

  const aisleOrder: StoreAisle[] = [
    'produce', 'dairy', 'meat & seafood', 'bakery',
    'pantry', 'frozen', 'beverages', 'spices & condiments', 'other',
  ];

  const checkedTotal = items.filter((i) => i.checked).length;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('grocery.title')}</h1>
        <Button onClick={generate} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('grocery.generate')}
        </Button>
      </div>

      {/* Progress */}
      {generated && items.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {t('grocery.itemsChecked', { checked: checkedTotal, total: items.length })}
        </div>
      )}

      {/* Content */}
      {!generated ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground max-w-xs">{t('grocery.empty')}</p>
          <Button onClick={generate}>{t('grocery.generate')}</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('grocery.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {aisleOrder.map((aisle) => {
            const aisleItems = byAisle[aisle];
            if (!aisleItems || aisleItems.length === 0) return null;
            return (
              <AisleSection
                key={aisle}
                aisle={aisle}
                items={aisleItems}
                onToggle={toggleItem}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

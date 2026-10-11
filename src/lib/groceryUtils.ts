import type { GroceryItem, Ingredient, Recipe, StoreAisle } from '@/types';

// ─── Aisle keyword mapping ────────────────────────────────────────────────────

const AISLE_KEYWORDS: Record<StoreAisle, string[]> = {
  produce: [
    'tomato', 'onion', 'garlic', 'ginger', 'lettuce', 'spinach', 'carrot',
    'pepper', 'cucumber', 'broccoli', 'mushroom', 'zucchini', 'potato',
    'sweet potato', 'eggplant', 'celery', 'corn', 'avocado', 'lemon',
    'lime', 'orange', 'apple', 'banana', 'pineapple', 'mango', 'cilantro',
    'basil', 'parsley', 'mint', 'scallion', 'green onion', 'leek',
    'bean sprout', 'bok choy', 'cabbage',
  ],
  dairy: [
    'milk', 'cheese', 'cream', 'butter', 'egg', 'yogurt', 'sour cream',
    'mozzarella', 'parmesan', 'pecorino', 'feta', 'ricotta', 'cheddar',
    'heavy cream', 'half and half',
  ],
  'meat & seafood': [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'salmon',
    'tuna', 'shrimp', 'prawn', 'crab', 'lobster', 'bacon', 'sausage',
    'ham', 'guanciale', 'pancetta', 'anchovy', 'mince', 'steak',
  ],
  bakery: [
    'bread', 'bun', 'roll', 'tortilla', 'pita', 'naan', 'baguette',
    'croissant', 'bagel',
  ],
  pantry: [
    'rice', 'pasta', 'noodle', 'flour', 'sugar', 'salt', 'oil', 'vinegar',
    'soy sauce', 'fish sauce', 'oyster sauce', 'hoisin', 'sesame oil',
    'olive oil', 'vegetable oil', 'stock', 'broth', 'coconut milk',
    'canned', 'tomato paste', 'bean', 'lentil', 'chickpea', 'cornstarch',
    'bread crumb', 'oat', 'cereal', 'honey', 'maple syrup', 'chocolate',
    'cocoa', 'vanilla', 'tamarind', 'douban', 'miso', 'tahini',
    'peanut butter', 'jam', 'dough', 'yeast', 'baking powder', 'baking soda',
  ],
  frozen: [
    'frozen', 'ice cream', 'peas', 'edamame',
  ],
  beverages: [
    'juice', 'water', 'soda', 'beer', 'wine', 'coffee', 'tea', 'milk tea',
  ],
  'spices & condiments': [
    'pepper', 'cumin', 'coriander', 'turmeric', 'paprika', 'chili', 'cayenne',
    'cinnamon', 'clove', 'cardamom', 'star anise', 'bay leaf', 'thyme',
    'rosemary', 'oregano', 'garam masala', 'curry', 'five spice', 'allspice',
    'peppercorn', 'saffron', 'mustard', 'ketchup', 'mayonnaise', 'hot sauce',
    'worcestershire', 'sriracha', 'gochujang', 'achiote', 'sumac',
    'nutritional yeast',
  ],
  other: [],
};

export function getAisle(ingredientName: string): StoreAisle {
  const name = ingredientName.toLowerCase();
  for (const [aisle, keywords] of Object.entries(AISLE_KEYWORDS) as [StoreAisle, string[]][]) {
    if (aisle === 'other') continue;
    if (keywords.some((kw) => name.includes(kw))) return aisle;
  }
  return 'other';
}

// ─── Merge + deduplicate ──────────────────────────────────────────────────────

function normaliseUnit(unit: string): string {
  return unit.toLowerCase().trim();
}

interface MergeKey { name: string; unit: string }

function makeKey(ing: Ingredient): string {
  return `${ing.name.toLowerCase().trim()}::${normaliseUnit(ing.unit)}`;
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function generateGroceryList(recipes: Recipe[]): GroceryItem[] {
  const map = new Map<string, GroceryItem & { _key: MergeKey }>();

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = makeKey(ing);
      const existing = map.get(key);
      if (existing) {
        existing.quantity += ing.quantity;
        if (!existing.sourceRecipeIds.includes(recipe.id)) {
          existing.sourceRecipeIds.push(recipe.id);
        }
      } else {
        map.set(key, {
          _key: { name: ing.name, unit: ing.unit },
          id: newId(),
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          aisle: getAisle(ing.name),
          sourceRecipeIds: [recipe.id],
          checked: false,
        });
      }
    }
  }

  // Sort by aisle then name
  const AISLE_ORDER: StoreAisle[] = [
    'produce', 'dairy', 'meat & seafood', 'bakery',
    'pantry', 'frozen', 'beverages', 'spices & condiments', 'other',
  ];

  return [...map.values()]
    .map(({ _key: _k, ...item }) => item)
    .sort((a, b) => {
      const aidx = AISLE_ORDER.indexOf(a.aisle);
      const bidx = AISLE_ORDER.indexOf(b.aisle);
      if (aidx !== bidx) return aidx - bidx;
      return a.name.localeCompare(b.name);
    });
}

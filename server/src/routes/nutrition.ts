import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '../../nutrition-cache.json');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const nutritionRouter = Router();

// ─── Cache helpers ────────────────────────────────────────────────────────────

interface CacheEntry {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fetchedAt: string;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as Record<string, CacheEntry>;
    }
  } catch {
    // corrupt cache — start fresh
  }
  return {};
}

function saveCache(cache: Record<string, CacheEntry>): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {
    // disk write failed — non-fatal
  }
}

function cacheKey(query: string): string {
  return query.toLowerCase().trim();
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - new Date(entry.fetchedAt).getTime() < CACHE_TTL_MS;
}

// ─── Spoonacular helpers ──────────────────────────────────────────────────────

const SPOONACULAR_BASE = 'https://api.spoonacular.com';

async function fetchNutritionFromSpoonacular(query: string): Promise<CacheEntry> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) throw new Error('SPOONACULAR_API_KEY not set');

  // Step 1: parseIngredients — converts "2 cups flour" into structured ingredient
  const parseRes = await fetch(
    `${SPOONACULAR_BASE}/recipes/parseIngredients?apiKey=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        ingredientList: query,
        servings: '1',
        includeNutrition: 'true',
      }),
    }
  );

  if (!parseRes.ok) {
    const text = await parseRes.text();
    throw new Error(`Spoonacular parseIngredients error ${parseRes.status}: ${text}`);
  }

  const parsed = await parseRes.json() as Array<{
    nutrition?: {
      nutrients?: Array<{ name: string; amount: number }>;
    };
  }>;

  if (!parsed.length || !parsed[0].nutrition?.nutrients) {
    throw new Error('No nutrition data returned from Spoonacular');
  }

  const nutrients = parsed[0].nutrition.nutrients;

  function get(name: string): number {
    return nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount ?? 0;
  }

  return {
    calories: Math.round(get('Calories') * 10) / 10,
    protein:  Math.round(get('Protein')  * 10) / 10,
    carbs:    Math.round(get('Carbohydrates') * 10) / 10,
    fat:      Math.round(get('Fat')      * 10) / 10,
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

nutritionRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const query = String(req.query.query ?? '').trim();
  if (!query) {
    res.status(400).json({ error: 'query param required' });
    return;
  }

  const cache = loadCache();
  const key = cacheKey(query);

  // Cache hit
  if (cache[key] && isFresh(cache[key])) {
    res.json(cache[key]);
    return;
  }

  // Cache miss — call Spoonacular
  try {
    const result = await fetchNutritionFromSpoonacular(query);
    cache[key] = result;
    saveCache(cache);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[nutrition]', message);
    res.status(502).json({ error: message });
  }
});

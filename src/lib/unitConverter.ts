/**
 * Unit conversion utilities backed by units.json.
 *
 * All volume conversions use ml as the base; all weight conversions use g.
 * Cross-dimension conversions (volume ↔ weight) require ingredientDensity.
 */

import unitsData from '../../units.json';

type DimensionName = 'volume' | 'weight' | 'count';

interface UnitSpec {
  toBase: number;
  system: string;
}

interface Dimension {
  _base: string;
  units: Record<string, UnitSpec>;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function dim(name: DimensionName): Dimension {
  return (unitsData as Record<string, unknown>)[name] as Dimension;
}

function findUnit(unit: string): { dimName: DimensionName; spec: UnitSpec } | null {
  for (const d of ['volume', 'weight', 'count'] as DimensionName[]) {
    const dimension = dim(d);
    if (dimension?.units && unit in dimension.units) {
      return { dimName: d, spec: dimension.units[unit] };
    }
  }
  return null;
}

function density(ingredientName: string): number | null {
  const map = (unitsData as Record<string, unknown>).ingredientDensity as Record<string, number>;
  // Try exact match, then lowercase
  return map[ingredientName] ?? map[ingredientName.toLowerCase()] ?? null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Convert `amount` from `fromUnit` to `toUnit`.
 *
 * - Same dimension (volume ↔ volume, weight ↔ weight): always works.
 * - Cross dimension (volume ↔ weight): requires ingredientName to be in
 *   `units.json#ingredientDensity`. Returns null if density is unknown.
 * - Count units: returns null (cannot convert to/from physical units).
 */
export function convertUnit(
  amount: number,
  fromUnit: string,
  toUnit: string,
  ingredientName = ''
): number | null {
  if (fromUnit === toUnit) return amount;

  const from = findUnit(fromUnit);
  const to = findUnit(toUnit);
  if (!from || !to) return null;

  // Same dimension: via base unit
  if (from.dimName === to.dimName) {
    if (from.dimName === 'count') return null; // count units don't scale
    const base = amount * from.spec.toBase;
    return base / to.spec.toBase;
  }

  // Cross dimension: volume ↔ weight via g/ml density
  const isVolWeight =
    (from.dimName === 'volume' && to.dimName === 'weight') ||
    (from.dimName === 'weight' && to.dimName === 'volume');

  if (isVolWeight) {
    const d = density(ingredientName);
    if (d === null) return null;

    if (from.dimName === 'volume') {
      // volume → weight: ml × (g/ml) = g → target weight unit
      const ml = amount * from.spec.toBase;
      const g = ml * d;
      return g / dim('weight').units[toUnit]?.toBase;
    } else {
      // weight → volume: g / (g/ml) = ml → target volume unit
      const g = amount * from.spec.toBase;
      const ml = g / d;
      return ml / dim('volume').units[toUnit]?.toBase;
    }
  }

  return null; // e.g. count ↔ weight — not convertible
}

/**
 * Given a unit and a target system, return the preferred display unit
 * in that system within the same dimension.
 *
 * E.g. `preferredUnit('cup', 'metric')` → 'ml' or 'l' depending on amount.
 * Pass amount so we can pick between ml/l or g/kg etc.
 */
export function preferredUnit(
  fromUnit: string,
  targetSystem: 'metric' | 'imperial',
  amount = 1
): string {
  const found = findUnit(fromUnit);
  if (!found || found.dimName === 'count') return fromUnit; // keep as-is

  const baseAmount = amount * found.spec.toBase;

  if (found.dimName === 'volume') {
    if (targetSystem === 'metric') return baseAmount >= 1000 ? 'l' : 'ml';
    return baseAmount >= 236.588 ? 'cup' : baseAmount >= 14.7868 ? 'tbsp' : 'tsp';
  }

  if (found.dimName === 'weight') {
    if (targetSystem === 'metric') return baseAmount >= 1000 ? 'kg' : 'g';
    return baseAmount >= 453.592 ? 'lb' : 'oz';
  }

  return fromUnit;
}

/**
 * Format a number for display, trimming trailing decimal zeros.
 * e.g. 1.00 → "1", 2.50 → "2.5", 0.333 → "0.33"
 */
export function formatAmount(n: number, decimals = 2): string {
  return parseFloat(n.toFixed(decimals)).toString();
}

/**
 * Convert an ingredient amount to the user's preferred unit system,
 * returning { amount, unit } or null if conversion not possible.
 */
export function convertIngredient(
  amount: number,
  unit: string,
  ingredientName: string,
  targetSystem: 'metric' | 'imperial'
): { amount: number; unit: string } | null {
  const toUnit = preferredUnit(unit, targetSystem, amount);
  if (toUnit === unit) return null; // already in preferred unit

  const converted = convertUnit(amount, unit, toUnit, ingredientName);
  if (converted === null) return null;

  return { amount: converted, unit: toUnit };
}

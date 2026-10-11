import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useRecipeStore } from '@/store/recipeStore';
import { Globe } from 'lucide-react';

const PALETTE = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16',
];

export function CuisineExplorer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recipes = useRecipeStore((s) => s.recipes);
  const setFilters = useRecipeStore((s) => s.setFilters);

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of recipes) {
      counts[r.cuisine] = (counts[r.cuisine] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count);
  }, [recipes]);

  const handleBarClick = (cuisine: string) => {
    setFilters({ cuisines: [cuisine] });
    navigate('/');
  };

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Globe className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('common.noResults')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">{t('explorer.title')}</h1>

      {/* Bar chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="cuisine"
              width={90}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) =>
                t('explorer.recipeCount', { count: Number(value) })
              }
              cursor={{ fill: 'hsl(var(--accent))' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer"
              onClick={(d) => handleBarClick((d as unknown as { cuisine: string }).cuisine)}>
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.map(({ cuisine, count }, i) => (
          <button
            key={cuisine}
            onClick={() => handleBarClick(cuisine)}
            className="rounded-xl border border-border p-4 text-left hover:bg-accent transition-colors"
          >
            <div
              className="h-1.5 w-8 rounded-full mb-3"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <p className="font-semibold text-sm">{cuisine}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('explorer.recipeCount', { count })}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

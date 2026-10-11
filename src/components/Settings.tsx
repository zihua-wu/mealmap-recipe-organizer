import { useTranslation } from 'react-i18next';
import { ToggleLeft, ToggleRight, Trash2, FlaskConical } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useRecipeStore } from '@/store/recipeStore';
import { useMealPlanStore } from '@/store/mealPlanStore';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Settings() {
  const { t } = useTranslation();
  const { unitSystem, toggleUnitSystem, remainingRequests } = useSettingsStore();
  const recipeCount = useRecipeStore((s) => s.recipes.length);
  const planCount = useMealPlanStore((s) => s.plans.length);

  const handleClearData = () => {
    if (!window.confirm(t('settings.clearConfirm'))) return;
    // Clear all persisted stores
    localStorage.removeItem('recipe-organizer:recipes');
    localStorage.removeItem('recipe-organizer:mealplans');
    localStorage.removeItem('recipe-organizer:settings');
    window.location.reload();
  };

  return (
    <div className="max-w-lg mx-auto space-y-8 pb-16">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* Language */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('settings.language')}
        </h2>
        <LanguageSwitcher />
      </section>

      {/* Unit system */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('settings.units')}
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {unitSystem === 'metric' ? t('unit.metric') : t('unit.imperial')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unitSystem === 'metric'
                ? t('settings.metricDesc')
                : t('settings.imperialDesc')}
            </p>
          </div>
          <button
            onClick={toggleUnitSystem}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            {unitSystem === 'metric'
              ? <ToggleLeft className="h-5 w-5 text-primary" />
              : <ToggleRight className="h-5 w-5 text-primary" />}
            {t('unit.switchTo', { system: unitSystem === 'metric' ? t('unit.imperial') : t('unit.metric') })}
          </button>
        </div>
      </section>

      {/* API quota */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('settings.apiQuota')}
        </h2>
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t('settings.spoonacularApi')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('settings.requestsRemaining', { count: remainingRequests() })}
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-24">
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(remainingRequests() / 150) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">
              {remainingRequests()} / 150
            </p>
          </div>
        </div>
      </section>

      {/* Data */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('settings.data')}
        </h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('settings.recipesCount', { count: recipeCount })}</p>
          <p>{t('settings.weeksCount', { count: planCount })}</p>
        </div>
        <button
          onClick={handleClearData}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          {t('settings.clearData')}
        </button>
      </section>

      {/* About */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('settings.about')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('settings.aboutDesc')}</p>
        <p className="text-xs text-muted-foreground">
          {t('settings.version', { v: '1.0' })} · {t('settings.apiPoweredBy')} Spoonacular
        </p>
      </section>
    </div>
  );
}

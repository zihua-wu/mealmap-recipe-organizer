import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import { LANGUAGES, type Language } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t('settings.language')}</span>
      <Select
        value={language}
        onValueChange={(val) => setLanguage(val as Language)}
      >
        <SelectTrigger className="w-28" aria-label={t('settings.language')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(LANGUAGES) as [Language, { label: string; nativeLabel: string }][]).map(
            ([code, { label, nativeLabel }]) => (
              <SelectItem key={code} value={code}>
                <span aria-label={label}>{nativeLabel}</span>
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

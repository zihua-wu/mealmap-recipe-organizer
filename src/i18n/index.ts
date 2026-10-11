import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import zh from './locales/zh.json';
import es from './locales/es.json';

export type Language = 'en' | 'zh' | 'es';

export const LANGUAGES: Record<Language, { label: string; nativeLabel: string }> = {
  en: { label: 'English', nativeLabel: 'EN' },
  zh: { label: 'Chinese', nativeLabel: '中文' },
  es: { label: 'Spanish', nativeLabel: 'Español' },
};

/** Read the persisted language from Zustand's localStorage key before stores hydrate. */
function getPersistedLanguage(): Language {
  try {
    const raw = localStorage.getItem('recipe-organizer:settings');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { language?: string } };
      const lang = parsed?.state?.language;
      if (lang === 'en' || lang === 'zh' || lang === 'es') return lang;
    }
  } catch {
    // ignore — fall through to default
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    es: { translation: es },
  },
  lng: getPersistedLanguage(),
  fallbackLng: 'en',          // missing Spanish key → fall back to English
  interpolation: {
    escapeValue: false,       // React already escapes
  },
  returnNull: false,
});

export default i18n;

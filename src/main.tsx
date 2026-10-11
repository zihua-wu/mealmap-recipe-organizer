import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// i18n must be imported before any component that calls useTranslation()
import './i18n';
import './index.css';
import App from './App.tsx';
import { registerSW } from 'virtual:pwa-register';

// Register service worker — auto-updates in the background.
// On update, shows a console note; in production you'd show a toast.
registerSW({
  onNeedRefresh() {
    console.info('[PWA] New content available — reload to update.');
  },
  onOfflineReady() {
    console.info('[PWA] App ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

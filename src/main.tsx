import {createRoot} from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registo imediato do Service Worker para suporte offline e caching acelerado
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('Nova versão da PWA disponível.');
    },
    onOfflineReady() {
      console.log('Aplicação e mapa prontos para funcionamento offline.');
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);

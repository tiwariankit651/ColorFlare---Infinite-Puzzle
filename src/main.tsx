import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const registerSW = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered successfully');
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 1000 * 60 * 60); // Every hour
    }).catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }
};

if ((import.meta as any).env?.PROD) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

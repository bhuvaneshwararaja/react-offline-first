import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OfflineProvider } from 'react-offline-first';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OfflineProvider config={{ storeName: 'example-notes' }}>
      <App />
    </OfflineProvider>
  </StrictMode>
);

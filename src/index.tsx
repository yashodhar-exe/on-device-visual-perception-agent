// index.tsx — Extension popup entry point

// CRITICAL: chromeMock must run synchronously BEFORE React renders
// to polyfill chrome.* APIs in the dev server context.
import './ui/chromeMock';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './ui/popup/App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

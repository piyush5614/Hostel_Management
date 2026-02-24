import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { measurePageLoad } from './utils/performance-monitor';

// Safety: if localStorage data is corrupted or too large, clear it to prevent
// STATUS_STACK_OVERFLOW / white-screen crashes on load.
try {
  const raw = localStorage.getItem('tc-hostel-data');
  if (raw && raw.length > 5_000_000) {
    // > 5 MB of mock data is excessive — reset
    console.warn('⚠️ Mock data too large, resetting localStorage');
    localStorage.removeItem('tc-hostel-data');
  } else if (raw) {
    JSON.parse(raw); // validate it's parseable
  }
} catch {
  console.warn('⚠️ Corrupted localStorage data detected, clearing...');
  localStorage.removeItem('tc-hostel-data');
  localStorage.removeItem('tc-hostel-auth');
  localStorage.removeItem('tc-hostel-enhanced-session');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Initialize performance monitoring
measurePageLoad();
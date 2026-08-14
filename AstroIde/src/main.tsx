import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import posthog from 'posthog-js';

// PostHog analytics — anonymous usage tracking
posthog.init('phc_zLGopG28Mg28z5Bt6qmMLvqE3tAhryeFBMzhFsihepSd', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
  capture_pageview: false, // Desktop app, no pages
  autocapture: false, // Manual events only
});

// Fix: Prevent buttons from stealing focus from Monaco editor.
document.addEventListener('mouseup', (e) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    const btn = (target.tagName === 'BUTTON' ? target : target.closest('button')) as HTMLElement;
    if (!btn.closest('.monaco-editor') && !btn.closest('input') && !btn.closest('textarea')) {
      btn.blur();
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

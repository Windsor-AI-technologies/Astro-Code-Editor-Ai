import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

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

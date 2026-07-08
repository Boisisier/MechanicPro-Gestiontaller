import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './shared/App.tsx';
import ErrorBoundary from './shared/components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);


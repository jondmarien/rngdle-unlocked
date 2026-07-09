import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { createLogger } from './lib/logger';
import './styles/global.css';

const log = createLogger('boot');
log.info('starting', {
  origin: typeof window !== 'undefined' ? window.location.origin : '',
  path: typeof window !== 'undefined' ? window.location.pathname : '',
  mode: import.meta.env.MODE,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

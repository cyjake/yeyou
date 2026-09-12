import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { registerPwa } from '../domain/pwa/registration';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Studio root element was not found.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

registerPwa((status, registration) => {
  window.dispatchEvent(new CustomEvent('yeyou:pwa-status', { detail: { status, registration } }));
});

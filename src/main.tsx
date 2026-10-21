import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// leaflet.css primero: `index.css` ajusta después sus controles.
import 'leaflet/dist/leaflet.css';
import './styles/index.css';
import { App } from './app/App';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el elemento #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

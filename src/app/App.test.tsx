import { render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCandidatesStore, useFixedPlacesStore } from '@/store';
import { App } from './App';

/** Leaflet mide el contenedor con APIs que jsdom no implementa del todo. */
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
});

beforeEach(() => {
  localStorage.clear();
  useCandidatesStore.getState().clear();
  useFixedPlacesStore.getState().clear();
});

/** jsdom no trae matchMedia: sin él, `useIsDesktop()` devuelve false (móvil). */
function mockDesktop(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('monta el shell con la barra superior y el panel de pestañas', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /Resumen/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('muestra el estado vacío cuando no hay candidato activo', () => {
    render(<App />);
    expect(screen.getAllByText('Todavía no hay un candidato').length).toBeGreaterThan(0);
  });

  it('cada botón de icono tiene nombre accesible', () => {
    render(<App />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName();
    }
  });

  it('monta el panel una sola vez en cada layout (sin ids duplicados)', () => {
    for (const desktop of [false, true]) {
      mockDesktop(desktop);
      const { container, unmount } = render(<App />);
      const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
      expect(new Set(ids).size, `layout ${desktop ? 'desktop' : 'móvil'}`).toBe(ids.length);
      expect(container.querySelectorAll('[role="tab"]')).toHaveLength(3);
      unmount();
    }
  });

  it('en desktop usa el panel lateral y en móvil el bottom sheet', () => {
    mockDesktop(true);
    const desktopRender = render(<App />);
    expect(desktopRender.container.querySelector('aside')).not.toBeNull();
    expect(
      desktopRender.queryByRole('button', { name: /Expandir el panel|Contraer el panel/ }),
    ).toBeNull();
    desktopRender.unmount();

    mockDesktop(false);
    const mobileRender = render(<App />);
    expect(mobileRender.container.querySelector('aside')).toBeNull();
    expect(mobileRender.getByRole('button', { name: 'Expandir el panel' })).toBeInTheDocument();
  });
});

import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import AppLayout from './layouts/AppLayout';

// Nombre del producto: no depende de APP_NAME (que en una instalación nueva vale "Laravel").
const appName = 'CheckITSE Huancayo';

/**
 * Inertia envuelve la página en el layout recibido como `children`, por lo que el
 * layout no es un `ComponentType<{}>` sino una función que recibe el árbol de la
 * página ya resuelto.
 */
type PageLayout = (page: React.ReactNode) => React.ReactElement;

/**
 * Evita títulos redundantes: si la página no aporta título, si ya coincide con el
 * nombre de la aplicación, o si el nombre ya está incluido, no se vuelve a anexar.
 */
function buildTitle(title?: string): string {
    if (!title) {
        return appName;
    }

    return title.includes('CheckITSE') ? title : `${title} - ${appName}`;
}

void createInertiaApp({
    title: buildTitle,
    resolve: async (name) => {
        const pageModule = await resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx'));
        const page = pageModule as { default: { layout?: PageLayout } };

        page.default.layout = page.default.layout ?? ((children: React.ReactNode) => <AppLayout>{children}</AppLayout>);

        return pageModule;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: 'var(--color-primary-500)',
    },
});

// Mantiene vigente el token CSRF de la etiqueta <meta>: Laravel lo renueva al registrarse o
// ingresar, y las peticiones fetch (guardar respuestas, correcciones, croquis) lo leen de ahí.
router.on('navigate', (evento) => {
    const token = (evento.detail.page.props as { csrf_token?: unknown }).csrf_token;
    if (typeof token === 'string' && token !== '') {
        document.querySelector('meta[name="csrf-token"]')?.setAttribute('content', token);
    }
});

// This will set light / dark mode on load...
void initializeTheme();

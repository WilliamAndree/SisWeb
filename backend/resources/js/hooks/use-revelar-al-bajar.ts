import { useEffect } from 'react';

/**
 * Animación de aparición al bajar, para todo el sitio.
 *
 * Cualquier elemento con `data-revelar` empieza oculto y aparece cuando entra en
 * pantalla. Variantes: `data-revelar` (sube), `="izquierda"`, `="derecha"`, `="zoom"`.
 * Para escalonar una lista: `style={{ '--retraso': '120ms' }}`.
 *
 * Sin JavaScript o con "reducir movimiento" el contenido se ve siempre: la clase
 * `revelar-listo` (que activa el ocultamiento) solo se pone cuando el observador existe.
 */
export function useRevelarAlBajar(clave: string) {
    useEffect(() => {
        const raiz = document.documentElement;
        if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            raiz.classList.remove('revelar-listo');
            return;
        }

        const observador = new IntersectionObserver(
            (entradas) => {
                for (const entrada of entradas) {
                    if (entrada.isIntersecting) {
                        entrada.target.classList.add('revelado');
                        observador.unobserve(entrada.target);
                    }
                }
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
        );

        const observar = (nodo: ParentNode) => nodo.querySelectorAll('[data-revelar]:not(.revelado)').forEach((el) => observador.observe(el));

        raiz.classList.add('revelar-listo');
        observar(document);

        // Contenido que aparece después (filtros, pestañas, modales) también se anima.
        const mutaciones = new MutationObserver((cambios) => {
            for (const cambio of cambios) {
                cambio.addedNodes.forEach((nodo) => {
                    if (!(nodo instanceof HTMLElement)) return;
                    if (nodo.matches('[data-revelar]:not(.revelado)')) observador.observe(nodo);
                    observar(nodo);
                });
            }
        });
        mutaciones.observe(document.body, { childList: true, subtree: true });

        return () => {
            observador.disconnect();
            mutaciones.disconnect();
        };
    }, [clave]);
}

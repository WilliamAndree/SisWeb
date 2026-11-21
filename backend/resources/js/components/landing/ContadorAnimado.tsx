import { useEffect, useRef, useState } from 'react';

/**
 * Número que cuenta desde 0 hasta `valor` cuando aparece en pantalla.
 * Los lectores de pantalla y quien reduce el movimiento ven el valor final.
 */
export function ContadorAnimado({ valor, duracionMs = 1400 }: Readonly<{ valor: number; duracionMs?: number }>) {
    const ref = useRef<HTMLSpanElement>(null);
    const [mostrado, setMostrado] = useState(valor);

    useEffect(() => {
        const nodo = ref.current;
        if (!nodo || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        setMostrado(0);
        let cuadro = 0;
        const observador = new IntersectionObserver(
            ([entrada]) => {
                if (!entrada.isIntersecting) return;
                observador.disconnect();
                const inicio = performance.now();
                const paso = (ahora: number) => {
                    const t = Math.min(1, (ahora - inicio) / duracionMs);
                    setMostrado(Math.round(valor * (1 - Math.pow(1 - t, 3))));
                    if (t < 1) cuadro = requestAnimationFrame(paso);
                };
                cuadro = requestAnimationFrame(paso);
            },
            { threshold: 0.4 },
        );
        observador.observe(nodo);

        return () => {
            observador.disconnect();
            cancelAnimationFrame(cuadro);
        };
    }, [valor, duracionMs]);

    return (
        <span ref={ref}>
            <span aria-hidden="true">{mostrado}</span>
            <span className="sr-only">{valor}</span>
        </span>
    );
}

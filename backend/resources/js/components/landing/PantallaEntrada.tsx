import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

const CLAVE_SESION = 'checkitse-entrada-vista';
/** Lo que dura la pantalla antes de levantar el telón. Corta a propósito: no debe hacer esperar. */
export const DURACION_ENTRADA_MS = 1100;

function yaSeVio(): boolean {
    try {
        return sessionStorage.getItem(CLAVE_SESION) === '1';
    } catch {
        return true;
    }
}

/**
 * Pantalla de bienvenida de la portada: marca, franja andina que se llena y un
 * telón que sube dejando ver Huancayo. Mientras tanto la foto de fondo ya se
 * está descargando. Solo aparece la primera vez por sesión y nunca si el
 * sistema pide reducir el movimiento.
 */
export function usePantallaEntrada(): boolean {
    const [mostrar] = useState(() => typeof window !== 'undefined' && !yaSeVio() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    return mostrar;
}

export function PantallaEntrada({ visible }: Readonly<{ visible: boolean }>) {
    const [fase, setFase] = useState<'llenando' | 'subiendo' | 'fin'>(visible ? 'llenando' : 'fin');

    useEffect(() => {
        if (!visible) return;
        try {
            sessionStorage.setItem(CLAVE_SESION, '1');
        } catch {
            // Sin almacenamiento la pantalla simplemente puede repetirse.
        }
        const subir = window.setTimeout(() => setFase('subiendo'), DURACION_ENTRADA_MS - 250);
        const terminar = window.setTimeout(() => setFase('fin'), DURACION_ENTRADA_MS + 650);
        return () => {
            window.clearTimeout(subir);
            window.clearTimeout(terminar);
        };
    }, [visible]);

    if (fase === 'fin') return null;

    return (
        <div
            aria-hidden="true"
            className={`bg-ink-900 trama-andina fixed inset-0 z-[60] flex flex-col items-center justify-center text-white ${fase === 'subiendo' ? 'animate-telon' : ''}`}
        >
            <div className="animate-aparecer flex items-center gap-3">
                <span className="bg-primary-500 flex size-14 items-center justify-center rounded-2xl">
                    <ShieldCheck className="size-8" />
                </span>
                <span className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                    CheckITSE <span className="font-acento text-sun-300 font-semibold italic">Huancayo</span>
                </span>
            </div>
            <p className="animate-aparecer mt-4 text-base tracking-[0.3em] text-slate-300 uppercase" style={{ ['--retraso' as string]: '150ms' }}>
                Abre seguro
            </p>
            <div className="mt-8 h-[18px] w-64 overflow-hidden rounded-sm bg-white/10 sm:w-80">
                <div className="franja-andina animate-llenar w-full" />
            </div>
        </div>
    );
}

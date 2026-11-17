import { Check, Info } from 'lucide-react';

const pasos = [
    { nombre: 'Tu local', detalle: 'Datos básicos' },
    { nombre: 'Condiciones', detalle: 'Qué tiene tu local' },
    { nombre: 'Resultado', detalle: 'Qué mejorar' },
];

/**
 * Progreso único del recorrido ciudadano (datos → condiciones → resultado).
 * Es el único indicador de pasos de cada pantalla: las páginas no deben
 * agregar otro encabezado del tipo "Paso X de 3".
 */
export function FlujoCiudadano({ actual }: Readonly<{ actual: 1 | 2 | 3 }>) {
    const porcentaje = Math.round(((actual - 1) / (pasos.length - 1)) * 100);

    return (
        <nav aria-label="Progreso de tu autoevaluación" className="mb-6">
            <p className="text-primary-700 mb-3 text-base font-bold">
                Paso {actual} de {pasos.length}
            </p>
            <div className="relative">
                <div aria-hidden="true" className="absolute top-4 right-[16.66%] left-[16.66%] h-0.5 rounded-full bg-slate-200">
                    <div className="bg-primary h-full rounded-full transition-[width] duration-500" style={{ width: `${porcentaje}%` }} />
                </div>
                <ol className="relative grid grid-cols-3">
                    {pasos.map((paso, index) => {
                        const numero = index + 1;
                        const hecho = numero < actual;
                        const enCurso = numero === actual;
                        let claseCirculo = 'border-slate-200 bg-white text-slate-500';
                        if (hecho) claseCirculo = 'border-primary bg-primary text-white';
                        if (enCurso) claseCirculo = 'border-primary bg-white text-primary-700 ring-4 ring-primary-100';

                        return (
                            <li key={paso.nombre} aria-current={enCurso ? 'step' : undefined} className="flex flex-col items-center text-center">
                                <span
                                    aria-hidden="true"
                                    className={`flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold ${claseCirculo}`}
                                >
                                    {hecho ? <Check className="size-4" /> : numero}
                                </span>
                                <span className={`mt-2 text-base font-semibold ${enCurso ? 'text-slate-900' : 'text-slate-500'}`}>
                                    <span className="sr-only">
                                        Paso {numero} de {pasos.length}
                                        {hecho ? ' (completado)' : ''}:{' '}
                                    </span>
                                    {paso.nombre}
                                </span>
                                <span className="hidden text-sm text-slate-500 sm:block">{paso.detalle}</span>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </nav>
    );
}

/** Aviso legal compacto: una sola línea discreta, sin repetir bloques grandes. */
export function AvisoPreventivo() {
    return (
        <aside aria-label="Alcance de la herramienta" className="my-4 flex items-start gap-2 text-sm leading-relaxed text-slate-500">
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <p>Es una simulación orientativa basada en lo que declaras. No reemplaza la inspección oficial ni emite certificados ITSE.</p>
        </aside>
    );
}

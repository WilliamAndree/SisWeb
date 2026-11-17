import { calcularVigencia, generarRecordatorioIcs, leerFecha, type EstadoCertificado } from '@/lib/renovacion-itse';
import { Link } from '@inertiajs/react';
import { ArrowRight, BellRing, CalendarCheck2, CalendarPlus, FileText, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

const ESTILO_ESTADO: Record<EstadoCertificado, { caja: string; etiqueta: string; texto: string }> = {
    vigente: { caja: 'border-primary-200 bg-primary-50', etiqueta: 'bg-primary text-white', texto: 'Tu certificado está vigente' },
    'renovar-pronto': { caja: 'border-amber-300 bg-amber-50', etiqueta: 'bg-amber-500 text-white', texto: 'Es momento de renovar' },
    vencido: { caja: 'border-rose-300 bg-rose-50', etiqueta: 'bg-rose-600 text-white', texto: 'Tu certificado venció' },
};

const PASOS_RENOVACION = [
    'Revisa que tu local siga igual que cuando te inspeccionaron (simúlalo aquí en 5 minutos).',
    'Presenta en tu municipalidad la solicitud de renovación y paga la tasa.',
    'Firma la declaración jurada de que mantienes las condiciones de seguridad.',
    'Si tu riesgo es bajo o medio, te entregan el certificado renovado y la inspección se hace después.',
];

const formatoFecha = (fecha: Date) => fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Calculadora de vencimiento y renovación del certificado ITSE
 * (D.S. N° 002-2018-PCM, arts. 15.4, 24 y 29).
 */
export function RenovacionRapida() {
    const [fecha, setFecha] = useState('');
    const [nombre, setNombre] = useState('');
    const expedicion = leerFecha(fecha);
    const vigencia = useMemo(() => (expedicion ? calcularVigencia(expedicion) : null), [expedicion]);

    const descargarRecordatorio = () => {
        if (!vigencia) return;
        const ics = generarRecordatorioIcs(nombre, vigencia.inicioRenovacion, vigencia.vencimiento);
        const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'renovacion-itse.ics';
        enlace.click();
        URL.revokeObjectURL(url);
    };

    const estilo = vigencia ? ESTILO_ESTADO[vigencia.estado] : null;

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            <div>
                <p className="text-primary-700 inline-flex items-center gap-2 text-base font-bold">
                    <RefreshCw aria-hidden="true" className="size-5" /> ¿Ya tienes tu certificado?
                </p>
                <h2 id="renovacion-titulo" className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Renueva a tiempo, sin cerrar tu local
                </h2>
                <p className="mt-3 text-lg leading-relaxed text-slate-600">
                    El certificado ITSE dura 2 años. Calcula cuándo vence y guarda un recordatorio en tu celular.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="renov-fecha" className="mb-1.5 block text-base font-semibold text-slate-800">
                            Fecha de expedición
                        </label>
                        <input
                            id="renov-fecha"
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="focus:border-primary-600 focus:ring-primary-600/20 h-13 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-lg outline-none focus:ring-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="renov-nombre" className="mb-1.5 block text-base font-semibold text-slate-800">
                            Nombre de tu local <span className="font-normal text-slate-500">(opcional)</span>
                        </label>
                        <input
                            id="renov-nombre"
                            type="text"
                            value={nombre}
                            maxLength={60}
                            placeholder="Ej. Perfumería Billy"
                            onChange={(e) => setNombre(e.target.value)}
                            className="focus:border-primary-600 focus:ring-primary-600/20 h-13 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-lg outline-none focus:ring-2"
                        />
                    </div>
                </div>

                {vigencia && estilo ? (
                    <div className={`mt-6 rounded-2xl border p-5 ${estilo.caja}`} aria-live="polite">
                        <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${estilo.etiqueta}`}>{estilo.texto}</span>
                        <p className="mt-3 text-lg text-slate-800">
                            Vence el <strong>{formatoFecha(vigencia.vencimiento)}</strong>
                        </p>
                        <p className="mt-1 text-4xl font-extrabold text-slate-900">
                            {vigencia.diasRestantes >= 0 ? `${vigencia.diasRestantes} días` : `Hace ${Math.abs(vigencia.diasRestantes)} días`}
                        </p>
                        {vigencia.estado === 'vigente' && (
                            <p className="mt-2 text-base text-slate-700">
                                Te recomendamos empezar a preparar la renovación desde el <strong>{formatoFecha(vigencia.inicioRenovacion)}</strong>.
                            </p>
                        )}
                        {vigencia.estado === 'vencido' && (
                            <p className="mt-2 text-base text-slate-700">
                                Ya no puedes renovarlo: debes solicitar una nueva ITSE. Simula tu local para llegar preparado.
                            </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-3">
                            {vigencia.estado !== 'vencido' && (
                                <button
                                    type="button"
                                    onClick={descargarRecordatorio}
                                    className="bg-ink-900 hover:bg-ink-800 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-5 text-base font-bold text-white"
                                >
                                    <CalendarPlus aria-hidden="true" className="size-5" /> Guardar recordatorio
                                </button>
                            )}
                            <Link
                                href={route('autoevaluacion.nueva')}
                                className="text-primary-800 inline-flex min-h-12 items-center gap-2 rounded-xl border border-current/20 bg-white px-5 text-base font-bold"
                            >
                                Revisar mi local <ArrowRight aria-hidden="true" className="size-5" />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <p className="mt-6 flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-5 text-base text-slate-600">
                        <CalendarCheck2 aria-hidden="true" className="size-6 shrink-0 text-slate-400" />
                        Elige la fecha que figura en tu certificado para ver cuándo vence.
                    </p>
                )}
            </div>

            <div className="rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
                <p className="text-sun-300 flex items-center gap-2 text-base font-bold">
                    <FileText aria-hidden="true" className="size-5" /> Así se renueva
                </p>
                <ol className="mt-5 space-y-4">
                    {PASOS_RENOVACION.map((paso, indice) => (
                        <li key={paso} className="flex gap-4">
                            <span className="bg-sun-400 text-ink-900 flex size-8 shrink-0 items-center justify-center rounded-full text-base font-extrabold">
                                {indice + 1}
                            </span>
                            <span className="pt-1 text-base leading-relaxed text-slate-200">{paso}</span>
                        </li>
                    ))}
                </ol>
                <p className="mt-6 flex items-start gap-2 rounded-2xl bg-white/5 p-4 text-sm leading-relaxed text-slate-300">
                    <BellRing aria-hidden="true" className="text-sun-300 mt-0.5 size-4 shrink-0" />
                    Si cambiaste el uso, ampliaste o remodelaste tu local, no se renueva: necesitas una nueva ITSE.
                </p>
            </div>
        </div>
    );
}

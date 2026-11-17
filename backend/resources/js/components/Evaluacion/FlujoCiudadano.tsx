import { Check, Info } from 'lucide-react';

const pasos = ['Datos del local', 'Condiciones', 'Resumen'];

export function FlujoCiudadano({ actual }: Readonly<{ actual: 1 | 2 | 3 }>) {
    return (
        <nav aria-label="Progreso de tu autoevaluación" className="mb-6">
            <ol className="grid grid-cols-3 gap-2 sm:gap-4">
                {pasos.map((paso, index) => (
                    <li
                        key={paso}
                        aria-current={index + 1 === actual ? 'step' : undefined}
                        className={`flex flex-col gap-2 rounded-xl border p-3 text-sm sm:flex-row sm:items-center ${index + 1 === actual ? 'border-primary bg-primary-50 text-primary-900 font-semibold' : 'border-slate-200 bg-white text-slate-600'}`}
                    >
                        <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-full ${index + 1 <= actual ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                            aria-hidden="true"
                        >
                            {index + 1 < actual ? <Check className="size-4" /> : index + 1}
                        </span>
                        <span>
                            <span className="sr-only">Paso {index + 1} de 3: </span>
                            {paso}
                        </span>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export function AvisoPreventivo() {
    return (
        <aside
            aria-label="Alcance de la herramienta"
            className="bg-info-50 text-info-800 my-5 flex items-start gap-3 rounded-2xl border border-sky-200 p-4 text-sm leading-relaxed"
        >
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <p>Esta orientación se basa en lo que declaras. No es una inspección, un certificado ni una aprobación oficial de ITSE.</p>
        </aside>
    );
}

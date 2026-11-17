import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Kit de formularios de CheckITSE.
 *
 * Reglas (ver docs/diseno-visual.md):
 *  - Cada dato es una "pregunta" numerada, con etiqueta en negrita y en
 *    minúsculas normales (nunca MAYÚSCULAS pequeñas).
 *  - La ayuda va debajo de la etiqueta, antes del campo, para leerla primero.
 *  - El error aparece junto a su campo, con icono y texto, no solo color.
 *  - Una sola columna en celular; campos de 48 px de alto y letra de 17 px o más.
 */

export const claseCampo = (conError = false) =>
    `block h-12 w-full rounded-lg border bg-white px-4 text-lg text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-4 ${
        conError ? 'border-rose-600 focus:ring-rose-100' : 'border-slate-400 focus:border-primary-700 focus:ring-primary-100'
    }`;

interface PreguntaProps {
    readonly id: string;
    readonly numero?: number;
    readonly etiqueta: string;
    readonly ayuda?: ReactNode;
    readonly error?: string;
    readonly opcional?: boolean;
    /** Para grupos de opciones: se renderiza como <fieldset> con <legend>. */
    readonly grupo?: boolean;
    readonly children: ReactNode;
}

function Encabezado({ numero, etiqueta, opcional }: Readonly<Pick<PreguntaProps, 'numero' | 'etiqueta' | 'opcional'>>) {
    return (
        <>
            {numero !== undefined && <span className="text-primary-700 mr-1">{numero}.</span>}
            {etiqueta}
            {opcional && <span className="ml-1.5 font-normal text-slate-500">(opcional)</span>}
        </>
    );
}

export function Pregunta({ id, numero, etiqueta, ayuda, error, opcional = false, grupo = false, children }: Readonly<PreguntaProps>) {
    const idAyuda = ayuda ? `${id}-ayuda` : undefined;
    const idError = error ? `${id}-error` : undefined;
    const claseEtiqueta = 'block text-lg font-semibold leading-snug text-slate-900';

    const cuerpo = (
        <>
            {ayuda && (
                <p id={idAyuda} className="mt-1 text-base leading-relaxed text-slate-600">
                    {ayuda}
                </p>
            )}
            <div className="mt-3">{children}</div>
            {error && (
                <p id={idError} className="mt-2 flex items-start gap-2 text-base font-medium text-rose-700">
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                    {error}
                </p>
            )}
        </>
    );

    if (grupo) {
        return (
            <fieldset id={`campo-${id}`} aria-describedby={[idAyuda, idError].filter(Boolean).join(' ') || undefined} className="min-w-0">
                <legend className={claseEtiqueta}>
                    <Encabezado numero={numero} etiqueta={etiqueta} opcional={opcional} />
                </legend>
                {cuerpo}
            </fieldset>
        );
    }

    return (
        <div id={`campo-${id}`}>
            <label htmlFor={id} className={claseEtiqueta}>
                <Encabezado numero={numero} etiqueta={etiqueta} opcional={opcional} />
            </label>
            {cuerpo}
        </div>
    );
}

/** Atributos ARIA que un control debe recibir para quedar enlazado a su ayuda y error. */
export function ariaDe(id: string, opciones: { ayuda?: boolean; error?: string }) {
    const describedBy = [opciones.ayuda ? `${id}-ayuda` : null, opciones.error ? `${id}-error` : null].filter(Boolean).join(' ');
    return { 'aria-invalid': Boolean(opciones.error), 'aria-describedby': describedBy || undefined };
}

interface OpcionTarjeta<T extends string> {
    readonly valor: T;
    readonly titulo: string;
    readonly descripcion?: string;
    readonly extra?: ReactNode;
}

interface OpcionesTarjetaProps<T extends string> {
    readonly nombre: string;
    readonly opciones: ReadonlyArray<OpcionTarjeta<T>>;
    readonly valor: T | '';
    readonly onCambio: (valor: T) => void;
    readonly columnas?: 1 | 2 | 3;
}

/** Opciones grandes con radio nativo: se pueden tocar en toda la tarjeta y usar con teclado. */
export function OpcionesTarjeta<T extends string>({ nombre, opciones, valor, onCambio, columnas = 2 }: Readonly<OpcionesTarjetaProps<T>>) {
    const claseColumnas = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }[columnas];
    return (
        <div className={`grid gap-3 ${claseColumnas}`}>
            {opciones.map((opcion) => {
                const activo = valor === opcion.valor;
                return (
                    <label
                        key={opcion.valor}
                        className={`has-[:focus-visible]:ring-primary-100 relative flex cursor-pointer gap-3 rounded-xl border-2 bg-white p-4 transition has-[:focus-visible]:ring-4 ${
                            activo ? 'border-primary-700 bg-primary-50' : 'border-slate-300 hover:border-slate-400'
                        }`}
                    >
                        <input
                            type="radio"
                            name={nombre}
                            value={opcion.valor}
                            checked={activo}
                            onChange={() => onCambio(opcion.valor)}
                            className="accent-primary-700 mt-1 size-5 shrink-0"
                        />
                        <span className="min-w-0">
                            <span className="block text-lg font-semibold text-slate-900">{opcion.titulo}</span>
                            {opcion.descripcion && <span className="mt-0.5 block text-base text-slate-600">{opcion.descripcion}</span>}
                            {opcion.extra}
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

/** Resumen de errores al inicio del formulario, con enlaces a cada campo. */
export function ResumenErrores({ errores, etiquetas }: Readonly<{ errores: Partial<Record<string, string>>; etiquetas: Record<string, string> }>) {
    const lista = Object.entries(errores).filter(([, mensaje]) => Boolean(mensaje));
    if (lista.length === 0) return null;
    return (
        <div role="alert" className="rounded-xl border-2 border-rose-600 bg-rose-50 p-5">
            <p className="flex items-center gap-2 text-lg font-bold text-rose-800">
                <AlertCircle aria-hidden="true" className="size-6" />
                Revisa {lista.length === 1 ? 'este dato' : `estos ${lista.length} datos`}
            </p>
            <ul className="mt-2 space-y-1 pl-8">
                {lista.map(([campo, mensaje]) => (
                    <li key={campo}>
                        <a href={`#campo-${campo}`} className="text-base text-rose-800 underline underline-offset-2">
                            {etiquetas[campo] ? `${etiquetas[campo]}: ` : ''}
                            {mensaje}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

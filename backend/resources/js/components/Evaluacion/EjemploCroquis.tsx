/**
 * Ejemplo de croquis de ubicación hecho a mano: las calles, el local marcado, una
 * referencia conocida y el norte. Le muestra al emprendedor que basta con un dibujo
 * simple en una hoja; no hace falta un programa ni un plano profesional.
 */
export function EjemploCroquis() {
    return (
        <details className="group mt-3 rounded-xl border border-slate-200 bg-slate-50">
            <summary className="text-primary-700 flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                <span className="transition group-open:rotate-90">▸</span> Ver un ejemplo y cómo hacerlo
            </summary>
            <div className="grid gap-5 px-4 pb-5 sm:grid-cols-[1fr_1.1fr] sm:items-center">
                <figure className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
                    <svg viewBox="0 0 320 220" role="img" aria-labelledby="ejemplo-croquis-titulo" className="h-auto w-full">
                        <title id="ejemplo-croquis-titulo">
                            Ejemplo de croquis: el local en la Av. Giráldez, entre dos jirones, frente a un parque, con la flecha del norte.
                        </title>
                        {/* Manzanas */}
                        <rect x="10" y="10" width="120" height="70" rx="4" fill="#f1f5f9" stroke="#94a3b8" />
                        <rect x="190" y="10" width="120" height="70" rx="4" fill="#f1f5f9" stroke="#94a3b8" />
                        <rect x="10" y="140" width="120" height="70" rx="4" fill="#f1f5f9" stroke="#94a3b8" />
                        {/* Parque de referencia */}
                        <rect x="190" y="140" width="120" height="70" rx="4" fill="#e6e2fa" stroke="#8576dc" />
                        <circle cx="225" cy="172" r="9" fill="#ab9fea" />
                        <circle cx="262" cy="185" r="11" fill="#ab9fea" />
                        <text x="250" y="206" textAnchor="middle" fontSize="11" fontWeight="700" fill="#3a307a">
                            Parque
                        </text>
                        {/* El local */}
                        <rect x="62" y="50" width="56" height="30" rx="3" fill="#ee5a14" />
                        <text x="90" y="69" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
                            MI LOCAL
                        </text>
                        {/* Calles */}
                        <text x="160" y="116" textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">
                            Av. Giráldez
                        </text>
                        <text x="160" y="45" textAnchor="middle" fontSize="10" fill="#475569" transform="rotate(-90 160 45)">
                            Jr. Ica
                        </text>
                        <text x="160" y="178" textAnchor="middle" fontSize="10" fill="#475569" transform="rotate(-90 160 178)">
                            Jr. Lima
                        </text>
                        {/* Norte */}
                        <g transform="translate(292 112)">
                            <path d="M0 -16 L7 6 L0 1 L-7 6 Z" fill="#17133a" />
                            <text y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#17133a">
                                N
                            </text>
                        </g>
                    </svg>
                    <figcaption className="mt-2 text-center text-sm text-slate-500">Ejemplo: así de simple puede ser.</figcaption>
                </figure>
                <ol className="space-y-2 text-base text-slate-700">
                    {[
                        'En una hoja, dibuja la calle de tu local y las dos calles más cercanas, con sus nombres.',
                        'Marca tu local con un rectángulo y escribe su número.',
                        'Agrega una referencia conocida: un parque, un mercado, un colegio.',
                        'Dibuja una flecha hacia el norte (puedes verlo en el mapa del celular).',
                        'Tómale una foto clara y súbela aquí.',
                    ].map((paso, i) => (
                        <li key={paso} className="flex gap-3">
                            <span className="bg-ink-900 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                                {i + 1}
                            </span>
                            {paso}
                        </li>
                    ))}
                </ol>
            </div>
        </details>
    );
}

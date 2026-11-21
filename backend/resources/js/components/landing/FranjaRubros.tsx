const RUBROS = [
    { foto: '/images/local-perfumeria.webp', nombre: 'Perfumerías' },
    { foto: '/images/local-farmacia.webp', nombre: 'Farmacias' },
    { foto: '/images/local-salon.webp', nombre: 'Salones de belleza' },
    { foto: '/images/emprendedora-tienda.webp', nombre: 'Tiendas de ropa' },
    { foto: '/images/estanteria.webp', nombre: 'Bodegas y minimarkets' },
    { foto: '/images/extintor.webp', nombre: 'Seguridad contra incendios' },
    { foto: '/images/tablero-electrico.webp', nombre: 'Instalaciones eléctricas' },
    { foto: '/images/salida-emergencia.webp', nombre: 'Rutas de evacuación' },
] as const;

/**
 * Franja de fotos que se desliza sola (se detiene al pasar el mouse y queda
 * fija si el sistema pide reducir el movimiento). La lista se duplica para que
 * el bucle no tenga saltos; la copia queda oculta para lectores de pantalla.
 */
export function FranjaRubros() {
    return (
        <section aria-labelledby="rubros-titulo" className="overflow-hidden py-16">
            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                <p data-revelar className="text-primary-700 text-sm font-bold tracking-[0.2em] uppercase">
                    Para cualquier rubro
                </p>
                <h2 id="rubros-titulo" data-revelar className="mt-2 max-w-3xl text-4xl font-extrabold text-slate-900 sm:text-5xl">
                    Preguntas hechas a la medida de tu negocio
                </h2>
            </div>
            <div className="group animate-deslizar mt-10 flex w-max gap-4 hover:[animation-play-state:paused] motion-reduce:animate-none">
                {[0, 1].map((copia) => (
                    <ul key={copia} aria-hidden={copia === 1} className="flex gap-4">
                        {RUBROS.map((rubro) => (
                            <li key={rubro.nombre} className="relative h-72 w-56 shrink-0 overflow-hidden rounded-2xl sm:h-96 sm:w-72">
                                <img
                                    src={rubro.foto}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover transition duration-700 hover:scale-105"
                                />
                                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
                                <p className="absolute right-4 bottom-4 left-4 text-lg leading-tight font-bold text-white">{rubro.nombre}</p>
                            </li>
                        ))}
                    </ul>
                ))}
            </div>
        </section>
    );
}

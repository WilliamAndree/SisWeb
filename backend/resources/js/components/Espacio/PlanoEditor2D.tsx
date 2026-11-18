import { Crosshair, Layers, Minus, Plus, RotateCcw } from 'lucide-react';
import React, { useRef, useState } from 'react';

export interface Vertice {
    x: number;
    y: number;
}

export interface ElementoEspacialData {
    id?: number;
    tipo: 'EXTINTOR' | 'SENAL_SALIDA' | 'LUZ_EMERGENCIA' | 'TABLERO_ELECTRICO' | 'OBSTACULO' | 'BOTIQUIN' | 'OTRO' | string;
    posicion_x: number;
    posicion_y: number;
    origen_dato?: 'DECLARADO_MANUAL' | 'ILUSTRATIVO_PLANTILLA' | 'CONFIRMADO_SUGERENCIA_IA' | string;
    observacion?: string | null;
    subsanacion_id?: number | null;
}

export interface ConectorData {
    id?: number;
    tipo: 'PUERTA_INTERIOR' | 'PUERTA_SALIDA' | 'VANO' | 'PASILLO' | 'ESCALERA' | 'CONEXION_NIVEL' | string;
    ancho_metros: number;
    conduce_a_salida_publica: boolean;
    abre_hacia_afuera?: boolean | null;
    ambiente_origen_codigo?: string | null;
    ambiente_destino_codigo?: string | null;
    nivel_destino_numero?: number | null;
    posicion_x: number;
    posicion_y: number;
    origen_dato?: string;
}

export interface AmbienteData {
    id?: number;
    codigo: string;
    nombre: string;
    uso: 'ATENCION_PUBLICO' | 'COCINA' | 'ALMACEN' | 'SERVICIOS_HIGIENICOS' | 'CIRCULACION' | 'OFICINA' | 'OTRO' | string;
    ancho_metros?: number | null;
    largo_metros?: number | null;
    area_m2?: number | null;
    posicion_x: number;
    posicion_y: number;
    vertices_poligono?: Vertice[] | null;
    origen_dimensiones?: string;
    notas?: string | null;
    elementos?: ElementoEspacialData[];
}

export interface NivelPisoData {
    id?: number;
    numero_piso: number;
    nombre: string;
    altura_metros?: number | null;
    orden?: number;
    ambientes: AmbienteData[];
    conectores: ConectorData[];
}

export interface GeometriaPlanoData {
    esquema_version?: string;
    niveles: NivelPisoData[];
}

interface PlanoEditor2DProps {
    geometria: GeometriaPlanoData;
    nivelSeleccionadoIndex?: number;
    ambienteSeleccionadoCodigo?: string | null;
    onSeleccionarAmbiente?: (codigo: string | null) => void;
    onActualizarPosicionAmbiente?: (codigo: string, posX: number, posY: number) => void;
    modoEdicion?: boolean;
    modoColocacionManual?: boolean;
    onCanvasClickCoordenadas?: (posXMetros: number, posYMetros: number, codigoAmbiente?: string | null) => void;
}

export function PlanoEditor2D({
    geometria,
    nivelSeleccionadoIndex = 0,
    ambienteSeleccionadoCodigo = null,
    onSeleccionarAmbiente,
    onActualizarPosicionAmbiente,
    modoEdicion = true,
    modoColocacionManual = false,
    onCanvasClickCoordenadas,
}: Readonly<PlanoEditor2DProps>) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    // Estados de navegación visual (zoom y paneo)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    // Estado para arrastrar un ambiente en el lienzo
    const [draggingAmbiente, setDraggingAmbiente] = useState<string | null>(null);
    const [dragOffset] = useState({ x: 0, y: 0 });

    // Escala fija: 45 píxeles = 1 metro en la cuadrícula
    const ESCALA_PPM = 45;
    const MARGEN = 40;

    const nivelActual = geometria.niveles[nivelSeleccionadoIndex] ?? geometria.niveles[0];
    const ambientes = nivelActual?.ambientes ?? [];
    const conectores = nivelActual?.conectores ?? [];

    // Calcular dimensiones dinámicas del viewport
    const maxCoords = ambientes.reduce(
        (acc, amb) => {
            const maxX = amb.vertices_poligono ? Math.max(...amb.vertices_poligono.map((v) => v.x)) : (amb.posicion_x || 0) + (amb.ancho_metros || 4);
            const maxY = amb.vertices_poligono ? Math.max(...amb.vertices_poligono.map((v) => v.y)) : (amb.posicion_y || 0) + (amb.largo_metros || 4);
            return {
                x: Math.max(acc.x, maxX),
                y: Math.max(acc.y, maxY),
            };
        },
        { x: 12, y: 10 },
    );

    const anchoSvg = Math.max(800, (maxCoords.x + 4) * ESCALA_PPM + MARGEN * 2);
    const altoSvg = Math.max(600, (maxCoords.y + 4) * ESCALA_PPM + MARGEN * 2);

    // Manejo de zoom
    const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.15));
    const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
    const handleResetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    // Inicio de paneo
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        if (modoColocacionManual) {
            return;
        }
        if (e.button === 0 && (e.target as HTMLElement).id === 'grid-bg') {
            setIsPanning(true);
            setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isPanning) {
            setPan({
                x: e.clientX - startPan.x,
                y: e.clientY - startPan.y,
            });
        } else if (draggingAmbiente && modoEdicion && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const currentSvgX = (e.clientX - rect.left - pan.x) / zoom;
            const currentSvgY = (e.clientY - rect.top - pan.y) / zoom;

            const nuevaPosXM = Math.max(0, Math.round(((currentSvgX - dragOffset.x - MARGEN) / ESCALA_PPM) * 10) / 10);
            const nuevaPosYM = Math.max(0, Math.round(((currentSvgY - dragOffset.y - MARGEN) / ESCALA_PPM) * 10) / 10);

            if (onActualizarPosicionAmbiente) {
                onActualizarPosicionAmbiente(draggingAmbiente, nuevaPosXM, nuevaPosYM);
            }
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDraggingAmbiente(null);
    };

    // Clic en el canvas SVG para colocación manual de sugerencia
    const handleCanvasClick = (e: React.MouseEvent<SVGElement>, codigoAmb?: string) => {
        if (!modoColocacionManual || !onCanvasClickCoordenadas || !svgRef.current) {
            return;
        }
        const rect = svgRef.current.getBoundingClientRect();
        const clickSvgX = (e.clientX - rect.left - pan.x) / zoom;
        const clickSvgY = (e.clientY - rect.top - pan.y) / zoom;

        const posXMetros = Math.max(0, Math.round(((clickSvgX - MARGEN) / ESCALA_PPM) * 100) / 100);
        const posYMetros = Math.max(0, Math.round(((clickSvgY - MARGEN) / ESCALA_PPM) * 100) / 100);

        onCanvasClickCoordenadas(posXMetros, posYMetros, codigoAmb ?? null);
    };

    return (
        <div className="relative flex h-[620px] w-full flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl select-none">
            {/* Barra de herramientas superior */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-md">
                <span className="flex items-center gap-1.5 font-bold text-slate-300">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    {nivelActual?.nombre ?? 'Piso 1'}
                </span>
                <div className="h-4 w-px bg-slate-700" />
                <span className="font-mono text-[11px] text-slate-400">Escala: 1m = {ESCALA_PPM}px</span>
                {modoColocacionManual && (
                    <>
                        <div className="h-4 w-px bg-slate-700" />
                        <span className="flex animate-pulse items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                            <Crosshair className="h-3 w-3" />
                            Modo Ubicación Manual (Haz clic donde está instalado)
                        </span>
                    </>
                )}
            </div>

            {/* Controles de Zoom y Vista */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-2xl border border-slate-700/60 bg-slate-900/90 p-1.5 text-white shadow-lg backdrop-blur-md">
                <button
                    type="button"
                    onClick={handleZoomIn}
                    className="rounded-xl p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    title="Acercar plano"
                >
                    <Plus className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={handleZoomOut}
                    className="rounded-xl p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    title="Alejar plano"
                >
                    <Minus className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={handleResetView}
                    className="rounded-xl p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    title="Centrar vista"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <div className="px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">{Math.round(zoom * 100)}%</div>
            </div>

            {/* Leyenda pedagógica inferior */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/90 px-3.5 py-2 text-[11px] text-slate-300 backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span>Extintor</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span>Luz Emerg.</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                    <span>Tablero TG</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-3 rounded bg-emerald-500" />
                    <span>Salida</span>
                </div>
                <div className="h-3 w-px bg-slate-700" />
                <div className="flex items-center gap-1 text-[10px] text-amber-300">
                    <span className="inline-block h-3 w-3 rounded-full border border-dashed border-amber-400" />
                    <span>Ilustrativo de plantilla</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-blue-300">
                    <span className="inline-block h-3 w-3 rounded-full border border-blue-400" />
                    <span>IA Confirmado</span>
                </div>
            </div>

            {/* Lienzo SVG */}
            <div className="h-full w-full flex-1 cursor-grab overflow-hidden active:cursor-grabbing">
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
                    className={`h-full w-full ${modoColocacionManual ? 'cursor-crosshair' : ''}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onClick={(e) => handleCanvasClick(e)}
                >
                    <defs>
                        {/* Cuadrícula métrica (cada 45px = 1 metro) */}
                        <pattern id="grid-metrico" width={ESCALA_PPM} height={ESCALA_PPM} patternUnits="userSpaceOnUse">
                            <path
                                d={`M ${ESCALA_PPM} 0 L 0 0 0 ${ESCALA_PPM}`}
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth="0.8"
                                strokeDasharray="2,2"
                            />
                        </pattern>

                        {/* Símbolo de extintor */}
                        <g id="simbolo-extintor">
                            <circle cx="0" cy="0" r="14" fill="#fee2e2" stroke="#dc2626" strokeWidth="2" />
                            <circle cx="0" cy="0" r="5" fill="#dc2626" />
                        </g>

                        {/* Símbolo de luz de emergencia */}
                        <g id="simbolo-luz">
                            <rect x="-10" y="-8" width="20" height="16" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
                            <circle cx="-4" cy="0" r="2.5" fill="#d97706" />
                            <circle cx="4" cy="0" r="2.5" fill="#d97706" />
                        </g>

                        {/* Símbolo de tablero eléctrico */}
                        <g id="simbolo-tablero">
                            <rect x="-9" y="-9" width="18" height="18" rx="3" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
                            <path d="M 0 -5 L -4 1 L 1 1 L -1 6 L 5 -1 L 0 -1 Z" fill="#0284c7" />
                        </g>

                        {/* Símbolo de obstáculo */}
                        <g id="simbolo-obstaculo">
                            <rect
                                x="-11"
                                y="-11"
                                width="22"
                                height="22"
                                rx="3"
                                fill="#ffedd5"
                                stroke="#ea580c"
                                strokeWidth="2"
                                strokeDasharray="3,2"
                            />
                            <line x1="-7" y1="-7" x2="7" y2="7" stroke="#ea580c" strokeWidth="2" />
                            <line x1="7" y1="-7" x2="-7" y2="7" stroke="#ea580c" strokeWidth="2" />
                        </g>

                        {/* Símbolo de señal de salida */}
                        <g id="simbolo-salida">
                            <rect x="-13" y="-7" width="26" height="14" rx="2" fill="#d1fae5" stroke="#5546b8" strokeWidth="2" />
                            <text x="0" y="3" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#463a96">
                                SALIDA
                            </text>
                        </g>

                        {/* Símbolo de botiquín */}
                        <g id="simbolo-botiquin">
                            <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#ffffff" stroke="#dc2626" strokeWidth="2" />
                            <rect x="-2" y="-7" width="4" height="14" fill="#dc2626" />
                            <rect x="-7" y="-2" width="14" height="4" fill="#dc2626" />
                        </g>
                    </defs>

                    {/* Fondo interactivo */}
                    <rect id="grid-bg" x="0" y="0" width={anchoSvg} height={altoSvg} fill="url(#grid-metrico)" />

                    {/* Grupo transformable con zoom y paneo */}
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                        {/* 1. Capa de Ambientes / Zonas */}
                        {ambientes.map((amb) => {
                            const estaSeleccionado = amb.codigo === ambienteSeleccionadoCodigo;

                            let puntosStr = '';
                            let centroX = 0;
                            let centroY = 0;

                            if (amb.vertices_poligono && amb.vertices_poligono.length >= 3) {
                                puntosStr = amb.vertices_poligono.map((v) => `${MARGEN + v.x * ESCALA_PPM},${MARGEN + v.y * ESCALA_PPM}`).join(' ');

                                const sx = amb.vertices_poligono.reduce((acc, v) => acc + v.x, 0);
                                const sy = amb.vertices_poligono.reduce((acc, v) => acc + v.y, 0);
                                centroX = MARGEN + (sx / amb.vertices_poligono.length) * ESCALA_PPM;
                                centroY = MARGEN + (sy / amb.vertices_poligono.length) * ESCALA_PPM;
                            } else {
                                const px = MARGEN + (amb.posicion_x || 0) * ESCALA_PPM;
                                const py = MARGEN + (amb.posicion_y || 0) * ESCALA_PPM;
                                const w = (amb.ancho_metros || 4) * ESCALA_PPM;
                                const h = (amb.largo_metros || 4) * ESCALA_PPM;
                                puntosStr = `${px},${py} ${px + w},${py} ${px + w},${py + h} ${px},${py + h}`;
                                centroX = px + w / 2;
                                centroY = py + h / 2;
                            }

                            return (
                                <g
                                    key={amb.codigo}
                                    className="cursor-pointer transition-all duration-150"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (modoColocacionManual && onCanvasClickCoordenadas) {
                                            handleCanvasClick(e, amb.codigo);
                                            return;
                                        }
                                        if (onSeleccionarAmbiente) {
                                            onSeleccionarAmbiente(amb.codigo);
                                        }
                                    }}
                                >
                                    <polygon
                                        points={puntosStr}
                                        fill={estaSeleccionado ? '#f8fafc' : '#ffffff'}
                                        stroke={estaSeleccionado ? '#0284c7' : '#334155'}
                                        strokeWidth={estaSeleccionado ? '3' : '2'}
                                        strokeDasharray="none"
                                        className="drop-shadow-sm filter transition-colors duration-150"
                                    />

                                    {/* Nombre y dimensiones en el centro */}
                                    <text
                                        x={centroX}
                                        y={centroY - 8}
                                        textAnchor="middle"
                                        className="pointer-events-none fill-slate-800 text-xs font-black tracking-tight select-none"
                                    >
                                        {amb.nombre}
                                    </text>
                                    <text
                                        x={centroX}
                                        y={centroY + 8}
                                        textAnchor="middle"
                                        className="pointer-events-none fill-slate-500 font-mono text-[10px] font-semibold select-none"
                                    >
                                        {amb.area_m2 ? `${amb.area_m2} m²` : `${amb.ancho_metros}m x ${amb.largo_metros}m`}
                                    </text>
                                    <text
                                        x={centroX}
                                        y={centroY + 22}
                                        textAnchor="middle"
                                        className="pointer-events-none fill-slate-400 text-[9px] font-bold tracking-wider uppercase select-none"
                                    >
                                        {amb.uso.replace('_', ' ')}
                                    </text>

                                    {/* 2. Capa de Elementos Espaciales dentro del ambiente */}
                                    {amb.elementos?.map((elem, idx) => {
                                        const elemX = MARGEN + (elem.posicion_x || 0) * ESCALA_PPM;
                                        const elemY = MARGEN + (elem.posicion_y || 0) * ESCALA_PPM;

                                        let simboloHref = '#simbolo-extintor';
                                        if (elem.tipo === 'LUZ_EMERGENCIA') simboloHref = '#simbolo-luz';
                                        if (elem.tipo === 'TABLERO_ELECTRICO') simboloHref = '#simbolo-tablero';
                                        if (elem.tipo === 'OBSTACULO') simboloHref = '#simbolo-obstaculo';
                                        if (elem.tipo === 'SENAL_SALIDA') simboloHref = '#simbolo-salida';
                                        if (elem.tipo === 'BOTIQUIN') simboloHref = '#simbolo-botiquin';

                                        const esIlustrativo = elem.origen_dato === 'ILUSTRATIVO_PLANTILLA';
                                        const esConfirmadoIA = elem.origen_dato === 'CONFIRMADO_SUGERENCIA_IA';

                                        return (
                                            <g key={`elem-${elem.tipo}-${idx}`} transform={`translate(${elemX}, ${elemY})`}>
                                                {/* Halo distintivo de procedencia */}
                                                {esIlustrativo && (
                                                    <circle cx="0" cy="0" r="17" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
                                                )}
                                                {esConfirmadoIA && <circle cx="0" cy="0" r="17" fill="none" stroke="#3b82f6" strokeWidth="2.5" />}

                                                <use href={simboloHref} />

                                                {esIlustrativo && (
                                                    <text
                                                        x="0"
                                                        y="25"
                                                        textAnchor="middle"
                                                        className="fill-amber-700 text-[7px] font-black select-none"
                                                    >
                                                        (Plantilla)
                                                    </text>
                                                )}
                                                {esConfirmadoIA && (
                                                    <text
                                                        x="0"
                                                        y="25"
                                                        textAnchor="middle"
                                                        className="fill-blue-700 text-[7px] font-black select-none"
                                                    >
                                                        (IA Confirmado)
                                                    </text>
                                                )}

                                                <title>{`${elem.tipo}: ${elem.observacion || 'Declarado'} [${elem.origen_dato || 'MANUAL'}]`}</title>
                                            </g>
                                        );
                                    })}
                                </g>
                            );
                        })}

                        {/* 3. Capa de Conectores (Puertas, Salidas y Pasadizos) */}
                        {conectores.map((con, idx) => {
                            const conX = MARGEN + (con.posicion_x || 0) * ESCALA_PPM;
                            const conY = MARGEN + (con.posicion_y || 0) * ESCALA_PPM;
                            const anchoPx = (con.ancho_metros || 0.9) * ESCALA_PPM;

                            const esSalida = con.conduce_a_salida_publica || con.tipo === 'PUERTA_SALIDA';

                            return (
                                <g key={`con-${idx}`} transform={`translate(${conX}, ${conY})`}>
                                    {esSalida ? (
                                        // Puerta de Salida Principal a la Calle
                                        <g className="cursor-pointer">
                                            <rect
                                                x={-anchoPx / 2}
                                                y={-6}
                                                width={anchoPx}
                                                height={12}
                                                rx="3"
                                                fill="#6a59cf"
                                                stroke="#463a96"
                                                strokeWidth="2"
                                            />
                                            <polygon points="0,-16 -6,-9 6,-9" fill="#463a96" />
                                            <text
                                                x="0"
                                                y="22"
                                                textAnchor="middle"
                                                className="fill-emerald-800 text-[9px] font-black tracking-wider uppercase select-none"
                                            >
                                                SALIDA A CALLE ({con.ancho_metros}m)
                                            </text>
                                        </g>
                                    ) : (
                                        // Puerta Interior o Vano
                                        <g className="cursor-pointer">
                                            <rect
                                                x={-anchoPx / 2}
                                                y={-4}
                                                width={anchoPx}
                                                height={8}
                                                rx="2"
                                                fill="#ffffff"
                                                stroke="#0284c7"
                                                strokeWidth="2"
                                            />
                                            <path
                                                d={`M ${-anchoPx / 2} -4 A ${anchoPx} ${anchoPx} 0 0 1 ${anchoPx / 2} -4`}
                                                fill="none"
                                                stroke="#38bdf8"
                                                strokeWidth="1.5"
                                                strokeDasharray="2,2"
                                            />
                                            <text x="0" y="16" textAnchor="middle" className="fill-slate-500 text-[8px] font-semibold select-none">
                                                Paso ({con.ancho_metros}m)
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>
        </div>
    );
}

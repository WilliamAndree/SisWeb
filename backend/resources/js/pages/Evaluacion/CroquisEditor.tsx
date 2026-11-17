import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Copy,
  Crosshair,
  DoorOpen,
  Eye,
  FileCheck,
  Flame,
  Hash,
  History,
  Info,
  Layers,
  LayoutTemplate,
  Loader2,
  MapPin,
  Maximize2,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  PlanoEditor2D,
  type AmbienteData,
  type ConectorData,
  type ElementoEspacialData,
  type GeometriaPlanoData,
  type NivelPisoData,
} from '@/components/Espacio/PlanoEditor2D';

export interface SugerenciaEspacialData {
  id: number;
  uuid: string;
  tipo_elemento: string;
  nombre_detectado?: string | null;
  descripcion_observacion: string;
  nivel_confianza?: string | null;
  estado: 'PENDIENTE' | 'CONFIRMADA' | 'RECHAZADA' | 'NO_APLICABLE' | 'INVALIDADA' | string;
  motivo_rechazo?: string | null;
  subsanacion_id: number;
  evidencia_url?: string | null;
  hash_evidencia: string;
  elemento_espacial_id?: number | null;
  generada_at?: string | null;
  resuelta_at?: string | null;
}

export interface AnalisisEspacialData {
  id: number;
  uuid: string;
  version_plano_id: number;
  numero_version?: number | null;
  hash_geometria_analizada: string;
  estado_ejecucion: string;
  es_vigente: boolean;
  todos_ambientes_conectados: boolean;
  total_ambientes: number;
  total_ambientes_conectados: number;
  total_conectores: number;
  total_conectores_confirmados: number;
  total_conectores_sugeridos: number;
  total_conectores_flotantes: number;
  total_conectores_indeterminados: number;
  total_advertencias: number;
  resumen_conectividad: {
    total_ambientes?: number;
    ambientes_conectados?: string[];
    ambientes_no_conectados?: string[];
    estadisticas_conectores?: {
      confirmados: number;
      sugeridos: number;
      flotantes: number;
      indeterminados: number;
    };
    elementos_declarados_totales?: number;
    elementos_plantilla_excluidos?: number;
    [key: string]: any;
  };
  resultado_preventivo: {
    es_integro: boolean;
    todos_ambientes_conectados: boolean;
    advertencias: Array<{
      tipo: string;
      mensaje: string;
      recomendacion?: string;
      ambiente_codigo?: string;
      conector_idx?: number;
      coordenadas?: { x: number; y: number };
      [key: string]: any;
    }>;
    resumen_ambientes?: Array<{
      codigo: string;
      nombre: string;
      uso: string;
      numero_piso: number;
      conectado_a_salida: boolean;
    }>;
    conclusiones_pedagogicas?: string[];
    aviso_legal?: string;
  };
  elementos_declarados?: Array<{
    ambiente_codigo: string;
    numero_piso: number;
    tipo: string;
    origen_dato: string;
    posicion_x: number;
    posicion_y: number;
    observacion?: string | null;
  }>;
  errores_integridad?: string[] | null;
  analizado_at?: string | null;
}

interface CroquisEditorProps {
  readonly autoevaluacion: {
    id: number;
    uuid: string;
    nombre_comercio: string;
    funcion_economica?: string | null;
    ruc?: string | null;
    direccion?: string | null;
    sector_huancayo?: string | null;
    area_m2?: number | null;
    pisos?: number | null;
    aforo?: number | null;
    estado: string;
    hash_integridad?: string | null;
  };
  readonly plano: {
    id: number;
    uuid: string;
    estado: string;
    version_activa_id?: number | null;
  };
  readonly versionActiva?: {
    plano_uuid: string;
    estado_plano: string;
    version_id: number;
    numero_version: number;
    hash_geometria_sha256: string;
    esquema_version: string;
    cerrada_at?: string | null;
    created_at?: string | null;
    geometria: GeometriaPlanoData;
    total_versiones: number;
  } | null;
  readonly plantillas: Record<
    string,
    {
      nombre: string;
      descripcion: string;
      geometria: GeometriaPlanoData;
    }
  >;
  readonly historialVersiones: Array<{
    id: number;
    numero_version: number;
    hash_geometria_sha256: string;
    descripcion_cambio?: string | null;
    cerrada_at?: string | null;
    created_at?: string | null;
  }>;
  readonly sugerencias?: SugerenciaEspacialData[];
  readonly ultimoAnalisis?: AnalisisEspacialData | null;
}

export default function CroquisEditor({
  autoevaluacion,
  plano,
  versionActiva,
  plantillas,
  historialVersiones: historialInicial,
  sugerencias: sugerenciasIniciales = [],
  ultimoAnalisis = null,
}: Readonly<CroquisEditorProps>) {
  // Geometría en memoria para edición
  const geometriaInicial: GeometriaPlanoData =
    versionActiva?.geometria ??
    plantillas['RECTANGULAR_SIMPLE']?.geometria ?? {
      esquema_version: 'v1.0',
      niveles: [
        {
          numero_piso: 1,
          nombre: 'Piso 1 - Atención',
          altura_metros: 2.8,
          ambientes: [
            {
              codigo: 'AMB-01',
              nombre: 'Salón Principal',
              uso: 'ATENCION_PUBLICO',
              ancho_metros: 4.0,
              largo_metros: 8.0,
              posicion_x: 0,
              posicion_y: 0,
              origen_dimensiones: 'DECLARADO_MANUAL',
              elementos: [],
            },
          ],
          conectores: [
            {
              tipo: 'PUERTA_SALIDA',
              ancho_metros: 1.0,
              conduce_a_salida_publica: true,
              abre_hacia_afuera: true,
              ambiente_origen_codigo: 'AMB-01',
              posicion_x: 2.0,
              posicion_y: 0,
              origen_dato: 'DECLARADO_MANUAL',
            },
          ],
        },
      ],
    };

  const [geometria, setGeometria] = useState<GeometriaPlanoData>(geometriaInicial);
  const [nivelActivoIndex, setNivelActivoIndex] = useState(0);
  const [ambienteSeleccionadoCodigo, setAmbienteSeleccionadoCodigo] = useState<string | null>(
    geometria.niveles[0]?.ambientes[0]?.codigo ?? null
  );
  const [tabSidebar, setTabSidebar] = useState<'ambientes' | 'conectores' | 'elementos' | 'analisis' | 'plantillas' | 'sugerencias' | 'historial'>('ambientes');
  const [guardando, setGuardando] = useState(false);
  const [analisisActual, setAnalisisActual] = useState<AnalisisEspacialData | null>(ultimoAnalisis ?? null);
  const [ejecutandoAnalisis, setEjecutandoAnalisis] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [descripcionCambio, setDescripcionCambio] = useState('');
  const [hashActual, setHashActual] = useState<string | null>(versionActiva?.hash_geometria_sha256 ?? null);
  const [numeroVersionActual, setNumeroVersionActual] = useState<number | null>(versionActiva?.numero_version ?? null);

  // Estados para Sugerencias IA
  const [sugerencias, setSugerencias] = useState<SugerenciaEspacialData[]>(sugerenciasIniciales);
  const [sugerenciaAConfirmar, setSugerenciaAConfirmar] = useState<SugerenciaEspacialData | null>(null);
  const [ambienteDestinoSugerencia, setAmbienteDestinoSugerencia] = useState<string>('');
  const [posXManual, setPosXManual] = useState<number>(1.0);
  const [posYManual, setPosYManual] = useState<number>(1.0);
  const [observacionConfirmacion, setObservacionConfirmacion] = useState<string>('');
  const [modoColocacionManualActivo, setModoColocacionManualActivo] = useState(false);
  const [procesandoConfirmacion, setProcesandoConfirmacion] = useState(false);

  const [sugerenciaARechazar, setSugerenciaARechazar] = useState<SugerenciaEspacialData | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesandoRechazo, setProcesandoRechazo] = useState(false);

  const nivelActual = geometria.niveles[nivelActivoIndex] ?? geometria.niveles[0];
  const ambientes = nivelActual?.ambientes ?? [];
  const conectores = nivelActual?.conectores ?? [];

  const ambienteSeleccionado = ambientes.find((a) => a.codigo === ambienteSeleccionadoCodigo) ?? ambientes[0] ?? null;

  const sugerenciasPendientes = sugerencias.filter((s) => s.estado === 'PENDIENTE');

  // Cargar una plantilla de Huancayo
  const handleCargarPlantilla = (clave: string) => {
    const plantilla = plantillas[clave];
    if (plantilla) {
      setGeometria(JSON.parse(JSON.stringify(plantilla.geometria)));
      setAmbienteSeleccionadoCodigo(plantilla.geometria.niveles[0]?.ambientes[0]?.codigo ?? null);
      setMensajeExito(`Plantilla "${plantilla.nombre}" cargada en el editor. Los equipos se marcaron como referenciales de plantilla.`);
      setMensajeError(null);
    }
  };

  // Modificar ambiente seleccionado
  const handleModificarAmbiente = (campo: keyof AmbienteData, valor: any) => {
    if (!ambienteSeleccionado) return;

    setGeometria((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GeometriaPlanoData;
      const nivel = copia.niveles[nivelActivoIndex];
      const ambIndex = nivel.ambientes.findIndex((a) => a.codigo === ambienteSeleccionado.codigo);
      if (ambIndex !== -1) {
        nivel.ambientes[ambIndex] = {
          ...nivel.ambientes[ambIndex],
          [campo]: valor,
        };

        // Recalcular área si se modifican ancho o largo rectangular
        if (campo === 'ancho_metros' || campo === 'largo_metros') {
          const w = Number.parseFloat(campo === 'ancho_metros' ? valor : nivel.ambientes[ambIndex].ancho_metros ?? 0);
          const l = Number.parseFloat(campo === 'largo_metros' ? valor : nivel.ambientes[ambIndex].largo_metros ?? 0);
          if (w > 0 && l > 0) {
            nivel.ambientes[ambIndex].area_m2 = Math.round(w * l * 100) / 100;
          }
        }
      }
      return copia;
    });
  };

  // Modificar posición arrastrada desde el canvas SVG
  const handleActualizarPosicionAmbiente = (codigo: string, posX: number, posY: number) => {
    setGeometria((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GeometriaPlanoData;
      const nivel = copia.niveles[nivelActivoIndex];
      const amb = nivel.ambientes.find((a) => a.codigo === codigo);
      if (amb) {
        amb.posicion_x = posX;
        amb.posicion_y = posY;
      }
      return copia;
    });
  };

  // Añadir un nuevo ambiente rectangular
  const handleAgregarAmbiente = () => {
    const count = ambientes.length + 1;
    const nuevoCodigo = `AMB-${count.toString().padStart(2, '0')}`;
    const nuevoAmbiente: AmbienteData = {
      codigo: nuevoCodigo,
      nombre: `Ambiente ${count}`,
      uso: 'ATENCION_PUBLICO',
      ancho_metros: 4.0,
      largo_metros: 4.0,
      area_m2: 16.0,
      posicion_x: (count - 1) * 4.5,
      posicion_y: 0,
      origen_dimensiones: 'DECLARADO_MANUAL',
      elementos: [],
    };

    setGeometria((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GeometriaPlanoData;
      copia.niveles[nivelActivoIndex].ambientes.push(nuevoAmbiente);
      return copia;
    });
    setAmbienteSeleccionadoCodigo(nuevoCodigo);
  };

  // Eliminar un ambiente
  const handleEliminarAmbiente = (codigo: string) => {
    if (ambientes.length <= 1) {
      setMensajeError('El establecimiento debe tener al menos un ambiente principal.');
      return;
    }

    setGeometria((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GeometriaPlanoData;
      copia.niveles[nivelActivoIndex].ambientes = copia.niveles[nivelActivoIndex].ambientes.filter((a) => a.codigo !== codigo);
      return copia;
    });

    const restante = ambientes.find((a) => a.codigo !== codigo);
    setAmbienteSeleccionadoCodigo(restante?.codigo ?? null);
  };

  // Añadir un conector / puerta
  const handleAgregarConector = (tipo: 'PUERTA_SALIDA' | 'PUERTA_INTERIOR') => {
    const nuevoConector: ConectorData = {
      tipo,
      ancho_metros: tipo === 'PUERTA_SALIDA' ? 1.0 : 0.9,
      conduce_a_salida_publica: tipo === 'PUERTA_SALIDA',
      abre_hacia_afuera: tipo === 'PUERTA_SALIDA',
      ambiente_origen_codigo: ambienteSeleccionado?.codigo ?? 'AMB-01',
      posicion_x: (ambienteSeleccionado?.posicion_x || 0) + (ambienteSeleccionado?.ancho_metros || 4) / 2,
      posicion_y: (ambienteSeleccionado?.posicion_y || 0),
      origen_dato: 'DECLARADO_MANUAL',
    };

    setGeometria((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GeometriaPlanoData;
      copia.niveles[nivelActivoIndex].conectores.push(nuevoConector);
      return copia;
    });
  };

  // Eliminar conector
  const handleEliminarConector = (index: number) => {
    setGeometria((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GeometriaPlanoData;
      copia.niveles[nivelActivoIndex].conectores.splice(index, 1);
      return copia;
    });
  };

  // Añadir un elemento espacial manual dentro del ambiente seleccionado
  const handleAgregarElemento = (tipo: ElementoEspacialData['tipo']) => {
    if (!ambienteSeleccionado) {
      setMensajeError('Selecciona primero un ambiente donde ubicar el elemento.');
      return;
    }

    const nuevoElem: ElementoEspacialData = {
      tipo,
      posicion_x: (ambienteSeleccionado.posicion_x || 0) + 0.5,
      posicion_y: (ambienteSeleccionado.posicion_y || 0) + 0.5,
      origen_dato: 'DECLARADO_MANUAL',
      observacion: `Elemento de seguridad declarado por el comerciante`,
    };

    setGeometria((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GeometriaPlanoData;
      const nivel = copia.niveles[nivelActivoIndex];
      const amb = nivel.ambientes.find((a) => a.codigo === ambienteSeleccionado.codigo);
      if (amb) {
        if (!amb.elementos) amb.elementos = [];
        amb.elementos.push(nuevoElem);
      }
      return copia;
    });
  };

  // Eliminar elemento de un ambiente
  const handleEliminarElemento = (codigoAmbiente: string, index: number) => {
    setGeometria((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GeometriaPlanoData;
      const nivel = copia.niveles[nivelActivoIndex];
      const amb = nivel.ambientes.find((a) => a.codigo === codigoAmbiente);
      if (amb && amb.elementos) {
        amb.elementos.splice(index, 1);
      }
      return copia;
    });
  };

  // Confirmar elemento ilustrativo de plantilla a través de endpoint N+1
  const handleConfirmarElementoPlantilla = async (codigoAmbiente: string, indiceElemento: number) => {
    setGuardando(true);
    setMensajeError(null);

    try {
      const res = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/croquis/elementos/confirmar-plantilla`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          codigo_ambiente: codigoAmbiente,
          indice_elemento: indiceElemento,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al confirmar elemento de plantilla.');
      }

      setGeometria(data.version.geometria);
      setNumeroVersionActual(data.version.numero_version);
      setHashActual(data.version.hash_geometria_sha256);
      setMensajeExito('Elemento confirmado como declaración ciudadana de existencia física.');
    } catch (err: any) {
      setMensajeError(err.message || 'Error al confirmar elemento.');
    } finally {
      setGuardando(false);
    }
  };

  // Guardar transaccionalmente el croquis (Versión N+1)
  const handleGuardarCroquis = async () => {
    setGuardando(true);
    setMensajeError(null);
    setMensajeExito(null);

    try {
      const res = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/croquis/guardar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          geometria,
          descripcion_cambio: descripcionCambio || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la versión del croquis.');
      }

      setMensajeExito(data.message);
      setNumeroVersionActual(data.version.numero_version);
      setHashActual(data.version.hash_geometria_sha256);
      setDescripcionCambio('');
    } catch (err: any) {
      setMensajeError(err.message || 'Error inesperado al guardar el croquis.');
    } finally {
      setGuardando(false);
    }
  };

  // Ejecutar análisis espacial preventivo y conectividad
  const handleEjecutarAnalisis = async () => {
    setEjecutandoAnalisis(true);
    setMensajeError(null);
    setMensajeExito(null);

    try {
      const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
      const res = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/croquis/analisis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken || '',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo procesar el análisis de conectividad.');
      }

      setAnalisisActual(data.analisis);
      setTabSidebar('analisis');
      setMensajeExito('Diagnóstico de conectividad espacial completado.');
    } catch (err: any) {
      setMensajeError(err.message || 'Error inesperado al ejecutar el análisis.');
    } finally {
      setEjecutandoAnalisis(false);
    }
  };

  // Iniciar flujo de confirmación de sugerencia
  const handleIniciarConfirmacionSugerencia = (sug: SugerenciaEspacialData) => {
    setSugerenciaAConfirmar(sug);
    const primerAmbiente = ambientes[0]?.codigo ?? '';
    setAmbienteDestinoSugerencia(primerAmbiente);
    setPosXManual(1.0);
    setPosYManual(1.0);
    setObservacionConfirmacion('');
    setModoColocacionManualActivo(true);
    setTabSidebar('ambientes');
    setMensajeExito(`Selecciona el ambiente en el panel o haz clic directamente sobre el plano para posicionar el [${sug.tipo_elemento}].`);
  };

  // Capturar coordenadas por clic en el canvas SVG
  const handleCanvasClickCoordenadas = (posX: number, posY: number, codigoAmb?: string | null) => {
    if (modoColocacionManualActivo && sugerenciaAConfirmar) {
      setPosXManual(posX);
      setPosYManual(posY);
      if (codigoAmb) {
        setAmbienteDestinoSugerencia(codigoAmb);
        setAmbienteSeleccionadoCodigo(codigoAmb);
      }
      setMensajeExito(`Coordenadas fijadas en (${posX}m, ${posY}m). Presiona "Confirmar e Incorporar" en el panel modal.`);
    }
  };

  // Enviar confirmación de sugerencia
  const handleEnviarConfirmacion = async () => {
    if (!sugerenciaAConfirmar) return;
    if (!ambienteDestinoSugerencia) {
      setMensajeError('Debes seleccionar el ambiente donde se ubica físicamente el elemento.');
      return;
    }

    setProcesandoConfirmacion(true);
    setMensajeError(null);

    try {
      const res = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/croquis/sugerencias/${sugerenciaAConfirmar.id}/confirmar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          codigo_ambiente: ambienteDestinoSugerencia,
          posicion_x: posXManual,
          posicion_y: posYManual,
          observacion: observacionConfirmacion || undefined,
          version_esperada_id: versionActiva?.version_id ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al confirmar la sugerencia.');
      }

      setGeometria(data.version.geometria);
      setNumeroVersionActual(data.version.numero_version);
      setHashActual(data.version.hash_geometria_sha256);

      setSugerencias((prev) =>
        prev.map((s) =>
          s.id === sugerenciaAConfirmar.id
            ? { ...s, estado: 'CONFIRMADA', elemento_espacial_id: data.sugerencia.elemento_espacial_id, resuelta_at: new Date().toISOString() }
            : s
        )
      );

      setMensajeExito(`Elemento [${sugerenciaAConfirmar.tipo_elemento}] confirmado y ubicado con éxito (Versión ${data.version.numero_version}).`);
      setSugerenciaAConfirmar(null);
      setModoColocacionManualActivo(false);
    } catch (err: any) {
      setMensajeError(err.message || 'Error al confirmar la sugerencia.');
    } finally {
      setProcesandoConfirmacion(false);
    }
  };

  // Enviar rechazo de sugerencia
  const handleEnviarRechazo = async () => {
    if (!sugerenciaARechazar) return;

    setProcesandoRechazo(true);
    setMensajeError(null);

    try {
      const res = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/croquis/sugerencias/${sugerenciaARechazar.id}/rechazar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
        },
        body: JSON.stringify({
          motivo: motivoRechazo || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al rechazar la sugerencia.');
      }

      setSugerencias((prev) =>
        prev.map((s) =>
          s.id === sugerenciaARechazar.id
            ? { ...s, estado: 'RECHAZADA', motivo_rechazo: motivoRechazo || 'Rechazada por el ciudadano.', resuelta_at: new Date().toISOString() }
            : s
        )
      );

      setMensajeExito('Sugerencia descartada correctamente.');
      setSugerenciaARechazar(null);
      setMotivoRechazo('');
    } catch (err: any) {
      setMensajeError(err.message || 'Error al descartar la sugerencia.');
    } finally {
      setProcesandoRechazo(false);
    }
  };

  return (
    <>
      <Head title={`Croquis Preventivo — ${autoevaluacion.nombre_comercio}`} />

      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        {/* Encabezado Institucional */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid}`}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Volver a la subsanación"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black text-slate-900 tracking-tight">
                    Croquis Preventivo Ciudadano
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Orientativo Huancayo
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {autoevaluacion.nombre_comercio} · {autoevaluacion.sector_huancayo || 'Huancayo'}
                </p>
              </div>
            </div>

            {/* Badges de Versión e Integridad Criptográfica */}
            <div className="flex items-center gap-3 text-xs">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <Hash className="h-4 w-4 text-slate-500" />
                <span className="font-bold text-slate-700">
                  {numeroVersionActual ? `Versión ${numeroVersionActual}` : 'Borrador'}
                </span>
                {hashActual && (
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]" title={hashActual}>
                    SHA: {hashActual.substring(0, 10)}...
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGuardarCroquis}
                disabled={guardando}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
              >
                {guardando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Sellando versión...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 text-emerald-400" />
                    <span>Guardar Croquis</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleEjecutarAnalisis}
                disabled={ejecutandoAnalisis}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
                title="Ejecutar análisis de conectividad e integridad del plano"
              >
                {ejecutandoAnalisis ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Analizando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-200" />
                    <span>Diagnóstico Espacial</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Deslinde Normativo y Pedagógico Obligatorio */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-start gap-3 text-amber-900 text-xs">
            <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Herramienta pedagógica y preventiva:</strong> Este croquis es una representación referencial ciudadana para orientar la seguridad de tu local comercial en Huancayo. <strong>No constituye plano arquitectónico oficial, ni reemplaza la inspección técnica de seguridad en edificaciones (ITSE).</strong>
            </div>
          </div>
        </div>

        {/* Mensajes de feedback */}
        {mensajeExito && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-emerald-900 text-xs flex items-center justify-between">
            <div className="max-w-7xl mx-auto flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{mensajeExito}</span>
            </div>
            <button type="button" onClick={() => setMensajeExito(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {mensajeError && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-rose-900 text-xs flex items-center justify-between">
            <div className="max-w-7xl mx-auto flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{mensajeError}</span>
            </div>
            <button type="button" onClick={() => setMensajeError(null)} className="text-rose-700 hover:text-rose-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Modal de confirmación y ubicación manual de sugerencia */}
        {sugerenciaAConfirmar && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-black text-sm text-slate-900">
                    Confirmar Elemento y Ubicar en Croquis
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSugerenciaAConfirmar(null);
                    setModoColocacionManualActivo(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Advertencia obligatoria */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
                <p className="font-bold">Declaración ciudadana de existencia física:</p>
                <p className="text-indigo-800 leading-relaxed">
                  Gemini identificó visualmente un posible elemento en la fotografía proporcionada. Revisa la evidencia y confirma si este elemento existe realmente en tu establecimiento.
                </p>
                <p className="text-[10px] text-slate-500 italic pt-1 border-t border-indigo-200/50">
                  Una observación visual no demuestra la existencia permanente, funcionamiento, ubicación exacta ni cumplimiento normativo del elemento.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label htmlFor="sugerencia-elemento-identificado" className="font-bold text-slate-700 block mb-1">Elemento identificado:</label>
                  <div id="sugerencia-elemento-identificado" className="p-2.5 rounded-xl bg-slate-100 font-bold text-slate-900 flex items-center justify-between">
                    <span>{sugerenciaAConfirmar.tipo_elemento}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Confianza IA: {sugerenciaAConfirmar.nivel_confianza ?? 'MEDIO'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    "{sugerenciaAConfirmar.descripcion_observacion}"
                  </p>
                </div>

                <div>
                  <label htmlFor="ambiente-destino-sugerencia" className="font-bold text-slate-700 block mb-1">Ambiente donde está instalado:</label>
                  <select
                    id="ambiente-destino-sugerencia"
                    value={ambienteDestinoSugerencia}
                    onChange={(e) => setAmbienteDestinoSugerencia(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-slate-50 font-medium"
                  >
                    {ambientes.map((a) => (
                      <option key={a.codigo} value={a.codigo}>
                        {a.codigo} — {a.nombre} ({a.area_m2} m²)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="coordenada-x-manual" className="font-bold text-slate-700 block mb-1">Coordenada X (m):</label>
                    <input
                      id="coordenada-x-manual"
                      type="number"
                      step="0.1"
                      min="0"
                      value={posXManual}
                      onChange={(e) => setPosXManual(Number.parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="coordenada-y-manual" className="font-bold text-slate-700 block mb-1">Coordenada Y (m):</label>
                    <input
                      id="coordenada-y-manual"
                      type="number"
                      step="0.1"
                      min="0"
                      value={posYManual}
                      onChange={(e) => setPosYManual(Number.parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="nota-instalacion-sugerencia" className="font-bold text-slate-700 block mb-1">Nota o detalle de instalación (opcional):</label>
                  <input
                    id="nota-instalacion-sugerencia"
                    type="text"
                    placeholder="Ej. Cerca a la caja de cobro, montado a 1.50m..."
                    value={observacionConfirmacion}
                    onChange={(e) => setObservacionConfirmacion(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSugerenciaAConfirmar(null);
                    setModoColocacionManualActivo(false);
                  }}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEnviarConfirmacion}
                  disabled={procesandoConfirmacion}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {procesandoConfirmacion ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Guardando versión...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirmar e Incorporar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de rechazo de sugerencia */}
        {sugerenciaARechazar && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-slate-900">
                  Descartar Sugerencia Visual
                </h3>
                <button
                  type="button"
                  onClick={() => setSugerenciaARechazar(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Al descartar esta observación, no se añadirá ningún elemento a tu croquis. La fotografía y el resultado de la autoevaluación permanecerán inalterados.
              </p>

              <div>
                <label htmlFor="motivo-rechazo-sugerencia" className="font-bold text-slate-700 block mb-1 text-xs">Motivo o razón (opcional):</label>
                <input
                  id="motivo-rechazo-sugerencia"
                  type="text"
                  placeholder="Ej. El elemento era temporal o no pertenece al local..."
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSugerenciaARechazar(null)}
                  className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleEnviarRechazo}
                  disabled={procesandoRechazo}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {procesandoRechazo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-rose-400" />}
                  <span>Descartar Sugerencia</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenido Principal: Lienzo 2D y Panel Lateral */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Editor SVG Interactivo (8 columnas) */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            <PlanoEditor2D
              geometria={geometria}
              nivelSeleccionadoIndex={nivelActivoIndex}
              ambienteSeleccionadoCodigo={ambienteSeleccionadoCodigo}
              onSeleccionarAmbiente={(cod) => setAmbienteSeleccionadoCodigo(cod)}
              onActualizarPosicionAmbiente={handleActualizarPosicionAmbiente}
              modoEdicion={true}
              modoColocacionManual={modoColocacionManualActivo}
              onCanvasClickCoordenadas={handleCanvasClickCoordenadas}
            />
          </div>

          {/* Columna Derecha: Panel Lateral de Herramientas y Sugerencias (4 columnas) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col h-full space-y-4">
              {/* Pestañas de la barra lateral */}
              <div className="flex items-center border-b border-slate-100 pb-2.5 gap-1 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => setTabSidebar('ambientes')}
                  className={`px-3 py-1.5 font-bold rounded-xl transition ${
                    tabSidebar === 'ambientes'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Ambientes
                </button>
                <button
                  type="button"
                  onClick={() => setTabSidebar('conectores')}
                  className={`px-3 py-1.5 font-bold rounded-xl transition ${
                    tabSidebar === 'conectores'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Salidas
                </button>
                <button
                  type="button"
                  onClick={() => setTabSidebar('elementos')}
                  className={`px-3 py-1.5 font-bold rounded-xl transition ${
                    tabSidebar === 'elementos'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Equipos
                </button>
                <button
                  type="button"
                  onClick={() => setTabSidebar('sugerencias')}
                  className={`px-3 py-1.5 font-bold rounded-xl transition flex items-center gap-1.5 ${
                    tabSidebar === 'sugerencias'
                      ? 'bg-indigo-600 text-white'
                      : 'text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Sugerencias IA</span>
                  {sugerenciasPendientes.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                      {sugerenciasPendientes.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTabSidebar('analisis')}
                  className={`px-3 py-1.5 font-bold rounded-xl transition flex items-center gap-1.5 ${
                    tabSidebar === 'analisis'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Diagnóstico</span>
                  {analisisActual && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        analisisActual.todos_ambientes_conectados ? 'bg-emerald-300' : 'bg-amber-400'
                      }`}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTabSidebar('plantillas')}
                  className={`px-3 py-1.5 font-bold rounded-xl transition ${
                    tabSidebar === 'plantillas'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Plantillas
                </button>
                <button
                  type="button"
                  onClick={() => setTabSidebar('historial')}
                  className={`px-2 py-1.5 font-bold rounded-xl transition ${
                    tabSidebar === 'historial'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 1. PESTAÑA AMBIENTES */}
              {tabSidebar === 'ambientes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Zonas ({ambientes.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAgregarAmbiente}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Agregar Zona</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ambientes.map((a) => (
                      <button
                        key={a.codigo}
                        type="button"
                        onClick={() => setAmbienteSeleccionadoCodigo(a.codigo)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                          a.codigo === ambienteSeleccionado?.codigo
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {a.nombre}
                      </button>
                    ))}
                  </div>

                  {/* Panel de edición del ambiente seleccionado */}
                  {ambienteSeleccionado ? (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-mono font-bold text-slate-500">
                          {ambienteSeleccionado.codigo}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEliminarAmbiente(ambienteSeleccionado.codigo)}
                          className="text-rose-600 hover:text-rose-800 text-[11px] font-bold inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="nombre-ambiente-seleccionado" className="font-bold text-slate-700 block">Nombre del ambiente:</label>
                        <input
                          id="nombre-ambiente-seleccionado"
                          type="text"
                          value={ambienteSeleccionado.nombre}
                          onChange={(e) => handleModificarAmbiente('nombre', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="uso-ambiente-seleccionado" className="font-bold text-slate-700 block">Uso o función:</label>
                        <select
                          id="uso-ambiente-seleccionado"
                          value={ambienteSeleccionado.uso}
                          onChange={(e) => handleModificarAmbiente('uso', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white font-medium"
                        >
                          <option value="ATENCION_PUBLICO">Atención al Público / Salón</option>
                          <option value="COCINA">Cocina / Preparación</option>
                          <option value="ALMACEN">Almacén / Depósito</option>
                          <option value="SERVICIOS_HIGIENICOS">Servicios Higiénicos</option>
                          <option value="CIRCULACION">Pasillo / Circulación</option>
                          <option value="OFICINA">Oficina / Caja</option>
                          <option value="OTRO">Otro uso comercial</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label htmlFor="ancho-ambiente-seleccionado" className="font-bold text-slate-700 block">Ancho (m):</label>
                          <input
                            id="ancho-ambiente-seleccionado"
                            type="number"
                            step="0.10"
                            min="0.5"
                            value={ambienteSeleccionado.ancho_metros ?? ''}
                            onChange={(e) => handleModificarAmbiente('ancho_metros', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="largo-ambiente-seleccionado" className="font-bold text-slate-700 block">Largo (m):</label>
                          <input
                            id="largo-ambiente-seleccionado"
                            type="number"
                            step="0.10"
                            min="0.5"
                            value={ambienteSeleccionado.largo_metros ?? ''}
                            onChange={(e) => handleModificarAmbiente('largo_metros', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                        <span>Área estimada:</span>
                        <strong className="font-mono text-slate-900 font-bold">
                          {ambienteSeleccionado.area_m2} m²
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      Selecciona un ambiente en el plano para editar sus cotas.
                    </div>
                  )}
                </div>
              )}

              {/* 2. PESTAÑA CONECTORES (PUERTAS Y SALIDAS) */}
              {tabSidebar === 'conectores' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Vanos y Salidas ({conectores.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAgregarConector('PUERTA_SALIDA')}
                      className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition"
                    >
                      <DoorOpen className="h-4 w-4 text-emerald-700" />
                      <span>+ Salida a Calle</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgregarConector('PUERTA_INTERIOR')}
                      className="p-2.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-900 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-100 transition"
                    >
                      <DoorOpen className="h-4 w-4 text-sky-700" />
                      <span>+ Puerta Interior</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {conectores.map((c, i) => (
                      <div
                        key={`con-item-${i}`}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800">
                            {c.conduce_a_salida_publica ? '🚪 Salida Principal' : '🚪 Puerta / Paso Interior'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Ancho: {c.ancho_metros}m · Posición: ({c.posicion_x}m, {c.posicion_y}m)
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarConector(i)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Eliminar puerta"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. PESTAÑA EQUIPOS DE SEGURIDAD (Con distinción H-MED-01) */}
              {tabSidebar === 'elementos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Equipos y Elementos
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Se añadirán al ambiente seleccionado:{' '}
                    <strong>{ambienteSeleccionado?.nombre || 'Ninguno seleccionado'}</strong>
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!ambienteSeleccionado}
                      onClick={() => handleAgregarElemento('EXTINTOR')}
                      className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 transition disabled:opacity-40"
                    >
                      <Flame className="h-4 w-4 text-rose-600" />
                      <span>+ Extintor</span>
                    </button>
                    <button
                      type="button"
                      disabled={!ambienteSeleccionado}
                      onClick={() => handleAgregarElemento('LUZ_EMERGENCIA')}
                      className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 transition disabled:opacity-40"
                    >
                      <Zap className="h-4 w-4 text-amber-600" />
                      <span>+ Luz Emerg.</span>
                    </button>
                    <button
                      type="button"
                      disabled={!ambienteSeleccionado}
                      onClick={() => handleAgregarElemento('TABLERO_ELECTRICO')}
                      className="p-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-900 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-100 transition disabled:opacity-40"
                    >
                      <Zap className="h-4 w-4 text-sky-600" />
                      <span>+ Tablero TG</span>
                    </button>
                    <button
                      type="button"
                      disabled={!ambienteSeleccionado}
                      onClick={() => handleAgregarElemento('OBSTACULO')}
                      className="p-2.5 rounded-xl border border-orange-200 bg-orange-50 text-orange-900 text-xs font-bold flex items-center gap-1.5 hover:bg-orange-100 transition disabled:opacity-40"
                    >
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span>+ Obstáculo</span>
                    </button>
                  </div>

                  {/* Listado de equipos en el ambiente seleccionado */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Elementos en {ambienteSeleccionado?.nombre}:
                    </span>
                    {ambienteSeleccionado?.elementos && ambienteSeleccionado.elementos.length > 0 ? (
                      ambienteSeleccionado.elementos.map((elem, idx) => {
                        const esIlustrativo = elem.origen_dato === 'ILUSTRATIVO_PLANTILLA';
                        const esConfirmadoIA = elem.origen_dato === 'CONFIRMADO_SUGERENCIA_IA';

                        return (
                          <div
                            key={`elem-list-${idx}`}
                            className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                              esIlustrativo
                                ? 'border-amber-300 bg-amber-50/60'
                                : esConfirmadoIA
                                ? 'border-blue-300 bg-blue-50/60'
                                : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{elem.tipo}</span>
                              <button
                                type="button"
                                onClick={() => handleEliminarElemento(ambienteSeleccionado.codigo, idx)}
                                className="text-rose-500 hover:text-rose-700 p-0.5"
                                title="Eliminar elemento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px]">
                              {esIlustrativo && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                                  Referencial de plantilla
                                </span>
                              )}
                              {esConfirmadoIA && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 font-bold">
                                  IA Confirmado
                                </span>
                              )}
                              {!esIlustrativo && !esConfirmadoIA && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                                  Declarado manual
                                </span>
                              )}
                              <span className="text-slate-500 font-mono">
                                ({elem.posicion_x}m, {elem.posicion_y}m)
                              </span>
                            </div>

                            {/* Botón para confirmar elemento ilustrativo (H-MED-01) */}
                            {esIlustrativo && (
                              <button
                                type="button"
                                onClick={() => handleConfirmarElementoPlantilla(ambienteSeleccionado.codigo, idx)}
                                className="w-full mt-1.5 py-1 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-xs transition"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Confirmar que existe en mi local</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No hay equipos registrados en esta zona.</p>
                    )}
                  </div>
                </div>
              )}

              {/* 4. PESTAÑA SUGERENCIAS VISUALES IA (Fase 3.2) */}
              {tabSidebar === 'sugerencias' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      Observaciones Visuales ({sugerencias.length})
                    </span>
                  </div>

                  {/* Avisos Pedagógicos Obligatorios */}
                  <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-950 space-y-1.5">
                    <p className="font-bold">Aviso sobre análisis visual automatizado:</p>
                    <p className="text-indigo-800 leading-relaxed">
                      Gemini identificó visualmente posibles elementos en las fotografías aportadas en tu subsanación.
                    </p>
                    <p className="text-[10px] text-slate-600 pt-1 border-t border-indigo-200/60 leading-normal">
                      <strong>Aviso obligatorio:</strong> Una observación visual no demuestra la existencia permanente, funcionamiento, ubicación exacta ni cumplimiento normativo del elemento.
                    </p>
                  </div>

                  {/* Listado de sugerencias */}
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {sugerencias.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-slate-50 text-center text-slate-400 text-xs italic space-y-1">
                        <p>No se registran observaciones visuales para esta autoevaluación.</p>
                        <p className="text-[10px]">Sube fotografías en la subsanación de observaciones para generar análisis visual con IA.</p>
                      </div>
                    ) : (
                      sugerencias.map((sug) => {
                        const esPendiente = sug.estado === 'PENDIENTE';
                        const esConfirmada = sug.estado === 'CONFIRMADA';
                        const esRechazada = sug.estado === 'RECHAZADA';
                        const esInvalidada = sug.estado === 'INVALIDADA';

                        return (
                          <div
                            key={sug.id}
                            className={`p-3 rounded-2xl border text-xs space-y-2 transition-all ${
                              esPendiente
                                ? 'border-indigo-300 bg-white shadow-xs'
                                : esConfirmada
                                ? 'border-emerald-300 bg-emerald-50/40'
                                : esInvalidada
                                ? 'border-rose-300 bg-rose-50/40 opacity-75'
                                : 'border-slate-200 bg-slate-50 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black text-slate-900 text-xs">
                                {sug.tipo_elemento}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  esPendiente
                                    ? 'bg-amber-100 text-amber-800'
                                    : esConfirmada
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : esInvalidada
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {sug.estado}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 italic leading-relaxed">
                              "{sug.descripcion_observacion}"
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Confianza: {sug.nivel_confianza ?? 'MEDIO'}</span>
                              <span>Subsanación #{sug.subsanacion_id}</span>
                            </div>

                            {/* Acciones para sugerencia PENDIENTE */}
                            {esPendiente && (
                              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleIniciarConfirmacionSugerencia(sug)}
                                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs transition flex items-center justify-center gap-1"
                                >
                                  <Crosshair className="h-3 w-3" />
                                  <span>Confirmar y Ubicar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSugerenciaARechazar(sug)}
                                  className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-[11px] transition"
                                >
                                  Descartar
                                </button>
                              </div>
                            )}

                            {esConfirmada && (
                              <div className="text-[10px] text-emerald-800 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Declarado por el comerciante en croquis</span>
                              </div>
                            )}

                            {esInvalidada && (
                              <div className="text-[10px] text-rose-800 font-medium flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                <span>{sug.motivo_rechazo || 'Evidencia no disponible'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA DIAGNÓSTICO ESPACIAL PREVENTIVO (SUBFASE 3.3 MVP) */}
              {tabSidebar === 'analisis' && (
                <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Diagnóstico Preventivo
                    </span>
                    <button
                      type="button"
                      onClick={handleEjecutarAnalisis}
                      disabled={ejecutandoAnalisis}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-xl transition shadow-xs disabled:opacity-50"
                    >
                      {ejecutandoAnalisis ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Analizando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          <span>{analisisActual ? 'Reanalizar' : 'Ejecutar'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!analisisActual ? (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 text-center space-y-2 bg-slate-50/50">
                      <ShieldCheck className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Aún no has ejecutado el diagnóstico de este croquis.</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        El sistema evaluará la integridad criptográfica del plano, la conectividad declarada de tus ambientes hacia las salidas a la vía pública y posibles conectores flotantes.
                      </p>
                      <button
                        type="button"
                        onClick={handleEjecutarAnalisis}
                        disabled={ejecutandoAnalisis}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Analizar Conectividad Ahora</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Estado de Integridad Criptográfica */}
                      <div className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                        analisisActual.resultado_preventivo.es_integro
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50 border-rose-200 text-rose-950'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-xs">
                            {analisisActual.resultado_preventivo.es_integro ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span>Plano Íntegro y Sellado</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-4 w-4 text-rose-600" />
                                <span>Fallo de Integridad</span>
                              </>
                            )}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            analisisActual.es_vigente
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {analisisActual.es_vigente ? 'Versión Activa' : 'Versión Anterior'}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-slate-500 truncate bg-white/80 p-1 rounded border border-slate-200" title={analisisActual.hash_geometria_analizada}>
                          SHA: {analisisActual.hash_geometria_analizada}
                        </div>
                      </div>

                      {/* Conectividad hacia Salidas */}
                      <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">Salidas Públicas Declaradas</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            analisisActual.todos_ambientes_conectados
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {analisisActual.todos_ambientes_conectados
                              ? '100% Conectado'
                              : `${analisisActual.total_ambientes_conectados}/${analisisActual.total_ambientes} conectados`}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {analisisActual.resultado_preventivo.resumen_ambientes?.map((amb) => (
                            <div
                              key={amb.codigo}
                              className={`p-2 rounded-xl text-xs flex items-center justify-between ${
                                amb.conectado_a_salida
                                  ? 'bg-slate-50 text-slate-800'
                                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${amb.conectado_a_salida ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="font-bold font-mono text-[11px]">{amb.codigo}</span>
                                <span className="text-slate-600 truncate max-w-[120px]">{amb.nombre}</span>
                              </div>
                              <span className="text-[10px] font-bold">
                                {amb.conectado_a_salida ? 'Conectado a calle' : 'Sin salida confirmada'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Estadísticas de Conectores */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                          <span className="text-[10px] text-emerald-700 font-bold block">Confirmados</span>
                          <span className="text-base font-black text-emerald-900">
                            {analisisActual.total_conectores_confirmados}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-sky-100 bg-sky-50/50">
                          <span className="text-[10px] text-sky-700 font-bold block">Sugeridos</span>
                          <span className="text-base font-black text-sky-900">
                            {analisisActual.total_conectores_sugeridos}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-rose-100 bg-rose-50/50">
                          <span className="text-[10px] text-rose-700 font-bold block">Flotantes / Desplazados</span>
                          <span className="text-base font-black text-rose-900">
                            {analisisActual.total_conectores_flotantes}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                          <span className="text-[10px] text-slate-600 font-bold block">Indeterminados</span>
                          <span className="text-base font-black text-slate-800">
                            {analisisActual.total_conectores_indeterminados}
                          </span>
                        </div>
                      </div>

                      {/* Advertencias Pedagógicas */}
                      {analisisActual.resultado_preventivo.advertencias.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                            Advertencias Detectadas ({analisisActual.resultado_preventivo.advertencias.length})
                          </span>
                          <div className="space-y-2">
                            {analisisActual.resultado_preventivo.advertencias.map((adv, aIdx) => (
                              <div
                                key={`adv-${aIdx}`}
                                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs space-y-1.5"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">
                                    {adv.tipo.replace(/_/g, ' ')}
                                  </span>
                                  {adv.ambiente_codigo && (
                                    <button
                                      type="button"
                                      onClick={() => setAmbienteSeleccionadoCodigo(adv.ambiente_codigo ?? null)}
                                      className="text-[10px] font-bold text-amber-800 hover:underline"
                                    >
                                      Ver {adv.ambiente_codigo}
                                    </button>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-800 leading-snug">{adv.mensaje}</p>
                                {adv.recomendacion && (
                                  <p className="text-[10px] text-amber-800 font-medium italic">
                                    💡 {adv.recomendacion}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resumen de Elementos Declarados */}
                      <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                        <span className="font-bold text-slate-800 block text-xs">Equipos Declarados por el Ciudadano</span>
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>Declarados manualmente o IA:</span>
                          <span className="font-bold text-slate-900">{analisisActual.elementos_declarados?.length ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Ilustrativos de plantilla (excluidos):</span>
                          <span>{analisisActual.resumen_conectividad?.elementos_plantilla_excluidos ?? 0}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200">
                          Nota: Los extintores se computan según la declaración del comerciante; su operatividad y vigencia técnica requieren inspección presencial.
                        </p>
                      </div>

                      {/* Aviso Legal Obligatorio (Sección 6) */}
                      <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
                        <p className="font-bold text-slate-700 mb-0.5">Aviso legal y alcance preventivo:</p>
                        {analisisActual.resultado_preventivo.aviso_legal}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. PESTAÑA PLANTILLAS */}
              {tabSidebar === 'plantillas' && (
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Plantillas de Huancayo
                  </span>
                  <div className="space-y-2">
                    {Object.entries(plantillas).map(([k, p]) => (
                      <div
                        key={k}
                        className="p-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 space-y-1.5"
                      >
                        <div className="font-bold text-xs text-slate-900">{p.nombre}</div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{p.descripcion}</p>
                        <button
                          type="button"
                          onClick={() => handleCargarPlantilla(k)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          <LayoutTemplate className="h-3.5 w-3.5" />
                          <span>Cargar esta plantilla</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. PESTAÑA HISTORIAL DE VERSIONES */}
              {tabSidebar === 'historial' && (
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    Versiones Inmutables ({historialInicial.length})
                  </span>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {historialInicial.map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">Versión {v.numero_version}</span>
                          <span className="text-[10px] text-slate-500">
                            {v.created_at ? new Date(v.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-slate-600 truncate bg-white p-1 rounded border border-slate-200">
                          {v.hash_geometria_sha256}
                        </div>
                        {v.descripcion_cambio && (
                          <p className="text-[10px] text-slate-500 italic">{v.descripcion_cambio}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input opcional de nota de cambio antes de guardar */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <label htmlFor="descripcion-cambio-version" className="text-[11px] font-bold text-slate-600 block">
                  Nota del cambio para esta versión:
                </label>
                <input
                  id="descripcion-cambio-version"
                  type="text"
                  placeholder="Ej. Ajuste de medidas del almacén y extintor..."
                  value={descripcionCambio}
                  onChange={(e) => setDescripcionCambio(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

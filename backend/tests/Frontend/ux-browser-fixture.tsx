/** Fixtures sintéticos: no inicia Laravel, no consulta BD ni proveedor externo. */
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from '../../resources/js/layouts/AppLayout';
import Checklist from '../../resources/js/pages/Evaluacion/Checklist';
import ExpedienteDigital from '../../resources/js/pages/Evaluacion/ExpedienteDigital';
import Home from '../../resources/js/pages/Evaluacion/Home';
import Nueva from '../../resources/js/pages/Evaluacion/Nueva';
import Resumen from '../../resources/js/pages/Evaluacion/Resumen';
import SubsanacionDirecta from '../../resources/js/pages/Evaluacion/SubsanacionDirecta';

const pantalla = new URLSearchParams(location.search).get('pantalla') || 'Inicio';
const rutas: Record<string, string> = {
    'autoevaluacion.index': '/',
    'autoevaluacion.nueva': '/autoevaluacion/nueva',
    login: '/login',
    register: '/register',
    'directorio.index': '/directorio',
    dashboard: '/dashboard',
    'perfil.show': '/perfil',
    'autoevaluacion.subsanar_items': '/autoevaluacion/demo/subsanar-items',
};
Object.defineProperty(window, 'route', {
    value: (name?: string) =>
        name ? rutas[name] || '/ruta-sintetica' : { current: (value: string) => pantalla === 'Inicio' && value === 'autoevaluacion.index' },
});
const requests: { url: string; body: unknown }[] = [];
Object.assign(window, { __uxRequests: requests, __uxSaveFails: false });
window.fetch = async (input, options) => {
    requests.push({ url: String(input), body: options?.body ? JSON.parse(String(options.body)) : null });
    if (Reflect.get(window, '__uxSaveFails')) return Response.json({ mensaje: 'Error sintético al guardar. Reintenta.' }, { status: 500 });
    return Response.json({ mensaje: 'Avance guardado.', success: true });
};

const criterio = {
    codigo: 'CRIT-01',
    criterio_id: 1,
    titulo: 'Revisa tu extintor',
    pregunta_ciudadana: '¿Puedes identificar el extintor y acceder a él?',
    categoria: 'SEGURIDAD CONTRA INCENDIOS',
    tipo_criterio: 'DECLARATIVO',
    norma_base: 'Referencia sintética de prueba',
    aplicable: true,
    requiere_informacion: false,
    opciones_respuesta: ['CUMPLE_DECLARADO', 'PENDIENTE_ATENDER', 'POR_REVISAR'],
    estado: null,
};
const autoevaluacion = {
    id: 1,
    uuid: 'demo',
    nombre_comercio: 'Bodega de ejemplo · Datos ficticios',
    funcion_economica: 'Comercio',
    estado: new URLSearchParams(location.search).has('cerrada') ? 'REGISTRADA' : 'INICIADA',
    area_m2: 80,
    pisos: 1,
    aforo: 10,
    usa_glp: false,
    tiene_equipos_fritura: null,
    tiene_escaleras: false,
    tiene_estanterias_altas: false,
};
const aliadoDemo = {
    id: 'A1',
    nombre_comercial: 'Extintores Wanka · Datos ficticios',
    whatsapp: '51964112233',
    telefono: '964112233',
    sede: 'El Tambo',
    verificado: true,
};
const asistenciaDemo = (codigo: string, titulo: string) => ({
    codigo,
    titulo,
    rango_costo: { referencia_soles: 100, minimo_soles: 80, maximo_soles: 150 },
    guia_autoayuda: ['Revisa la etiqueta de carga.'],
    aliados: [aliadoDemo],
});
const itemsSubsanar = [
    {
        id: 1,
        codigo: 'CRIT-01',
        titulo: 'Extintor portátil adecuado y vigente',
        categoria: 'Incendios',
        estado: 'PENDIENTE_ATENDER',
        accion_mejora_orientativa: 'Recarga el extintor y colócalo a la vista.',
        asistencia: asistenciaDemo('CRIT-01', 'Extintor'),
    },
    {
        id: 2,
        codigo: 'CRIT-09',
        titulo: 'Botiquín básico de primeros auxilios',
        categoria: 'Primeros auxilios',
        estado: 'POR_REVISAR',
        asistencia: asistenciaDemo('CRIT-09', 'Botiquín'),
    },
];
const documentosExpediente = [
    {
        tipo: 'declaracion_jurada',
        titulo: 'Declaración Jurada de Cumplimiento (Anexo 4)',
        descripcion: 'Formato firmado.',
        como_conseguirlo: 'Descárgalo desde tu resumen.',
        base_legal: 'D.S. N° 002-2018-PCM, art. 20.1',
        formatos: ['pdf', 'jpg'],
        obligatorio: true,
        archivo: null,
    },
    {
        tipo: 'recibo_pago',
        titulo: 'Recibo de pago del trámite',
        descripcion: 'Comprobante.',
        como_conseguirlo: 'En tu municipalidad.',
        base_legal: 'Art. 6',
        formatos: ['pdf'],
        obligatorio: false,
        archivo: {
            id: 9,
            nombre: 'recibo.pdf',
            mime: 'application/pdf',
            tamano_bytes: 120000,
            hash_corto: 'abc123def456',
            subido_el: '2026-11-17T10:00:00Z',
            url: '/archivo-sintetico',
        },
    },
];
const props = {
    auth: { user: { id: 1, name: 'Persona sintética', email: 'fixture@example.test' } },
    errors: {},
    ...(pantalla === 'Condiciones'
        ? {
              autoevaluacion,
              checklist: {
                  autoevaluacion_id: 1,
                  uuid: 'demo',
                  criterios: [criterio],
                  no_aplican: [],
                  informacion_pendiente: [],
                  resumen: {
                      total_criterios_catalogo: 1,
                      total_activos: 1,
                      total_suspendidos: 0,
                      criterios_aplicables: 1,
                      criterios_no_aplican: 0,
                      criterios_requieren_informacion: 0,
                  },
              },
          }
        : {}),
    ...(pantalla === 'Subsanar'
        ? { autoevaluacion: { ...autoevaluacion, sector_huancayo: 'El Tambo' }, items: itemsSubsanar, total_observaciones: 2 }
        : {}),
    ...(pantalla === 'Expediente' ? { autoevaluacion, modalidad: 'EX_POST', documentos: documentosExpediente, tamano_maximo_mb: 10 } : {}),
    ...(pantalla === 'Resumen'
        ? {
              autoevaluacion,
              resumen: {
                  total_criterios_aplicables: 1,
                  total_cumple_declarado: 0,
                  total_pendiente_atender: 1,
                  total_por_revisar: 0,
                  total_no_aplica: 0,
              },
              pendiente_atender: [{ ...criterio, que_observar: 'Acceso al extintor', accion_mejora_orientativa: 'Revisar el acceso.' }],
              por_revisar: [],
              cumple_declarado: [],
              no_aplica: [],
          }
        : {}),
};
const pages = { Inicio: Home, Datos: Nueva, Condiciones: Checklist, Resumen, Subsanar: SubsanacionDirecta, Expediente: ExpedienteDigital };
const Component = pages[pantalla as keyof typeof pages] || Home;
void createInertiaApp({
    page: { component: pantalla, props, url: location.pathname, version: null, clearHistory: false, encryptHistory: false },
    resolve: () => Object.assign(Component, { layout: (page: React.ReactNode) => <AppLayout>{page}</AppLayout> }),
    setup({ App, props: appProps }) {
        createRoot(document.getElementById('app')!).render(<App {...appProps} />);
    },
});

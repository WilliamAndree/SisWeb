/** Fixtures sintéticos: no inicia Laravel, no consulta BD ni proveedor externo. */
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from '../../resources/js/layouts/AppLayout';
import AdminPanel from '../../resources/js/pages/Admin/Panel';
import Login from '../../resources/js/pages/Auth/Login';
import Register from '../../resources/js/pages/Auth/Register';
import Dashboard from '../../resources/js/pages/Dashboard/Dashboard';
import Directorio from '../../resources/js/pages/Directorio/Index';
import Checklist from '../../resources/js/pages/Evaluacion/Checklist';
import ExpedienteDigital from '../../resources/js/pages/Evaluacion/ExpedienteDigital';
import Home from '../../resources/js/pages/Evaluacion/Home';
import Nueva from '../../resources/js/pages/Evaluacion/Nueva';
import Resumen from '../../resources/js/pages/Evaluacion/Resumen';
import SubsanacionDirecta from '../../resources/js/pages/Evaluacion/SubsanacionDirecta';
import InicioProveedor from '../../resources/js/pages/Proveedor/Inicio';
import PerfilProveedor from '../../resources/js/pages/Proveedor/Perfil';
import PlanProveedorPage from '../../resources/js/pages/Proveedor/Plan';
import ProductosProveedor from '../../resources/js/pages/Proveedor/Productos';
import VentasProveedor from '../../resources/js/pages/Proveedor/Ventas';

const pantalla = new URLSearchParams(location.search).get('pantalla') || 'Inicio';
// Cada pantalla se ve con el tipo de cuenta que la usa, para validar su barra de navegación.
const PANTALLAS_PROVEEDOR = ['Proveedor', 'Productos', 'Ventas', 'MiNegocio', 'Planes'];
const tipoCuenta = (pantalla === 'Admin' && 'admin') || (PANTALLAS_PROVEEDOR.includes(pantalla) && 'proveedor') || 'cliente';
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
    ofertas: [
        { id: 1, nombre: `${titulo} · opción económica`, precio_soles: 45, unidad: 'servicio', proveedor: { ...aliadoDemo, plan: 'basico' } },
        {
            id: 2,
            nombre: `${titulo} · nuevo con instalación`,
            precio_soles: 155,
            unidad: 'unidad',
            proveedor: { ...aliadoDemo, id: 'A2', nombre_comercial: 'Apu Seguridad · Datos ficticios', plan: 'destacado', sede: 'Chilca' },
        },
    ],
});
const panelCliente = {
    records: [
        {
            id: 1,
            uuid_trazabilidad: 'demo',
            nombre_comercio: 'BillyEssences · Datos ficticios',
            funcion_economica: 'Comercio',
            estado: 'REGISTRADA',
            porcentaje_cumplimiento: 73,
            sector_huancayo: 'El Tambo',
            fecha: '2026-11-17',
            fecha_corta: '17 nov 2026',
            conteo_condiciones: { total: 11, cumple: 8, no_cumple: 2, por_revisar: 1, na: 0 },
        },
        {
            id: 2,
            uuid_trazabilidad: 'demo2',
            nombre_comercio: 'Café Wanka · Datos ficticios',
            funcion_economica: 'Encuentro',
            estado: 'INICIADA',
            porcentaje_cumplimiento: 0,
            fecha: '2026-11-16',
            conteo_condiciones: { total: 0, cumple: 0, no_cumple: 0, por_revisar: 0, na: 0 },
        },
    ],
    kpis: { total_locales: 2, aprobados: 0, observados: 1, en_proceso: 1, riesgo_dominante: 'BAJO_MEDIO' },
};
const directorio = {
    aliados: [
        {
            ...aliadoDemo,
            categoria: 'incendios',
            contacto_nombre: 'Rosa',
            especialidad_texto: 'Recarga de extintores',
            cobertura: 'Huancayo',
            servicios: ['Recarga PQS'],
            plan: 'destacado',
        },
    ],
    planes: [{ id: 'basico', nombre: 'Básico', precio: 0, descripcion: 'Para empezar.', destacado: false, beneficios: ['Ficha'] }],
    filtros: { categoria: null, distrito: null },
    categorias: [{ valor: '', etiqueta: 'Todas' }],
    distritos: [{ valor: '', etiqueta: 'Todos' }],
};
const perfilResumen = {
    nombre_comercial: 'Extintores Wanka · Datos ficticios',
    plan: 'basico',
    plan_nombre: 'Básico',
    plan_vence_el: null,
    estado_revision: 'pendiente' as const,
    observacion_revision: null,
    verificado: false,
    publicado: false,
};
const planesDemo = [
    {
        id: 'basico',
        nombre: 'Básico',
        precio: 0,
        descripcion: 'Para empezar.',
        destacado: false,
        etiqueta: 'Gratis para siempre',
        limite_productos: 5,
        beneficios: ['Hasta 5 productos'],
    },
    {
        id: 'destacado',
        nombre: 'Destacado',
        precio: 49,
        descripcion: 'Para que te vean primero.',
        destacado: true,
        etiqueta: 'El más elegido',
        limite_productos: 25,
        beneficios: ['Todo lo del plan Básico', 'Hasta 25 productos', 'Sello Destacado'],
    },
    {
        id: 'premium',
        nombre: 'Premium',
        precio: 99,
        descripcion: 'Primer lugar.',
        destacado: false,
        etiqueta: 'Máxima visibilidad',
        limite_productos: null,
        beneficios: ['Productos ilimitados'],
    },
];
const precio = (base: number) => [
    { meses: 1, etiqueta: '1 mes', descuento: 0, monto: base, por_mes: base, ahorro: 0 },
    { meses: 3, etiqueta: '3 meses', descuento: 10, monto: Math.round(base * 2.7), por_mes: Math.round(base * 0.9), ahorro: Math.round(base * 0.3) },
    {
        meses: 12,
        etiqueta: '12 meses',
        descuento: 20,
        monto: Math.round(base * 9.6),
        por_mes: Math.round(base * 0.8),
        ahorro: Math.round(base * 2.4),
    },
];
const usosDemo = [
    { valor: 'incendios', etiqueta: 'Protección contra incendios' },
    { valor: 'primeros_auxilios', etiqueta: 'Primeros auxilios' },
];
const cuentaProveedor: Record<string, Record<string, unknown>> = {
    Proveedor: {
        perfil: perfilResumen,
        conteo: { productos: 2, activos: 1, limite: 5 },
        pasos: [
            { clave: 'perfil', texto: 'Completa los datos de tu negocio', hecho: true },
            { clave: 'producto', texto: 'Publica tu primer producto con precio', hecho: false },
        ],
        solicitudPendiente: null,
        planes: planesDemo,
        estadisticas: {
            ultimos_30_dias: { apariciones: 184, contactos: 23, mapa: 9, elecciones: 11 },
            ventas_mes: { monto: 525, cantidad: 3 },
            meses: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((mes, i) => ({
                mes,
                apariciones: 60 + i * 25,
                contactos: 6 + i * 3,
                ventas: i * 120,
            })),
            top_productos: [{ oferta_id: 1, nombre: 'Extintor PQS 6 kg', apariciones: 120, contactos: 15, elecciones: 7 }],
        },
    },
    Ventas: {
        perfil: { ...perfilResumen, estado_revision: 'aprobado' as const, publicado: true },
        ventas: [
            {
                id: 1,
                descripcion: 'Extintor PQS 6 kg',
                producto: 'Extintor PQS 6 kg',
                cantidad: 2,
                monto_soles: 270,
                fecha: '2026-11-15',
                cliente: 'Bodega Mery',
            },
            { id: 2, descripcion: 'Recarga PQS', producto: null, cantidad: 1, monto_soles: 40, fecha: '2026-10-02', cliente: null },
        ],
        totales: { mes: 270, mes_anterior: 40, ventas_mes: 1, historico: 310 },
        productos: [{ id: 1, nombre: 'Extintor PQS 6 kg', precio_soles: 135, stock: 8 }],
    },
    Productos: {
        perfil: perfilResumen,
        ofertas: [
            {
                id: 1,
                criterio_codigo: 'CRIT-01',
                uso: 'incendios',
                nombre: 'Extintor PQS 6 kg',
                marca: 'Kidde',
                descripcion: null,
                precio_soles: 140,
                unidad: 'unidad',
                stock: 8,
                zona: 'Huancayo',
                activo: true,
            },
            {
                id: 2,
                criterio_codigo: 'CRIT-09',
                uso: 'primeros_auxilios',
                nombre: 'Botiquín completo',
                marca: null,
                descripcion: null,
                precio_soles: 75,
                unidad: 'unidad',
                stock: 0,
                zona: 'Todo Huancayo',
                activo: false,
            },
        ],
        criterios: [{ codigo: 'CRIT-01', titulo: 'Extintor portátil adecuado y vigente', uso: 'incendios' }],
        usos: usosDemo,
        zonas: ['Todo Huancayo', 'Huancayo', 'El Tambo', 'Chilca'],
        unidades: ['unidad', 'servicio'],
        limite: 5,
    },
    MiNegocio: {
        perfil: {
            ...perfilResumen,
            especialidad: 'incendios',
            descripcion: null,
            telefono: '964112233',
            whatsapp: null,
            distrito: 'El Tambo',
            direccion: 'Jr. Puno 450',
            latitud: null,
            longitud: null,
        },
        distritos: ['Huancayo', 'El Tambo', 'Chilca'],
    },
    Planes: {
        perfil: perfilResumen,
        planes: planesDemo,
        precios: { destacado: precio(49), premium: precio(99) },
        duraciones: [
            { meses: 1, descuento: 0, etiqueta: '1 mes' },
            { meses: 3, descuento: 10, etiqueta: '3 meses' },
            { meses: 12, descuento: 20, etiqueta: '12 meses' },
        ],
        metodos: [
            { valor: 'yape', etiqueta: 'Yape' },
            { valor: 'transferencia', etiqueta: 'Transferencia bancaria' },
        ],
        pago: {
            titular: 'CheckITSE Huancayo',
            yape_plin: '904 249 285',
            banco: null,
            cuenta: null,
            cci: null,
        },
        solicitudes: [
            {
                uuid: 'a',
                plan_solicitado: 'destacado',
                plan_nombre: 'Destacado',
                meses: 3,
                monto_soles: 132,
                metodo_pago: 'Yape',
                numero_operacion: '04512398',
                fecha_pago: '2026-11-10',
                estado: 'rechazada',
                observacion_admin: 'El monto no coincide.',
                vigente_hasta: null,
                enviado_el: '2026-11-10 10:00:00',
            },
        ],
    },
    Admin: {
        seccion: 'resumen',
        resumen: { pagos_pendientes: 1, negocios_pendientes: 1, negocios_publicados: 4, planes_pagados_activos: 3, por_vencer: 1, vencidos: 0 },
        ingresos: {
            mes: 470,
            mes_anterior: 267,
            anio: 1250,
            total: 1250,
            esperado_30_dias: 99,
            meses: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].map((mes, i) => ({
                mes,
                monto: [49, 99, 0, 267, 267, 470][i],
            })),
            por_plan: [{ etiqueta: 'Destacado', monto: 700, cantidad: 4 }],
            por_metodo: [{ etiqueta: 'Yape', monto: 900, cantidad: 5 }],
            ultimos: [{ id: 3, negocio: 'Señales Wanka', plan: 'Premium', meses: 3, monto_soles: 267, metodo_pago: 'Yape', fecha: '2026-11-10' }],
        },
        vencimientos: [
            {
                id: 9,
                negocio: 'Señales Wanka',
                responsable: 'Andrés',
                whatsapp: '904249285',
                plan: 'Premium',
                precio_mes: 99,
                vence_el: '2026-11-21',
                dias: 4,
                estado: 'por_vencer',
                recordatorio_enviado_el: null,
                puede_recordar: true,
            },
        ],
        filtros: { pagos: 'pendiente', negocios: 'pendiente' },
        solicitudes: [
            {
                id: 1,
                negocio: 'Extintores Wanka · Datos ficticios',
                negocio_estado: 'pendiente',
                cuenta: 'rosa@example.test',
                plan_actual: 'Básico',
                plan_solicitado: 'Destacado',
                meses: 3,
                monto_soles: 132,
                metodo_pago: 'Yape',
                numero_operacion: '04512398',
                fecha_pago: '2026-11-17',
                es_imagen: false,
                estado: 'pendiente',
                observacion_admin: null,
                revisor: null,
                revisado_en: null,
                vigente_hasta: null,
                enviado_el: '2026-11-17 09:00:00',
            },
        ],
        negocios: [],
    },
};
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
    auth: { user: { id: 1, name: 'Persona sintética', email: 'fixture@example.test', tipo_cuenta: tipoCuenta } },
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
    ...(pantalla === 'Expediente' ? { autoevaluacion, modalidad: 'EX_POST', documentos: documentosExpediente, tamano_maximo_mb: 7 } : {}),
    ...(cuentaProveedor[pantalla] ?? {}),
    ...(pantalla === 'Panel' ? panelCliente : {}),
    ...(pantalla === 'Aliados' ? directorio : {}),
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
const pages = {
    Inicio: Home,
    Datos: Nueva,
    Condiciones: Checklist,
    Resumen,
    Subsanar: SubsanacionDirecta,
    Expediente: ExpedienteDigital,
    Login,
    Registro: Register,
    Proveedor: InicioProveedor,
    Productos: ProductosProveedor,
    Ventas: VentasProveedor,
    MiNegocio: PerfilProveedor,
    Planes: PlanProveedorPage,
    Admin: AdminPanel,
    Panel: Dashboard,
    Aliados: Directorio,
};
const Component = pages[pantalla as keyof typeof pages] || Home;
void createInertiaApp({
    page: { component: pantalla, props, url: location.pathname, version: null, clearHistory: false, encryptHistory: false },
    // Respeta el layout propio de la página (portada de ancho completo, login sin layout).
    resolve: () =>
        Reflect.get(Component, 'layout') ? Component : Object.assign(Component, { layout: (page: React.ReactNode) => <AppLayout>{page}</AppLayout> }),
    setup({ App, props: appProps }) {
        createRoot(document.getElementById('app')!).render(<App {...appProps} />);
    },
});

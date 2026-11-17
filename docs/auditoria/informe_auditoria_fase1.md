# INFORME DE AUDITORÍA INTEGRAL (INTERNA Y EXTERNA) — CHECKITSE
**Fecha de emisión:** 26 de octubre de 2026  
**Rama:** `fase-1-navbar-navegacion`  
**Entorno de ejecución:** Servidor local (`http://127.0.0.1:8000`) en PHP 8.2 y Google Chrome 155.0 Headless vía Chrome DevTools Protocol (CDP).

---

## 1. RESUMEN EJECUTIVO Y DECLARACIÓN DE AUDITORÍA EXTERNA
La auditoría externa se ejecutó mediante una instancia real de Google Chrome 155.0.8059.85 controlada por CDP sobre un total de 46 evaluaciones de pantalla en dos resoluciones:
- **Escritorio:** 1366 x 768 px
- **Móvil:** 390 x 844 px

Se probaron con éxito las cuatro situaciones de sesión solicitadas:
1. **Visitante sin sesión:** Sin cookies ni cabeceras de autorización.
2. **Invitado con autoevaluación a medias:** Cookie cifrada `guest_session_token` válida, evaluando un local con 1 criterio CUMPLE y 8 pendientes (UUID `105b3ace-d011-4da9-9526-cf78797bcda3`).
3. **Usuario autenticado sin locales:** Sesión iniciada para `test@example.com` (ID 1, 0 locales registrados).
4. **Usuario autenticado con locales conforme y con observaciones:** Sesión iniciada para `123qwerty@gmail.com` (ID 2, 19 locales con registros al 100% VERDE y al 44.4% ROJO).

Todas las evidencias visuales (52 capturas PNG) quedaron almacenadas en el directorio de artefactos para respaldo y consulta.

---

## 2. LOS 10 HALLAZGOS MÁS IMPORTANTES EN ORDEN DE PRIORIDAD

1. **[H-01] Contradicción de contadores y filtros en el Dashboard:** La tarjeta superior muestra *"0 locales con observaciones"* y el botón de filtro indica *"Con Observaciones (0)"*. Al pulsar el filtro, se listan locales observados con badge *"CON OBSERVACIONES"* y aviso de *"Se detectaron 3 condiciones observadas"*.
2. **[H-02] Recuadro negro visible en el Panel y páginas con AppLayout:** El elemento `<main id="main-content" tabIndex={-1}>` carece de `focus:outline-none`. Cuando recibe foco por navegación Inertia, clic o skip link, el navegador aplica su outline nativo negro (`3px solid oklch(0.205 0 0)`).
3. **[H-03] Brecha de autorización en `/autoevaluacion/revision/{uuid}`:** La acción `simulacionRevision` carece de cualquier comprobación de `user_id` o `guest_session_token`. Cualquiera con el UUID accede públicamente a los datos de la simulación.
4. **[H-04] El botón "Subsanar" del Dashboard conduce a la carga forzada de fotos:** El botón `Subsanar ({total})` redirige a `/autoevaluacion/subsanacion/{uuid}`, exigiendo archivos fotográficos cuando el modelo simplificado ITSE no requiere evidencias documentales para el ciudadano.
5. **[H-07] Pantallas indebidamente construidas para imprimir:** El Informe Preventivo y el Resumen contienen botones y estilos de impresión (`window.print()`), cuando el informe es un documento digital privado y el Anexo 4 es el único formato oficial de presentación física.
6. **[H-05] Exposición de enums crudos (`BAJO_MEDIO`, `MUY_ALTO`, `0 m²`):** En las tarjetas del Dashboard y cabeceras de riesgo se renderizan valores internos de base de datos con guiones bajos y ceros no formateados.
7. **[H-06] Jerga criptográfica compleja en el Dashboard:** Se destaca *"Trazabilidad Criptográfica SHA-256"* y hashes de 64 caracteres en tarjetas ciudadanas donde un comerciante requiere claridad práctica y no tecnicismos.
8. **[H-09] Áreas táctiles menores a 44 px en móvil:** Múltiples botones de acción (reevaluar `h-7 w-7`, copiar código, filtros) no cumplen el estándar de accesibilidad táctil de 44x44 px en pantallas de 390x844.
9. **[H-10] Callejón sin salida en `/autoevaluacion/recursos-cercanos/{codigo}`:** Ruta pública que retorna JSON crudo sin plantilla visual ni enlace de retorno para el usuario.
10. **[H-12] Deuda técnica masiva en `EvaluacionController`:** Controlador central de 1,275 líneas apoyado en un trait de 781 líneas (2,056 líneas en total), concentrando más de diez dominios distintos.

---

## 3. CATÁLOGO COMPLETO DE HALLAZGOS (FORMATO DE LISTA)

### HALLAZGO H-01
- **Pantalla o ruta:** `/panel-ciudadano` (Dashboard)
- **Tipo:** Datos / UX
- **Severidad:** Alta
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Contradicción de contadores. En el backend, `calcularKpisDashboard()` clasifica como `en_proceso` a las evaluaciones con semáforo ÁMBAR, dejando `observados` en 0. En el frontend, la tarjeta evalúa `esConforme = porcentaje >= 100`, por lo que un local con 80% muestra el badge *"CON OBSERVACIONES"*. El panel dice *"0 locales con observaciones"*, el botón muestra *"Con Observaciones (0)"*, pero al hacer clic se listan locales marcados en observación.
- **Evidencia:** `app/Http/Controllers/EvaluacionController.php:674-682` y `resources/js/pages/Dashboard/Dashboard.tsx:208-211`. Captura: `panel_locales_desktop_user_locales.png`.

---

### HALLAZGO H-02
- **Pantalla o ruta:** Todas las páginas con `AppLayout` (`/`, `/panel-ciudadano`, `/directorio`, `/mi-cuenta`, etc.)
- **Tipo:** Visual
- **Severidad:** Alta
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Recuadro negro visible en el contenedor principal. En `AppLayout.tsx`, `<main id="main-content" tabIndex={-1}>` no tiene `focus:outline-none`. Al recibir el foco programático que envía Inertia en cada cambio de página o al hacer clic en el contenedor, el navegador renderiza un contorno negro nativo de 3px (`outline: oklch(0.205 0 0) none 3px`).
- **Evidencia:** `resources/js/layouts/AppLayout.tsx:22-26`. Captura: `panel_vacio_desktop_user_zero.png`.

---

### HALLAZGO H-03
- **Pantalla o ruta:** `/autoevaluacion/revision/{uuid}`
- **Tipo:** Seguridad
- **Severidad:** Alta
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Falta de autorización en la simulación de revisión. El método `simulacionRevision` carga la autoevaluación por su UUID sin llamar a `autorizarAccesoAutoevaluacion()` ni verificar sesión o usuario. Cualquier persona con el UUID puede acceder a los datos privados del negocio.
- **Evidencia:** `app/Http/Controllers/EvaluacionController.php:167-175`. Captura: `transicion_simulacion_desktop_user_locales.png`.

---

### HALLAZGO H-04
- **Pantalla o ruta:** `/panel-ciudadano`
- **Tipo:** Funcional / Deuda técnica
- **Severidad:** Alta
- **Esfuerzo:** M
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** El botón de acción "Subsanar" de las tarjetas del Dashboard conduce al flujo legacy de carga de archivos. En vez de permitir una verificación o reevaluación ágil, redirige a `/autoevaluacion/subsanacion/{uuid}`, pantalla que exige cargar fotos o PDFs (máx 5MB) mediante un modal de evidencias.
- **Evidencia:** `resources/js/pages/Dashboard/Dashboard.tsx:446-451`. Captura: `transicion_subsanacion_desktop_user_locales.png`.

---

### HALLAZGO H-05
- **Pantalla o ruta:** `/panel-ciudadano` y `/autoevaluacion/informe/{uuid}`
- **Tipo:** Texto / Datos
- **Severidad:** Media
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Exposición de enums y valores crudos de base de datos. Se muestran etiquetas como `Riesgo BAJO_MEDIO`, `Riesgo MUY_ALTO` (con guiones bajos), modalidades `EX_ANTE` / `EX_POST` en texto plano y valores vacíos mostrados como `0 m² • 0 pers.` o `"Dirección no consignada"`.
- **Evidencia:** `resources/js/pages/Dashboard/Dashboard.tsx:257, 278, 552`. Captura: `panel_locales_desktop_user_locales.png`.

---

### HALLAZGO H-06
- **Pantalla o ruta:** `/panel-ciudadano`
- **Tipo:** Texto / UX
- **Severidad:** Media
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Jerga técnica y criptográfica innecesaria para el comerciante. La Tarjeta KPI 3 se titula *"Trazabilidad Criptográfica SHA-256"* y cada tarjeta exhibe *"Sello SHA-256"* junto a una cadena hexadecimal de 64 caracteres, saturando visualmente la tarjeta sin aportar valor práctico al usuario.
- **Evidencia:** `resources/js/pages/Dashboard/Dashboard.tsx:363-370, 600-620`. Captura: `panel_locales_desktop_user_locales.png`.

---

### HALLAZGO H-07
- **Pantalla o ruta:** `/autoevaluacion/informe/{uuid}` y `/autoevaluacion/{uuid}/resumen`
- **Tipo:** Impresión
- **Severidad:** Media
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Pantallas con botones y estilos de impresión indebidos. Tanto `InformePreventivo.tsx` como `Resumen.tsx` implementan `window.print()` e incluyen estilos de hoja impresa A4 con firmas simuladas. El informe preventivo es un documento de consumo personal digital para el comerciante; el único documento normativo imprimible ante la municipalidad es el Anexo 4.
- **Evidencia:** `resources/js/pages/Evaluacion/InformePreventivo.tsx:310` y `resources/js/pages/Evaluacion/Resumen.tsx:870, 2008`. Capturas: `informe_preventivo_desktop_user_locales.png`, `resumen_conforme_desktop_user_locales.png`.

---

### HALLAZGO H-08
- **Pantalla o ruta:** `/panel-ciudadano`
- **Tipo:** Texto / Datos
- **Severidad:** Baja
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Aviso preventivo fijo desconectado de la realidad. Bajo el contador de locales observados aparece una caja fija: *"Aviso preventivo: Requieren atención técnica de extintores, cableado o señalética antes de la inspección."* Este mensaje se renderiza siempre, incluso cuando no hay observaciones sobre esos rubros o cuando el total de observados es 0.
- **Evidencia:** `resources/js/pages/Dashboard/Dashboard.tsx:590-594`. Captura: `panel_locales_desktop_user_locales.png`.

---

### HALLAZGO H-09
- **Pantalla o ruta:** `/panel-ciudadano`, `/directorio`, `/autoevaluacion/{uuid}/checklist`
- **Tipo:** UX / Accesibilidad
- **Severidad:** Media
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Áreas táctiles menores a 44 px en resolución móvil (390x844). Se detectaron controles con dimensiones reducidas: botón circular de reevaluación de 28x28 px (`h-7 w-7`), botones de copiar al portapapeles (`h-6 w-6`), píldoras de filtro en el panel (`py-1.5`) y botones de ayuda en el checklist, lo que dificulta la pulsación en dispositivos táctiles.
- **Evidencia:** `resources/js/pages/Dashboard/Dashboard.tsx:265, 699`. Captura: `panel_locales_mobile_user_locales.png`.

---

### HALLAZGO H-10
- **Pantalla o ruta:** `/autoevaluacion/recursos-cercanos/{codigo}`
- **Tipo:** Funcional / UX
- **Severidad:** Media
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Callejón sin salida por respuesta JSON en ruta web pública. Al acceder a esta ruta mediante el navegador, el servidor entrega un JSON crudo sin plantilla visual, layout ni mecanismo de navegación para retornar a la aplicación.
- **Evidencia:** `routes/web.php:65` y `app/Http/Controllers/EvaluacionController.php:480`. Captura: `recursos_cercanos_desktop_visitor.png`.

---

### HALLAZGO H-11
- **Pantalla o ruta:** `/directorio`
- **Tipo:** Navegación / Semántica
- **Severidad:** Baja
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Elementos `<header>` múltiples y anidados. La vista `Directorio/Index.tsx` monta una cabecera temática `<header className="relative overflow-hidden bg-slate-900...">` dentro del contenido de `<main>`, sumándose al `<header>` del `Navbar` institucional.
- **Evidencia:** `resources/js/pages/Directorio/Index.tsx:384`. Captura: `directorio_desktop_visitor.png`.

---

### HALLAZGO H-12
- **Pantalla o ruta:** `app/Http/Controllers/EvaluacionController.php`
- **Tipo:** Deuda técnica
- **Severidad:** Alta
- **Esfuerzo:** L
- **Fase sugerida:** Deuda transversal
- **Descripción:** Macrocontrolador con sobrecarga de responsabilidades. `EvaluacionController` tiene 1,275 líneas y su trait asociado 781 líneas (2,056 líneas en conjunto), administrando registro, checklist, dashboard, perfil, criptografía, catálogo, PDF, streaming de archivos y autenticación.
- **Evidencia:** `app/Http/Controllers/EvaluacionController.php` y `app/Http/Controllers/Traits/EvaluacionHelperTrait.php`.

---

### HALLAZGO H-13
- **Pantalla o ruta:** `/autoevaluacion/{uuid}/checklist` vs `/api/autoevaluaciones/{uuid}/checklist`
- **Tipo:** Deuda técnica
- **Severidad:** Baja
- **Esfuerzo:** S
- **Fase sugerida:** Fase 2 checklist
- **Descripción:** Endpoints duplicados de guardado. El frontend interactúa exclusivamente con la ruta web `POST /autoevaluacion/{uuid}/checklist`. La ruta `POST /api/autoevaluaciones/{uuid}/checklist` duplica la funcionalidad y solo es utilizada por una prueba aislada en el backend.
- **Evidencia:** `resources/js/pages/Evaluacion/Checklist.tsx:753` y `routes/web.php:79`.

---

### HALLAZGO H-14
- **Pantalla o ruta:** `/evaluacion/create` y `/evaluacion/{uuid}`
- **Tipo:** Deuda técnica
- **Severidad:** Baja
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Rutas alias heredadas no referenciadas. Son rutas legacy en `routes/web.php` que apuntan a `nueva` y `resultado` pero ningún componente del frontend las consume.
- **Evidencia:** `routes/web.php:72-73`.

---

### HALLAZGO H-15
- **Pantalla o ruta:** `/autoevaluacion/resultado/{uuid}`
- **Tipo:** Deuda técnica
- **Severidad:** Media
- **Esfuerzo:** M
- **Fase sugerida:** Fase 3 diagnóstico y anexos
- **Descripción:** Vista muerta (código zombi). `Resultado.tsx` (1,100 líneas) fue reemplazada funcionalmente por `Resumen.tsx` (2,600 líneas). El controlador intercepta toda autoevaluación V2 y emite un redirect 302 a `/resumen`, dejando `Resultado.tsx` en desuso operativo.
- **Evidencia:** `app/Http/Controllers/EvaluacionController.php:157-159` y `resources/js/pages/Evaluacion/Resultado.tsx`.

---

### HALLAZGO H-16
- **Pantalla o ruta:** Global (Checklist, Resumen, Subsanacion, Simulacion)
- **Tipo:** Deuda técnica
- **Severidad:** Media
- **Esfuerzo:** M
- **Fase sugerida:** Fase 2 checklist
- **Descripción:** URLs relativas escritas a mano en llamadas a la API y transiciones. Existen llamadas con `fetch('/autoevaluacion/${uuid}/checklist')`, `router.visit('/autoevaluacion/${uuid}/resumen')` y cadenas directas en lugar de usar las rutas con nombre de Ziggy (`route('autoevaluacion.checklist.store')`).
- **Evidencia:** `resources/js/pages/Evaluacion/Checklist.tsx:753, 2173`, `resources/js/pages/Evaluacion/Subsanacion.tsx:121, 213`.

---

### HALLAZGO H-17
- **Pantalla o ruta:** Global
- **Tipo:** Texto / Vocabulario
- **Severidad:** Baja
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Inconsistencia de terminología en la interfaz. El objeto físico se nombra alternadamente como *"local"*, *"establecimiento"*, *"sucursal"* o *"comercio"*. El proceso se titula *"autoevaluación"*, *"simulador preventivo"* o *"evaluación"*. El cierre se denomina *"diagnóstico"*, *"resumen"* o *"informe"*.
- **Evidencia:** `Home.tsx` ("Simulador preventivo"), `Nueva.tsx` ("Datos del Establecimiento"), `Dashboard.tsx` ("locales registrados" vs "Autoevaluar Otra Sucursal").

---

### HALLAZGO H-18
- **Pantalla o ruta:** `/mi-cuenta`
- **Tipo:** Visual / Consistencia
- **Severidad:** Baja
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Mezcla incoherente de colores temáticos de acción. En el perfil de usuario se utilizan fondos azules e iconos azules (`bg-blue-50 text-blue-600`) para las secciones personales y el aviso de locales, mientras que el botón de guardado y los badges de contribuyente usan verde esmeralda (`bg-emerald-600`), desentonando con la paleta de identidad cívica.
- **Evidencia:** `resources/js/pages/Perfil/PerfilUsuario.tsx:160-178, 185-187`. Captura: `perfil_usuario_desktop_user_zero.png`.

---

### HALLAZGO H-19
- **Pantalla o ruta:** `/autoevaluacion/anexo/{uuid}`
- **Tipo:** Navegación / Semántica
- **Severidad:** Baja
- **Esfuerzo:** S
- **Fase sugerida:** Fase 3 diagnóstico y anexos
- **Descripción:** Triple elemento `<header>` en la página del Anexo Oficial. La pantalla renderiza el Navbar de la aplicación, el banner superior de la página y el membrete formal del documento normativo.
- **Evidencia:** `resources/js/pages/Evaluacion/AnexoOficial.tsx`. Captura: `anexo_oficial_desktop_user_locales.png`.

---

### HALLAZGO H-20
- **Pantalla o ruta:** Global
- **Tipo:** Seguridad
- **Severidad:** Media
- **Esfuerzo:** S
- **Fase sugerida:** Fase 1 ampliada
- **Descripción:** Brecha en la autorización por UUID si el `session_token` del invitado es nulo. En `autorizarAccesoAutoevaluacion()`, la verificación de la cookie se encuentra dentro de `if (filled($autoevaluacion->session_token))`. Si una autoevaluación anónima llega a crearse o existir con `session_token = null`, el método no aborta y permite el acceso a cualquiera que envíe el UUID.
- **Evidencia:** `app/Http/Controllers/Traits/EvaluacionHelperTrait.php:214-226`.

---

## 4. RESPUESTAS EN PROSA A LAS PREGUNTAS REQUERIDAS

### Pregunta B7: Rutas Heredadas y Contradicción con el Modelo Simplificado
- **Enlaces activos hacia rutas heredadas:** En el Dashboard ([`Dashboard.tsx#L446`](file:///C:/xampp/htdocs/SisWeb/resources/js/pages/Dashboard/Dashboard.tsx#L446)), el botón de las tarjetas con observaciones (`Subsanar ({totalObservaciones})`) conduce a `route('autoevaluacion.subsanacion', { uuid })`. En [`Checklist.tsx#L1351`](file:///C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Checklist.tsx#L1351) existe un botón secundario que también apunta a dicha ruta. Desde la vista de subsanación ([`Subsanacion.tsx#L425`](file:///C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Subsanacion.tsx#L425)), un enlace lleva a `/autoevaluacion/revision/{uuid}`. Las rutas `/evaluacion/create` y `/evaluacion/{uuid}` no tienen enlaces visibles en el frontend.
- **Contradicción con el modelo simplificado:** El modelo normativo ITSE simplificado para Huancayo se basa en declaraciones ciudadanas no vinculantes (`CUMPLE`, `POR_SUBSANAR` o `NO_APLICA`) sin requerir evidencia documental para el ciudadano. Las pantallas heredadas `Subsanacion.tsx` y `EvidenciaUploadModal.tsx` contradicen este principio al exigir la carga física de archivos (PDF/JPG/PNG máx 5MB) para subsanar observaciones, persistiendo archivos en almacenamiento local y tablas forenses. Asimismo, `SimulacionRevision.tsx` emula una inspección punitiva con semáforos sancionatorios.

---

### Pregunta C1: Verificación de Propiedad de Autoevaluación en Cada Ruta con UUID
A continuación se detalla cómo se valida la propiedad en cada una de las 10 rutas con UUID y cuáles pueden abrirse conociendo solo el UUID:

1. **`checklist` (`GET /autoevaluacion/{uuid}/checklist`):** Ejecuta `autorizarAccesoAutoevaluacion()`. Si `user_id !== null`, comprueba que `$user->id === $autoevaluacion->user_id` o que la sesión contenga `guest_authorized_uuid === $uuid`. Si `user_id === null`, verifica que `guest_session_token` coincida con la cookie mediante `hash_equals`. *Solo se puede abrir con el UUID si el registro tiene `user_id = null` y `session_token = null`.*
2. **`resumen` (`GET /autoevaluacion/{uuid}/resumen`):** Mismo mecanismo a través de `autorizarAccesoAutoevaluacion()`. *Solo se puede abrir si `user_id = null` y `session_token = null`.*
3. **`resultado` (`GET /autoevaluacion/resultado/{uuid}`):** Ejecuta `validarAutorizacionConsulta()`. Si `user_id !== null`, valida el ID del usuario autenticado; si es anónima, valida el `session_token` contra la cookie. Para registros V2 emite un redirect 302 hacia `/resumen`. *Solo se puede abrir si `user_id = null` y `session_token = null`.*
4. **`informe` (`GET /autoevaluacion/informe/{uuid}`):** Ejecuta `validarAutorizacionInforme()`. Valida propiedad por `user_id` o por cookie `guest_session_token`. *Solo se puede abrir si `user_id = null` y `session_token = null`.*
5. **`anexo` (`GET /autoevaluacion/anexo/{uuid}`):** Ejecuta `autorizarAccesoAutoevaluacion()`. *Solo se puede abrir si `user_id = null` y `session_token = null`.*
6. **`reevaluar` (`GET /autoevaluacion/reevaluar/{uuid}`):** Ejecuta `validarAutorizacionReevaluacion()`. Si `user_id === null` y `session_token` está vacío o no coincide la cookie, **aborta estrictamente con 403**. *No se puede abrir con solo conocer el UUID.*
7. **`finalizar` (`POST /autoevaluacion/{uuid}/finalizar`):** Ejecuta `autorizarAccesoAutoevaluacion()`. *Solo se podría ejecutar si `user_id = null` y `session_token = null`.*
8. **`evidencia` (`GET /autoevaluacion/subsanacion/{uuid}/evidencia/{subsanacion}`):** Validación directa en el controlador. Exige `$user->id === $autoevaluacion->user_id` o coincidencia estricta mediante `hash_equals` de la cookie. *No se puede abrir con solo el UUID.*
9. **`revision` (`GET /autoevaluacion/revision/{uuid}`):** **NO EJECUTA NINGÚN CONTROL DE AUTORIZACIÓN.** Carga el registro con `firstOrFail()` y renderiza la vista. ***SE PUEDE ABRIR CON SOLO CONOCER EL UUID (Brecha confirmada en H-03).***
10. **`subsanacion` (`GET /autoevaluacion/subsanacion/{uuid}`):** Ejecuta `autorizarAccesoAutoevaluacion()`. *Solo se puede abrir si `user_id = null` y `session_token = null`.*

---

### Pregunta C2: Endpoints Duplicados de Guardado de Checklist
El frontend ([`Checklist.tsx#L753`](file:///C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Checklist.tsx#L753)) utiliza **exclusivamente la ruta web**:  
`POST /autoevaluacion/${uuid}/checklist` (`autoevaluacion.checklist.store`).  
La ruta API `POST /api/autoevaluaciones/{uuid}/checklist` (`api.autoevaluaciones.checklist.store`) no tiene ningún uso en la interfaz ni en scripts de cliente; es código duplicado consumido únicamente por la prueba unitaria `ChecklistDinamicoEndpointTest.php`.

---

### Pregunta C4: Deuda Técnica Visible
1. **Sobrecarga de `EvaluacionController`:** 1,275 líneas en el controlador y 781 líneas en `EvaluacionHelperTrait` (2,056 líneas en total). Concentra lógica de negocio que debería residir en servicios especializados (generación de snapshots, autorización de dominios, formateo de KPIs, manejo de adjuntos).
2. **Duplicación de componentes y vistas zombi:** La pantalla `Resultado.tsx` (1,100 líneas) permanece en el repositorio aunque el flujo moderno siempre redirige a `Resumen.tsx`. Existen seis modales de diálogo (`GuiaModal`, `GuiaPedagogicaModal`, `ModalConfirmarReevaluacion`, `ModalGuardarProgreso`, `EvidenciaUploadModal`, `ProveedoresCercanosModal`) con código de maquetación y gestión de estado altamente redundante.
3. **Rutas web huérfanas:** `evaluacion.create` y `evaluacion.show` en `routes/web.php` no tienen referencias en el frontend.
4. **URLs relativas escritas a mano:** Abundantes llamadas con cadenas literales (`fetch('/autoevaluacion/...')`) en lugar de emplear el helper `route()` de Ziggy.
5. **Textos fijos desalineados con los datos:** Mensajes como el "Aviso preventivo" del Dashboard no responden al estado dinámico del local.

---

## 5. LISTA DE PANTALLAS QUE NO PUDIERON REVISARSE (O PARTICULARIDADES)

1. **`/autoevaluacion/recursos-cercanos/{codigo}`:** No es una página HTML con frontend, sino un endpoint que devuelve un payload JSON crudo.
2. **`/autoevaluacion/resultado/{uuid}`:** Al pertenecer todas las evaluaciones creadas a la arquitectura V2, el controlador emite una redirección 302 automática hacia `/autoevaluacion/{uuid}/resumen`.
3. **`/autoevaluacion/subsanacion/{uuid}/evidencia/{subsanacion}`:** Es un endpoint de descarga privada binaria. Al no existir un archivo adjunto cargado previamente, responde 404 por diseño.

---

## 6. INVENTARIO EXACTO DE ELEMENTOS CREADOS DURANTE LA AUDITORÍA
Para que el propietario pueda decidir si conservarlos o depurarlos, a continuación se detalla todo lo generado en la base de datos de desarrollo y en el sistema de archivos:

### A. Registros en Base de Datos de Desarrollo
1. **Tabla `autoevaluaciones`:**
   - **ID 32:** `uuid_trazabilidad: 0a513202-4e6d-4998-921c-539ee1b88443`, Nombre: *"Bodega Auditoría Externa"*, RUC: `20123456780`, `user_id: null`.
   - **ID 33:** `uuid_trazabilidad: 105b3ace-d011-4da9-9526-cf78797bcda3`, Nombre: *"Comercio Auditoría Invitado"*, RUC: `20123456789`, `user_id: null`.
2. **Tabla `respuestas_autoevaluacion`:**
   - **1 registro:** Vinculado a `autoevaluacion_id: 33` para el criterio `CRIT-01` (`criterio_id: 1`), con estado `CUMPLE` y nota *"Verificado operable manómetro verde"*.
3. **Tabla `users`:**
   - **0 usuarios creados.** Se utilizaron exclusivamente las cuentas preexistentes (`test@example.com` y `123qwerty@gmail.com`).
4. **Tabla `sessions`:**
   - Registros de sesión temporales gestionados automáticamente por el driver de base de datos de Laravel.

### B. Archivos Generados
1. **Documento de auditoría solicitado:**
   - `docs/auditoria/informe_auditoria_fase1.md` *(archivo nuevo sin commitear)*.
2. **Scripts auxiliares en scratch:**
   - Ubicados en el directorio de artefactos (`.gemini/antigravity-cli/brain/.../scratch/`), fuera del árbol de la aplicación.
3. **Capturas de pantalla de evidencia:**
   - 52 archivos PNG en el directorio de artefactos de la sesión.

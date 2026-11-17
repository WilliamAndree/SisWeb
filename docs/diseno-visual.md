# Diseño visual

## Público y principios

El público principal son **emprendedores jóvenes que abren su primer local** en Huancayo. Las pantallas siguen tres reglas:

1. **Una acción principal por pantalla.** El botón ámbar ("Simular mi local") o el verde ("Continuar") es siempre el siguiente paso.
2. **Menos campos visibles.** Lo opcional o poco común queda plegado: la dirección y las condiciones especiales (caldero, inflamables, sótano, galería).
3. **Sin repetir.** Hay un único indicador de pasos (`FlujoCiudadano`) y un único aviso legal compacto (`AvisoPreventivo`) por pantalla.

## Tokens (`backend/resources/css/app.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `primary-*` | Verde esmeralda (`#047857` como base) | Acciones, estados "listo", enlaces |
| `ink-900 / 800 / 700` | `#0b1f1a`, `#12302a`, `#1b4038` | Superficies de alto impacto: hero, bloque de respaldo, logo |
| `sun-*` | Ámbar (`#fbbf24` como base) | CTA principal sobre fondo oscuro y acentos de emprendimiento |
| `canvas` | `#f6f7f4` | Fondo general cálido |
| Tipografía | Plus Jakarta Sans (fonts.bunny.net) | Titulares en `extrabold` con `tracking-tight` |

Los estados usan texto o icono además del color: "Sin factores que eleven el riesgo" en verde y viñetas ámbar para los motivos.

## Componentes compartidos

| Componente | Archivo | Propósito |
| --- | --- | --- |
| `Navbar` | `components/Navbar.tsx` | Navegación con enlaces declarados en un arreglo; menú móvil con Escape |
| `FlujoCiudadano` | `components/Evaluacion/FlujoCiudadano.tsx` | Progreso Tu local → Condiciones → Resultado |
| `AvisoPreventivo` | `components/Evaluacion/FlujoCiudadano.tsx` | Deslinde legal en una línea |
| `clasificarItse` | `lib/clasificacion-itse.ts` | Clasificación ITSE posterior o previa, espejo del servidor |
| `REFERENCIAS` | `data/respaldoCientifico.ts` | Fuente única del respaldo científico |

## Accesibilidad

- Un solo `h1` por pantalla. Todos los campos tienen `label`.
- El foco pasa al título del grupo solo cuando el usuario cambia de grupo, no al cargar la página.
- Las animaciones respetan `prefers-reduced-motion`.
- No hay desbordamiento horizontal entre 320 y 1440 px. Lo verifica `tests/Frontend/ux-browser.test.mjs`, que guarda capturas en `docs/producto/evidencias-ux01/`.

## Pendiente (fase 2)

Aplicar el mismo sistema a Checklist, Resumen, Resultado, Panel ciudadano y Directorio.

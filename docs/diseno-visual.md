# Diseño visual

## Público y principios

El público principal son **emprendedores jóvenes que abren su primer local** en Huancayo, muchos de ellos usuarios nuevos de este tipo de trámite. Las pantallas siguen cuatro reglas:

1. **Letra grande.** La base es de 17 px (`html { font-size: 106.25% }` en `app.css`). Los textos de lectura usan `text-base` a `text-xl` y los títulos `text-3xl` o más.
2. **Una acción principal por pantalla.** El botón ámbar ("Simular mi local gratis") o el verde ("Continuar", "Pedir cotización") es siempre el siguiente paso.
3. **Fotos reales que reflejen el rubro.** Las portadas de los locales se eligen por el nombre del negocio (`lib/imagen-negocio.ts`): "BillyEssences" muestra una perfumería, no una bodega.
4. **Sin repetir.** Hay un único indicador de pasos (`FlujoCiudadano`) y un único aviso legal compacto por pantalla.

## Tokens (`backend/resources/css/app.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `primary-*` | Verde esmeralda (`#047857` como base) | Acciones, estados "listo", enlaces |
| `ink-900 / 800 / 700` | `#0b1f1a`, `#12302a`, `#1b4038` | Superficies de alto impacto: hero, bloque para proveedores |
| `sun-*` | Ámbar (`#fbbf24` como base) | CTA principal sobre fondo oscuro y datos destacados |
| `canvas` | `#f6f7f4` | Fondo general cálido |
| Tipografía | Plus Jakarta Sans (fonts.bunny.net) | Titulares en `extrabold` con `tracking-tight` |

## Imágenes

Las fotos propias están en `backend/public/images/` en formato WebP (entre 50 y 220 KB). Las licencias y los autores están en `backend/public/images/CREDITOS.md`. Solo se usan fotos con la Licencia Unsplash gratuita, no Unsplash+.

## Pantallas

| Pantalla | Secciones |
| --- | --- |
| Portada (`/`) | Hero con foto · datos clave de la ley · ruta de 4 pasos · rubros con fotos · calculadora de modalidad · áreas que revisa el inspector · renovación con recordatorio · accesos a la tienda de aliados · preguntas frecuentes |
| Datos del local (`/autoevaluacion/nueva`) | Un indicador de pasos · 3 grupos de datos · campos opcionales plegados · precalificación al final |
| Aliados (`/directorio`) | Hero · lo más buscado (por producto) · proveedores con filtros · sección para proveedores con planes |

## Componentes compartidos

| Componente | Archivo | Propósito |
| --- | --- | --- |
| `Navbar` | `components/Navbar.tsx` | Navegación; bajo 380 px el botón principal pasa al menú |
| `FlujoCiudadano`, `AvisoPreventivo` | `components/Evaluacion/FlujoCiudadano.tsx` | Progreso del recorrido y deslinde legal en una línea |
| `RenovacionRapida` | `components/landing/RenovacionRapida.tsx` | Vencimiento del certificado y recordatorio `.ics` |
| `clasificarItse` | `lib/clasificacion-itse.ts` | Modalidad ITSE, espejo del servidor |
| `calcularVigencia` | `lib/renovacion-itse.ts` | Vigencia de 2 años y aviso de 90 días |
| `resolverFotoNegocio` | `lib/imagen-negocio.ts` | Foto de portada según el rubro |

## Accesibilidad

- Un solo `h1` por pantalla y todos los campos con `label`.
- No hay desbordamiento horizontal entre 320 y 1440 px. Lo verifica `tests/Frontend/ux-browser.test.mjs`.
- Las animaciones respetan `prefers-reduced-motion`.

## Pendiente

Aplicar este sistema a Checklist, Resumen, Resultado y Panel ciudadano.

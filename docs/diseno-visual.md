# Diseño visual

## Público y principios

El público principal son **emprendedores jóvenes que abren su primer local** en Huancayo, muchos de ellos usuarios nuevos de este tipo de trámite. Las pantallas siguen cuatro reglas:

1. **Letra grande.** La base es de 17 px (`html { font-size: 106.25% }` en `app.css`). Los textos de lectura usan `text-base` a `text-xl` y los títulos `text-3xl` o más.
2. **Una acción principal por pantalla.** El botón dorado sobre fondo oscuro ("Simular mi local gratis") o el naranja ("Continuar", "Subir una foto") es siempre el siguiente paso.
3. **Fotos reales que reflejen el rubro y lo que falta.** Las portadas se eligen por el nombre del negocio (`lib/imagen-negocio.ts`) y cada ítem pendiente muestra la foto de lo que falta (`lib/item-visual.ts`).
4. **Sin repetir.** Hay un único indicador de pasos (`FlujoCiudadano`) y un único aviso legal compacto por pantalla.

## Identidad "Andes"

Inspirada en los textiles wanka del Valle del Mantaro, para que CheckITSE no se parezca a una plantilla genérica:

- **Naranja fuego** para acciones: es el color de la seguridad contra incendios.
- **Índigo noche** para las superficies oscuras (hero, encabezados de sección y pie de página).
- **Dorado y magenta** como acentos, igual que en las mantas andinas.
- **Franja andina** (`franja-andina`): triángulos y rombos al pie de cada bloque oscuro. **Trama andina** (`trama-andina`): retícula de rombos casi invisible sobre el índigo.
- **Verde azulado solo para "cumple / listo"**: `emerald-*` se redefinió para que conserve ese único significado.

## Tokens (`backend/resources/css/app.css`)

| Token | Valor base | Uso |
| --- | --- | --- |
| `primary-*` | Naranja fuego `#c2410c` (texto blanco con contraste AA) | Acciones, enlaces, énfasis |
| `ink-900 / 800 / 700 / 600` | Índigo `#17133a` a `#4a3f94` | Hero, encabezados de sección, pie de página |
| `sun-*` | Dorado `#ffc233` | CTA sobre fondo oscuro, cifras y etiquetas |
| `magenta-*` | `#c21f68` | Acento textil |
| `emerald-*` / `success-*` | Verde azulado `#0d7c68` | Solo estados "cumple", "listo" y "verificado" |
| `canvas` | Crema `#fbf6ee` | Fondo general |
| Tipografía | Bricolage Grotesque (títulos `h1` y `h2`, clase `font-display`) y Plus Jakarta Sans (texto) | fonts.bunny.net |

## Imágenes

Las fotos propias están en `backend/public/images/` en formato WebP (entre 50 y 220 KB). Las licencias y los autores están en `backend/public/images/CREDITOS.md`. Solo se usan fotos con la Licencia Unsplash gratuita, no Unsplash+.

## Pantallas

| Pantalla | Secciones |
| --- | --- |
| Portada (`/`, ancho completo) | Hero cinematográfico a pantalla completa (4 fotos con fundido y acercamiento lento, pausa y puntos) · franja de rubros que se desliza · Hero con foto · datos clave de la ley · ruta de 4 pasos · rubros con fotos · calculadora de modalidad · áreas que revisa el inspector · renovación con recordatorio · accesos a la tienda de aliados · preguntas frecuentes |
| Datos del local (`/autoevaluacion/nueva`) | Un indicador de pasos · 3 grupos de datos · campos opcionales plegados · precalificación al final |
| Aliados (`/directorio`) | Hero · lo más buscado (por producto) · proveedores con filtros · sección para proveedores con planes |

## Formularios

Inspirados en la claridad de los formularios de gob.pe, con pasos, ayudas y validación amable. Kit en `components/form/Pregunta.tsx`:

| Regla | Cómo se aplica |
| --- | --- |
| Cada dato es una pregunta numerada | `<Pregunta numero={1} etiqueta="...">`, etiqueta en negrita de 19 px y en minúsculas normales |
| La ayuda va antes del campo | Prop `ayuda`, enlazada con `aria-describedby` |
| Campos grandes y con borde visible | `claseCampo()`: 48 px de alto, letra de 19 px y borde `slate-400` |
| Opciones fáciles de tocar | `<OpcionesTarjeta>` con radio nativo en toda la tarjeta; Sí/No/Aún no lo sé en botones de 48 px |
| Errores claros | Mensaje con icono junto al campo y `<ResumenErrores>` arriba, con enlaces a cada campo |
| Formularios largos divididos | Máximo unas 5 preguntas por paso, con barra de progreso y un paso final para revisar y cambiar |
| Nada de MAYÚSCULAS diminutas | Ningún texto de lectura queda por debajo de `text-sm` (14,9 px) |

Formularios que siguen estas reglas: datos del local (`/autoevaluacion/nueva`, 14 preguntas en 3 pasos) y afiliación de proveedores (`/directorio/anunciate`, 9 preguntas en 3 pasos).

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

## Lo que te falta

`components/Evaluacion/LoQueTeFalta.tsx` aparece en el Resumen y en la pantalla de subsanación:

1. Cada ítem pendiente es una tarjeta grande con la foto de lo que falta y la etiqueta "Falta" o "Por revisar".
2. Al elegir una, el panel muestra qué hacer, el costo aproximado y los proveedores de esa especialidad.
3. Cada proveedor tiene un botón de WhatsApp con el mensaje ya escrito (producto y nombre del local) y un mapa de su zona.
4. El botón "Ya lo resolví: subir una foto" abre la carga de evidencia de ese ítem.

Los mapas usan la búsqueda pública de Google Maps (`output=embed`), sin clave de API. Muestran la **zona de atención** (distrito) del proveedor, no una dirección exacta, porque el directorio no guarda direcciones verificadas.

## Expediente digital

`/autoevaluacion/{uuid}/expediente-digital` reúne los documentos del trámite, basado en el formulario de ITSE de facilita.gob.pe, pero más simple:

- **Solo se pide lo que corresponde.** Con riesgo bajo o medio, la declaración jurada (D.S. 002-2018-PCM, art. 20.1). Con riesgo alto, los 6 documentos del art. 25.1. Catálogo editable en `config/expediente.php`.
- **Cada documento** está numerado y explica qué es, cómo conseguirlo y qué formatos acepta (PDF, JPG, PNG o WebP, máximo 10 MB). Se puede arrastrar el archivo o tomar una foto con el celular.
- **Para quien revisa:** progreso "X de Y obligatorios", vista previa de cada archivo, descarga de todo en un ZIP numerado en orden y una ficha de revisión imprimible con un código de verificación (huella SHA-256) por archivo.
- **Seguridad:** los archivos se guardan en el disco privado y solo los descarga el dueño del expediente (con cuenta o con su token de invitado).

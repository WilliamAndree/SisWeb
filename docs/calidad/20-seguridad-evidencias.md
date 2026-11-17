# Fase 3C — Seguridad de evidencias

## Contratos conservados

| Operación | Tipos admitidos | Límite |
| --- | --- | --- |
| Almacenar respaldo | JPEG, PNG, WebP y PDF según MIME validado | 5120 KiB; archivo no vacío |
| Solicitar análisis visual | image/jpeg, image/png, image/webp | 5242880 bytes; imagen reconocible |
| PDF | Se almacena y descarga como documento; no se envía a análisis visual | Mismo límite documental |

No se cambiaron referencias normativas ni el soporte documental PDF. El hash se calcula sobre bytes reales; nunca se reemplaza por un hash ficticio para afirmar integridad.

## Defectos y pruebas

| ID | Defecto | Corrección | Caso y evidencia roja |
| --- | --- | --- | --- |
| D-3C-02 | codigo_item sin restricción se usaba en el nombre físico y admitía separadores/traversal | Códigos alfanuméricos, guion y underscore, máximo 64 caracteres, antes de escribir | EVID-3C-01, tres casos; 04 |
| D-3C-03 | Una ruta almacenada podía apuntar a otro archivo del disco privado | EvidenciaPrivadaService exige evidencias/, rechaza puntos/separadores manipulados y comprueba realpath bajo el disco | EVID-3C-03, dos casos; 04 |
| D-3C-04 | La descarga no comprobaba la huella registrada y servía bytes adulterados | Comparar SHA-256 real con hash_equals; discrepancia devuelve 409 | EVID-3C-02; 04 |
| D-3C-05 | Un archivo vacío podía aceptarse para almacenamiento | Rechazo explícito de tamaño cero, sin prohibir imágenes válidas menores de 1 KiB | EVID-3C-04; 04 y regresión 06 |
| D-3C-09 | Un archivo vacío/cabecera incompleta podía encolarse como imagen por fallback de MIME/extensión | Exigir contenido y estructura reconocible con getimagesizefromstring antes de crear el análisis | IA-3C-04; 04 |

El helper de ruta se comparte entre descarga, solicitud y procesamiento de IA. La comprobación canónica también impide resolver un enlace fuera de la raíz configurada. No se afirma haber ejecutado una matriz de symlinks de Windows: los casos dinámicos son rutas directas y traversal sintéticos.

EVID-3C-05 construye UploadedFile real con bytes HTML, nombre .jpg y MIME declarado image/jpeg; el endpoint rechaza por MIME real sin persistir. No depende del MIME simulado de UploadedFile::fake. EVID-3C-06 conserva el PNG previo, carga un PDF sintético, compara ambas huellas con hash('sha256', bytes) y comprueba bytes de descarga e historial. Se mantienen los controles existentes de 5 MB, WebP, propietario, invitado, UUID cruzado y rollback.

## Alcance de la inspección

El PNG nuevo es sintético y no requiere GD. El helper antiguo de Gemini ahora usa esos bytes reales aun cuando conserva el nombre .jpg de sus fixtures. Esto verifica el contrato visual permitido y no demuestra decodificación exhaustiva de JPEG/WebP ni resistencia de un modelo real. El caso WebP legado de almacenamiento comprueba MIME/cabecera; no se presenta como un análisis visual completo de WebP.

La inspección estructural de imagen no es antivirus ni validación exhaustiva de todos los formatos corruptos. Los documentos PDF siguen sujetos al contrato de archivo/MIME/tamaño: no se incorporó un parser documental nuevo. Los nombres originales no determinan autorización; los archivos se guardan en disco privado con nombre no colisionante. Los códigos legados compatibles se conservan.

Para registros históricos sin hash se conserva la descarga autorizada: no se afirma integridad criptográfica de esos registros. Cuando existe hash, una discrepancia bloquea descarga; la solicitud/procesamiento de IA también conserva la comprobación de huella. La autorización se aplica antes de leer bytes.

No se eliminaron evidencias previas del proyecto. Las manipulaciones de las pruebas afectan exclusivamente archivos sintéticos del Storage temporal/fake y registros de sisweb_testing, con rollback del runner. No se escribieron archivos de producción ni se reparó el InnoDB original de XAMPP.

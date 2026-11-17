# Fase 3D — TDD geométrico

Estado final: pruebas y correcciones ejecutadas localmente; resumen en 26-resultados-fase3d.md. No se rediseñó React ni se cambiaron normas. Se revisaron los documentos anteriores, especialmente 19–22, AGENTS.md y las guías locales testing-best-practices/laravel-best-practices. Versiones instaladas: Laravel 12.69.2 y Pest 3.8.7. No existe .ai/rules. Se inspeccionaron controladores, servicios espaciales, modelos, migraciones, rutas y contratos React relacionados, preservando cambios anteriores.

La línea base 02 aprobó 631 pruebas/4381 aserciones. Un intento inicial de ejecutar ROJO fue rechazado por el límite de uso del revisor automático: no se ejecutó ni cuenta como resultado. Al reanudar, la instancia QA estaba apagada; el preflight bloqueó la ejecución. Se inició únicamente la instancia nativa ya provisionada mediante tests/start-native-mariadb.ps1. El preflight 02b confirmó testing/mysql/127.0.0.1:3307/sisweb_testing, cuenta restringida, recovery=0, Storage temporal, caché/sesión/correo array, cola sync y HTTP externo bloqueado. No se reparó ni arrancó el servidor original de XAMPP. No se ejecutaron pruebas mientras la conexión no estuvo verificada.

## Contratos y decisiones

- Geometría v1.0: rectángulos con ancho/largo positivos o polígonos con al menos tres vértices y cierre implícito. Dimensiones/coordenadas de escritura se normalizan a dos decimales, según el contrato existente.
- Área: cálculo derivado; no se confía en area_m2 enviada por el cliente. Se mantiene redondeo final a dos decimales y SHA-256 de los bytes JSON normalizados.
- Límites de persistencia: posiciones/dimensiones en columnas DECIMAL(6,2), alturas/conectores DECIMAL(4,2), área DECIMAL(8,2). Se rechazan valores no numéricos/no finitos o fuera del rango representable antes de SQL. Son límites técnicos del esquema, no normas de edificación.
- Los vértices se guardan en JSON, no en las columnas de posición: requieren números finitos; no se les aplica el límite de posición SQL, que invalidaría esquinas generadas al sumar ancho a un origen válido.
- Altura opcional null no se inventa. Cero, false y null no se consideran intercambiables en la auditoría relacional. Números de piso 0 y negativos siguen admitidos; cada número identifica un nivel distinto.
- Tolerancia de proximidad existente: GeometriaPuntoSegmento::TOLERANCIA_METROS_DEFAULT = 0.20 m. Es un parámetro técnico del croquis, no una tolerancia normativa oficial validada en esta fase.

## Defectos geométricos y TDD

| ID | Defecto confirmado | Corrección | Caso / ROJO |
| --- | --- | --- | --- |
| D-3D-01 | Coerciones convierten texto/coordenadas inválidas a cero o permiten magnitudes incompatibles con SQL | Validación de estructura, tipo, finitud, rango y booleanos antes de convertir; puntos de consulta también validados | GEO-3D-02/03; 03-rojo |
| D-3D-02 | Intersección estricta no detecta contacto de aristas no adyacentes | Detectar colinealidad/punto en segmento cerrado; orientación en la grilla centimétrica normalizada | GEO-3D-04; 03 |
| D-3D-03 | Redondear distancia antes del umbral incluye puntos exteriores; comparar sin compensación binaria excluye algunas fronteras trasladadas | Comparación con distancia sin redondear y margen exclusivamente computacional de 8·PHP_FLOAT_EPSILON·escala | GEO-3D-01 y GEO-3D-05; 03 y 08 |
| D-3D-16 | Shoelace con productos de coordenadas absolutas pierde el área por cancelación catastrófica | Trasladar vértices respecto del primero antes de sumar productos; misma fórmula y área matemática | GEO-3D-08; 12-rojo-precision-area |

El margen de máquina no cambia 0.20 m por una tolerancia física nueva. Se probaron 0.20 y 0.20004 m en distintos orígenes; el exterior sigue excluido. La distancia pública conserva por defecto sus cuatro decimales; la comparación interna usa el valor sin redondeo. Se conserva el tratamiento previo del segmento degenerado.

En 12 también se registró una regresión introducida durante la corrección: limitar vértices JSON al rango de posiciones SQL hacía que un rectángulo válido en el extremo dejara de ser verificable al generar su esquina. GEO-3D-09 reprodujo esa incoherencia; se corrigió el límite aplicable. No se contabiliza como defecto preexistente adicional ni se ocultó su ejecución.

## Matriz requisito–caso

| Requisito | Prueba nueva o existente |
| --- | --- |
| Rectángulos y área derivada | GEO-3D-09, PLAN-3D-18 y ModeloEspacialVersionadoTest existentes |
| Triángulo, orientación inversa y polígono irregular L | GEO-3D-07: áreas conocidas 6, 6 y 48 m² |
| Autointersección y contacto no simple | GEO-3D-04 y GEO-3D-06; casos existentes de polígonos cruzados |
| Dimensiones negativas, cero y null | GEO-3D-06 |
| Texto, no finitos y coordenadas extremas | GEO-3D-02/03 y PLAN-3D-01 |
| Identidad duplicada de ambiente/piso | GEO-3D-10; duplicación entre pisos diferentes sí es válida y no colisiona en el grafo |
| Puntos/perímetros, distancias y tolerancias | GeometriaPuntoSegmentoTest existente; GEO-3D-01/02/05 |
| Precisión lejos del origen | GEO-3D-08: cuadrados trasladados a ±10^9 conservan 1 m² |
| Geometría almacenada corrupta | PLAN-3D-10 |

Las pruebas no simulan el algoritmo ni su hash. Los casos ya correctos son caracterización verde, no defectos inventados. Los archivos anteriores de pruebas permanecen intactos. La fórmula geométrica no comprueba condiciones físicas ni certifica seguridad ITSE.

## Alcance pendiente

No se acredita cobertura total, aritmética exacta arbitraria, validación CAD de todo solapamiento/contención o fuzzing exhaustivo de metadatos. El test de puntos exteriores se refiere a proximidad del perímetro y conectores; no constituye una validación completa de todos los elementos interiores. Polígonos muy extensos mantienen comprobación cuadrática de aristas: la carga medida de esta fase no demuestra escalabilidad ilimitada. No se inventaron máximos normativos de vértices, medidas reglamentarias o márgenes físicos nuevos.

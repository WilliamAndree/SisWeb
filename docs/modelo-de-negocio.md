# Modelo de negocio

## Propuesta de valor

| Cliente | Problema | Qué le da CheckITSE | Paga |
| --- | --- | --- | --- |
| Emprendedor que abre un local | No sabe qué le pedirá el inspector y el trámite se alarga por observaciones (41 días en Huancayo frente a 7 legales, según Doing Business 2020) | Simulación gratuita, lista de mejoras, declaración jurada prellenada y recordatorio de renovación | No |
| Proveedor de seguridad (extintores, señalética, electricistas) | Le cuesta llegar al negocio justo cuando necesita su producto | Aparece en la lista de mejoras del local, con contacto directo por WhatsApp | Sí, suscripción mensual |

El emprendedor es gratuito para que la base de usuarios crezca. Los ingresos vienen de los proveedores, que pagan por aparecer frente a una necesidad concreta y ya detectada.

## Planes para proveedores

Se configuran en `backend/config/aliados.php` (claves `planes`, `duraciones` y `pago`) y se contratan desde la cuenta del proveedor (`/proveedor/plan`). Son **precios de lanzamiento propuestos**. Cada beneficio listado funciona de verdad en la aplicación.

| Plan | Precio | Productos | Beneficios |
| --- | --- | --- | --- |
| Básico | Gratis | Hasta 5 | Ficha con mapa y WhatsApp; aparece en "Lo que te falta" |
| Destacado | S/ 49 al mes | Hasta 25 | Sello "Destacado"; aparece antes que los negocios Básico |
| Premium | S/ 99 al mes | Ilimitados | Sello "Premium"; primer lugar; atención prioritaria |

Pagar por adelantado sale más barato: 3 meses con 10 % de descuento (Destacado S/ 132) y 12 meses con 20 % (Destacado S/ 470, Premium S/ 950). El servidor calcula el monto; el proveedor no puede cambiarlo.

## Cobro con comprobante y administración

1. El proveedor elige plan y duración, paga por **Yape o Plin al 904 249 285** (configurable en `.env` con `CHECKITSE_PAGO_YAPE`; la cuenta bancaria aparece solo si se completa `CHECKITSE_PAGO_CUENTA`) y sube la foto o PDF del comprobante con su número de operación.
2. Se guarda en `solicitudes_plan` como **pendiente**, con el archivo privado (`storage/app/private/pagos`) y su huella SHA-256. Un mismo número de operación no se puede usar dos veces ni enviar otro pago mientras uno está en revisión.
3. Un **administrador** (`/admin`) ve el comprobante y lo **aprueba**: el plan se activa y vence según los meses pagados (si renueva el mismo plan, se suma al final) y, si el negocio seguía en revisión, **queda publicado en el mismo paso** o lo **rechaza con un motivo** que el proveedor lee en su cuenta. Queda registrado quién revisó y cuándo.
4. Cada madrugada `checkitse:vencer-planes` devuelve a Básico los planes vencidos. Aunque no corra, la aplicación ya trata un plan vencido como Básico.

**Seguimiento para el administrador** (`/admin`, solo ve sus secciones: Resumen, Pagos, Negocios, Vencimientos):

- **Resumen:** tareas del día, ingresos del mes (contra el mes anterior), del año e histórico, renovaciones esperadas en 30 días, gráfico de 6 meses, ingresos por plan y por medio de pago, y últimos cobros.
- **Vencimientos:** planes por vencer (7 días), vencidos y vigentes, con el botón **Recordar por WhatsApp**: abre WhatsApp con el mensaje listo (plan, fecha, enlace para renovar y número de Yape) y guarda la fecha del aviso.

**Cuenta del proveedor** (solo ve: Resumen, Mis productos, Mis ventas, Mi negocio, Mi plan):

- **Resumen:** cuántas veces lo vieron, cuántos le escribieron por WhatsApp, cuántos eligieron su producto y cuánto vendió (últimos 30 días y gráfico de 6 meses), y sus productos con más interés. Se registra en `eventos_proveedor` una vez por visitante y día.
- **Mis ventas:** registra cada venta (producto, cantidad, monto, cliente); descuenta las unidades disponibles y muestra los totales por mes (`ventas_proveedor`).

**Aprobación de negocios:** un proveedor nuevo queda **en revisión** y no lo ven los clientes hasta que el administrador lo aprueba. El administrador también puede **pedir correcciones** (el negocio vuelve a revisión cuando el proveedor guarda sus cambios) o **suspenderlo**.

**Cuentas de administrador:** no hay registro público. Se crean desde el servidor:

```bash
php artisan checkitse:crear-admin correo@dominio.com --nombre="Tu nombre"
```

Si no pasas `--password`, el comando genera una contraseña segura y la muestra una sola vez.

## Por qué escala

1. **Demanda recurrente.** Cada local nuevo necesita ITSE, y el certificado se renueva cada 2 años. El recordatorio de renovación devuelve al usuario a la plataforma.
2. **Venta en el momento justo.** El checklist ya sabe qué le falta a cada local (por ejemplo, un extintor Clase K si cocina con aceite), así que el anuncio llega cuando hay intención de compra.
3. **Réplica por ciudad.** La regla de clasificación es nacional (D.S. 002-2018-PCM). Para abrir otra ciudad solo se agregan proveedores y distritos en la configuración.

## Transparencia

Los proveedores con plan pagado se muestran marcados, el usuario elige libremente con quién trabajar y ningún proveedor puede garantizar la aprobación de la ITSE. El texto está en la página del directorio.

## Cuentas separadas

| Cuenta | Qué hace | Dónde |
| --- | --- | --- |
| Emprendedor (`tipo_cuenta = cliente`) | Simula su local, ve "Lo que te falta", compara ofertas, elige y arma su expediente digital | `/panel-ciudadano` |
| Proveedor (`tipo_cuenta = proveedor`) | Publica su perfil (especialidad, descripción, contacto, distrito, dirección y ubicación exacta con el GPS del celular) y sus productos con precio, ligados al criterio ITSE que resuelven | `/proveedor` |

El tipo se elige al registrarse ("Soy emprendedor" o "Soy proveedor") y el servidor envía a cada uno a su panel después de iniciar sesión.

## Cotizador en "Lo que te falta"

1. Cada producto del proveedor está ligado a un criterio (`ofertas_proveedor.criterio_codigo`, por ejemplo `CRIT-01` = extintor).
2. Cuando a un local le falta algo, o está "por revisar", la tarjeta muestra "Desde S/ X" con el precio más bajo publicado.
3. Al abrir el ítem, el costo aproximado es el rango real de las ofertas (mínimo a máximo). Si aún no hay ofertas, se muestra el rango referencial del catálogo.
4. El emprendedor elige una oferta y "Tu presupuesto" suma lo elegido. La elección se guarda en su dispositivo, por evaluación.
5. Primero aparecen los planes pagados (Premium y luego Destacado) y después el precio más bajo.

**Ubicación honesta:** solo los proveedores con cuenta propia, que registraron su punto, muestran la dirección y la ruta exacta en Google Maps. Los del catálogo de ejemplo muestran solo su zona.

Los proveedores y precios iniciales (`OfertasDemoSeeder`) son **datos de ejemplo** para la demostración.

## Próximos pasos técnicos

| Paso | Estado |
| --- | --- |
| Página de planes con ventajas, precios por 1, 3 y 12 meses y comparativa | Hecho |
| Cuentas separadas de emprendedor y proveedor | Hecho |
| Cuenta del proveedor separada: Resumen, Mis productos (filtros por uso, zona y estado), Mi negocio y Mi plan | Hecho |
| Ofertas con precio en "Lo que te falta", elección y presupuesto | Hecho |
| Orden por plan (Premium, Destacado, Básico), sello y límite de productos por plan | Hecho |
| Cobro con comprobante (Yape, Plin, banco), revisión por administrador y vencimiento del plan | Hecho |
| Aprobación de negocios por un administrador antes de mostrarlos | Hecho |
| Cobro automático en línea (Culqi, Mercado Pago o Izipay) | Pendiente (opcional; hoy se valida el comprobante a mano) |
| Avisos por correo o WhatsApp cuando se aprueba o rechaza un pago | Pendiente |
| Panel del proveedor con visitas y clics a WhatsApp | Pendiente |
| Guardar la elección del emprendedor en el servidor, para verla desde otro dispositivo | Pendiente |

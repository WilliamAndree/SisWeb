# Modelo de negocio

## Propuesta de valor

| Cliente | Problema | Qué le da CheckITSE | Paga |
| --- | --- | --- | --- |
| Emprendedor que abre un local | No sabe qué le pedirá el inspector y el trámite se alarga por observaciones (41 días en Huancayo frente a 7 legales, según Doing Business 2020) | Simulación gratuita, lista de mejoras, declaración jurada prellenada y recordatorio de renovación | No |
| Proveedor de seguridad (extintores, señalética, electricistas) | Le cuesta llegar al negocio justo cuando necesita su producto | Aparece en la lista de mejoras del local, con contacto directo por WhatsApp | Sí, suscripción mensual |

El emprendedor es gratuito para que la base de usuarios crezca. Los ingresos vienen de los proveedores, que pagan por aparecer frente a una necesidad concreta y ya detectada.

## Planes para proveedores

Se configuran en `backend/config/aliados.php` (clave `planes`) y se muestran en `/directorio#anunciate`. Son **precios de lanzamiento propuestos**; ajústalos según tu validación con proveedores reales.

| Plan | Precio | Beneficios |
| --- | --- | --- |
| Básico | Gratis | Ficha en el directorio, contacto por WhatsApp, 1 especialidad |
| Destacado | S/ 49 al mes | Primero en su especialidad, sello "Destacado", recomendado en el plan de mejoras del local, reporte mensual |
| Premium | S/ 99 al mes | Catálogo de hasta 20 productos con precio, visible en la portada, hasta 3 especialidades |

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
| Página de planes y solicitud en 3 pasos con el plan elegido (`/directorio/anunciate`) | Hecho |
| Cuentas separadas de emprendedor y proveedor | Hecho |
| Panel del proveedor: perfil, ubicación GPS y productos con precio | Hecho |
| Ofertas con precio en "Lo que te falta", elección y presupuesto | Hecho |
| Orden por plan (Premium, Destacado, Básico) y sello "Destacado" | Hecho (el plan se asigna manualmente en `proveedores_recursos.plan`) |
| Cobro en línea de los planes (Culqi, Mercado Pago o Izipay) y vencimiento del plan | Pendiente |
| Panel del proveedor con visitas y clics a WhatsApp | Pendiente |
| Verificación de proveedores por un administrador (`verificado`) | Pendiente (hoy se marca en la base de datos) |
| Guardar la elección del emprendedor en el servidor, para verla desde otro dispositivo | Pendiente |

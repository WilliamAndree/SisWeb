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

## Próximos pasos técnicos

| Paso | Estado |
| --- | --- |
| Página de planes y solicitud con el plan elegido | Hecho |
| Campo `plan` y fecha de vencimiento en `proveedores_recursos` para ordenar a los destacados primero | Pendiente |
| Mostrar proveedores del plan Destacado dentro del resumen de mejoras de cada local | Pendiente |
| Cobro en línea (Culqi, Mercado Pago o Izipay) | Pendiente |
| Panel del proveedor con visitas y clics a WhatsApp | Pendiente |

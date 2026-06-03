ÉPICA 1 - Administración de Prestadores
US-001

Como Administrador

Quiero registrar un prestador

Para poder asociar configuraciones específicas.

Criterios de aceptación
Crear prestador.
Editar prestador.
Activar/Inactivar.
Ver historial.
US-002

Como Administrador

Quiero administrar SPST

Para poder identificar correctamente las zonas de trabajo.

Criterios
Crear SPST.
Asociar a Prestador.
Asociar Zona.
US-003

Como Administrador

Quiero administrar clientes y sucursales

Para que el motor pueda identificar recorridos.

ÉPICA 2 - Tarifarios
US-010

Como Administrador

Quiero cargar tarifarios

Para validar importes automáticamente.

Datos
Prestador
Tipo Servicio
Zona
Importe
Vigencia
US-011

Como Administrador

Quiero versionar tarifarios

Para mantener histórico.

ÉPICA 3 - Tabla KM
US-020

Como Administrador

Quiero cargar tablas KM

Para validar distancias pactadas.

Datos
Prestador
SPST
Cliente
Sucursal
KM
US-021

Como Administrador

Quiero importar tablas KM desde Excel

Para acelerar la migración.

ÉPICA 4 - Importación de Liquidaciones
US-030

Como TL

Quiero importar un CSV

Para iniciar el análisis.

US-031

Como TL

Quiero validar estructura del archivo

Para detectar errores antes de procesar.

US-032

Como TL

Quiero conservar historial de importaciones

Para auditar revisiones anteriores.

ÉPICA 5 - Motor de Reglas

Esta es la más importante.

US-040

Como Sistema

Quiero validar tarifas

Para detectar diferencias.

Genera:

ALT001

US-041

Como Sistema

Quiero validar KM

Para detectar diferencias contra tabla pactada.

Genera:

ALT002

US-042

Como Sistema

Quiero detectar incidentes duplicados

Para evitar doble liquidación.

Genera:

ALT006

US-043

Como Sistema

Quiero detectar viáticos duplicados

Para alertar posibles inconsistencias.

Genera:

ALT003

US-044

Como Sistema

Quiero detectar agrupaciones de incidentes

Para identificar rutas compartidas.

Genera:

ALT005

US-045

Como Sistema

Quiero detectar segundas visitas

Para alertar posibles duplicidades.

Genera:

ALT006

ÉPICA 6 - Gestión de Alertas
US-050

Como TL

Quiero visualizar alertas priorizadas

Para concentrarme en casos relevantes.

US-051

Como TL

Quiero filtrar alertas

Por:

Prestador
Fecha
Riesgo
Tipo
US-052

Como TL

Quiero ver explicación de la alerta

Para entender por qué fue generada.

Ejemplo
Posible Viático Duplicado

Motivos:

- Mismo SPST
- Misma zona
- Otro incidente detectado
- Diferencia de 8 días
ÉPICA 7 - Observaciones
US-060

Como TL

Quiero registrar una observación

Para solicitar correcciones.

US-061

Como TL

Quiero indicar motivo estandarizado

Ejemplos:

Precio incorrecto
KM incorrectos
Viático duplicado
Servicio duplicado
Otro
US-062

Como TL

Quiero marcar observación como resuelta

Cuando el prestador corrija.

ÉPICA 8 - Dashboard
US-070

Como TL

Quiero visualizar métricas

Para monitorear el proceso.

Widgets

Liquidaciones pendientes.

Alertas abiertas.

Prestadores con más observaciones.

Tiempo medio de revisión.

ÉPICA 9 - Auditoría
US-080

Como Auditor

Quiero consultar historial completo

Para entender decisiones tomadas.

US-081

Como Auditor

Quiero conocer quién aprobó cada caso

Para mantener trazabilidad.

PRIORIZACIÓN MoSCoW
MUST HAVE (MVP)

✅ Prestadores

✅ SPST

✅ Tarifarios

✅ Tabla KM

✅ Importación CSV

✅ Motor de Reglas

✅ Alertas

✅ Observaciones

✅ Dashboard básico

SHOULD HAVE

⚠ Historial avanzado

⚠ Versionado de reglas

⚠ Biblioteca de casos

COULD HAVE

⚠ Recomendaciones automáticas

⚠ Similitud entre casos

WON'T HAVE (MVP)

❌ IA generativa

❌ Machine Learning

❌ Integración directa con sistema actual

❌ OCR
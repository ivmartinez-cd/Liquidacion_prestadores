ARQUITECTURA FUNCIONAL
Principio N°1

No programar reglas de negocio en código.

❌ Incorrecto

if(prestador == "INFOMAC")
{
   km = 150;
}

✅ Correcto

Prestador
↓
Tabla KM
↓
Motor de Reglas
↓
Resultado
Componentes Principales
Módulo Configuración

Administra:

Prestadores
SPST
Tarifarios
Tabla KM
Reglas
Parámetros
Módulo Importación

Responsabilidad:

Convertir CSV en datos normalizados.

CSV
↓
Parser
↓
Validación
↓
Incidentes
Módulo Motor de Reglas

Corazón del sistema.

Incidente
+
Histórico
+
Tabla KM
+
Tarifario
+
Configuración
=
Alertas
Módulo Analizador de Casos

Responsabilidad:

Buscar patrones.

Ejemplos:

Ruta compartida
Segunda visita
Viático duplicado
Servicio repetido
Módulo Biblioteca de Casos

Guardar decisiones históricas.

Alerta
↓
Resolución TL
↓
Caso Histórico
MODELO DE DATOS CONCEPTUAL
Prestador
Prestador
---------
Id
Nombre
Estado
FechaAlta
SPST
SPST
---------
Id
PrestadorId
Nombre
Zona
Cliente
Cliente
---------
Id
Nombre
Sucursal
Sucursal
---------
Id
ClienteId
Nombre
Localidad
Provincia
Tabla KM
TablaKM
---------
Id
PrestadorId
SPSTId
ClienteId
SucursalId
KmPactados
VigenciaDesde
VigenciaHasta
Tarifario
Tarifario
---------
Id
PrestadorId
TipoServicio
Zona
Importe
VigenciaDesde
VigenciaHasta
Liquidación
Liquidacion
---------
Id
PrestadorId
Periodo
FechaImportacion
Estado
Incidente
Incidente
---------
Id
LiquidacionId
NumeroIncidente
Tipo
Cliente
Sucursal
FechaCierre
CostoServicio
CostoKM
Total
Alerta
Alerta
---------
Id
IncidenteId
Tipo
Riesgo
Estado
Descripcion
Resolución
Resolucion
---------
Id
AlertaId
Usuario
Decision
Comentario
Fecha
Caso Histórico
CasoHistorico
---------
Id
TipoAlerta
Datos
Resolucion
Justificacion
ESTRATEGIA DE IMPORTACIÓN
Fase 1

CSV únicamente.

Porque hoy todo gira alrededor del export de la web.

Fase 2

Conector directo.

Sistema Actual
↓ API
Nuevo Sistema

Sin exportar archivos.

MOTOR DE REGLAS

La recomendación es que las reglas sean configurables.

Ejemplo:

Regla
ALT003
Configuración
Nombre:
Posible Viático Duplicado

Activo:
SI

Riesgo:
80

Ventana:
30 días

Prestadores:
Todos

De esta manera la TL puede ajustar comportamientos sin pedir desarrollo.

DISEÑO MULTI-PRESTADOR

La aplicación debe asumir que:

INFOMAC
≠
Prestador B
≠
Prestador C

Por lo tanto:

Todo debe estar asociado a:

Prestador
MIGRACIÓN DESDE EXCEL

No intentaría migrar todo de golpe.

Etapa 1

Migrar:

Tarifarios
Tabla KM
Etapa 2

Validar con la TL.

Etapa 3

Eliminar dependencia del Excel.

DECISIÓN TECNOLÓGICA RECOMENDADA
Backend

Si la empresa trabaja con Microsoft:

ASP.NET Core

Frontend

React

o

Next.js

Base de Datos

PostgreSQL

Hosting
On Premise
Azure
AWS

Cualquiera sirve.

Lo que haría antes de escribir una sola línea de código
Sprint 0

Duración:

2 a 3 semanas.

Entregables:

1. Catálogo Maestro de Reglas

RN001...
RN002...
RN003...

2. Catálogo Maestro de Alertas

ALT001...
ALT002...
ALT003...

3. Modelo de Datos

Versión validada.

4. Wireframes navegables

Dashboard.
Importación.
Alertas.
Detalle.

5. Backlog MVP

Historias de usuario completas.
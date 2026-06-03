DOCUMENTO DE DISEÑO FUNCIONAL (FDD)
Nombre del Proyecto

Asistente Inteligente de Validación de Preliquidaciones de Prestadores

1. Visión del Producto
Situación actual

La validación de preliquidaciones se realiza mediante:

Exportación manual de CSV.
Cruce manual con Excel.
Revisión manual de tarifas.
Revisión manual de kilómetros.
Detección manual de viáticos duplicados.
Experiencia y criterio de la Team Leader.

Esto provoca:

Alto tiempo operativo.
Dependencia de personas específicas.
Riesgo de errores.
Escasa trazabilidad.
Visión futura

La aplicación actuará como un asistente de análisis.

No reemplazará a la Team Leader.

Su función será:

Detectar inconsistencias.
Detectar patrones sospechosos.
Agrupar casos relacionados.
Priorizar casos para revisión.

La decisión final seguirá siendo humana.

2. Objetivos del MVP
Objetivos de Negocio
OBJ-01

Reducir el tiempo de revisión manual.

Meta:

-50% mínimo
-70% objetivo ideal
OBJ-02

Centralizar reglas operativas.

Eliminar dependencia exclusiva de Excel.

OBJ-03

Detectar inconsistencias automáticamente.

OBJ-04

Generar trazabilidad.

3. Actores
Actor	Función
Prestador	Genera preliquidación
Team Leader	Analiza
Jefe de Operaciones	Aprueba
Gerente	Aprueba
Administrador	Configura reglas
4. Proceso TO-BE
Prestador
    ↓
Preliquidación
    ↓
CSV
    ↓
Importación
    ↓
Motor de Análisis
    ↓
Generación de Alertas
    ↓
Team Leader
    ↓
Bitácora
    ↓
Prestador Corrige
    ↓
Nueva Liquidación
    ↓
Reanálisis
5. Módulos
M01 - Gestión de Prestadores

Funciones:

Alta/Baja/Modificación.
Gestión de SPST.
Gestión de zonas.
Gestión de clientes.
Gestión de sucursales.
M02 - Tarifarios

Configuración de:

Campo
Prestador
Tipo Servicio
Zona
Importe
Vigencia
M03 - Tabla KM

Configuración de:

Campo
Prestador
SPST
Cliente
Sucursal
KM Pactados
M04 - Importación

Funciones:

Importar CSV.
Validar estructura.
Historial de importaciones.
Reprocesamiento.
M05 - Motor de Análisis

Corazón del sistema.

Procesa:

CSV
+
Tarifario
+
Tabla KM
+
Historial
+
Reglas
M06 - Bandeja de Alertas

Vista principal de trabajo.

Filtros:

Prestador.
Fecha.
Tipo.
Riesgo.
Estado.
M07 - Historial

Registro completo de:

Alertas.
Resoluciones.
Comentarios.
Auditoría.
6. Catálogo Inicial de Alertas
ALT001

Precio Incorrecto

Severidad:

🔴 Alta

ALT002

KM Incorrectos

🔴 Alta

ALT003

Viático Duplicado

🔴 Alta

ALT004

Servicio Duplicado

🔴 Alta

ALT005

Ruta Compartida

🟠 Media

ALT006

Segunda Visita por Incidente Pendiente

🟠 Media

ALT007

Agrupación de Incidentes Misma Zona

🟠 Media

ALT008

SPST No Determinado

🔴 Alta

ALT009

Tarifario Inexistente

🔴 Alta

7. Modelo de Riesgo

Cada alerta suma puntaje.

Ejemplo:

Alerta	Puntaje
Precio incorrecto	100
KM incorrectos	100
Servicio duplicado	90
Viático duplicado	80
Ruta compartida	40

Resultado:

Incidente

Riesgo = 210

Clasificación:

Riesgo	Nivel
0-49	Bajo
50-99	Medio
100-149	Alto
150+	Crítico
8. Biblioteca de Casos

Esta es una funcionalidad diferencial.

Cuando la TL resuelve una alerta:

Guardar:

Tipo.
Datos involucrados.
Decisión.
Justificación.

Ejemplo:

Caso #458

Posible Viático Duplicado

Resolución:

Corresponde viático.

Motivo:

Segunda visita por repuesto.
9. Aprendizaje Operativo (Fase 2)

El sistema deberá poder identificar:

Caso Nuevo

similar a:

Caso Histórico

y mostrar:

Se encontró un caso similar.

Resolución histórica:
"Aprobado por segunda visita de repuesto."
10. Wireframe Conceptual
Dashboard
Liquidaciones Pendientes

12

Alertas Abiertas

87

Prestadores Observados

5

Tiempo Medio de Revisión

42 min
Bandeja de Alertas
Riesgo | Tipo | Prestador | Estado

180 | Viático Duplicado | INFOMAC | Pendiente

140 | Ruta Compartida | PST X | Pendiente

120 | Servicio Duplicado | PST Y | Pendiente
Detalle
Incidente 55321

Alerta:
Posible Viático Duplicado

Motivos:

- Misma zona
- Mismo SPST
- Servicio previo hace 8 días

Relacionados:

55318
55319

Acciones:

[ Confirmar Observación ]
[ Descartar ]
[ Guardar Caso ]
11. Roadmap
MVP
Prestadores.
Tarifarios.
Tabla KM.
Importación CSV.
Alertas.
Dashboard.
Historial.
Fase 2
Biblioteca de Casos.
Motor de Similitud.
Recomendaciones.
Fase 3
IA.
Predicción de observaciones.
Detección avanzada de patrones.
Próximo entregable recomendado

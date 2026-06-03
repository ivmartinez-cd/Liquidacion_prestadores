# DOCUMENTO DE INGENIERÍA INVERSA
## Aplicación Web — Validación Automática de Liquidaciones de Prestadores

**Versión:** 1.0 | **Fecha:** 2026-06-02 | **Estado:** Borrador para validación

---

## RESUMEN EJECUTIVO

El proceso actual de liquidación de prestadores de servicio técnico opera en un ciclo mensual que combina un sistema web (preliquidación), archivos CSV exportados, y planillas Excel individuales por prestador donde una Team Leader realiza controles manuales antes de autorizar la facturación.

Se analizaron **20 archivos Excel** de validación (.xlsx), **40+ archivos de liquidación** (.xls/HTML), **4 PSTs activos**, y archivos complementarios de SLA y pedidos de repuesto correspondientes a los meses enero–mayo 2026.

**Hallazgos principales:**
- El proceso tiene **alta dependencia del conocimiento implícito** de la Team Leader
- Existen **4 estructuras Excel distintas** (una por PST), con lógica parcialmente estandarizada
- Aproximadamente el **70% de los controles son automatizables** completamente
- Hay **reglas de negocio críticas no documentadas** (umbrales de viáticos variables, doble tarifa en instalaciones SAN JUAN)
- La **TABLA KMS** es el activo más crítico: si falta un par Sucursal-Empresa, el control falla silenciosamente

---

## ENTREGABLE 1 — INVENTARIO COMPLETO DE ARCHIVOS

| Archivo | Tipo | Objetivo | Criticidad |
|---|---|---|---|
| `PENTACOM YYYYMM.xlsx` | Excel validación | Control mensual PST Córdoba (Pentacom) | **ALTA** |
| `PERTEX YYYYMM.xlsx` | Excel validación | Control mensual PST Rosario (Supernova/Pertex) | **ALTA** |
| `INFOMAC YYYYMM.xlsx` | Excel validación | Control mensual PST Villa Mercedes + Gral. Roca/Neuquén | **ALTA** |
| `SAN JUAN YYYYMM.xlsx` | Excel validación | Control mensual PST San Juan (Gestión Integral) | **ALTA** |
| `liquidacion_XXXX-X_YYYYMMDD.xls` | HTML exportado | Preliquidación del prestador (origen: app web) | **ALTA** |
| `liquidacion_XXXX-X_YYYYMMDD_preco.xls` | HTML exportado | Preliquidación Pre-Correctivos (San Juan) | **ALTA** |
| `liquidacion_XXXX-X_YYYYMMDD_CC.xls` | HTML exportado | Preliquidación Centro Cívico (San Juan) | **ALTA** |
| `SLA PENTACOM - 2025 - 2026.xlsx` | Excel SLA | Seguimiento cumplimiento SLA Pentacom | MEDIA |
| `Facturacion Abril 2026 - Gestion.xlsx` | Excel resumen | Detalle facturación mensual (San Juan) | MEDIA |
| `Pedido de repuesto XX-MM-YYYY.xls` | HTML exportado | Pedidos de repuestos Pentacom (no liquidación) | BAJA |
| `PENTACOM YYYYMM.pdf` / `PERTEX YYYYMM.pdf` / etc. | PDF impresión | Versión impresa del Excel de control | BAJA |
| `FC-XX-XXXXX_XXXX-X.pdf` | PDF factura | Factura emitida por el prestador | MEDIA |
| `XXXX_merged.pdf` | PDF combinado | Factura + liquidación combinadas para archivo | BAJA |
| `NUEVA LIQ CC - SUMADA CON TRABAJO ADICIONAL.pdf` | PDF ajuste | Liquidación corregida de Centro Cívico | MEDIA |
| `33710995449_001_XXXXX.pdf` | PDF AFIP | Comprobante fiscal AFIP del prestador | MEDIA |
| Imágenes `.JPG` | Imagen | Fotos de movimientos de equipos / constancias | BAJA |

**Total PSTs activos:** 4  
**Total archivos Excel de validación analizados:** 20 (5 meses × 4 PSTs)  
**Total liquidaciones .xls analizadas:** ~40

---

## ENTREGABLE 2 — ANÁLISIS HOJA POR HOJA

### Archivos de validación — Estructura por PST

#### PST Córdoba — `PENTACOM YYYYMM.xlsx`

**Hojas:** `ENERO` (o mes actual) · `VIATICOS` · `TABLA KMS` · `SERVICIOS`

---

### Hoja: ENERO (o mes correspondiente)

- **Objetivo:** Contener la liquidación del mes para validación y archivo.
- **Datos almacenados:** Lista de incidentes del mes con su precio calculado.
- **Origen de datos:** Copiado manualmente desde el archivo `liquidacion_XXXX.xls`.
- **Usuario responsable:** Team Leader.
- **Frecuencia:** Una vez por mes (al cierre del período).
- **Estructura:**
  - Fila 2: Identificación del agente (`AGENTE: PENTACOM`)
  - Fila 4: Sección `CORRECTIVOS`
  - Fila 5: Encabezados: `Incidente | Tipo | Empresa | Sucursal | Nro. Serie | Cantidad | Costo Serv | Cant. Km | Costo Km | Total viaje | Costo total | Fecha Cierre`
  - Filas de datos: uno por incidente

**Fórmulas presentes:**
- `Total viaje = Cant. Km × Costo Km` → `=J8*I8`
- `Costo total = Costo Serv + Total viaje` → `=K8+H8` (cuando hay KMs), o valor directo cuando no hay viático

**Campos completados manualmente:** `Costo Serv`, `Cant. Km`, `Costo Km` (verificados contra TABLA KMS y tarifa vigente).

> **Observación:** *Inferido* — La hoja tiene secciones adicionales (PREVENTIVOS, INSTALACIONES) que no se visualizaron en las primeras filas; hay datos que continúan más abajo.

---

### Hoja: VIATICOS

- **Objetivo:** Repositorio histórico de todos los servicios que incluyeron kilómetros (viáticos), desde el inicio del contrato.
- **Datos almacenados:** Todos los incidentes históricos con KMs, con columna `Dif` para detectar discrepancias.
- **Origen de datos:** Acumulación mensual, cargado por Team Leader.
- **Frecuencia:** Actualización mensual.
- **Columnas:**  
  `Incidente | Tipo | Empresa | Sucursal | Nro. Serie | Cantidad | Costo Serv | Cant. Km | Costo Km | Total viaje | Costo total | Fecha Cierre | [KMs en tabla] | Dif | SPST/Localidad`
- **Fórmula clave:** `Dif = (KMs según tabla) - (KMs cobrados)` → `=M2-H2`
- **Propósito de la Dif:** Verificar que los KMs facturados coinciden con los KMs de la TABLA KMS.
- **Volumen:** PENTACOM: 1641 filas históricas. PERTEX: 741 filas. SAN JUAN: 1371 filas.
- **Observación:** Los registros duplicados dentro de VIATICOS (mismo incidente en dos filas consecutivas) representan rutas compartidas o servicios donde se aplica el "recorrido" especial (ver RN006).

---

### Hoja: TABLA KMS

- **Objetivo:** Tabla maestra de kilómetros por par (Cliente/Sucursal → SPST origen).
- **Datos almacenados:** Por cada combinación Empresa+Sucursal, el domicilio del cliente, el domicilio del SPST, los KMs medidos por Google Maps, y si aplica viático.
- **Origen de datos:** Cargado manualmente por Team Leader (con validación vía Google Maps). **[CONFIRMADO]**
- **Frecuencia:** Actualización cuando se incorpora un nuevo cliente/sucursal.

**Columnas PENTACOM:**  
`Sucursal | Empresa | Domicilio | Localidad | Provincia | Prestador (SPST) | Domicilio SPST | Localidad SPST | Provincia SPST | Kms recorrido | Aplica viático | Kms a facturar | RECORRIDO (URL Maps)`

**Columnas PERTEX:**  
`Sucursal | Empresa | Domicilio | Localidad | Provincia | Base | Localidad | Provincia | Kms recorrido | Aplica viático | Kms a facturar | Kms FER | Observacion`

> Nota: PERTEX tiene columna adicional `Kms FER`. **[Requiere validación con usuario]**

**Columnas SAN JUAN (TABLA KMS 2023):**  
`Sucursal | Empresa | Domicilio | Localidad | Provincia | Domicilio Prestador | Kms recorrido | Aplica viático | Kms a facturar | Maps`

**Fórmulas:**
- `Aplica viático = IF(Kms > 30, "Si", "No")` → umbral general 30 km
- `Kms a facturar = IF(Aplica = "si", Kms, 0)`

**Volumen:** PENTACOM: 278 registros. PERTEX: 198. SAN JUAN: 468 (+268 escuelas).

> **Criticidad: MÁXIMA.** Si falta un par, el KM queda vacío sin alertar error.

---

### Hoja: SERVICIOS

- **Objetivo:** Historial completo de todos los servicios desde el inicio del contrato para consulta y cross-reference.
- **Datos almacenados:** Incidentes históricos con precios históricos.
- **Origen de datos:** Acumulación desde inicio del contrato.
- **Frecuencia:** Actualización mensual.
- **Volumen:** PENTACOM: 6257 registros (desde abril 2021). PERTEX: 4026. SAN JUAN: 8193. INFOMAC: 5535.
- **Uso principal:** Verificar duplicados de incidentes entre meses.

---

### Hojas adicionales exclusivas de SAN JUAN

#### Hoja: KMS GSJ
- **Objetivo:** Lookup `Nro. Serie → Sector → Localidad` para equipos de Gobierno de San Juan.
- **Datos:** 198 números de serie con su sector organizacional y localidad.
- **Fórmula:** `=VLOOKUP(A2, domicilio, 2, FALSE)` para obtener domicilio del cliente.
- **Uso:** Determinar a qué localidad pertenece cada equipo escolar sin tener la dirección explícita en el incidente.

#### Hoja: GSJ JULIO
- **Objetivo:** Tabla KMS específica para equipos del Gobierno de San Juan, indexada por número de serie.
- **Datos:** 46 registros con Nro. Serie, sucursal escolar, domicilio, localidad, KMs y link Maps.
- **Nota:** Nombre informal, datos pueden estar desactualizados. **[Requiere validación con usuario]**

#### Hoja: LOCALIDADES
- **Objetivo:** Tabla estándar de kilómetros por localidad (sin depender del cliente específico).
- **Datos:** 72 localidades con KMs estándar desde San Juan Capital y localidad cabecera cuando corresponde.
- **Uso:** Alternativa de lookup cuando no se encuentra el par exacto en TABLA KMS 2023.

#### Hoja: TECNICOS
- **Objetivo:** Asignación de incidente a técnico específico.
- **Datos:** 462 registros con `Incidente → Nombre de técnico` (JUAN PABLO TERZI, GASTON, ANDRES, JUAN PABLO CASTRO).
- **Uso:** Trazabilidad y control de recursos.

#### Hoja: TABLA KMS DE DAVID (ESCUELAS)
- **Objetivo:** Tabla KMS específica para escuelas del Gobierno de San Juan, construida por un técnico específico ("David").
- **Datos:** 268 registros (Sucursal escolar → Localidad → KMs).
- **Riesgo:** El nombre informal indica conocimiento no formalizado concentrado en una persona. **[Riesgo operativo identificado]**

---

### Archivos de liquidación — `liquidacion_XXXX-X_YYYYMMDD.xls`

- **Objetivo:** Exportación de la preliquidación desde la aplicación web.
- **Formato real:** HTML con extensión .xls (no formato Excel binario real).
- **Estructura:** Una tabla HTML con columnas:  
  `Incidente | Rubro | Tipo | Empresa | Sucursal | Nro. Serie | Fecha Cierre | Costo Serv | Cant. Km | Costo Km | Total viaje | Costo total | P.IT`
- **Campo P.IT:** Indica "Pasa IT" (Sí/No). Todos los registros observados tienen `SI`. **[Requiere validación del significado exacto]**
- **Campo Rubro:** En todos los casos = "Impresoras". **[Confirmado]**
- **Nomenclatura:** `liquidacion_[ID]-[DÍGITO]_[FECHA].xls`
  - Sufijos especiales: `_preco` (Pre-Correctivos), `_CC` (Centro Cívico), `_Deposito Bodega Educacion`, `_CENTRO CIVICO`

---

## ENTREGABLE 3 — CATÁLOGO DE ENTIDADES DEL NEGOCIO

### Entidad: PST (Prestador de Servicio Técnico)

**Definición:** Empresa o persona física contratada para realizar servicios técnicos de mantenimiento y reparación de impresoras. Es quien genera la preliquidación y emite la factura.

**Campos identificados:**
- Nombre comercial (ej: Pentacom S.A., Supernova Servicios S.R.L., Infomac S.A.S., Gestión Integral S.R.L.)
- Nombre del Excel de control (ej: PENTACOM, PERTEX, INFOMAC, SAN JUAN)
- Región/Plaza (Córdoba, Rosario, Villa Mercedes + Gral. Roca/Neuquén, San Juan)
- CUIT (aparece en nombres de facturas, ej: `33710995449`)
- Dirección base (domicilio del SPST en TABLA KMS)

**Relaciones:**
- Un PST tiene muchos SPST
- Un PST tiene una planilla Excel de control mensual
- Un PST emite una o más liquidaciones por mes
- Un PST tiene una TABLA KMS propia

---

### Entidad: SPST (Sub-Prestador de Servicio Técnico)

**Definición:** Técnico o sub-equipo dentro de un PST, asignado a una zona geográfica específica. Tiene su propia dirección base que define el punto de origen para el cálculo de KMs.

**Campos identificados:**
- Nombre (ej: "PST Cordoba - Pentacom S.A.", "SPST Pentacom - Rio IV", "SPST Pentacom - Marcos Juarez")
- Domicilio base / Localidad / Provincia

**Relaciones:**
- Un SPST pertenece a un PST
- Un SPST tiene muchas filas en la TABLA KMS (es el origen de los viajes)
- Un SPST atiende una o varias sucursales de clientes

**Observación:** PENTACOM tiene múltiples SPSTs: Córdoba capital, Río IV, Marcos Juárez, Villa María, Laboulaye, Arroyito. **[Confirmado por evidencia en TABLA KMS]**

---

### Entidad: Incidente

**Definición:** Evento de servicio técnico que genera una línea de liquidación.

**Campos identificados:**
- ID_Incidente (formato `NNNNNN-N`, ej: `820130-4`)
- Tipo (Correctivo, Preventivo, Instalación-Desinstalación, Pre-Correctivo, Guardia, Sistemas)
- Empresa (cliente al que pertenece el equipo)
- Sucursal (punto físico donde está el equipo)
- Nro. Serie (número de serie del equipo atendido)
- Fecha Cierre
- Rubro (siempre "Impresoras" en los datos analizados)
- P.IT (pasa IT: Sí/No)

**Relaciones:**
- Un incidente genera exactamente una línea de liquidación
- Un incidente puede aparecer en múltiples liquidaciones del mismo mes (ej: preco + regular en San Juan)

---

### Entidad: Liquidación

**Definición:** Conjunto de incidentes facturados por un PST en un período dado.

**Campos identificados:**
- ID_Liquidación (formato `NNNN-N`, ej: `3739-6`)
- Fecha de generación
- PST asociado
- Período (mes YYYYMM)
- Tipo/sufijo (regular, preco, CC, Deposito Bodega, Centro Cívico)

---

### Entidad: Línea de Liquidación

**Definición:** Registro de un servicio específico dentro de una liquidación, con sus costos calculados.

**Campos identificados:**
- Incidente (FK)
- Costo Serv (tarifa base)
- Cant. Km (kilómetros facturados)
- Costo Km (tarifa por kilómetro)
- Total viaje (= Cant.Km × Costo Km)
- Costo total (= Costo Serv + Total viaje)

---

### Entidad: Cliente (Empresa)

**Definición:** Empresa propietaria de los equipos que reciben servicio técnico.

**Clientes identificados (muestra):** OCA, Banco Santander Río, Banco Credicoop, Aerolineas Argentinas, Arcos Dorados (McDonald's), YAGUAR, Gobierno de San Juan, NASA, Quickfood S.A., ADM Agro, Molino Cañuelas, CCU, Efectivo Si, Galeno, Brinks Argentina, DHL, Saputo, Sancor, entre otros.

---

### Entidad: Sucursal

**Definición:** Punto físico de un Cliente donde está instalado el equipo.

**Campos identificados:** Nombre/código, Domicilio, Localidad, Provincia.

**Relaciones:**
- Una sucursal pertenece a un Cliente
- Una sucursal tiene KMs calculados desde cada SPST (en TABLA KMS)

---

### Entidad: Tarifa

**Definición:** Precio aplicable por tipo de servicio en un período vigente.

**Valores observados (enero 2026):**

| PST | Correctivo/Instalación | Preventivo | Costo KM |
|---|---|---|---|
| PENTACOM | $58.042 | $26.832 | $649,53/km |
| PERTEX | $56.596 | $28.287 | $684,20/km |
| INFOMAC (Villa Mercedes) | $49.116 | $23.073 | $595,60/km |
| INFOMAC (Gral. Roca/Nqn) | $52.534 | — | $595,60/km |
| SAN JUAN | $46.126 (corr.) / $92.252 (inst.) | $23.073 | $633,30/km |

> **Observación:** Las tarifas cambian periódicamente. No hay tabla de tarifas vigentes centralizada en los archivos analizados. **[Requiere validación con usuario]**

---

### Entidad: Tabla KMS

**Definición:** Tabla maestra que contiene la distancia preacordada entre cada SPST y cada sucursal de cliente.

**Relaciones:**
- Una entrada relaciona un par (Empresa + Sucursal) con un SPST específico
- La misma sucursal puede tener KMs distintos según qué SPST atiende

---

### Entidad: Factura

**Definición:** Documento fiscal emitido por el PST después de la validación.

**Campos identificados (de nombres de archivo):**
- Número de factura (ej: `FC-14-1914`)
- Fecha de emisión / PST emisor / ID de liquidación asociada / CUIT del emisor

---

## ENTREGABLE 4 — REGLAS DE NEGOCIO

### RN001 — Costo de servicio según tipo de incidente
**Descripción:** El precio base (Costo Serv) varía según el tipo: Correctivo > Preventivo. Instalación-Desinstalación tiene tarifa especial.  
**Origen:** Valores observados en columna `Costo Serv` de liquidaciones y planillas de validación.  
**Automatizable:** Sí — tabla de tarifas por tipo × período.  
**Complejidad:** Baja.  
**Estado:** *Confirmado por evidencia.*

---

### RN002 — Instalación-Desinstalación se factura doble en San Juan
**Descripción:** Para PST San Juan (Gestión Integral), los servicios tipo "Instalación-Desinstalación" tienen `Costo total = 2 × Costo Serv` ($92.252 = 2 × $46.126).  
**Origen:** Observado en SAN JUAN 202601.xlsx: todos los registros tipo "Instalación-Desinstalación" tienen costo total = doble del correctivo.  
**Automatizable:** Sí.  
**Complejidad:** Baja.  
**Estado:** *Confirmado para SAN JUAN. Requiere validar si aplica en otros PSTs.*

---

### RN003 — Pre-Correctivos se facturan a $0,01
**Descripción:** Los servicios tipo "Pre-Correctivo" (pickup de equipos en depósitos) tienen `Costo Serv = $0,01` y generan una liquidación separada con sufijo `_preco`.  
**Origen:** Confirmado en `liquidacion_3719-2_20260209_preco.xls`.  
**Automatizable:** Sí.  
**Complejidad:** Baja.  
**Estado:** *Confirmado por evidencia.*

---

### RN004 — Viático aplica cuando KMs > 30
**Descripción:** Solo se cobran kilómetros de viaje cuando la distancia desde el SPST a la sucursal supera 30 km.  
**Origen:** Fórmula en TABLA KMS: `=IF(Kms>30,"Si","No")`.  
**Automatizable:** Sí.  
**Complejidad:** Baja.  
**Estado:** *Confirmado por evidencia.*

---

### RN005 — Umbral de viático variable según cliente/zona
**Descripción:** Para algunas combinaciones específicas el umbral es diferente a 30 km. Observado en PERTEX: Aeropuerto Santa Fe tiene umbral 20 km: `=IF(I6>20,"Si","No")`.  
**Origen:** Fórmula en TABLA KMS PERTEX, fila "Aeropuerto Santa Fe".  
**Automatizable:** Sí — el umbral debe ser configurable por par Empresa-Sucursal.  
**Complejidad:** Media.  
**Estado:** *Confirmado para PERTEX. Requiere auditar si existen más excepciones en otros PSTs.*

---

### RN006 — Rutas compartidas: KMs no se duplican
**Descripción:** Cuando en un mismo recorrido se atienden múltiples incidentes (misma ruta), los kilómetros se asignan al primer incidente y los demás van a $0.  
**Origen:** Fórmulas de suma en hoja VIATICOS de PENTACOM: filas agrupan incidentes de la misma fecha/ruta con `=SUM(M17:M18)`.  
**Automatizable:** Parcialmente — requiere identificar misma fecha, mismo SPST, misma zona.  
**Complejidad:** Alta.  
**Estado:** *Confirmado por evidencia. La lógica exacta de agrupación requiere validación.*

---

### RN007 — KMs de la TABLA KMS son preacordados y no se modifican por el prestador
**Descripción:** El prestador NO puede cargar KMs distintos a los de la TABLA KMS. Si cobra KMs, deben coincidir exactamente con los KMs registrados en la tabla.  
**Origen:** La columna `Dif` en VIATICOS detecta discrepancias: `=KMs_tabla - KMs_cobrados`.  
**Automatizable:** Sí — comparación directa.  
**Complejidad:** Baja.  
**Estado:** *Confirmado por evidencia (columna Dif).*

---

### RN008 — Incidente no puede aparecer duplicado en la misma liquidación
**Descripción:** Un número de incidente solo puede aparecer una vez por liquidación.  
**Origen:** Lógica implícita; hoja SERVICIOS sirve como historial para detectar cobros anteriores.  
**Automatizable:** Sí.  
**Complejidad:** Baja.  
**Estado:** *Inferido. Requiere validación si se acepta el mismo incidente en múltiples liquidaciones del mismo mes (ej: preco + regular).*

---

### RN009 — Centro Cívico (San Juan) tiene liquidación separada a $0,01
**Descripción:** Los servicios al "CENTRO CIVICO" del Gobierno de San Juan se facturan a $0,01 en una liquidación separada con sufijo `_CC`.  
**Origen:** Confirmado en `liquidacion_3720-8_20260209_CC.xls`.  
**Automatizable:** Sí.  
**Complejidad:** Baja.  
**Estado:** *Confirmado por evidencia.*

---

### RN010 — Tarifa Preventivo ≈ 50% del Correctivo
**Descripción:** En todos los PSTs observados, el costo del servicio preventivo es aproximadamente la mitad del correctivo.  
**Origen:** PENTACOM: $26.832 / $58.042 ≈ 46%. PERTEX: $28.287 / $56.596 = 50%. SAN JUAN: $23.073 / $46.126 = 50%.  
**Automatizable:** Sí — validar ratio por PST y período.  
**Complejidad:** Baja.  
**Estado:** *Confirmado por evidencia. Requiere tabla de tarifas con valores exactos.*

---

### RN011 — Costo Km varía por PST pero no por cliente
**Descripción:** El costo por kilómetro es uniforme para todos los clientes dentro del mismo PST, pero distinto entre PSTs.  
**Origen:** Observado en liquidaciones: PENTACOM: $649,53/km; PERTEX: $684,20/km; SAN JUAN: $633,30/km; INFOMAC: $595,60/km.  
**Automatizable:** Sí.  
**Complejidad:** Baja.  
**Estado:** *Confirmado por evidencia.*

---

### RN012 — Preventivos sin viático cuando están dentro de ciudad
**Descripción:** Los servicios preventivos en sucursales cercanas (< 30 km) no generan cobro de KMs.  
**Origen:** Múltiples preventivos en liquidaciones PERTEX con Cant. Km = 0 y Total viaje = $0.  
**Automatizable:** Sí.  
**Complejidad:** Baja.  
**Estado:** *Confirmado por evidencia.*

---

### RN013 — INFOMAC tiene tarifas distintas por zona geográfica
**Descripción:** INFOMAC atiende dos zonas con tarifas distintas: Villa Mercedes ($49.116) y Gral. Roca / Neuquén / Cipolletti ($52.534).  
**Origen:** Planilla INFOMAC 202601.xlsx: secciones "Correctivos - Villa Mercedes" vs. "Correctivos - General Roca - Rio Negro - Neuquen - Cipoletti".  
**Automatizable:** Sí — tarifa por zona dentro del PST.  
**Complejidad:** Media.  
**Estado:** *Confirmado por evidencia.*

---

### RN014 — SLA puede generar descuentos
**Descripción:** El incumplimiento del SLA (tiempo de resolución) puede generar descuentos en el monto a cobrar.  
**Origen:** SLA PENTACOM 2025-2026.xlsx: columnas `HorasVencido`, `DescuentoOperaFeriados`, `DescuentoOPFS` con valores no nulos.  
**Automatizable:** Parcialmente — requiere lógica de cálculo de descuento por SLA.  
**Complejidad:** Alta.  
**Estado:** *Confirmado que existen descuentos. La fórmula de cálculo no fue identificada. Requiere validación.*

---

### RN015 — INFOMAC agrupa múltiples secciones con totales parciales
**Descripción:** La planilla INFOMAC contiene múltiples secciones con sub-totales y referencias a tarifas en celdas remotas de la misma planilla (ej: `G17*E197`).  
**Origen:** Fórmulas en hoja ENERO de INFOMAC 202601.xlsx.  
**Automatizable:** Sí, una vez mapeadas todas las zonas.  
**Complejidad:** Alta.  
**Estado:** *Confirmado que existen múltiples secciones. Estructura completa requiere validación.*

---

### RN016 — Equipos escolares de San Juan tienen KMs por número de serie
**Descripción:** Para "Gobierno de San Juan" (escuelas), los KMs no se determinan por nombre de sucursal sino por el número de serie del equipo, ya que cada equipo está en una escuela específica.  
**Origen:** Hoja KMS GSJ + TABLA KMS DE DAVID. Fórmulas en hoja ENERO: `=VLOOKUP(E7, TABLAKMS23, 7, FALSE)`.  
**Automatizable:** Sí — lookup por Nro. Serie.  
**Complejidad:** Media.  
**Estado:** *Confirmado por evidencia.*

---

## ENTREGABLE 5 — FÓRMULAS Y CÁLCULOS

| ID | Fórmula | Propósito | Variables | PSTs |
|---|---|---|---|---|
| F01 | `=Cant.Km × Costo.Km` | Costo de viaje | Cant.Km, Costo Km | Todos |
| F02 | `=Costo.Serv + Total.viaje` | Costo total del incidente | Costo Serv, Total viaje | Todos |
| F03 | `=IF(Kms > 30, "Si", "No")` | Determinar si aplica viático | Kms recorrido (TABLA KMS) | Todos |
| F04 | `=IF(Aplica = "si", Kms, 0)` | Kms a facturar | Aplica viático, Kms recorrido | Todos |
| F05 | `=KMs_tabla - KMs_cobrados` | Diferencia para validación | KMs tabla vs. KMs en liquidación | PENTACOM, PERTEX |
| F06 | `=VLOOKUP(Nro.Serie, TABLAKMS23, 7, FALSE)` | Obtener KMs por número de serie | Nro. Serie, TABLA KMS 2023 | SAN JUAN |
| F07 | `=VLOOKUP(Nro.Serie, TABLAKMS23, 4, FALSE)` | Obtener Localidad por número de serie | Nro. Serie, TABLA KMS 2023 | SAN JUAN |
| F08 | `=VLOOKUP(Nro.Serie, domicilio, 2, FALSE)` | Obtener domicilio del cliente | Nro. Serie, tabla domicilio | SAN JUAN |
| F09 | `=SUM(Cant.Km grupo)` | Sumar KMs de incidentes agrupados por ruta compartida | Grupo de incidentes | PENTACOM |
| F10 | `=IF(Kms > 20, "Si", "No")` | Viático con umbral 20 km (excepción) | Kms recorrido | PERTEX (Aerop. SF) |

**Fórmulas repetidas / lógica duplicada:**
- F01 y F02 presentes en los 4 PSTs con variaciones menores en referencias de columna.
- F03 y F04 presentes en todas las TABLA KMS con columnas distintas por PST.
- La lógica `Costo total = Costo Serv + (Cant.Km × Costo Km)` es idéntica en todos los PSTs.

---

## ENTREGABLE 6 — MAPA DEL PROCESO AS-IS

```
[PRESTADOR]                 [SISTEMA WEB]           [TEAM LEADER]
     │                           │                        │
     ▼                           │                        │
Cierra incidentes               │                        │
en app web          ◄───────────┤                        │
     │                           │                        │
     ▼                           │                        │
Genera preliquidación           │                        │
en app web          ────────────►                        │
     │                           │                        │
     ▼                           │                        │
Exporta CSV         ─── liquidacion_XXXX.xls ──────────►│
                                 │                        │
                                 │               Copia datos CSV
                                 │               a planilla Excel
                                 │               del PST
                                 │                        │
                                 │               VALIDACIONES MANUALES:
                                 │               • ¿Costo Serv correcto?
                                 │               • ¿KMs = TABLA KMS?
                                 │               • ¿Viático aplica?
                                 │               • ¿Duplicados?
                                 │               • ¿Rutas compartidas?
                                 │               • ¿Tipo correcto?
                                 │                        │
                                 │               ¿INCONSISTENCIAS?
                                 │                SI │    │ NO
                                 │                   ▼    │
                                 │           Solicita     │
                                 │           corrección   │
                                 │           al PST       │
                                 │               │        │
                          [PRESTADOR]            │        │
                        corrige en app           │        │
                        y re-exporta   ──────────┘        │
                                                          ▼
                                              Autoriza facturación
                                                          │
                                          [PRESTADOR] emite factura PDF
                                                          │
                                          Adjunta factura + liquidación
                                          (merged PDF para archivo)
```

**Actores:** Prestador · Sistema Web · Team Leader  
**Archivos en uso:** `liquidacion_XXXX.xls` → `EMPRESA YYYYMM.xlsx` → Factura PDF → `_merged.pdf`

---

## ENTREGABLE 7 — MATRIZ DE VALIDACIONES

| ID | Validación | Fuente de datos | Automática | Manual | Complejidad |
|---|---|---|---|---|---|
| V01 | Costo de servicio correcto según tipo | Tabla de tarifas por PST y período | **Sí** | No | Baja |
| V02 | Costo KM correcto según PST y período | Tabla de tarifas KM por PST | **Sí** | No | Baja |
| V03 | Kilómetros cobrados = kilómetros en TABLA KMS | TABLA KMS + Incidente | **Sí** | No | Media |
| V04 | Viático aplica solo cuando KMs > umbral | TABLA KMS | **Sí** | No | Baja |
| V05 | KMs = 0 cuando no aplica viático | TABLA KMS | **Sí** | No | Baja |
| V06 | Incidente duplicado en la misma liquidación | Liquidación actual | **Sí** | No | Baja |
| V07 | Incidente ya cobrado en liquidación anterior del mismo PST | Historial SERVICIOS | **Sí** | No | Media |
| V08 | Instalación-Desinstalación facturada al doble en San Juan | Tipo + PST | **Sí** | No | Baja |
| V09 | Pre-Correctivo facturado a $0,01 | Tipo + PST | **Sí** | No | Baja |
| V10 | Centro Cívico (San Juan) facturado a $0,01 | Tipo + Cliente + PST | **Sí** | No | Baja |
| V11 | Par Empresa+Sucursal existe en TABLA KMS | TABLA KMS | **Sí** | No | Media |
| V12 | Nro. Serie existe en TABLA KMS (San Juan escuelas) | KMS GSJ + TABLA KMS DE DAVID | **Sí** | No | Media |
| V13 | Ruta compartida (mismos KMs cobrados múltiples veces el mismo día) | Historial VIATICOS | Parcial | **Sí** | Alta |
| V14 | Cantidad = 1 por incidente | Columna Cantidad | **Sí** | No | Baja |
| V15 | Fecha cierre corresponde al período facturado | Fecha Cierre + Período | **Sí** | No | Baja |
| V16 | Tipo de servicio correcto (no inflar precio) | Sistema origen | Parcial | **Sí** | Alta |
| V17 | SLA cumplido (si no → aplicar descuento) | SLA PENTACOM | Parcial | **Sí** | Alta |
| V18 | P.IT = SI en todos los registros | Campo P.IT del CSV | **Sí** | No | Baja |
| V19 | Tarifas vigentes en el período correcto | Tabla de tarifas con fechas de vigencia | **Sí** | No | Media |
| V20 | INFOMAC: tarifa correcta según zona | Zona del SPST | **Sí** | No | Media |

---

## ENTREGABLE 8 — DOLOR OPERATIVO ACTUAL

| Actividad / Riesgo | Descripción | Impacto |
|---|---|---|
| Copiar datos manualmente del CSV al Excel | La TL copia los datos del .xls al Excel del PST, con riesgo de errores de transcripción | **ALTO** |
| Verificación manual de KMs contra TABLA KMS | Para cada incidente con KMs, la TL busca el par en la tabla y compara manualmente | **ALTO** |
| TABLA KMS desactualizada | Si se agrega una nueva sucursal y no se actualiza la tabla, el control falla silenciosamente | **ALTO** |
| Conocimiento concentrado en la TL | Reglas de rutas compartidas, excepciones de umbral, y lógica de San Juan solo las conoce la TL | **ALTO** |
| Múltiples liquidaciones por PST (San Juan) | San Juan genera 2-4 liquidaciones por mes que deben consolidarse | **ALTO** |
| Detección de rutas compartidas | Requiere que la TL recuerde o consulte el historial de VIATICOS para detectar cobros duplicados de ruta | **ALTO** |
| Actualizaciones de tarifas sin registro formal | No hay tabla de tarifas vigentes centralizada; la TL debe saber qué tarifa aplica a cada período | **ALTO** |
| "TABLA KMS DE DAVID" | Datos de escuelas mantenidos por una persona específica. Riesgo de desactualización | **ALTO** |
| Excel diferente por PST | Cada PST tiene su propio Excel con estructura parcialmente distinta | **MEDIO** |
| Ciclos de corrección sin trazabilidad | No hay registro formal de correcciones solicitadas ni historial de versiones | **MEDIO** |
| Archivos PDF combinados manualmente | El merged PDF se genera con herramienta externa (ilovepdf) | **BAJO** |
| Pedidos de repuesto en mismo repositorio | Los .xls de repuestos están mezclados con liquidaciones | **BAJO** |

---

## ENTREGABLE 9 — OPORTUNIDADES DE AUTOMATIZACIÓN

| Validación | ¿Automatizable? | Justificación |
|---|---|---|
| V01 — Costo servicio correcto | **Completamente** | Solo requiere tabla de tarifas por PST/tipo/período |
| V02 — Costo KM correcto | **Completamente** | Solo requiere tabla de tarifas KM por PST/período |
| V03 — KMs = TABLA KMS | **Completamente** | Lookup directo Empresa+Sucursal+SPST → KMs |
| V04 — Viático aplica | **Completamente** | IF(KMs > umbral) donde umbral es configurable |
| V05 — KMs = 0 sin viático | **Completamente** | Derivado de V04 |
| V06 — Duplicado en liquidación | **Completamente** | GROUP BY incidente + COUNT |
| V07 — Incidente ya cobrado | **Completamente** | Lookup en historial de servicios procesados |
| V08 — Doble en instalación SJ | **Completamente** | Regla por PST + tipo de servicio |
| V09 — Preco a $0,01 | **Completamente** | Regla por tipo de servicio |
| V10 — CC a $0,01 | **Completamente** | Regla por tipo + cliente + PST |
| V11 — Par existe en TABLA KMS | **Completamente** | Lookup + alerta si no existe |
| V12 — Serie en KMS GSJ | **Completamente** | Lookup por Nro. Serie |
| V13 — Rutas compartidas | **Parcialmente** | Misma fecha + mismo SPST + misma localidad es detectable; decisión final puede requerir supervisión |
| V14 — Cantidad = 1 | **Completamente** | Validación de campo |
| V15 — Fecha en período | **Completamente** | Comparación fecha vs. período de liquidación |
| V16 — Tipo correcto | **Manual** | Requiere conocimiento del contexto del servicio |
| V17 — SLA y descuentos | **Parcialmente** | Cálculo automatizable una vez mapeada la fórmula |
| V18 — P.IT = SI | **Completamente** | Filtro de campo |
| V19 — Tarifas período correcto | **Completamente** | Requiere tabla de tarifas con fechas de vigencia |
| V20 — Zona INFOMAC | **Completamente** | Regla por zona del SPST |

**Estimación de cobertura automática:** ~85% completamente automatizable. El 15% restante (rutas compartidas y tipo correcto) puede detectarse como alerta para revisión manual.

---

## ENTREGABLE 10 — MODELO DE DATOS PRELIMINAR (Conceptual)

```
PST ──(1:N)── SPST
 │
 └──(1:N)── Liquidacion ──(1:N)── LineaLiquidacion ──(N:1)── Incidente
                                                                   │
                                                            Empresa (Cliente)
                                                                   │
                                                               Sucursal

TablaKMS: (Empresa + Sucursal + SPST) → KMs + umbral + aplica_viatico

Tarifa: (PST + TipoServicio + Zona + VigenciaDesde + VigenciaHasta) → CostoServ + CostoKm

SerieLocalidad (solo San Juan): NroSerie → Sector → Localidad → KMs
```

### Entidades y atributos principales

**PST:** id, nombre, nombre_excel, region, cuit, domicilio_base  
**SPST:** id, id_pst, nombre, domicilio, localidad, provincia  
**Empresa:** id, nombre  
**Sucursal:** id, id_empresa, nombre, domicilio, localidad, provincia  
**Incidente:** id (NN-NNNNNN), tipo, id_empresa, id_sucursal, nro_serie, fecha_cierre, periodo, rubro, pasa_IT  
**Liquidacion:** id (NNNN-N), id_pst, periodo, tipo_liquidacion, fecha_exportacion, estado  
**LineaLiquidacion:** id, id_liquidacion, id_incidente, costo_serv, cant_km, costo_km, total_viaje, costo_total, estado_validacion  
**TablaKMS:** id, id_empresa, id_sucursal, id_spst, kms_recorrido, umbral_viatico, aplica_viatico, kms_a_facturar, url_maps  
**Tarifa:** id, id_pst, tipo_servicio, zona, costo_servicio, costo_km, vigencia_desde, vigencia_hasta  
**SerieLocalidad:** nro_serie, sector, localidad, kms *(solo San Juan)*

---

## ENTREGABLE 11 — REQUERIMIENTOS PARA FUTURA APLICACIÓN

### Módulos necesarios

| Módulo | Descripción |
|---|---|
| Gestión de PSTs y SPSTs | ABM de prestadores y sub-prestadores con datos y zonas |
| Tabla KMS | ABM de pares Empresa+Sucursal+SPST con KMs y umbral de viático |
| Tabla de Tarifas | Tarifas por PST + tipo de servicio + zona + período de vigencia |
| Procesamiento de Liquidaciones | Carga del CSV, parseo automático e ingesta |
| Motor de Validación | Ejecución automática de todas las reglas sobre una liquidación |
| Panel de Revisión | Visualización de resultados: errores, alertas, OKs por incidente |
| Gestión de Correcciones | Registro de correcciones solicitadas al PST y su historial |
| Historial de Servicios | Almacenamiento de servicios procesados para validación cruzada |
| Autorización de Facturación | Flujo de aprobación de la TL |
| Reportes | Resúmenes por PST/período, métricas de errores frecuentes |

### Pantallas necesarias

| Pantalla | Descripción |
|---|---|
| Dashboard principal | Estado de liquidaciones del período actual por PST |
| Carga de liquidación | Upload del CSV + selección de PST + período |
| Detalle de validación | Lista de incidentes con resultado de cada regla (OK / Error / Alerta) |
| TABLA KMS | Vista y edición de la tabla de kilómetros |
| Tarifas | Vista y edición de tarifas por PST/período |
| Historial de liquidaciones | Búsqueda por PST, período, estado |
| Configuración de reglas | Activar/desactivar validaciones, configurar umbrales |
| Gestión de correcciones | Solicitudes de corrección al PST y seguimiento |

### Configuraciones necesarias
- Umbral de viático por par Empresa+Sucursal (default 30 km, excepciones configurables)
- Tarifas por PST + tipo + zona + vigencia
- Reglas especiales por PST (doble instalación SJ, preco $0,01, CC $0,01, INFOMAC zonas)
- Calendario de períodos de facturación

### Roles necesarios

| Rol | Permisos |
|---|---|
| Team Leader | Cargar liquidaciones, revisar validaciones, aprobar/rechazar, solicitar correcciones |
| Administrador | Gestionar PSTs, SPSTs, TABLA KMS, tarifas, reglas |
| Prestador (futuro) | Acceso a su propia preliquidación y estado |
| Solo lectura | Consulta de historial y reportes |

---

## ENTREGABLE 12 — RIESGOS DE IMPLEMENTACIÓN

| Riesgo | Descripción | Nivel |
|---|---|---|
| TABLA KMS desactualizada | Al migrar, si hay pares faltantes las validaciones de KMs fallarán silenciosamente | **ALTO** |
| "TABLA KMS DE DAVID" | Tabla de escuelas de San Juan mantenida por una persona específica, sin proceso formal de actualización | **ALTO** |
| Regla de rutas compartidas no documentada | La lógica exacta de cuándo dos incidentes comparten ruta no está explicitada en ningún documento | **ALTO** |
| Excepciones de umbral viático | Solo se detectó una excepción (Aeropuerto Santa Fe: 20 km). Pueden existir más no visibles en los datos analizados | **MEDIO** |
| Lógica de descuentos por SLA | El archivo SLA muestra descuentos calculados pero la fórmula no fue encontrada en los Excel analizados | **MEDIO** |
| Múltiples tarifas históricas | La hoja SERVICIOS acumula incidentes desde 2021 con tarifas distintas; mapear la vigencia puede ser complejo | **MEDIO** |
| Estructura INFOMAC incompleta | Referencias a celdas remotas (ej: `E197`, `E199`) que contienen configuración no completamente visible | **MEDIO** |
| Nomenclatura inconsistente | El mismo concepto tiene nombres distintos en cada Excel (TABLA KMS vs. TABLA KMS 2023 vs. TABLA KMS DE DAVID vs. KMS ABRIL) | **MEDIO** |
| San Juan: múltiples liquidaciones por mes | La lógica de consolidación de las 2-4 liquidaciones no está documentada formalmente | **MEDIO** |
| Campo P.IT desconocido | El campo "P.IT" está siempre en "SI" en los datos analizados; no se encontraron casos con "NO" ni su lógica | **MEDIO** |
| Pedidos de repuesto | Los .xls de pedidos tienen formato HTML vacío. Su proceso es completamente distinto a la liquidación | **BAJO** |
| PERTEX vs. Supernova | El Excel de Rosario usa "PERTEX" en lugar del nombre de la empresa. El origen no está documentado | **BAJO** |

---

## CLASIFICACIÓN DE CONCLUSIONES

| Categoría | Ejemplos |
|---|---|
| **Confirmadas por evidencia** | Estructura de 4 hojas por PST, fórmulas de cálculo de viático, doble tarifa instalación SJ, preco $0,01, CC $0,01, tarifas por tipo, KMs por TABLA KMS, umbral 30 km general, umbral 20 km PERTEX Aerop. SF, múltiples SPSTs en PENTACOM |
| **Inferidas** | Proceso de copia manual del CSV al Excel, ciclo de corrección al PST, lógica completa de rutas compartidas, criterio de agrupación de incidentes por fecha/zona, estructura completa de zonas INFOMAC |
| **Requieren validación con usuario** | Significado exacto de P.IT, fórmula de descuento por SLA, por qué el Excel de Rosario se llama PERTEX, estructura completa de tarifas históricas, existencia de otras excepciones de umbral, proceso de consolidación de múltiples liquidaciones San Juan, contenido y vigencia de "KMS ABRIL" |

---

*Documento generado mediante ingeniería inversa de archivos reales correspondientes a enero–mayo 2026.*  
*Toda regla de negocio inferida debe ser validada con la Team Leader antes de iniciar el diseño técnico de la solución.*

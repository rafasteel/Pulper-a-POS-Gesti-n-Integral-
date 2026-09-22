# 🏪 Pulpería POS & Gestión Integral

Sistema integral de Punto de Venta (POS), Control de Inventario Multimodal, Libreta de Fiados (Crédito), Control de Caja Ciego y Copiloto de IA diseñado especialmente para Pulperías, Minimarkets y Tiendas de Conveniencia.

Desarrollado con **React 19 + TypeScript + Vite + Tailwind CSS v4** y arquitectura de base de datos relacional para **Supabase (PostgreSQL 15+)**.

---

## 🚀 Características Principales

1. **Punto de Venta (POS) Táctil & Cero Latencia:**
   - Atajos de teclado: `F12` (Cobrar), `F6` (Pausar ticket en espera), `F2` (Lector código de barras USB).
   - Botones táctiles grandes y selector de presentaciones directas en tarjeta (ej. *Unidad*, *Six-Pack*, *Caja x 24*).
   - Apertura simulada de gaveta de dinero y cálculo de cambio en vivo.

2. **📱 Escáner Móvil Inalámbrico con Código QR:**
   - La caja genera un código QR dinámico.
   - Cualquier teléfono en la tienda o almacén abre la interfaz de escáner cámara, activa linterna, vibración háptica (`navigator.vibrate`) y envía instantáneamente los códigos escaneados a la caja mediante **Supabase Realtime**.

3. **📦 Inventario Base & Presentaciones Múltiples:**
   - Lógica de conversión de unidades: Vender 1 caja descuenta automáticamente 24 unidades base del stock.
   - Historial inmutable de movimientos (**Kardex** automático).

4. **💵 Control de Caja & Arqueo Ciego:**
   - Fondo inicial de sencillo y registro de entradas/salidas de efectivo.
   - **Arqueo Ciego:** El cajero cuenta billetes y monedas por denominación sin ver el saldo esperado; al enviar, el sistema calcula automáticamente si hay sobrante o faltante.

5. **🤝 Libreta de Fiados (Cuentas por Cobrar):**
   - Control de límites de crédito y bloqueo por mora.
   - Registro de abonos parciales o totales.
   - Envío de comprobantes y recordatorios formateados para **WhatsApp** con un solo clic.

6. **🔍 Kiosco Verificador de Precios:**
   - Pantalla limpia y de tipografía grande para que clientes o colaboradores escaneen y vean precios y promociones activas.

7. **📋 Conteo Físico & Auditoría:**
   - Modo de auditoría móvil para contrastar inventario contado vs. sistema con cálculo de diferencias y aprobación por PIN.

8. **🤖 Copiloto Inteligente (IA Analytics):**
   - Detección de capital inmovilizado en mercadería de baja rotación.
   - Alertas de productos críticos para pedido al repartidor.
   - Asistente tipo chat para consultar ganancias y métricas del negocio.

---

## 🗄️ Esquema de Base de Datos Supabase

El script SQL completo para la base de datos se encuentra en:
```
supabase/schema.sql
```
Incluye:
- 25+ tablas normalizadas.
- Políticas de seguridad por fila (**Row Level Security - RLS**).
- Triggers PL/pgSQL para actualización atómica del inventario base y Kardex.
- Vistas analíticas para Dashboard y el Copiloto IA.

---

## 🛠️ Instalación y Ejecución Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/rafasteel/Pulper-a-POS-Gesti-n-Integral-.git

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Compilar para producción
npm run build
```

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

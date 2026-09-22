export type RoleCode = 'superadmin' | 'propietario' | 'administrador' | 'cajero' | 'bodeguero' | 'contador';

export type SubscriptionStatus = 'activa' | 'suspendida' | 'prueba' | 'vencida';
export type SubscriptionPlan = 'basico' | 'pro' | 'empresarial';

export interface SaaSTenant {
  id: string;
  nombre: string;
  nombreComercial?: string;
  subdominio?: string;
  propietarioNombre: string;
  email: string;
  telefono: string;
  whatsapp?: string;
  direccion?: string;
  estadoSuscripcion: SubscriptionStatus;
  plan: SubscriptionPlan;
  precioMensual: number;
  fechaVencimiento: string;
  limiteSucursales: number;
  limiteUsuarios: number;
  creadoEn: string;
}

export interface UserProfile {
  id: string;
  nombre: string;
  apellido: string;
  rol: RoleCode;
  sucursalId?: string;
  negocioId?: string;
  avatarUrl?: string;
  pin: string;
}

export interface Category {
  id: string;
  nombre: string;
  icono: string;
  color: string;
}

export interface ProductPresentation {
  id: string;
  productoId: string;
  nombre: string; // ej. "Unidad", "Six-Pack", "Caja x 24"
  factorConversion: number; // Factor contra unidad base (1, 6, 24, etc.)
  codigoBarras: string;
  precioCosto: number;
  precioVenta: number;
  precioMayoreo?: number;
  esPresentacionBase: boolean;
  activo: boolean;
}

export interface Product {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion?: string;
  unidadMedidaBase: string; // 'unidad', 'libra', 'kg', 'litro'
  permiteDecimales: boolean;
  esFavorito: boolean;
  stockMinimo: number;
  stockMaximo: number;
  perecedero: boolean;
  fechaVencimientoProxima?: string;
  imagenUrl?: string;
  presentaciones: ProductPresentation[];
  existenciaBase: number; // Stock actual en unidades base
}

export interface CartItem {
  id: string; // unique item cart row id
  producto: Product;
  presentacion: ProductPresentation;
  cantidad: number;
  precioUnitario: number;
  descuentoUnitario: number;
  subtotal: number;
  costoUnitarioBase: number;
}

export interface PaymentRecord {
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia' | 'fiado' | 'mixto';
  monto: number;
  montoRecibido?: number;
  cambio?: number;
  referencia?: string;
}

export interface Sale {
  id: string;
  numeroTicket: string;
  fechaHora: string;
  clienteId?: string;
  clienteNombre?: string;
  cajeroId: string;
  cajeroNombre: string;
  tipoVenta: 'contado' | 'credito_fiado' | 'mixto';
  items: CartItem[];
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  costoTotal: number;
  utilidadEstimada: number;
  pagos: PaymentRecord[];
  estado: 'completada' | 'anulada' | 'en_espera';
  notas?: string;
}

export interface Customer {
  id: string;
  nombre: string;
  apodo?: string;
  cedula?: string;
  telefono?: string;
  whatsapp?: string;
  direccion?: string;
  limiteCredito: number;
  saldoDeudorActual: number;
  plazoDias: number;
  bloqueadoPorMora: boolean;
  activo: boolean;
}

export interface CreditPayment {
  id: string;
  clienteId: string;
  fecha: string;
  monto: number;
  metodoPago: 'efectivo' | 'transferencia';
  referencia?: string;
  notas?: string;
  saldoRestante: number;
}

export interface CashRegister {
  id: string;
  nombre: string;
  codigo: string;
  estado: 'abierta' | 'cerrada';
  aperturaActual?: {
    id: string;
    usuarioId: string;
    usuarioNombre: string;
    fechaApertura: string;
    montoInicial: number;
  };
}

export interface CashMovement {
  id: string;
  aperturaId: string;
  tipo: 'entrada_efectivo' | 'retiro_gasto' | 'retiro_deposito';
  monto: number;
  motivo: string;
  usuarioNombre: string;
  fecha: string;
}

export interface CashClosingReport {
  id: string;
  aperturaId: string;
  cajeroNombre: string;
  fechaCierre: string;
  montoInicial: number;
  montoDeclaradoEfectivo: number;
  montoEsperadoEfectivo: number;
  diferenciaEfectivo: number; // declarado - esperado
  totalVentasEfectivo: number;
  totalVentasTarjeta: number;
  totalVentasTransferencia: number;
  totalVentasFiado: number;
  totalEntradasExtra: number;
  totalRetirosGastos: number;
  totalAbonosFiado: number;
  desgloseBilletes?: Record<string, number>;
  notas?: string;
}

export interface KardexMovement {
  id: string;
  fecha: string;
  productoId: string;
  productoNombre: string;
  tipo: 'venta' | 'compra' | 'ajuste_positivo' | 'ajuste_negativo' | 'merma' | 'conteo_fisico';
  cantidadBase: number;
  saldoAnterior: number;
  saldoNuevo: number;
  costoUnitarioBase: number;
  referencia: string;
  usuario: string;
}

export interface PhysicalCountItem {
  productoId: string;
  productoNombre: string;
  presentacionNombre: string;
  codigoBarras: string;
  stockSistemaBase: number;
  stockContadoBase: number;
  diferencia: number;
  estado: 'pendiente' | 'contado';
}

export interface OperationalExpense {
  id: string;
  fecha: string;
  categoria: string;
  descripcion: string;
  monto: number;
  pagadoDesdeCaja: boolean;
  usuarioNombre: string;
  comprobanteUrl?: string;
}

export interface BusinessConfig {
  nombreNegocio: string;
  nombreComercial: string;
  monedaSimbolo: string;
  monedaCodigo: string;
  telefono: string;
  direccion: string;
  mensajeTicket: string;
  impuestoPorcentaje: number;
  sonidoEscanerActivo: boolean;
  vibracionActiva: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

import { Category, Product, Customer, UserProfile, CashRegister, BusinessConfig, SaaSTenant } from '../types';

export const INITIAL_TENANTS: SaaSTenant[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Pulpería La Bendición',
    nombreComercial: 'Minimarket & Pulpería La Bendición',
    propietarioNombre: 'Don Manuel González',
    email: 'contacto@labendicion.com',
    telefono: '+505 8899-7766',
    whatsapp: '50588997766',
    direccion: 'De la Iglesia El Carmen 2c. al Sur, 1/2c. Abajo',
    estadoSuscripcion: 'activa',
    plan: 'pro',
    precioMensual: 25.00,
    fechaVencimiento: '2027-12-31',
    limiteSucursales: 2,
    limiteUsuarios: 5,
    creadoEn: '2026-01-10',
  },
  {
    id: '22222222-2222-2222-2222-222222222221',
    nombre: 'Minimarket El Ahorro',
    nombreComercial: 'El Ahorro Express',
    propietarioNombre: 'Carlos Morales',
    email: 'carlos@elahorro.com',
    telefono: '+505 8711-2233',
    whatsapp: '50587112233',
    direccion: 'Frente a la rotonda El Güegüense',
    estadoSuscripcion: 'suspendida',
    plan: 'basico',
    precioMensual: 15.00,
    fechaVencimiento: '2026-09-01',
    limiteSucursales: 1,
    limiteUsuarios: 2,
    creadoEn: '2026-02-15',
  },
  {
    id: '33333333-3333-3333-3333-333333333331',
    nombre: 'Abarrotes Doña Julia',
    nombreComercial: 'Tienda Doña Julia',
    propietarioNombre: 'Julia Mendoza',
    email: 'julia@abarrotes.com',
    telefono: '+505 8655-4433',
    whatsapp: '50586554433',
    direccion: 'Barrio San José, terminal de buses',
    estadoSuscripcion: 'prueba',
    plan: 'basico',
    precioMensual: 15.00,
    fechaVencimiento: '2026-09-29',
    limiteSucursales: 1,
    limiteUsuarios: 2,
    creadoEn: '2026-09-15',
  },
];

export const INITIAL_CONFIG: BusinessConfig = {
  nombreNegocio: 'Pulpería La Bendición',
  nombreComercial: 'Minimarket & Pulpería La Bendición',
  monedaSimbolo: 'C$',
  monedaCodigo: 'NIO',
  telefono: '+505 8899-7766',
  direccion: 'De la Iglesia El Carmen 2c. al Sur, 1/2c. Abajo',
  mensajeTicket: '¡Gracias por apoyar a su pulpería de confianza! Dios bendiga su hogar.',
  impuestoPorcentaje: 0.00,
  sonidoEscanerActivo: true,
  vibracionActiva: true,
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'u0000000-0000-0000-0000-000000000001',
    nombre: 'Super Admin',
    apellido: '(Vendor SaaS)',
    rol: 'superadmin',
    pin: '9999',
  },
  {
    id: 'u0000000-0000-0000-0000-000000000002',
    nombre: 'Don Manuel',
    apellido: 'González',
    rol: 'propietario',
    sucursalId: '11111111-1111-1111-1111-111111111112',
    negocioId: '11111111-1111-1111-1111-111111111111',
    pin: '1234',
  },
  {
    id: 'u0000000-0000-0000-0000-000000000003',
    nombre: 'Rosa',
    apellido: 'Martínez',
    rol: 'cajero',
    sucursalId: '11111111-1111-1111-1111-111111111112',
    negocioId: '11111111-1111-1111-1111-111111111111',
    pin: '2222',
  },
  {
    id: 'u-3',
    nombre: 'Carlos',
    apellido: 'Rivas',
    rol: 'bodeguero',
    sucursalId: '11111111-1111-1111-1111-111111111112',
    negocioId: '11111111-1111-1111-1111-111111111111',
    pin: '3333',
  },
  {
    id: 'u-4',
    nombre: 'Lic. Morales',
    apellido: 'Contador',
    rol: 'contador',
    sucursalId: '11111111-1111-1111-1111-111111111112',
    negocioId: '11111111-1111-1111-1111-111111111111',
    pin: '4444',
  }
];

export const INITIAL_CATEGORIES: Category[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_REGISTER: CashRegister = {
  id: '',
  nombre: 'Caja Mostrador',
  codigo: 'CAJA-01',
  estado: 'cerrada',
  aperturaActual: undefined,
};

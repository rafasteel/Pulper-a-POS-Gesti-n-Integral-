import { Category, Product, Customer, UserProfile, CashRegister, BusinessConfig, SaaSTenant } from '../types';

export const INITIAL_TENANTS: SaaSTenant[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nombre: 'Mi Pulpería Principal',
    nombreComercial: 'Mi Pulpería Principal',
    propietarioNombre: 'Administrador',
    email: 'contacto@pulperia.local',
    telefono: '+504 9999-8888',
    whatsapp: '50499998888',
    direccion: 'Barrio Central',
    estadoSuscripcion: 'activa',
    plan: 'pro',
    precioMensual: 29.00,
    fechaVencimiento: '2030-12-31',
    limiteSucursales: 5,
    limiteUsuarios: 10,
    creadoEn: '2026-01-01',
  },
];

export const INITIAL_CONFIG: BusinessConfig = {
  nombreNegocio: 'Mi Pulpería Principal',
  nombreComercial: 'Mi Pulpería Principal',
  monedaSimbolo: 'L',
  monedaCodigo: 'HNL',
  telefono: '+504 9999-8888',
  direccion: 'Barrio Central',
  mensajeTicket: '¡Gracias por su compra en nuestra pulpería!',
  impuestoPorcentaje: 0.00,
  sonidoEscanerActivo: true,
  vibracionActiva: true,
};

export const INITIAL_USERS: UserProfile[] = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    nombre: 'Super Admin',
    apellido: '(Vendor SaaS)',
    rol: 'superadmin',
    pin: '9999',
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    nombre: 'Propietario',
    apellido: 'Principal',
    rol: 'propietario',
    sucursalId: '00000000-0000-0000-0000-000000000002',
    negocioId: '00000000-0000-0000-0000-000000000001',
    pin: '1234',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    nombre: 'Cajero',
    apellido: 'Turno',
    rol: 'cajero',
    sucursalId: '00000000-0000-0000-0000-000000000002',
    negocioId: '00000000-0000-0000-0000-000000000001',
    pin: '2222',
  },
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

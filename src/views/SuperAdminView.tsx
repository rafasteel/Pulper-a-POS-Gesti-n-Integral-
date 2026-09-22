import React, { useState } from 'react';
import { 
  Building2, 
  DollarSign, 
  ShieldAlert, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ArrowRight, 
  MessageCircle, 
  Store, 
  Lock, 
  Unlock, 
  TrendingUp, 
  AlertOctagon 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SaaSTenant, SubscriptionPlan, SubscriptionStatus } from '../types';

interface SuperAdminViewProps {
  onBackToPOS: () => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onBackToPOS }) => {
  const { 
    tenants, 
    currentTenant, 
    switchTenant, 
    toggleTenantSubscription, 
    updateTenantPlan, 
    addNewTenant,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | SubscriptionStatus>('todos');
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);

  // Formulario nuevo cliente
  const [formData, setFormData] = useState({
    nombre: '',
    subdominio: '',
    propietarioNombre: '',
    email: '',
    telefono: '',
    plan: 'pro' as SubscriptionPlan,
    precioMensual: 29,
    estadoSuscripcion: 'activa' as SubscriptionStatus,
    limiteSucursales: 1,
    limiteUsuarios: 5,
  });

  // Métricas SaaS calculadas
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.estadoSuscripcion === 'activa').length;
  const trialTenants = tenants.filter(t => t.estadoSuscripcion === 'prueba').length;
  const suspendedTenants = tenants.filter(t => t.estadoSuscripcion === 'suspendida').length;
  
  // MRR (Monthly Recurring Revenue) estimado en USD
  const totalMRR = tenants
    .filter(t => t.estadoSuscripcion === 'activa')
    .reduce((sum, t) => sum + (t.precioMensual || 0), 0);

  // Filtrado de lista
  const filteredTenants = tenants.filter(t => {
    const matchesSearch = 
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.propietarioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.telefono.includes(searchTerm) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || t.estadoSuscripcion === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + 30);

    addNewTenant({
      nombre: formData.nombre,
      subdominio: formData.subdominio || formData.nombre.toLowerCase().replace(/\s+/g, '-'),
      propietarioNombre: formData.propietarioNombre,
      email: formData.email,
      telefono: formData.telefono,
      plan: formData.plan,
      precioMensual: formData.precioMensual,
      estadoSuscripcion: formData.estadoSuscripcion,
      fechaVencimiento: fechaVence.toISOString().split('T')[0],
      limiteSucursales: formData.limiteSucursales,
      limiteUsuarios: formData.limiteUsuarios,
    });

    setShowNewTenantModal(false);
    setFormData({
      nombre: '',
      subdominio: '',
      propietarioNombre: '',
      email: '',
      telefono: '',
      plan: 'pro',
      precioMensual: 29,
      estadoSuscripcion: 'activa',
      limiteSucursales: 1,
      limiteUsuarios: 5,
    });
  };

  const extendSubscription30Days = (tenant: SaaSTenant) => {
    toggleTenantSubscription(tenant.id, 'activa');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner / SaaS Admin Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  PulpoPOS SaaS • Super Administrador
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Global Master
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Plataforma de cobros, control multi-inquilino y suspensión de pulperías
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewTenantModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Nueva Pulpería Cliente
            </button>

            <button
              onClick={onBackToPOS}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Volver al POS ({currentTenant.nombre})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* KPI Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card: MRR */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">MRR Recurrente</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">${totalMRR}</span>
              <span className="text-xs text-slate-400 font-medium">/mes USD</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Ingreso mensual proyectado
            </p>
          </div>

          {/* Card: Total Negocios */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Pulperías</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-white">{totalTenants}</div>
            <p className="mt-1 text-[11px] text-slate-400">Clientes registrados</p>
          </div>

          {/* Card: Activas */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400">Suscripciones Activas</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-400">{activeTenants}</div>
            <p className="mt-1 text-[11px] text-slate-400">Acceso POS completo</p>
          </div>

          {/* Card: Pruebas */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-400">Período de Prueba</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-blue-400">{trialTenants}</div>
            <p className="mt-1 text-[11px] text-slate-400">Demostraciones en curso</p>
          </div>

          {/* Card: Suspendidas */}
          <div className="bg-slate-900/60 border border-red-500/20 rounded-xl p-4 shadow-sm bg-gradient-to-b from-red-950/20 to-transparent">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-400">Suspendidas (Mora)</span>
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-red-400">{suspendedTenants}</div>
            <p className="mt-1 text-[11px] text-red-300">Bloqueadas del sistema</p>
          </div>
        </section>

        {/* Directory Controls: Search & Tabs */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por pulpería, propietario, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(['todos', 'activa', 'prueba', 'suspendida'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab === 'todos' ? 'Todas' : tab}
              </button>
            ))}
          </div>
        </section>

        {/* Tenants Table / Cards List */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">
                Directorio de Pulperías Clientes ({filteredTenants.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Negocio actual en vista POS: <strong className="text-indigo-300">{currentTenant.nombre}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-slate-400 font-medium">
                  <th className="py-3.5 px-4">Pulpería / Cliente</th>
                  <th className="py-3.5 px-4">Propietario & Contacto</th>
                  <th className="py-3.5 px-4">Plan & Cuota</th>
                  <th className="py-3.5 px-4">Vencimiento</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-center">Acción de Control</th>
                  <th className="py-3.5 px-4 text-right">Opciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTenants.map(tenant => {
                  const isCurrent = tenant.id === currentTenant.id;
                  const isSuspended = tenant.estadoSuscripcion === 'suspendida';
                  const isTrial = tenant.estadoSuscripcion === 'prueba';
                  const isActive = tenant.estadoSuscripcion === 'activa';

                  return (
                    <tr 
                      key={tenant.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isSuspended ? 'bg-red-950/10' : ''
                      } ${isCurrent ? 'border-l-4 border-l-indigo-500' : ''}`}
                    >
                      {/* Pulpería / Cliente */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSuspended 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : isActive 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {tenant.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {tenant.nombre}
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                  En uso
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {tenant.subdominio || tenant.nombre.toLowerCase().replace(/\s+/g, '-')}.pulpopos.com
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Propietario & Contacto */}
                      <td className="py-4 px-4">
                        <div className="text-white font-medium">{tenant.propietarioNombre}</div>
                        <div className="text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{tenant.telefono}</span>
                          <a
                            href={`https://wa.me/${tenant.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hola ${tenant.propietarioNombre}, le saluda Rafael de PulpoPOS respecto a su cuenta.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Plan & Cuota */}
                      <td className="py-4 px-4">
                        <select
                          value={tenant.plan}
                          onChange={(e) => updateTenantPlan(tenant.id, e.target.value as SubscriptionPlan)}
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white capitalize focus:outline-none focus:border-indigo-500"
                        >
                          <option value="basico">Básico ($15/m)</option>
                          <option value="pro">Pro ($29/m)</option>
                          <option value="empresarial">Empresarial ($49/m)</option>
                        </select>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Max: {tenant.limiteSucursales} sucursal(es) • {tenant.limiteUsuarios} usuarios
                        </div>
                      </td>

                      {/* Vencimiento */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className={`font-mono ${
                            new Date(tenant.fechaVencimiento) < new Date() ? 'text-red-400 font-bold' : 'text-slate-300'
                          }`}>
                            {tenant.fechaVencimiento}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => extendSubscription30Days(tenant)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline mt-0.5 block"
                        >
                          + Extender 30 días
                        </button>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4">
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Activa
                          </span>
                        )}
                        {isTrial && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Clock className="w-3 h-3" /> Prueba
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
                            <AlertOctagon className="w-3 h-3" /> Suspendida
                          </span>
                        )}
                      </td>

                      {/* Botón de 1 Clic: Suspender / Reactivar */}
                      <td className="py-4 px-4 text-center">
                        {isSuspended ? (
                          <button
                            type="button"
                            onClick={() => toggleTenantSubscription(tenant.id, 'activa')}
                            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Reactivar Acceso</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleTenantSubscription(tenant.id, 'suspendida')}
                            className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Suspender (Mora)</span>
                          </button>
                        )}
                      </td>

                      {/* Opciones Adicionales */}
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            switchTenant(tenant.id);
                            onBackToPOS();
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium inline-flex items-center gap-1 transition-colors"
                          title="Entrar a operar en esta pulpería"
                        >
                          <span>Entrar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* Modal: Registrar Nueva Pulpería */}
      {showNewTenantModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Registrar Nueva Pulpería (Cliente)</h3>
              </div>
              <button 
                onClick={() => setShowNewTenantModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nombre Comercial de la Pulpería *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pulpería El Encanto"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nombre del Propietario *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Santos Rodriguez"
                    value={formData.propietarioNombre}
                    onChange={(e) => setFormData({ ...formData, propietarioNombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Teléfono / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: +504 9876-5432"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ej: pulperiaelencanto@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Plan Contratado</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => {
                      const plan = e.target.value as SubscriptionPlan;
                      const price = plan === 'basico' ? 15 : plan === 'pro' ? 29 : 49;
                      setFormData({ ...formData, plan, precioMensual: price });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="basico">Básico ($15 / mes)</option>
                    <option value="pro">Pro ($29 / mes)</option>
                    <option value="empresarial">Empresarial ($49 / mes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estado Inicial</label>
                  <select
                    value={formData.estadoSuscripcion}
                    onChange={(e) => setFormData({ ...formData, estadoSuscripcion: e.target.value as SubscriptionStatus })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="activa">Activa (Pagó)</option>
                    <option value="prueba">Prueba Gratis (15 días)</option>
                    <option value="suspendida">Suspendida</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewTenantModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  Guardar y Habilitar Pulpería
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

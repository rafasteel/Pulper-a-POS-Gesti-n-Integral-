import React from 'react';
import { 
  AlertTriangle, 
  Lock, 
  MessageCircle, 
  RefreshCw, 
  ShieldAlert, 
  Store, 
  UserCheck, 
  ExternalLink,
  Calendar,
  CreditCard
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SubscriptionLockedScreen: React.FC = () => {
  const { 
    currentTenant, 
    toggleTenantSubscription, 
    tenants, 
    switchTenant,
    setCurrentUser,
    users 
  } = useApp();

  const superAdminUser = users.find(u => u.rol === 'superadmin') || {
    id: 'u-superadmin',
    nombre: 'Rafael (Super Admin)',
    apellido: '',
    email: 'admin@pulposaas.com',
    rol: 'superadmin' as const,
    activo: true,
    pin: '9999',
  };

  const whatsappMessage = encodeURIComponent(
    `Hola Soporte PulpoPOS, necesito reactivar la suscripción de mi negocio: "${currentTenant.nombre}" (ID: ${currentTenant.id}). Por favor indíquenme los medios de pago.`
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full bg-slate-900/90 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-red-950/50 relative z-10 text-white animate-fade-in">
        
        {/* Header Icon & Status */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-500/20">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Acceso Suspendido
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Suscripción No Activa
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-md">
            El servicio de punto de venta e inventario para <strong className="text-white">{currentTenant.nombre}</strong> ha sido suspendido temporalmente.
          </p>
        </div>

        {/* Tenant Subscription Card Details */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Negocio:</span>
            </div>
            <span className="font-semibold text-white text-sm">{currentTenant.nombre}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>Plan Contratado:</span>
            </div>
            <span className="text-sm font-semibold capitalize text-blue-300">
              Plan {currentTenant.plan} (${currentTenant.precioMensual}/mes)
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Fecha de Vencimiento:</span>
            </div>
            <span className="text-sm font-medium text-amber-400">
              {currentTenant.fechaVencimiento} (Vencida)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Titular Registrado:</span>
            </div>
            <span className="text-sm text-slate-300">
              {currentTenant.propietarioNombre} ({currentTenant.telefono})
            </span>
          </div>
        </div>

        {/* Security reassurance banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-6 flex items-start gap-3">
          <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-emerald-400 font-medium">Tus datos están protegidos: </strong> 
            El catálogo de productos, existencias, clientes y deudores fiados siguen seguros en la nube. Al activar la suscripción, tendrás acceso inmediato sin perder ninguna información.
          </div>
        </div>

        {/* Actions / CTA */}
        <div className="space-y-3">
          <a
            href={`https://wa.me/50499998888?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.01]"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Contactar Administrador por WhatsApp</span>
            <ExternalLink className="w-4 h-4 opacity-75" />
          </a>

          {/* Testing / Sandbox Utilities */}
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
              Herramientas de Demostración & Super Admin
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleTenantSubscription(currentTenant.id, 'activa')}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Simular Reactivación Inmediata
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentUser(superAdminUser);
                }}
                className="py-2.5 px-3 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-600 hover:to-purple-600 text-white text-xs font-medium rounded-lg border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                Acceder como Super Admin
              </button>
            </div>

            {/* Quick Tenant Switcher for Testing */}
            <div className="mt-2 flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 whitespace-nowrap">Probar otra pulpería:</span>
              <select
                value={currentTenant.id}
                onChange={(e) => switchTenant(e.target.value)}
                className="w-full bg-slate-800 text-xs text-white border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} ({t.estadoSuscripcion})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Store, 
  Lock, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  Delete, 
  ArrowRight, 
  Database, 
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundManager } from '../utils/audioHaptics';
import { SupabaseConfigModal } from '../components/common/SupabaseConfigModal';

interface LoginViewProps {
  onSuccessLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccessLogin }) => {
  const { 
    users, 
    loginWithPinCode, 
    loginWithEmail, 
    isSupabaseConnected, 
    currentTenant, 
    switchTenant, 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pin' | 'credentials'>('pin');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('donmanuel@labendicion.com');
  const [password, setPassword] = useState('Pulperia123!');
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Manejador de teclado numérico táctil
  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      soundManager.playTouchClick();
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMessage('');
      
      // Si llega a 4 dígitos, intentar desbloqueo automático
      if (newPin.length === 4) {
        attemptPinLogin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    soundManager.playTouchClick();
    setPin(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    soundManager.playTouchClick();
    setPin('');
    setErrorMessage('');
  };

  const attemptPinLogin = async (pinToTry: string) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await loginWithPinCode(pinToTry, selectedUserId);
      if (result.success) {
        soundManager.playPaymentSuccess();
        if (onSuccessLogin) onSuccessLogin();
      } else {
        soundManager.playError();
        setErrorMessage(result.error || 'PIN incorrecto. Intente nuevamente.');
        setPin('');
      }
    } catch (err: any) {
      soundManager.playError();
      setErrorMessage(err.message || 'Error al autenticar');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await loginWithEmail(email, password);
      if (result.success) {
        soundManager.playPaymentSuccess();
        if (onSuccessLogin) onSuccessLogin();
      } else {
        soundManager.playError();
        setErrorMessage(result.error || 'Credenciales no válidas');
      }
    } catch (err: any) {
      soundManager.playError();
      setErrorMessage(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const quickFillCredentials = (userEmail: string, userPass: string, tenantId?: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    if (tenantId) switchTenant(tenantId);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Luces decorativas de fondo */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tarjeta de Inicio de Sesión */}
      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-white">
        
        {/* Encabezado con Logotipo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 mb-3">
            <Store className="w-7 h-7" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {currentTenant.nombre}
          </h1>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">Punto de Venta & Control de Turnos</span>
            {isSupabaseConnected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Cloud
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                title="Configurar conexión con Supabase"
              >
                <Database className="w-2.5 h-2.5" />
                Modo Local (Configurar)
              </button>
            )}
          </div>
        </div>

        {/* Selector de Pestaña: PIN Táctil vs Email/Password */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setErrorMessage('');
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'pin'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN Táctil</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('credentials');
              setErrorMessage('');
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'credentials'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Correo & Clave</span>
          </button>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA 1: TECLADO NUMÉRICO TÁCTIL (PIN DE CAJERO) */}
        {/* ==================================================================== */}
        {activeTab === 'pin' && (
          <div className="space-y-4">
            {/* Selector de Usuario para PIN */}
            <div>
              <label className="block text-[11px] text-slate-400 font-medium mb-1">
                Selecciona tu usuario de caja:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido} ({u.rol.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Visualizador de Puntos del PIN */}
            <div className="flex justify-center items-center gap-3 py-3">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > index
                      ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-lg shadow-emerald-400/50'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                />
              ))}
            </div>

            {/* Teclado Numérico Táctil */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigit(num)}
                  disabled={isLoading}
                  className="h-13 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-lg font-bold text-white shadow-sm active:scale-95 transition-all flex items-center justify-center"
                >
                  {num}
                </button>
              ))}

              {/* Botón Borrar Todo */}
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading || pin.length === 0}
                className="h-13 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 active:scale-95 transition-all flex items-center justify-center"
              >
                C
              </button>

              {/* Dígito 0 */}
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={isLoading}
                className="h-13 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-lg font-bold text-white shadow-sm active:scale-95 transition-all flex items-center justify-center"
              >
                0
              </button>

              {/* Botón Retroceso */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isLoading || pin.length === 0}
                className="h-13 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 active:scale-95 transition-all flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Botón de Entrada Manual / Confirmación */}
            <button
              type="button"
              onClick={() => attemptPinLogin(pin)}
              disabled={isLoading || pin.length === 0}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Desbloquear Turno</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Pistas de PIN para demostración */}
            <div className="pt-2 text-center text-[10px] text-slate-500">
              PINs de demostración: <strong className="text-slate-300">1234</strong> (Propietario), <strong className="text-slate-300">4321</strong> (Cajera), <strong className="text-slate-300">9999</strong> (SuperAdmin)
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA 2: CREDENCIALES (SUPABASE AUTH REAL) */}
        {/* ==================================================================== */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="usuario@pulperia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Iniciar Sesión en Supabase</span>
                </>
              )}
            </button>

            {/* Chips de Cuentas Preconfiguradas (Demo Rápido) */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Cuentas Rápidas del Seed:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => quickFillCredentials('donmanuel@labendicion.com', 'Pulperia123!', '11111111-1111-1111-1111-111111111111')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700"
                >
                  Propietario Activo
                </button>
                <button
                  type="button"
                  onClick={() => quickFillCredentials('rosa@labendicion.com', 'Cajera123!', '11111111-1111-1111-1111-111111111111')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] border border-slate-700"
                >
                  Cajera Rosa
                </button>
                <button
                  type="button"
                  onClick={() => quickFillCredentials('admin@pulposaas.com', 'SuperAdmin2026!')}
                  className="px-2 py-1 bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 rounded text-[10px] border border-indigo-700/50"
                >
                  Super Admin SaaS
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Pie de la tarjeta: Botón de configuración de base de datos */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Configurar Supabase</span>
          </button>

          <span className="text-[10px] text-slate-500 font-mono">v1.2.0 • SaaS Ready</span>
        </div>

      </div>

      {/* Modal de Configuración Supabase */}
      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Store,
  QrCode,
  DollarSign,
  Volume2,
  VolumeX,
  Smartphone,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { soundManager } from '../../utils/audioHaptics';

interface HeaderProps {
  onOpenQRPairModal: () => void;
  onOpenHeldCartsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenQRPairModal, onOpenHeldCartsModal }) => {
  const { currentUser, setCurrentUser, users, config, updateConfig, cashRegister, heldCarts } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const nextVal = !config.sonidoEscanerActivo;
    updateConfig({ sonidoEscanerActivo: nextVal });
    soundManager.setSoundEnabled(nextVal);
    soundManager.playTouchClick();
  };

  return (
    <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between select-none backdrop-blur-sm z-30">
      {/* Izquierda: Logotipo y Nombre de Pulpería */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-lg">
          <Store className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-tight leading-none">
              {config.nombreNegocio}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              POS Retail
            </span>
          </div>
          <span className="text-xs text-slate-400 leading-none">
            {cashRegister.nombre} • <span className="text-emerald-400 font-medium">En Línea</span>
          </span>
        </div>
      </div>

      {/* Centro: Indicadores Rápidos (Tickets en espera, Estado Caja, Escáner Móvil QR) */}
      <div className="flex items-center gap-2">
        {/* Botón Escáner Móvil Inalámbrico */}
        <button
          onClick={onOpenQRPairModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all text-xs font-semibold cursor-pointer active:scale-95 shadow-sm"
          title="Emparejar cámara del teléfono como escáner inalámbrico"
        >
          <Smartphone className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="hidden sm:inline">Escáner Móvil</span>
          <QrCode className="w-3.5 h-3.5" />
        </button>

        {/* Tickets en Espera */}
        {heldCarts.length > 0 && (
          <button
            onClick={onOpenHeldCartsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all text-xs font-semibold cursor-pointer active:scale-95 animate-bounce"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pausados:</span>
            <span className="bg-amber-500 text-slate-950 text-[11px] font-black rounded-full px-1.5">
              {heldCarts.length}
            </span>
          </button>
        )}

        {/* Estado de Caja */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Fondo Inicial:</span>
          <span className="font-bold text-slate-200">
            {config.monedaSimbolo}
            {cashRegister.aperturaActual?.montoInicial.toFixed(2) || '0.00'}
          </span>
        </div>
      </div>

      {/* Derecha: Reloj, Sonido y Cambio Rápido de Cajero/Usuario */}
      <div className="flex items-center gap-3">
        {/* Toggle de Sonido */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            config.sonidoEscanerActivo
              ? 'text-slate-300 hover:text-white hover:bg-slate-800'
              : 'text-rose-400 bg-rose-500/10'
          }`}
          title={config.sonidoEscanerActivo ? 'Sonido activado' : 'Sonido silenciado'}
        >
          {config.sonidoEscanerActivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Reloj */}
        <div className="hidden lg:block text-xs font-mono font-medium text-slate-400 px-2 py-1 rounded bg-slate-800/50">
          {time}
        </div>

        {/* Dropdown de Usuario / Rol */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition cursor-pointer active:scale-95"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs uppercase">
              {currentUser.nombre.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-200 leading-tight">{currentUser.nombre}</div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 leading-tight">
                {currentUser.rol}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                Cambio Rápido de Usuario / Turno:
              </div>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    setShowUserDropdown(false);
                    soundManager.playTouchClick();
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-800 transition ${
                    u.id === currentUser.id ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  <div>
                    <div>{u.nombre} {u.apellido}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{u.rol}</div>
                  </div>
                  {u.id === currentUser.id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Activo
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

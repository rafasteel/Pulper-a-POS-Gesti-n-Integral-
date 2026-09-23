import React from 'react';
import { useApp } from '../../context/AppContext';
import { CreditCard, PauseCircle, Trash2, ShieldCheck, Lock } from 'lucide-react';
import { soundManager } from '../../utils/audioHaptics';

interface CartSummaryProps {
  onOpenPaymentModal: () => void;
  onOpenPauseModal: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  onOpenPaymentModal,
  onOpenPauseModal,
}) => {
  const { cart, clearCart, config, cashRegister } = useApp();
  const isCashRegisterOpen = cashRegister.estado === 'abierta' && Boolean(cashRegister.aperturaActual?.id);

  const subtotal = cart.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);
  const totalDescuentos = cart.reduce((sum, item) => sum + item.descuentoUnitario * item.cantidad, 0);
  const total = Math.max(0, subtotal - totalDescuentos);
  const totalArticulos = cart.reduce((sum, item) => sum + item.cantidad, 0);

  const handleClear = () => {
    if (cart.length > 0 && window.confirm('¿Seguro que deseas vaciar el carrito?')) {
      clearCart();
    }
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-3 flex flex-col gap-2.5 select-none shadow-xl">
      {/* Resumen de Montos */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Artículos ({totalArticulos.toFixed(1)}):</span>
          <span>
            {config.monedaSimbolo}
            {subtotal.toFixed(2)}
          </span>
        </div>

        {totalDescuentos > 0 && (
          <div className="flex justify-between items-center text-xs text-amber-400 font-medium">
            <span>Descuentos Aplicados:</span>
            <span>
              -{config.monedaSimbolo}
              {totalDescuentos.toFixed(2)}
            </span>
          </div>
        )}

        {/* Total Prominente de Alto Contraste */}
        <div className="flex justify-between items-baseline pt-1 border-t border-slate-800">
          <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">Total a Pagar:</span>
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
              {config.monedaSimbolo}
              {total.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500 block leading-none">{config.monedaCodigo}</span>
          </div>
        </div>
      </div>

      {/* Botones de Acción Táctiles Grandes */}
      <div className="grid grid-cols-4 gap-2">
        {/* Limpiar */}
        <button
          onClick={handleClear}
          disabled={cart.length === 0}
          className="col-span-1 h-12 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700/80 flex flex-col items-center justify-center transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Vaciar carrito"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-[10px] font-bold mt-0.5">Vaciar</span>
        </button>

        {/* Pausar Venta */}
        <button
          onClick={onOpenPauseModal}
          disabled={cart.length === 0}
          className="col-span-1 h-12 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex flex-col items-center justify-center transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          title="Pausar ticket actual (F6)"
        >
          <PauseCircle className="w-4 h-4" />
          <span className="text-[10px] font-bold mt-0.5">Pausar</span>
        </button>

        {/* Cobrar Principal (Botón Gigante Verde o Bloqueado por Caja Cerrada) */}
        {!isCashRegisterOpen ? (
          <button
            disabled
            title="Debes abrir caja primero antes de poder cobrar"
            className="col-span-2 h-12 rounded-xl bg-slate-800/90 border border-amber-500/40 text-amber-300 font-bold text-xs flex flex-col items-center justify-center gap-0.5 opacity-80 cursor-not-allowed shadow-inner"
          >
            <div className="flex items-center gap-1.5 text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              <span className="font-extrabold uppercase tracking-wide">Caja Cerrada</span>
            </div>
            <span className="text-[10px] text-amber-200/80 font-normal">Debes abrir caja primero</span>
          </button>
        ) : (
          <button
            onClick={() => {
              soundManager.playTouchClick();
              onOpenPaymentModal();
            }}
            disabled={cart.length === 0}
            className="col-span-2 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <CreditCard className="w-5 h-5 text-slate-950" />
            <span>Cobrar</span>
            <span className="text-xs bg-slate-950/20 text-slate-950 px-1.5 py-0.5 rounded font-mono font-bold">
              F12
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
        <ShieldCheck className="w-3 h-3 text-emerald-500/80" />
        <span>Kardex automático multi-presentación activo</span>
      </div>
    </div>
  );
};

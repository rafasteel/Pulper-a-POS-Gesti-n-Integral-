import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, Clock, Play, Trash2, ShoppingBag } from 'lucide-react';

interface HeldCartsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeldCartsModal: React.FC<HeldCartsModalProps> = ({ isOpen, onClose }) => {
  const { heldCarts, resumeCart, deleteHeldCart, config } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-sm text-slate-100">Tickets en Espera ({heldCarts.length})</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {heldCarts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay ventas pausadas actualmente</p>
            </div>
          ) : (
            heldCarts.map(cart => (
              <div
                key={cart.id}
                className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-3 rounded-xl flex items-center justify-between gap-3 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-200 truncate">{cart.nombre}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {cart.items.length} productos •{' '}
                    <span className="font-bold text-emerald-400">
                      {config.monedaSimbolo}
                      {cart.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Pausado: {new Date(cart.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      resumeCart(cart.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Recuperar</span>
                  </button>

                  <button
                    onClick={() => deleteHeldCart(cart.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Descartar ticket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Trash2, Plus, Minus, Tag, AlertCircle } from 'lucide-react';
import { soundManager } from '../../utils/audioHaptics';

export const CartTable: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, setDiscount, config } = useApp();

  if (cart.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 select-none">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-3">
          <Tag className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-base font-bold text-slate-400">El carrito está vacío</p>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Escanea un código de barras con la pistola USB, usa la cámara o selecciona un producto de la cuadrícula.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
        {cart.map(item => {
          const isBulk = item.producto.permiteDecimales;
          return (
            <div
              key={item.id}
              className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-2.5 transition flex flex-col gap-1.5 shadow-sm"
            >
              {/* Encabezado del Producto y Presentación */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-100 truncate leading-snug">
                    {item.producto.nombre}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.presentacion.nombre}
                    </span>
                    {item.presentacion.factorConversion > 1 && (
                      <span className="text-[10px] text-slate-400">
                        (x{item.presentacion.factorConversion} {item.producto.unidadMedidaBase}s base)
                      </span>
                    )}
                    {item.producto.existenciaBase <= item.producto.stockMinimo && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        <AlertCircle className="w-3 h-3" /> Stock bajo ({item.producto.existenciaBase})
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtotal del Item */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-emerald-400">
                    {config.monedaSimbolo}
                    {item.subtotal.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {config.monedaSimbolo}
                    {item.precioUnitario.toFixed(2)} c/u
                  </div>
                </div>
              </div>

              {/* Fila de Controles: Cantidad (+/-), Descuento y Eliminar */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.cantidad - (isBulk ? 0.5 : 1))}
                    className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center font-bold text-sm transition cursor-pointer active:scale-95"
                    title="Disminuir"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    step={isBulk ? '0.25' : '1'}
                    min="0"
                    value={item.cantidad}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) updateQuantity(item.id, val);
                    }}
                    className="w-14 h-7 text-center font-bold text-sm bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />

                  <button
                    onClick={() => updateQuantity(item.id, item.cantidad + (isBulk ? 0.5 : 1))}
                    className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center font-bold text-sm transition cursor-pointer active:scale-95"
                    title="Aumentar"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-slate-400 ml-1">
                    {isBulk ? item.producto.unidadMedidaBase : 'uds'}
                  </span>
                </div>

                {/* Descuento por ítem y botón de eliminación */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const input = window.prompt(
                        `Descuento unitario en ${config.monedaSimbolo}:`,
                        item.descuentoUnitario.toString()
                      );
                      if (input !== null) {
                        const desc = parseFloat(input) || 0;
                        setDiscount(item.id, Math.max(0, desc));
                        soundManager.playTouchClick();
                      }
                    }}
                    className={`text-[11px] px-2 py-1 rounded transition cursor-pointer ${
                      item.descuentoUnitario > 0
                        ? 'bg-amber-500/20 text-amber-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {item.descuentoUnitario > 0
                      ? `-${config.monedaSimbolo}${item.descuentoUnitario * item.cantidad}`
                      : '+ Descto'}
                  </button>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer active:scale-95"
                    title="Quitar del carrito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

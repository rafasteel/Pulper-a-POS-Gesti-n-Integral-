import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, PlusCircle, Barcode, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../../utils/audioHaptics';

interface QuickRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBarcode?: string;
}

export const QuickRegisterModal: React.FC<QuickRegisterModalProps> = ({
  isOpen,
  onClose,
  initialBarcode = '',
}) => {
  const { categories, quickRegisterProduct, addToCart, config } = useApp();

  const [nombre, setNombre] = useState('');
  const [codigoBarras, setCodigoBarras] = useState(initialBarcode);
  const [precioCosto, setPrecioCosto] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [categoriaId, setCategoriaId] = useState(categories[0]?.id || '');
  const [stockInicial, setStockInicial] = useState('12');

  useEffect(() => {
    if (initialBarcode) {
      setCodigoBarras(initialBarcode);
    }
  }, [initialBarcode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !codigoBarras.trim() || !precioVenta) {
      soundManager.playError();
      alert('Por favor complete los campos obligatorios');
      return;
    }

    const numCosto = parseFloat(precioCosto) || 0;
    const numVenta = parseFloat(precioVenta) || 0;
    const numStock = parseFloat(stockInicial) || 0;

    const newProd = quickRegisterProduct({
      nombre: nombre.trim(),
      codigoBarras: codigoBarras.trim(),
      precioCosto: numCosto,
      precioVenta: numVenta,
      categoriaId,
      stockInicial: numStock,
    });

    soundManager.playPaymentSuccess();
    // Agregar inmediatamente al carrito
    addToCart(newProd, newProd.presentaciones[0], 1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm text-slate-100">Registro Rápido de Producto</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Código de Barras:</label>
            <div className="relative">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={codigoBarras}
                onChange={e => setCodigoBarras(e.target.value)}
                placeholder="Escanea o escribe el código..."
                className="w-full h-10 pl-9 pr-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Producto:</label>
            <input
              type="text"
              required
              placeholder="Ej: Jugo Hit 500ml Mora"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Precio Costo ({config.monedaSimbolo}):
              </label>
              <input
                type="number"
                step="0.50"
                placeholder="0.00"
                value={precioCosto}
                onChange={e => setPrecioCosto(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-400 block mb-1">
                Precio Venta ({config.monedaSimbolo}):
              </label>
              <input
                type="number"
                step="0.50"
                required
                placeholder="0.00"
                value={precioVenta}
                onChange={e => setPrecioVenta(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría:</label>
              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className="w-full h-10 px-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Stock Inicial (Base):</label>
              <input
                type="number"
                value={stockInicial}
                onChange={e => setStockInicial(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar y Agregar al Carrito</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Barcode, Sparkles, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audioHaptics';

export const PriceKioskView: React.FC = () => {
  const { findProductByBarcode, config } = useApp();
  const [barcode, setBarcode] = useState('');
  const [scannedResult, setScannedResult] = useState<{
    productName: string;
    presentationName: string;
    price: number;
    stock: number;
    promotions?: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcode.trim();
    if (!clean) return;

    const match = findProductByBarcode(clean);
    if (match) {
      soundManager.playScanSuccess();
      setScannedResult({
        productName: match.product.nombre,
        presentationName: match.presentation.nombre,
        price: match.presentation.precioVenta,
        stock: match.product.existenciaBase,
        promotions: match.presentation.factorConversion >= 6 ? '¡Ahorro por volumen en mayoreo disponible!' : undefined,
      });
      setBarcode('');
    } else {
      soundManager.playError();
      alert('Producto no encontrado en el sistema');
      setBarcode('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 items-center justify-center p-6 text-center select-none overflow-hidden relative">
      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-slate-950 pointer-events-none" />

      <div className="max-w-xl w-full z-10 space-y-6">
        {/* Cabecera del Kiosco */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kiosco Verificador de Precios</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Consulta el Precio de Cualquier Producto
          </h1>
          <p className="text-sm text-slate-400">
            Pasa el código de barras frente al lector para ver precio y ofertas al instante.
          </p>
        </div>

        {/* Input de Escáner Continuo */}
        <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
          <Barcode className="w-6 h-6 text-indigo-400 absolute left-4 top-1/2 -translate-y-1/2 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Escanea el código aquí..."
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-slate-900 border-2 border-indigo-500/60 rounded-2xl text-lg font-mono text-center text-indigo-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400 shadow-xl shadow-indigo-500/10"
            autoFocus
          />
        </form>

        {/* Tarjeta de Resultado Grande y Legible */}
        {scannedResult ? (
          <div className="bg-slate-900/90 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold uppercase">
              <CheckCircle2 className="w-4 h-4" />
              <span>Producto Verificado</span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white leading-tight">{scannedResult.productName}</h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 mt-1 inline-block">
                Presentación: {scannedResult.presentationName}
              </span>
            </div>

            {/* Precio Gigante */}
            <div className="py-2">
              <span className="text-5xl sm:text-6xl font-black text-emerald-400 tracking-tight">
                {config.monedaSimbolo}
                {scannedResult.price.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 block mt-1 font-mono uppercase">
                {config.monedaCodigo} (Impuesto incluido)
              </span>
            </div>

            {scannedResult.promotions && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
                🎁 {scannedResult.promotions}
              </div>
            )}

            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              Disponibles en tienda: {scannedResult.stock} unidades
            </div>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 text-xs">
            Apunta el producto al escáner de mesa o pistola USB
          </div>
        )}
      </div>
    </div>
  );
};

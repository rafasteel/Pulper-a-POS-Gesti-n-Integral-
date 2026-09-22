import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClipboardCheck, Barcode, Plus, CheckCircle2, ShieldAlert, RotateCcw } from 'lucide-react';
import { Product } from '../types';
import { soundManager } from '../utils/audioHaptics';

export const PhysicalAuditView: React.FC = () => {
  const { products, updateProduct, findProductByBarcode, config } = useApp();

  // Mapeo local de conteo físico
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = scannedBarcode.trim();
    if (!clean) return;

    const match = findProductByBarcode(clean);
    if (match) {
      soundManager.playScanSuccess();
      setCounts(prev => ({
        ...prev,
        [match.product.id]: (prev[match.product.id] || 0) + match.presentation.factorConversion,
      }));
      setScannedBarcode('');
    } else {
      soundManager.playError();
      alert('Código no encontrado');
    }
  };

  const handleManualCountChange = (productId: string, val: number) => {
    soundManager.playTouchClick();
    setCounts(prev => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  const handleApplyAdjustment = () => {
    if (adminPin !== '1234') {
      soundManager.playError();
      alert('PIN de Administrador incorrecto (El PIN demo es 1234)');
      return;
    }

    // Aplicar los ajustes a las existencias reales
    products.forEach((p: Product) => {
      if (counts[p.id] !== undefined) {
        updateProduct({
          ...p,
          existenciaBase: counts[p.id],
        });
      }
    });

    soundManager.playPaymentSuccess();
    alert('¡Ajuste de inventario aplicado exitosamente en la base de datos!');
    setShowApprovalModal(false);
    setAdminPin('');
    setCounts({});
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Encabezado */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100">Conteo Físico & Auditoría de Stock</h1>
            <p className="text-xs text-slate-400">Escanea anaqueles y tramos para contrastar Sistema vs. Físico</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCounts({})}
            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar</span>
          </button>

          <button
            onClick={() => setShowApprovalModal(true)}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aprobar Ajuste (Admin)</span>
          </button>
        </div>
      </div>

      {/* Barra de Escaneo en Auditoría */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60">
        <form onSubmit={handleScanSubmit} className="max-w-xl flex gap-2">
          <div className="relative flex-1">
            <Barcode className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Escanea con pistola o cámara para contar +1..."
              value={scannedBarcode}
              onChange={e => setScannedBarcode(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Sumar</span>
          </button>
        </form>
      </div>

      {/* Tabla de Comparación: Sistema vs Contado */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-3">Producto</th>
                  <th className="p-3 text-center">Stock en Sistema</th>
                  <th className="p-3 text-center">Conteo Físico Real</th>
                  <th className="p-3 text-center">Diferencia</th>
                  <th className="p-3 text-right">Impacto Financiero</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p: Product) => {
                  const systemStock = p.existenciaBase;
                  const countedStock = counts[p.id] !== undefined ? counts[p.id] : systemStock;
                  const diff = countedStock - systemStock;
                  const baseCost = p.presentaciones[0]?.precioCosto || 0;
                  const financialImpact = diff * baseCost;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-100">{p.nombre}</div>
                        <div className="text-[11px] text-slate-400">Unidad: {p.unidadMedidaBase}</div>
                      </td>

                      <td className="p-3 text-center font-bold text-slate-300">
                        {systemStock} {p.unidadMedidaBase}s
                      </td>

                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleManualCountChange(p.id, countedStock - 1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={countedStock}
                            onChange={e => handleManualCountChange(p.id, parseFloat(e.target.value) || 0)}
                            className="w-14 h-7 text-center font-bold bg-slate-950 border border-slate-700 rounded text-cyan-300"
                          />
                          <button
                            onClick={() => handleManualCountChange(p.id, countedStock + 1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {diff === 0 ? (
                          <span className="text-slate-500 font-medium">Cuadrado (0)</span>
                        ) : diff > 0 ? (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                            +{diff} (Sobrante)
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                            {diff} (Faltante / Merma)
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono font-bold">
                        <span className={diff < 0 ? 'text-rose-400' : diff > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                          {config.monedaSimbolo}
                          {financialImpact.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Aprobación por PIN de Supervisor */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Autorización Requerida</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa el PIN de Propietario / Administrador para aplicar los ajustes de inventario.
              </p>
            </div>

            <input
              type="password"
              maxLength={4}
              placeholder="PIN de 4 dígitos (Demo: 1234)"
              value={adminPin}
              onChange={e => setAdminPin(e.target.value)}
              className="w-full h-11 text-center font-mono text-xl tracking-widest bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="h-10 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyAdjustment}
                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

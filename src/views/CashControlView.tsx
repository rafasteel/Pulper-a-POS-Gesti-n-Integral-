import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  DollarSign,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownLeft,
  EyeOff,
  FileText,
} from 'lucide-react';
import { CashMovement } from '../types';
import { soundManager } from '../utils/audioHaptics';

export const CashControlView: React.FC = () => {
  const {
    cashRegister,
    openCashRegister,
    addCashMovement,
    closeCashRegisterBlind,
    cashMovements,
    config,
  } = useApp();

  const [initialAmountInput, setInitialAmountInput] = useState('1000');
  const [movementType, setMovementType] = useState<'entrada_efectivo' | 'retiro_gasto'>('retiro_gasto');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Estados para Arqueo Ciego
  const [billsCount, setBillsCount] = useState<Record<string, number>>({
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    'monedas': 0,
  });
  const [lastClosedReport, setLastClosedReport] = useState<any | null>(null);

  // Calcular total declarado por el conteo del cajero
  const declaredCash =
    (billsCount['1000'] || 0) * 1000 +
    (billsCount['500'] || 0) * 500 +
    (billsCount['200'] || 0) * 200 +
    (billsCount['100'] || 0) * 100 +
    (billsCount['50'] || 0) * 50 +
    (billsCount['20'] || 0) * 20 +
    (billsCount['10'] || 0) * 10 +
    (billsCount['monedas'] || 0);

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(initialAmountInput) || 0;
    openCashRegister(amt);
    soundManager.playPaymentSuccess();
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(movementAmount) || 0;
    if (amt <= 0 || !movementReason.trim()) return;

    addCashMovement(movementType, amt, movementReason.trim());
    setMovementAmount('');
    setMovementReason('');
    soundManager.playPaymentSuccess();
  };

  const handleBlindClose = () => {
    if (declaredCash <= 0 && !window.confirm('¿El conteo declarado es 0.00? ¿Deseas continuar?')) {
      return;
    }

    const report = closeCashRegisterBlind(declaredCash, billsCount, 'Cierre ciego de turno');
    setLastClosedReport(report);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto select-none p-4 space-y-4">
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100">{cashRegister.nombre}</h1>
            <p className="text-xs text-slate-400">
              Estado actual:{' '}
              <span
                className={`font-bold ${
                  cashRegister.estado === 'abierta' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {cashRegister.estado.toUpperCase()}
              </span>
              {cashRegister.aperturaActual && ` • Cajero: ${cashRegister.aperturaActual.usuarioNombre}`}
            </p>
          </div>
        </div>

        {cashRegister.estado === 'abierta' && (
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
            <div className="text-[11px] text-slate-400">Fondo Inicial Apertura:</div>
            <div className="text-lg font-black text-slate-200">
              {config.monedaSimbolo}
              {cashRegister.aperturaActual?.montoInicial.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {cashRegister.estado === 'cerrada' ? (
        /* Caja Cerrada: Formulario de Apertura de Turno */
        <div className="max-w-md mx-auto w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl my-auto">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Apertura de Turno de Caja</h2>
            <p className="text-xs text-slate-400 mt-1">Ingresa el fondo inicial de sencillo para dar cambio:</p>
          </div>

          <form onSubmit={handleOpenShift} className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                {config.monedaSimbolo}
              </span>
              <input
                type="number"
                step="10"
                required
                value={initialAmountInput}
                onChange={e => setInitialAmountInput(e.target.value)}
                className="w-full h-12 pl-10 pr-4 bg-slate-950 border border-slate-700 rounded-xl text-xl font-bold text-center text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-lg shadow-emerald-600/20"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Turno de Caja</span>
            </button>
          </form>
        </div>
      ) : (
        /* Caja Abierta: Movimientos y Arqueo Ciego */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Panel Izquierdo: Movimientos de Efectivo */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
              <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                Registrar Movimiento de Efectivo
              </h3>

              <form onSubmit={handleAddMovement} className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('entrada_efectivo')}
                    className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      movementType === 'entrada_efectivo'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Entrada (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType('retiro_gasto')}
                    className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      movementType === 'retiro_gasto'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Retiro / Gasto (-)</span>
                  </button>
                </div>

                <div>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder={`Monto en ${config.monedaSimbolo}...`}
                    value={movementAmount}
                    onChange={e => setMovementAmount(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Motivo (ej: Compra de hielo, pago proveedor, cambio)..."
                    value={movementReason}
                    onChange={e => setMovementReason(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  Registrar Movimiento
                </button>
              </form>
            </div>

            {/* Historial de Movimientos de Caja */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h3 className="font-bold text-xs text-slate-400">Movimientos del Turno</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {cashMovements.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No hay entradas ni retiros registrados</p>
                ) : (
                  cashMovements.map((m: CashMovement) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-200">{m.motivo}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.usuarioNombre}
                        </div>
                      </div>
                      <span
                        className={`font-black ${
                          m.tipo === 'entrada_efectivo' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.tipo === 'entrada_efectivo' ? '+' : '-'}
                        {config.monedaSimbolo}
                        {m.monto.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Panel Derecho: Flujo de Cierre Ciego */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-100">Arqueo Ciego de Cierre</h2>
                  <span className="text-[11px] text-slate-400">
                    El cajero cuenta físicamente el dinero antes de ver el monto esperado
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Total Contado:</div>
                <div className="text-xl font-black text-emerald-400">
                  {config.monedaSimbolo}
                  {declaredCash.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Desglose por denominaciones de billetes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {['1000', '500', '200', '100', '50', '20', '10'].map(denom => (
                <div key={denom} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="font-bold text-slate-300">Billetes de {denom}:</span>
                    <span className="text-emerald-400 font-mono">
                      {config.monedaSimbolo}{(billsCount[denom] || 0) * parseInt(denom)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={billsCount[denom] || ''}
                    onChange={e =>
                      setBillsCount(prev => ({
                        ...prev,
                        [denom]: Math.max(0, parseInt(e.target.value) || 0),
                      }))
                    }
                    placeholder="0"
                    className="w-full h-8 text-center font-bold text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              ))}

              {/* Monedas sueltas */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="font-bold text-slate-300">Monedas (Monto):</span>
                  <span className="text-emerald-400 font-mono">
                    {config.monedaSimbolo}{billsCount['monedas'] || 0}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={billsCount['monedas'] || ''}
                  onChange={e =>
                    setBillsCount(prev => ({
                      ...prev,
                      monedas: Math.max(0, parseFloat(e.target.value) || 0),
                    }))
                  }
                  placeholder="0.00"
                  className="w-full h-8 text-center font-bold text-xs bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            {/* Botón de Envío de Cierre Ciego */}
            <button
              onClick={handleBlindClose}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95"
            >
              <EyeOff className="w-5 h-5 text-slate-950" />
              <span>Cerrar Turno & Revelar Cuadre (Arqueo Ciego)</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal / Reporte Revelado de Arqueo Ciego */}
      {lastClosedReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Resultado del Cierre de Caja</h3>
              <p className="text-xs text-slate-400">Turno de: {lastClosedReport.cajeroNombre}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Fondo Inicial:</span>
                <span>{config.monedaSimbolo}{lastClosedReport.montoInicial.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Ventas en Efectivo:</span>
                <span>+{config.monedaSimbolo}{lastClosedReport.totalVentasEfectivo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Entradas Extra:</span>
                <span>+{config.monedaSimbolo}{lastClosedReport.totalEntradasExtra.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Retiros / Gastos:</span>
                <span>-{config.monedaSimbolo}{lastClosedReport.totalRetirosGastos.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-slate-200">
                <span>Monto Esperado por Sistema:</span>
                <span className="text-white">{config.monedaSimbolo}{lastClosedReport.montoEsperadoEfectivo.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-slate-200">
                <span>Monto Declarado (Físico):</span>
                <span className="text-emerald-400">{config.monedaSimbolo}{lastClosedReport.montoDeclaradoEfectivo.toFixed(2)}</span>
              </div>

              {/* Diferencia / Cuadre */}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                <span>DIFERENCIA:</span>
                <span
                  className={
                    lastClosedReport.diferenciaEfectivo === 0
                      ? 'text-emerald-400'
                      : lastClosedReport.diferenciaEfectivo > 0
                      ? 'text-cyan-400'
                      : 'text-rose-400'
                  }
                >
                  {lastClosedReport.diferenciaEfectivo > 0 ? '+' : ''}
                  {config.monedaSimbolo}
                  {lastClosedReport.diferenciaEfectivo.toFixed(2)} (
                  {lastClosedReport.diferenciaEfectivo === 0
                    ? 'Cuadrado Exacto'
                    : lastClosedReport.diferenciaEfectivo > 0
                    ? 'Sobrante'
                    : 'Faltante'}
                  )
                </span>
              </div>
            </div>

            <button
              onClick={() => setLastClosedReport(null)}
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Aceptar y Cerrar Reporte
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

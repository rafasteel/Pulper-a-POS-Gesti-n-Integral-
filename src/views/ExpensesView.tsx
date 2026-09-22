import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Receipt, Plus, CheckCircle2 } from 'lucide-react';
import { OperationalExpense } from '../types';
import { soundManager } from '../utils/audioHaptics';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, config } = useApp();

  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('servicios');
  const [pagadoDesdeCaja, setPagadoDesdeCaja] = useState(true);

  const totalGastos = expenses.reduce((sum: number, e: OperationalExpense) => sum + e.monto, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(monto) || 0;
    if (amt <= 0 || !descripcion.trim()) return;

    addExpense({
      descripcion: descripcion.trim(),
      monto: amt,
      categoria,
      pagadoDesdeCaja,
    });

    soundManager.playPaymentSuccess();
    setDescripcion('');
    setMonto('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none p-4 space-y-4">
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100">Control de Gastos Operativos</h1>
            <p className="text-xs text-slate-400">Salidas de dinero por servicios básicos, salarios, hielo y compras menores</p>
          </div>
        </div>

        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right text-xs">
          <span className="text-slate-400">Total Gastos Registrados: </span>
          <span className="text-base font-black text-rose-400">
            {config.monedaSimbolo}
            {totalGastos.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Formulario para registrar gasto */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Nuevo Gasto</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Descripción del Gasto:</label>
              <input
                type="text"
                required
                placeholder="Ej: Pago de luz Enel, 2 bolsas de hielo..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Monto ({config.monedaSimbolo}):</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="0.00"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Categoría:</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full h-10 px-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="servicios">Servicios (Luz/Agua)</option>
                  <option value="salarios">Salarios / Turnos</option>
                  <option value="insumos">Bolsas / Empaques</option>
                  <option value="hielo">Hielo / Perecederos</option>
                  <option value="limpieza">Limpieza / Mantenimiento</option>
                  <option value="otros">Otros Gastos</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="desdeCaja"
                checked={pagadoDesdeCaja}
                onChange={e => setPagadoDesdeCaja(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <label htmlFor="desdeCaja" className="text-slate-300 text-xs cursor-pointer">
                Descontar de la caja actual (Retiro)
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Gasto</span>
            </button>
          </form>
        </div>

        {/* Tabla de Gastos Recientes */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs font-bold text-slate-300">
            <span>Historial de Gastos</span>
            <span className="text-slate-500">{expenses.length} registros</span>
          </div>

          <div className="overflow-x-auto flex-1 p-3">
            {expenses.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No hay gastos registrados en la sesión
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2">Descripción</th>
                    <th className="pb-2">Categoría</th>
                    <th className="pb-2">Origen</th>
                    <th className="pb-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {expenses.map((exp: OperationalExpense) => (
                    <tr key={exp.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 text-slate-400">
                        {new Date(exp.fecha).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2.5 font-bold text-slate-200">{exp.descripcion}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase text-[10px] font-semibold">
                          {exp.categoria}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {exp.pagadoDesdeCaja ? 'Caja Mostrador' : 'Caja Chica Externa'}
                      </td>
                      <td className="py-2.5 text-right font-black text-rose-400">
                        -{config.monedaSimbolo}{exp.monto.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Search,
  Plus,
  MessageCircle,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react';
import { Customer } from '../types';
import { soundManager } from '../utils/audioHaptics';

export const CreditFiadoView: React.FC = () => {
  const { customers, registerCustomerPayment, addNewCustomer, config } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('efectivo');

  // Modal para nuevo cliente
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustNickname, setNewCustNickname] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('1000');
  const [newCustDays, setNewCustDays] = useState('15');

  const filteredCustomers = customers.filter(
    (c: Customer) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.apodo && c.apodo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalCarteraFiado = customers.reduce((sum: number, c: Customer) => sum + c.saldoDeudorActual, 0);

  const selectedCustomer = customers.find((c: Customer) => c.id === selectedCustomerId);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !paymentAmount) return;

    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) return;

    registerCustomerPayment(selectedCustomerId, amt, paymentMethod, 'Abono en mostrador');
    setPaymentAmount('');
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    addNewCustomer({
      nombre: newCustName.trim(),
      apodo: newCustNickname.trim() || undefined,
      telefono: newCustPhone.trim() || undefined,
      whatsapp: newCustPhone.trim().replace(/[^0-9]/g, '') || undefined,
      limiteCredito: parseFloat(newCustLimit) || 500,
      plazoDias: parseInt(newCustDays) || 15,
    });

    soundManager.playPaymentSuccess();
    setIsAddCustomerOpen(false);
    setNewCustName('');
    setNewCustNickname('');
    setNewCustPhone('');
  };

  const getWhatsAppStatementUrl = (cust: Customer) => {
    const phone = cust.whatsapp || cust.telefono?.replace(/[^0-9]/g, '');
    if (!phone) return '#';
    const text = `*${config.nombreNegocio} - Estado de Cuenta*%0A` +
      `Estimado/a ${cust.nombre}, le saludamos cordialmente.%0A%0A` +
      `Su saldo actual pendiente en su libreta de confianza es de: *${config.monedaSimbolo}${cust.saldoDeudorActual.toFixed(2)}*%0A` +
      `Límite asignado: ${config.monedaSimbolo}${cust.limiteCredito.toFixed(2)}%0A%0A` +
      `Agradecemos su puntual pago en caja o vía transferencia.%0A¡Dios le bendiga!`;
    return `https://wa.me/${phone}?text=${text}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Barra de Encabezado con Métricas de Fiados */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100">Libreta de Fiados & Cuentas por Cobrar</h1>
            <p className="text-xs text-slate-400">Control de créditos a vecinos y recordatorios por WhatsApp</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
            <span className="text-slate-400">Total en la Calle (Fiado): </span>
            <span className="font-black text-amber-400">
              {config.monedaSimbolo}
              {totalCarteraFiado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Contenido: Lista y Panel de Abonos */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden p-4 gap-4">
        {/* Lista de Clientes */}
        <div className="lg:col-span-7 flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-slate-800 bg-slate-950/60">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o apodo (ej. Doña Martha, Don Chepe)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredCustomers.map((cust: Customer) => {
              const isSelected = selectedCustomerId === cust.id;
              const hasDebt = cust.saldoDeudorActual > 0;
              const isOverLimit = cust.saldoDeudorActual >= cust.limiteCredito;

              return (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomerId(cust.id);
                    soundManager.playTouchClick();
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500 text-white'
                      : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100 truncate">{cust.nombre}</span>
                      {cust.apodo && (
                        <span className="text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                          {cust.apodo}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Tel: {cust.telefono || 'Sin teléfono'} • Plazo: {cust.plazoDias} días
                    </div>
                  </div>

                  {/* Saldo Deudor y Acciones */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Deuda Actual:</div>
                      <div
                        className={`text-base font-black ${
                          isOverLimit
                            ? 'text-rose-400'
                            : hasDebt
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {config.monedaSimbolo}
                        {cust.saldoDeudorActual.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Límite: {config.monedaSimbolo}{cust.limiteCredito}
                      </div>
                    </div>

                    {/* Botón WhatsApp */}
                    {cust.whatsapp && hasDebt && (
                      <a
                        href={getWhatsAppStatementUrl(cust)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition"
                        title="Enviar estado de cuenta por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Derecho: Registrar Abono y Detalle del Cliente */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden">
          {selectedCustomer ? (
            <div className="h-full flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-base text-white">{selectedCustomer.nombre}</h3>
                    <span className="text-xs text-indigo-400 font-semibold">{selectedCustomer.apodo}</span>
                  </div>

                  {selectedCustomer.bloqueadoPorMora && (
                    <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                      <Lock className="w-3 h-3" /> Bloqueado
                    </span>
                  )}
                </div>

                {/* Resumen Financiero del Cliente */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Límite de Crédito:</span>
                    <span className="font-bold text-slate-200">{config.monedaSimbolo}{selectedCustomer.limiteCredito.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-400">Saldo Pendiente:</span>
                    <span className="text-amber-400">{config.monedaSimbolo}{selectedCustomer.saldoDeudorActual.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="text-slate-400">Crédito Disponible:</span>
                    <span className="text-emerald-400 font-bold">
                      {config.monedaSimbolo}
                      {Math.max(0, selectedCustomer.limiteCredito - selectedCustomer.saldoDeudorActual).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Formulario de Registro de Abono */}
                <form onSubmit={handlePaymentSubmit} className="space-y-3 pt-2">
                  <h4 className="font-bold text-xs text-slate-300">Registrar Abono a la Deuda:</h4>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('efectivo')}
                      className={`h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                        paymentMethod === 'efectivo'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                        paymentMethod === 'transferencia'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Transferencia
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {config.monedaSimbolo}
                    </span>
                    <input
                      type="number"
                      step="1"
                      placeholder="Monto a abonar..."
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 bg-slate-950 border border-slate-700 rounded-xl text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Píldora de Pago Total Rápido */}
                  {selectedCustomer.saldoDeudorActual > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(selectedCustomer.saldoDeudorActual.toString())}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer block"
                    >
                      Pagar deuda total ({config.monedaSimbolo}{selectedCustomer.saldoDeudorActual.toFixed(2)})
                    </button>
                  )}

                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Abono y Rebajar Saldo</span>
                  </button>
                </form>
              </div>

              {/* Botón Compartir Estado */}
              {selectedCustomer.whatsapp && selectedCustomer.saldoDeudorActual > 0 && (
                <a
                  href={getWhatsAppStatementUrl(selectedCustomer)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-10 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Enviar Recordatorio por WhatsApp</span>
                </a>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
              <Users className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-semibold">Selecciona un cliente de la lista</p>
              <p className="text-xs text-slate-600 mt-1">Podrás ver su saldo y registrar abonos en efectivo o banco.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Cliente */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Dar de Alta a Nuevo Cliente</h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: José Luis Estrada"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Apodo / Referencia Vecinal:</label>
                <input
                  type="text"
                  placeholder="Ej: Chepe Pulpero, Doña María Costurera"
                  value={newCustNickname}
                  onChange={e => setNewCustNickname(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">WhatsApp / Teléfono:</label>
                <input
                  type="text"
                  placeholder="Ej: 50588997766"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Límite de Crédito:</label>
                  <input
                    type="number"
                    step="50"
                    value={newCustLimit}
                    onChange={e => setNewCustLimit(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Plazo en Días:</label>
                  <input
                    type="number"
                    value={newCustDays}
                    onChange={e => setNewCustDays(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Banknote,
  CreditCard,
  Send,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { soundManager } from '../../utils/audioHaptics';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { cart, config, customers, completeSale, isProcessingSale } = useApp();

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'fiado'>('efectivo');
  const [cashReceived, setCashReceived] = useState<string>(total.toString());
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [reference, setReference] = useState<string>('');
  const [completedSaleTicket, setCompletedSaleTicket] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, numCashReceived - total);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Botones de denominaciones rápidas
  const quickBills = [50, 100, 200, 500, 1000];

  const handleConfirmPayment = async () => {
    if (isSubmitting || isProcessingSale) return;

    setErrorMessage(null);

    if (paymentMethod === 'efectivo' && numCashReceived < total) {
      soundManager.playError();
      setErrorMessage(
        `El monto recibido (${config.monedaSimbolo}${numCashReceived}) es menor al total (${config.monedaSimbolo}${total})`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[PaymentModal] Iniciando cobro de venta:', {
        metodo: paymentMethod,
        montoRecibido: paymentMethod === 'efectivo' ? numCashReceived : total,
        total,
        cliente: selectedCustomer?.nombre,
      });

      const result = await completeSale({
        metodo: paymentMethod,
        montoRecibido: paymentMethod === 'efectivo' ? numCashReceived : total,
        clienteId: paymentMethod === 'fiado' ? selectedCustomerId : undefined,
        referencia: reference || undefined,
      });

      console.log('[PaymentModal] Respuesta de completeSale en frontend:', result);

      if (result.success && result.sale) {
        setCompletedSaleTicket(result.sale);
      } else {
        soundManager.playError();
        setErrorMessage(result.error || 'Error al procesar la venta en Supabase');
      }
    } catch (err: any) {
      soundManager.playError();
      console.error('[PaymentModal] Excepción no controlada en cobro:', err);
      setErrorMessage(err.message || 'Error inesperado durante el procesamiento de la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAll = () => {
    setCompletedSaleTicket(null);
    setErrorMessage(null);
    onClose();
  };

  const getWhatsAppMessageUrl = () => {
    if (!completedSaleTicket || !selectedCustomer?.whatsapp) return '';
    const itemsText = completedSaleTicket.items
      .map((i: any) => `• ${i.cantidad}x ${i.producto.nombre} (${i.presentacion.nombre}): ${config.monedaSimbolo}${i.subtotal}`)
      .join('%0A');
    const msg = `*${config.nombreNegocio}*%0A` +
      `¡Hola ${selectedCustomer.nombre}! Su compra ha sido registrada:%0A` +
      `Ticket: ${completedSaleTicket.numeroTicket}%0A%0A` +
      `*Detalle:*%0A${itemsText}%0A%0A` +
      `*Total: ${config.monedaSimbolo}${completedSaleTicket.total}*%0A` +
      (paymentMethod === 'fiado'
        ? `*Nuevo Saldo Deudor:* ${config.monedaSimbolo}${selectedCustomer.saldoDeudorActual}%0A`
        : '') +
      `¡Gracias por su preferencia!`;
    return `https://wa.me/${selectedCustomer.whatsapp}?text=${msg}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Encabezado del Modal */}
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                {completedSaleTicket ? 'Venta Completada con Éxito' : 'Cobrar Venta'}
              </h2>
              <span className="text-[11px] text-slate-400">Total: {config.monedaSimbolo}{total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleCloseAll}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido: Si ya se completó la venta, mostrar comprobante / ticket */}
        {completedSaleTicket ? (
          <div className="p-5 flex flex-col items-center text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">¡Venta Exitosa!</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ticket #{completedSaleTicket.numeroTicket}</p>
            </div>

            {/* Resumen del Ticket */}
            <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-left font-mono text-xs space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-800">
                <div className="font-bold text-slate-200">{config.nombreNegocio}</div>
                <div className="text-[10px] text-slate-500">{config.direccion}</div>
              </div>

              <div className="space-y-1 max-h-32 overflow-y-auto">
                {completedSaleTicket.items.map((it: any) => (
                  <div key={it.id} className="flex justify-between text-slate-300 text-[11px]">
                    <span className="truncate pr-2">
                      {it.cantidad}x {it.producto.nombre} ({it.presentacion.nombre})
                    </span>
                    <span className="shrink-0">{config.monedaSimbolo}{it.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-800 space-y-1">
                <div className="flex justify-between font-bold text-sm text-emerald-400">
                  <span>TOTAL:</span>
                  <span>{config.monedaSimbolo}{completedSaleTicket.total.toFixed(2)}</span>
                </div>
                {paymentMethod === 'efectivo' && (
                  <>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Efectivo Recibido:</span>
                      <span>{config.monedaSimbolo}{completedSaleTicket.pagos[0]?.montoRecibido?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-cyan-400 text-xs">
                      <span>Cambio / Vuelto:</span>
                      <span>{config.monedaSimbolo}{completedSaleTicket.pagos[0]?.cambio?.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Acciones Finales: WhatsApp y Nueva Venta */}
            <div className="w-full grid grid-cols-2 gap-2 pt-2">
              {selectedCustomer?.whatsapp && (
                <a
                  href={getWhatsAppMessageUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="col-span-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Ticket WhatsApp</span>
                </a>
              )}

              <button
                onClick={handleCloseAll}
                className={`${
                  selectedCustomer?.whatsapp ? 'col-span-1' : 'col-span-2'
                } h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition`}
              >
                <Receipt className="w-4 h-4" />
                <span>Nueva Venta</span>
              </button>
            </div>
          </div>
        ) : (
          /* Flujo de Cobro: Selector de Método y Monto */
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* 1. Selector de Método de Pago */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => {
                  setPaymentMethod('efectivo');
                  soundManager.playTouchClick();
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer active:scale-95 ${
                  paymentMethod === 'efectivo'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Efectivo</span>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod('tarjeta');
                  soundManager.playTouchClick();
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer active:scale-95 ${
                  paymentMethod === 'tarjeta'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Tarjeta</span>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod('transferencia');
                  soundManager.playTouchClick();
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer active:scale-95 ${
                  paymentMethod === 'transferencia'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Send className="w-5 h-5" />
                <span className="text-xs">Transf.</span>
              </button>

              <button
                onClick={() => {
                  setPaymentMethod('fiado');
                  soundManager.playTouchClick();
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer active:scale-95 ${
                  paymentMethod === 'fiado'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span className="text-xs">Al Fiado</span>
              </button>
            </div>

            {/* 2. Configuración según Método */}
            {paymentMethod === 'efectivo' && (
              <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">Efectivo Recibido:</label>
                  <button
                    onClick={() => setCashReceived(total.toString())}
                    className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold cursor-pointer"
                  >
                    Pago Exacto
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                    {config.monedaSimbolo}
                  </span>
                  <input
                    type="number"
                    step="1"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 bg-slate-900 border border-slate-700 rounded-xl text-xl font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Billetes de denominación rápida */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {quickBills.map(bill => (
                    <button
                      key={bill}
                      onClick={() => {
                        setCashReceived(bill.toString());
                        soundManager.playTouchClick();
                      }}
                      className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      +{bill}
                    </button>
                  ))}
                </div>

                {/* Cálculo de Cambio / Vuelto en Vivo */}
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300">Cambio a Entregar:</span>
                  <span
                    className={`text-2xl font-black ${
                      changeDue >= 0 ? 'text-cyan-400' : 'text-rose-400'
                    }`}
                  >
                    {config.monedaSimbolo}
                    {changeDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* 3. Modo Al Fiado (Crédito de Pulpería) */}
            {paymentMethod === 'fiado' && (
              <div className="space-y-3 bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-500/30">
                <label className="text-xs font-bold text-indigo-300 block">Seleccionar Cliente de la Libreta:</label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apodo ? `(${c.apodo})` : ''} - Deuda: {config.monedaSimbolo}{c.saldoDeudorActual}
                    </option>
                  ))}
                </select>

                {selectedCustomer && (
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Límite de Crédito:</span>
                      <span className="font-bold text-slate-200">{config.monedaSimbolo}{selectedCustomer.limiteCredito}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Deuda Actual:</span>
                      <span className="font-bold text-amber-400">{config.monedaSimbolo}{selectedCustomer.saldoDeudorActual}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                      <span className="text-slate-300">Saldo tras esta compra:</span>
                      <span className="text-emerald-400">
                        {config.monedaSimbolo}
                        {(selectedCustomer.saldoDeudorActual + total).toFixed(2)}
                      </span>
                    </div>

                    {selectedCustomer.saldoDeudorActual + total > selectedCustomer.limiteCredito && (
                      <div className="flex items-center gap-1.5 text-rose-400 text-[11px] pt-1 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>¡Excede el límite de crédito permitido!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Referencia opcional para tarjeta/transferencia */}
            {(paymentMethod === 'tarjeta' || paymentMethod === 'transferencia') && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nº Referencia o Autorización:</label>
                <input
                  type="text"
                  placeholder="Ej: POS-00912 o Transf. Bancaria..."
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Alerta Visual Roja de Error Estricto (Supabase / Validación) */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-950/80 border-2 border-rose-500/70 rounded-xl text-rose-200 text-xs flex flex-col gap-2 animate-in fade-in zoom-in-95 shadow-lg shadow-rose-950/50">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between font-bold text-rose-300">
                      <span className="text-xs uppercase tracking-wide">Error al Registrar Venta en Supabase</span>
                      <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="text-slate-400 hover:text-white p-0.5 rounded transition"
                        title="Descartar alerta"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-2.5 bg-slate-950/90 rounded-lg border border-rose-500/30 text-[11px] font-mono text-rose-300 break-words leading-relaxed select-text">
                      {errorMessage}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-rose-400/90 font-medium">
                      <span>⚠️ El carrito NO ha sido limpiado. La transacción no se completó en Supabase.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de Confirmación Principal */}
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isSubmitting || isProcessingSale}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-95"
            >
              {isSubmitting || isProcessingSale ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                  <span>Registrando Venta en Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-slate-950" />
                  <span>Confirmar Venta ({config.monedaSimbolo}{total.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

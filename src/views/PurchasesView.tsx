import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Truck, 
  Plus, 
  ShoppingBag, 
  Receipt, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Phone, 
  Mail, 
  Building 
} from 'lucide-react';
import { soundManager } from '../utils/audioHaptics';

export const PurchasesView: React.FC = () => {
  const { 
    suppliers, 
    purchases, 
    products, 
    addNewSupplier, 
    registerPurchase, 
    config 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'recepcion' | 'proveedores' | 'historial'>('recepcion');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado Formulario Recepción de Compra
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [tipoPago, setTipoPago] = useState<'contado' | 'credito'>('contado');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<Array<{
    productoId: string;
    presentacionId: string;
    cantidad: number;
    factorConversion: number;
    costoUnitario: number;
    subtotal: number;
  }>>([]);

  // Estado para añadir ítem a la lista de compra
  const [currentProductoId, setCurrentProductoId] = useState('');
  const [currentPresentacionId, setCurrentPresentacionId] = useState('');
  const [currentCantidad, setCurrentCantidad] = useState(1);
  const [currentCosto, setCurrentCosto] = useState(0);

  // Estado Formulario Nuevo Proveedor
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    nombreComercial: '',
    contactoNombre: '',
    telefono: '',
    email: '',
    ruc: '',
    direccion: '',
    diasCredito: 0,
  });

  // Búsqueda de proveedores
  const [searchSupplier, setSearchSupplier] = useState('');

  // Manejar cambio de producto seleccionado para ítem de compra
  const handleProductSelect = (prodId: string) => {
    setCurrentProductoId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod && prod.presentaciones.length > 0) {
      setCurrentPresentacionId(prod.presentaciones[0].id);
      setCurrentCosto(prod.presentaciones[0].precioCosto);
    } else {
      setCurrentPresentacionId('');
      setCurrentCosto(0);
    }
  };

  const handlePresentationSelect = (presId: string) => {
    setCurrentPresentacionId(presId);
    const prod = products.find(p => p.id === currentProductoId);
    const pres = prod?.presentaciones.find(pr => pr.id === presId);
    if (pres) {
      setCurrentCosto(pres.precioCosto);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProductoId || !currentPresentacionId || currentCantidad <= 0) {
      setErrorMessage('Selecciona un producto, presentación válida y cantidad mayor a 0');
      return;
    }

    const prod = products.find(p => p.id === currentProductoId);
    const pres = prod?.presentaciones.find(pr => pr.id === currentPresentacionId);
    const factor = pres?.factorConversion || 1;
    const subtotal = currentCantidad * currentCosto;

    setItems(prev => [
      ...prev,
      {
        productoId: currentProductoId,
        presentacionId: currentPresentacionId,
        cantidad: currentCantidad,
        factorConversion: factor,
        costoUnitario: currentCosto,
        subtotal: subtotal,
      }
    ]);

    // Resetear formulario de ítem
    setCurrentProductoId('');
    setCurrentPresentacionId('');
    setCurrentCantidad(1);
    setCurrentCosto(0);
    setErrorMessage(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calcular total de la compra en curso
  const totalCompra = items.reduce((sum, it) => sum + it.subtotal, 0);

  // Guardar Recepción de Compra en Supabase
  const handleSavePurchase = async () => {
    if (items.length === 0) {
      setErrorMessage('Agrega al menos un producto a la lista de compra');
      return;
    }
    if (!selectedProveedorId && suppliers.length > 0) {
      setErrorMessage('Por favor selecciona un proveedor de la lista');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await registerPurchase({
        proveedorId: selectedProveedorId || (suppliers[0]?.id ?? '00000000-0000-0000-0000-000000000000'),
        numeroFactura: numeroFactura.trim() || undefined,
        tipoPago: tipoPago,
        observaciones: observaciones.trim() || undefined,
        items,
      });

      if (!res.success) {
        soundManager.playError();
        setErrorMessage(res.error || 'Error al guardar la compra en Supabase');
        return;
      }

      soundManager.playPaymentSuccess();
      setSuccessMessage('¡Compra y recepción de mercadería registradas con éxito en Supabase!');
      setItems([]);
      setNumeroFactura('');
      setObservaciones('');
      setSelectedProveedorId('');
    } catch (err: any) {
      soundManager.playError();
      setErrorMessage(err.message || 'Error inesperado al conectar con Supabase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar Nuevo Proveedor en Supabase
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.nombreComercial.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await addNewSupplier({
        nombreComercial: supplierForm.nombreComercial.trim(),
        contactoNombre: supplierForm.contactoNombre.trim() || undefined,
        telefono: supplierForm.telefono.trim() || undefined,
        email: supplierForm.email.trim() || undefined,
        ruc: supplierForm.ruc.trim() || undefined,
        direccion: supplierForm.direccion.trim() || undefined,
        diasCredito: supplierForm.diasCredito || 0,
      });

      if (!res.success) {
        soundManager.playError();
        setErrorMessage(res.error || 'Error al registrar el proveedor en Supabase');
        return;
      }

      soundManager.playPaymentSuccess();
      setShowSupplierModal(false);
      setSupplierForm({
        nombreComercial: '',
        contactoNombre: '',
        telefono: '',
        email: '',
        ruc: '',
        direccion: '',
        diasCredito: 0,
      });
    } catch (err: any) {
      soundManager.playError();
      setErrorMessage(err.message || 'Error inesperado al conectar con Supabase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.nombreComercial.toLowerCase().includes(searchSupplier.toLowerCase()) ||
    (s.contactoNombre && s.contactoNombre.toLowerCase().includes(searchSupplier.toLowerCase())) ||
    (s.ruc && s.ruc.includes(searchSupplier))
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100">Compras, Proveedores & Recepción de Mercadería</h1>
            <p className="text-xs text-slate-400">Registra entradas de stock con afectación inmediata a inventario real</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('recepcion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'recepcion'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Recepción de Mercadería</span>
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'proveedores'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Directorio Proveedores ({suppliers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'historial'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Historial Compras ({purchases.length})</span>
          </button>
        </div>
      </div>

      {/* Global Alerts Banner */}
      {errorMessage && (
        <div className="m-4 mb-0 p-3.5 bg-rose-950/80 border-2 border-rose-500/70 rounded-xl flex items-start gap-2.5 text-rose-200 text-xs animate-shake shadow-lg shadow-rose-950/40 shrink-0">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Rechazo de Supabase / Base de Datos:</span> {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="m-4 mb-0 p-3.5 bg-emerald-950/80 border-2 border-emerald-500/70 rounded-xl flex items-start gap-2.5 text-emerald-200 text-xs shadow-lg shadow-emerald-950/40 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main View Body */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* TAB 1: RECEPCIÓN DE MERCADERÍA */}
        {activeTab === 'recepcion' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Columna Izquierda: Encabezado de Compra y Agregar Ítem */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Datos de la Factura de Compra</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Proveedor *</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedProveedorId}
                      onChange={e => setSelectedProveedorId(e.target.value)}
                      className="flex-1 h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Selecciona Proveedor --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.nombreComercial}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowSupplierModal(true)}
                      className="px-2.5 h-9 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition cursor-pointer"
                      title="Crear Nuevo Proveedor"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">N° de Factura</label>
                    <input
                      type="text"
                      placeholder="Ej: F-10294"
                      value={numeroFactura}
                      onChange={e => setNumeroFactura(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de Pago</label>
                    <select
                      value={tipoPago}
                      onChange={e => setTipoPago(e.target.value as 'contado' | 'credito')}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="contado">Contado</option>
                      <option value="credito">Crédito</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Observaciones</label>
                  <input
                    type="text"
                    placeholder="Notas o detalles de la entrega"
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <h3 className="font-bold text-xs text-slate-200 mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Agregar Producto al Envío</span>
                </h3>

                <form onSubmit={handleAddItem} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Producto</label>
                    <select
                      value={currentProductoId}
                      onChange={e => handleProductSelect(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Selecciona Producto --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} (Stock actual: {p.existenciaBase} {p.unidadMedidaBase}s)
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentProductoId && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Presentación / Formato</label>
                        <select
                          value={currentPresentacionId}
                          onChange={e => handlePresentationSelect(e.target.value)}
                          className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          {products.find(p => p.id === currentProductoId)?.presentaciones.map(pr => (
                            <option key={pr.id} value={pr.id}>
                              {pr.nombre} (Factor: {pr.factorConversion}, Costo: {config.monedaSimbolo}{pr.precioCosto.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cantidad a Ingresar</label>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={currentCantidad}
                            onChange={e => setCurrentCantidad(parseFloat(e.target.value) || 0)}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Costo Unitario ({config.monedaSimbolo})</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentCosto}
                            onChange={e => setCurrentCosto(parseFloat(e.target.value) || 0)}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full h-9 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir a la Factura</span>
                      </button>
                    </>
                  )}
                </form>
              </div>
            </div>

            {/* Columna Derecha: Detalle de Ítems e Impacto de Stock */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                    <span>Lote de Mercadería por Recibir ({items.length} ítems)</span>
                  </h2>
                  <span className="text-xs text-slate-400">
                    Al confirmar, las existencias en Supabase se incrementarán en tiempo real
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">
                    <Truck className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-400" />
                    <p className="text-xs">No has agregado productos a esta recepción de compra</p>
                    <p className="text-[11px] text-slate-600 mt-1">Usa el formulario lateral para añadir ítems</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Producto</th>
                          <th className="p-2.5">Presentación</th>
                          <th className="p-2.5 text-center">Cantidad</th>
                          <th className="p-2.5 text-right">Costo Unitario</th>
                          <th className="p-2.5 text-right">Subtotal</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {items.map((it, idx) => {
                          const prod = products.find(p => p.id === it.productoId);
                          const pres = prod?.presentaciones.find(pr => pr.id === it.presentacionId);

                          return (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="p-2.5 font-bold text-slate-200">
                                {prod?.nombre || 'Producto no encontrado'}
                              </td>
                              <td className="p-2.5 text-slate-300">
                                {pres?.nombre || 'Unidad'}
                              </td>
                              <td className="p-2.5 text-center font-bold text-amber-400">
                                {it.cantidad}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-300">
                                {config.monedaSimbolo}{it.costoUnitario.toFixed(2)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                                {config.monedaSimbolo}{it.subtotal.toFixed(2)}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pie de Compra: Total y Confirmación */}
              <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Total a Pagar Factura:</span>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {config.monedaSimbolo}{totalCompra.toFixed(2)}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || items.length === 0}
                  onClick={handleSavePurchase}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registrando en Supabase...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar e Ingresar a Inventario</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECTORIO DE PROVEEDORES */}
        {activeTab === 'proveedores' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre comercial, contacto o RUC/RTN..."
                  value={searchSupplier}
                  onChange={e => setSearchSupplier(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowSupplierModal(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Proveedor (Nube)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSuppliers.map(sup => (
                <div key={sup.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-100">{sup.nombreComercial}</h3>
                      {sup.contactoNombre && (
                        <p className="text-xs text-amber-400">Contacto: {sup.contactoNombre}</p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                      RUC/RTN: {sup.ruc || 'N/A'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 space-y-1 text-xs text-slate-400">
                    {sup.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{sup.telefono}</span>
                      </div>
                    )}
                    {sup.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{sup.email}</span>
                      </div>
                    )}
                    {sup.direccion && (
                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        {sup.direccion}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HISTORIAL DE COMPRAS */}
        {activeTab === 'historial' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-xs text-slate-200">Facturas de Compra Registradas en Supabase</h2>
              <span className="text-xs text-slate-400">Total: {purchases.length} compras</span>
            </div>

            {purchases.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No hay compras registradas en la base de datos aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Factura #</th>
                      <th className="p-3">Proveedor</th>
                      <th className="p-3 text-center">Ítems</th>
                      <th className="p-3 text-right">Total Factura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {purchases.map(p => {
                      const sup = suppliers.find(s => s.id === p.proveedorId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30">
                          <td className="p-3 font-mono text-slate-300">
                            {new Date(p.fechaEmision).toLocaleDateString()}
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-400">
                            {p.numeroFactura || 'S/N'}
                          </td>
                          <td className="p-3 text-slate-200">
                            {sup ? sup.nombreComercial : (p.proveedorNombre || 'Proveedor Casual')}
                          </td>
                          <td className="p-3 text-center text-slate-400">
                            {p.items?.length || 0}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            {config.monedaSimbolo}{p.total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Nuevo Proveedor */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                <span>Registrar Nuevo Proveedor (Supabase)</span>
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nombre Comercial de la Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cervecería Hondureña / Embotelladora"
                  value={supplierForm.nombreComercial}
                  onChange={e => setSupplierForm({ ...supplierForm, nombreComercial: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej: Lic. Carlos Perez"
                    value={supplierForm.contactoNombre}
                    onChange={e => setSupplierForm({ ...supplierForm, contactoNombre: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: 9988-7766"
                    value={supplierForm.telefono}
                    onChange={e => setSupplierForm({ ...supplierForm, telefono: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">RTN / RUC</label>
                  <input
                    type="text"
                    placeholder="Ej: 0801199012345"
                    value={supplierForm.ruc}
                    onChange={e => setSupplierForm({ ...supplierForm, ruc: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="ventas@proveedor.com"
                    value={supplierForm.email}
                    onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Dirección Física</label>
                <input
                  type="text"
                  placeholder="Dirección o bodega"
                  value={supplierForm.direccion}
                  onChange={e => setSupplierForm({ ...supplierForm, direccion: e.target.value })}
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowSupplierModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition shadow disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Proveedor</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Package,
  Layers,
  History,
  Plus,
  Search,
  Calendar,
  X,
} from 'lucide-react';
import { Product, ProductPresentation, KardexMovement } from '../types';
import { soundManager } from '../utils/audioHaptics';

export const InventoryView: React.FC = () => {
  const {
    products,
    addPresentationToProduct,
    deletePresentationFromProduct,
    quickRegisterProduct,
    categories,
    kardex,
    config,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'catalogo' | 'kardex'>('catalogo');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditingPresentations, setIsEditingPresentations] = useState(false);
  const [presError, setPresError] = useState<string | null>(null);
  const [isSubmittingPres, setIsSubmittingPres] = useState(false);

  // Formulario para nueva presentación
  const [newPresName, setNewPresName] = useState('');
  const [newPresFactor, setNewPresFactor] = useState('1');
  const [newPresBarcode, setNewPresBarcode] = useState('');
  const [newPresCost, setNewPresCost] = useState('');
  const [newPresPrice, setNewPresPrice] = useState('');

  // Formulario para nuevo producto desde Inventario
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProdError, setNewProdError] = useState<string | null>(null);
  const [isSubmittingProd, setIsSubmittingProd] = useState(false);
  const [prodNombre, setProdNombre] = useState('');
  const [prodCategoriaId, setProdCategoriaId] = useState(categories[0]?.id || '');
  const [prodUnidad, setProdUnidad] = useState('unidad');
  const [prodCodigo, setProdCodigo] = useState('');
  const [prodCosto, setProdCosto] = useState('');
  const [prodVenta, setProdVenta] = useState('');
  const [prodStock, setProdStock] = useState('10');
  const prodMinimo = '5';
  const prodMaximo = '100';

  const filteredProducts = products.filter(
    (p: Product) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.presentaciones.some((pr: ProductPresentation) => pr.codigoBarras.includes(searchTerm))
  );

  // Calcular valorización total del inventario
  const valorTotalInventario = products.reduce((sum: number, p: Product) => {
    const basePres = p.presentaciones.find((pr: ProductPresentation) => pr.esPresentacionBase) || p.presentaciones[0];
    const costo = basePres ? basePres.precioCosto / basePres.factorConversion : 0;
    return sum + p.existenciaBase * costo;
  }, 0);

  const handleAddPresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    setPresError(null);
    if (!selectedProduct || !newPresName.trim() || !newPresPrice) return;

    const factor = parseFloat(newPresFactor) || 1;
    const costo = parseFloat(newPresCost) || 0;
    const venta = parseFloat(newPresPrice) || 0;

    setIsSubmittingPres(true);
    try {
      const res = await addPresentationToProduct(selectedProduct.id, {
        nombre: newPresName.trim(),
        factorConversion: factor,
        codigoBarras: newPresBarcode.trim(),
        precioCosto: costo,
        precioVenta: venta,
      });

      if (!res.success || !res.presentation) {
        soundManager.playError();
        setPresError(`Error de Supabase: ${res.error || 'No se pudo crear la presentación'}`);
        return;
      }

      // Actualizar producto seleccionado en modal
      setSelectedProduct(prev =>
        prev
          ? {
              ...prev,
              presentaciones: [...prev.presentaciones, res.presentation!],
            }
          : null
      );

      setNewPresName('');
      setNewPresFactor('1');
      setNewPresBarcode('');
      setNewPresCost('');
      setNewPresPrice('');
      soundManager.playPaymentSuccess();
    } catch (err: any) {
      soundManager.playError();
      setPresError(err.message || 'Error inesperado agregando presentación');
    } finally {
      setIsSubmittingPres(false);
    }
  };

  const handleDeletePresentation = async (presId: string) => {
    if (!selectedProduct) return;
    if (selectedProduct.presentaciones.length <= 1) {
      alert('El producto debe tener al menos una presentación activa');
      return;
    }
    const res = await deletePresentationFromProduct(presId);
    if (!res.success) {
      soundManager.playError();
      alert(`Error al eliminar presentación: ${res.error}`);
      return;
    }

    setSelectedProduct(prev =>
      prev
        ? {
            ...prev,
            presentaciones: prev.presentaciones.filter((pr: ProductPresentation) => pr.id !== presId),
          }
        : null
    );
    soundManager.playTouchClick();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewProdError(null);
    if (!prodNombre.trim() || !prodVenta) {
      soundManager.playError();
      setNewProdError('Por favor complete los campos obligatorios (*).');
      return;
    }

    setIsSubmittingProd(true);
    try {
      const res = await quickRegisterProduct({
        nombre: prodNombre.trim(),
        codigoBarras: prodCodigo.trim(),
        precioCosto: parseFloat(prodCosto) || 0,
        precioVenta: parseFloat(prodVenta) || 0,
        categoriaId: prodCategoriaId,
        stockInicial: parseFloat(prodStock) || 0,
        unidadMedidaBase: prodUnidad,
        stockMinimo: parseFloat(prodMinimo) || 5,
        stockMaximo: parseFloat(prodMaximo) || 100,
      });

      if (!res.success) {
        soundManager.playError();
        setNewProdError(`Error de Supabase: ${res.error || 'No se pudo crear el producto'}`);
        return;
      }

      setIsAddingProduct(false);
      setProdNombre('');
      setProdCodigo('');
      setProdCosto('');
      setProdVenta('');
      setProdStock('10');
      soundManager.playPaymentSuccess();
    } catch (err: any) {
      soundManager.playError();
      setNewProdError(err.message || 'Error inesperado creando producto');
    } finally {
      setIsSubmittingProd(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Barra Superior con Métricas de Inventario */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100">Catálogo, Presentaciones y Kardex</h1>
            <p className="text-xs text-slate-400">Control de stock en unidad base con factores de conversión</p>
          </div>
        </div>

        {/* Métricas Resumen */}
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400">Total Productos: </span>
            <span className="font-bold text-white">{products.length}</span>
          </div>

          <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <span className="text-slate-400">Valorización Estimada: </span>
            <span className="font-black text-emerald-400">
              {config.monedaSimbolo}
              {valorTotalInventario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Toggle Pestañas */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('catalogo')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTab === 'catalogo' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Catálogo
            </button>
            <button
              onClick={() => setActiveTab('kardex')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTab === 'kardex' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Kardex ({kardex.length})
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-hidden p-4">
        {activeTab === 'catalogo' ? (
          <div className="h-full flex flex-col gap-3">
            {/* Buscador & Botón Nuevo Producto */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o código de presentación..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => {
                  setNewProdError(null);
                  setIsAddingProduct(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nuevo Producto (Nube)</span>
              </button>
            </div>

            {/* Tabla de Productos con Presentaciones */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3">Producto</th>
                      <th className="p-3">Stock Base</th>
                      <th className="p-3">Presentaciones (Factor / Venta)</th>
                      <th className="p-3">Perecedero</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProducts.map((prod: Product) => {
                      const isLowStock = prod.existenciaBase <= prod.stockMinimo;
                      return (
                        <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            <div className="font-bold text-slate-100">{prod.nombre}</div>
                            <div className="text-[11px] text-slate-400">
                              Unidad Base: <span className="text-indigo-300 uppercase">{prod.unidadMedidaBase}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full font-bold ${
                                isLowStock
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400'
                              }`}
                            >
                              {prod.existenciaBase} {prod.unidadMedidaBase}s
                            </span>
                          </td>

                          {/* Presentaciones (Pills) */}
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1.5">
                              {prod.presentaciones.map((pr: ProductPresentation) => (
                                <div
                                  key={pr.id}
                                  className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700/80 text-[11px] flex items-center gap-1.5"
                                >
                                  <span className="font-bold text-slate-200">{pr.nombre}</span>
                                  <span className="text-slate-500">(x{pr.factorConversion})</span>
                                  <span className="font-black text-emerald-400">
                                    {config.monedaSimbolo}
                                    {pr.precioVenta.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="p-3 text-slate-400">
                            {prod.perecedero && prod.fechaVencimientoProxima ? (
                              <div className="flex items-center gap-1 text-[11px] text-slate-300">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{prod.fechaVencimientoProxima}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedProduct(prod);
                                setIsEditingPresentations(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs border border-indigo-500/30 transition cursor-pointer active:scale-95"
                            >
                              + Presentaciones
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Pestaña Kardex */
          <div className="h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-xs font-bold text-slate-300">
              <span>Historial Inmutable de Kardex (Trazabilidad Total)</span>
              <span className="text-slate-500">{kardex.length} registros</span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Producto / Presentación</th>
                    <th className="p-3">Tipo Movimiento</th>
                    <th className="p-3">Cant. Base</th>
                    <th className="p-3">Saldo Anterior</th>
                    <th className="p-3">Saldo Nuevo</th>
                    <th className="p-3">Referencia</th>
                    <th className="p-3">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {kardex.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <span>Aún no hay movimientos registrados en este turno</span>
                      </td>
                    </tr>
                  ) : (
                    kardex.map((k: KardexMovement) => (
                      <tr key={k.id} className="hover:bg-slate-800/40 font-mono text-[11px]">
                        <td className="p-3 text-slate-400">
                          {new Date(k.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 font-sans font-bold text-slate-200">{k.productoNombre}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${
                              k.tipo === 'venta'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {k.tipo}
                          </span>
                        </td>
                        <td className={`p-3 font-bold ${k.cantidadBase < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {k.cantidadBase > 0 ? `+${k.cantidadBase}` : k.cantidadBase}
                        </td>
                        <td className="p-3 text-slate-400">{k.saldoAnterior}</td>
                        <td className="p-3 font-bold text-slate-100">{k.saldoNuevo}</td>
                        <td className="p-3 text-slate-400 font-sans">{k.referencia}</td>
                        <td className="p-3 text-slate-300 font-sans">{k.usuario}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal para Agregar / Gestionar Presentaciones Múltiples */}
      {isEditingPresentations && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Presentaciones de: {selectedProduct.nombre}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Stock Base Actual: {selectedProduct.existenciaBase} {selectedProduct.unidadMedidaBase}s
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditingPresentations(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Lista actual de presentaciones */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedProduct.presentaciones.map((pr: ProductPresentation) => (
                  <div
                    key={pr.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-200">
                        {pr.nombre}{' '}
                        {pr.esPresentacionBase && (
                          <span className="text-[10px] text-emerald-400 font-bold ml-1">(Base)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Factor: x{pr.factorConversion} {selectedProduct.unidadMedidaBase}s • Código:{' '}
                        <span className="font-mono text-slate-300">{pr.codigoBarras || 'Sin código'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-black text-emerald-400">
                          {config.monedaSimbolo}
                          {pr.precioVenta.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Costo: {config.monedaSimbolo}{pr.precioCosto.toFixed(2)}
                        </div>
                      </div>

                      {!pr.esPresentacionBase && (
                        <button
                          onClick={() => handleDeletePresentation(pr.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Eliminar presentación"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {presError && (
                <div className="p-3 mb-3 rounded-xl bg-rose-950/80 border-2 border-rose-500/70 text-rose-200 text-xs flex items-start gap-2">
                  <span className="text-sm">⚠️</span>
                  <div className="flex-1 font-semibold">{presError}</div>
                </div>
              )}

              {/* Formulario para añadir nueva presentación */}
              <form onSubmit={handleAddPresentation} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Añadir Nueva Presentación (ej. Six-Pack, Caja, Fardo):</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[11px] text-slate-400 block mb-0.5">Nombre:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Six-Pack"
                      value={newPresName}
                      onChange={e => setNewPresName(e.target.value)}
                      className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-0.5">Factor Conversión:</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="Ej: 6"
                      value={newPresFactor}
                      onChange={e => setNewPresFactor(e.target.value)}
                      className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-0.5">Código de Barras:</label>
                    <input
                      type="text"
                      placeholder="UPC / EAN..."
                      value={newPresBarcode}
                      onChange={e => setNewPresBarcode(e.target.value)}
                      className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-0.5">Precio Costo:</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="0.00"
                      value={newPresCost}
                      onChange={e => setNewPresCost(e.target.value)}
                      className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-emerald-400 font-bold block mb-0.5">Precio Venta:</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      placeholder="0.00"
                      value={newPresPrice}
                      onChange={e => setNewPresPrice(e.target.value)}
                      className="w-full h-8 px-2.5 bg-slate-900 border border-emerald-500/50 rounded-lg text-emerald-400 font-bold"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isSubmittingPres}
                      className={`w-full h-8 rounded-lg text-white font-bold text-xs transition cursor-pointer active:scale-95 ${
                        isSubmittingPres
                          ? 'bg-slate-700 opacity-60 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-500'
                      }`}
                    >
                      {isSubmittingPres ? 'Guardando...' : 'Añadir'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Añadir Nuevo Producto (100% Cloud) */}
      {isAddingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-sm text-slate-100">Nuevo Producto en Catálogo Cloud</h2>
              </div>
              <button
                onClick={() => setIsAddingProduct(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newProdError && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/80 border-2 border-rose-500/70 text-rose-200 text-xs flex items-start gap-2">
                <span className="text-sm">⚠️</span>
                <div className="flex-1 font-semibold">{newProdError}</div>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Producto *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Leche Eskimo Entera 1L"
                  value={prodNombre}
                  onChange={e => setProdNombre(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Categoría:</label>
                  <select
                    value={prodCategoriaId}
                    onChange={e => setProdCategoriaId(e.target.value)}
                    className="w-full h-9 px-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Unidad Base:</label>
                  <select
                    value={prodUnidad}
                    onChange={e => setProdUnidad(e.target.value)}
                    className="w-full h-9 px-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="unidad">Unidad</option>
                    <option value="libra">Libra</option>
                    <option value="kg">Kilogramo</option>
                    <option value="litro">Litro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Código de Barras:</label>
                  <input
                    type="text"
                    placeholder="Código de barras..."
                    value={prodCodigo}
                    onChange={e => setProdCodigo(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Stock Inicial (Base):</label>
                  <input
                    type="number"
                    value={prodStock}
                    onChange={e => setProdStock(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Precio Costo ({config.monedaSimbolo}):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={prodCosto}
                    onChange={e => setProdCosto(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Precio Venta ({config.monedaSimbolo}) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={prodVenta}
                    onChange={e => setProdVenta(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingProd}
                  className={`w-full h-11 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer active:scale-95 ${
                    isSubmittingProd
                      ? 'bg-slate-700 opacity-60 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmittingProd ? 'Guardando en Supabase...' : 'Guardar Producto en Supabase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, PlusCircle, AlertTriangle, X } from 'lucide-react';
import { Product, ProductPresentation } from '../../types';

interface ProductGridProps {
  onOpenQuickRegister: (barcode?: string) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ onOpenQuickRegister }) => {
  const { products, categories, addToCart, config } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'all' || p.categoriaId === selectedCategory;
      const cleanSearch = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !cleanSearch ||
        p.nombre.toLowerCase().includes(cleanSearch) ||
        p.presentaciones.some(pres => pres.codigoBarras.includes(cleanSearch) || pres.nombre.toLowerCase().includes(cleanSearch));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const handleAddPresentation = (product: Product, presentation: ProductPresentation, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, presentation, 1);
  };

  return (
    <div className="h-full flex flex-col gap-2.5 overflow-hidden">
      {/* Barra de Búsqueda y Filtro de Categorías */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, categoría o código de barras..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-9 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Píldoras de Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({products.length})
          </button>
          {categories.map(cat => {
            const count = products.filter(p => p.categoriaId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700/70'
                }`}
              >
                <span>{cat.nombre}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cuadrícula de Productos */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <AlertTriangle className="w-8 h-8 text-amber-500/80 mb-2" />
            <p className="text-sm font-bold text-slate-300">No se encontraron productos</p>
            <p className="text-xs text-slate-500 mt-1">¿Deseas darlo de alta rápidamente?</p>
            <button
              onClick={() => onOpenQuickRegister(searchTerm)}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar "{searchTerm}"</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filteredProducts.map(prod => {
              const baseStock = prod.existenciaBase;
              const isLowStock = baseStock <= prod.stockMinimo;
              const isDepleted = baseStock <= 0;

              return (
                <div
                  key={prod.id}
                  className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between transition-all shadow-sm hover:border-slate-600 select-none group"
                >
                  <div>
                    {/* Stock badge */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isDepleted
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : isLowStock
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {baseStock} {prod.unidadMedidaBase}s
                      </span>

                      {prod.perecedero && prod.fechaVencimientoProxima && (
                        <span className="text-[9px] text-slate-400">
                          Vence: {new Date(prod.fechaVencimientoProxima).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>

                    {/* Nombre del Producto */}
                    <h3 className="font-bold text-xs text-slate-100 line-clamp-2 leading-tight group-hover:text-emerald-400 transition-colors">
                      {prod.nombre}
                    </h3>
                  </div>

                  {/* Botones de Presentaciones Múltiples (Unidad, Six-pack, Caja, etc.) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-col gap-1">
                    {prod.presentaciones.map(pres => (
                      <button
                        key={pres.id}
                        onClick={e => handleAddPresentation(prod, pres, e)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-emerald-600 hover:text-white border border-slate-700 hover:border-emerald-500 text-slate-300 flex items-center justify-between text-xs transition cursor-pointer active:scale-95 group/btn"
                      >
                        <span className="font-medium text-[11px] truncate">{pres.nombre}</span>
                        <span className="font-black text-emerald-400 group-hover/btn:text-white shrink-0 ml-1">
                          {config.monedaSimbolo}
                          {pres.precioVenta.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

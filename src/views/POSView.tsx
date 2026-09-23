import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ProductGrid } from '../components/pos/ProductGrid';
import { CartTable } from '../components/pos/CartTable';
import { CartSummary } from '../components/pos/CartSummary';
import { PaymentModal } from '../components/pos/PaymentModal';
import { HeldCartsModal } from '../components/pos/HeldCartsModal';
import { QRPairModal } from '../components/pos/QRPairModal';
import { QuickRegisterModal } from '../components/pos/QuickRegisterModal';
import {
  Barcode,
  Camera,
  Smartphone,
  Inbox,
} from 'lucide-react';
import { soundManager } from '../utils/audioHaptics';

interface POSViewProps {
  onSwitchToMobileScanner: () => void;
}

export const POSView: React.FC<POSViewProps> = ({ onSwitchToMobileScanner }) => {
  const { findProductByBarcode, addToCart, cart, pauseCart, cashRegister } = useApp();

  const [barcodeInput, setBarcodeInput] = useState('');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHeldOpen, setIsHeldOpen] = useState(false);
  const [isQRPairOpen, setIsQRPairOpen] = useState(false);
  const [isQuickRegisterOpen, setIsQuickRegisterOpen] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState('');
  const [cashDrawerOpen, setCashDrawerOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const handleOpenPayment = () => {
    if (cashRegister.estado !== 'abierta' || !cashRegister.aperturaActual?.id) {
      soundManager.playError();
      alert('Debes abrir caja primero antes de poder cobrar.');
      return;
    }
    setIsPaymentOpen(true);
  };

  // Atajos de teclado globales (F12 Cobrar, F6 Pausar, F2 Buscar código)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) handleOpenPayment();
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length > 0) pauseCart();
      } else if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, pauseCart, cashRegister]);

  // Manejador del escáner de código de barras (USB o manual)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcodeInput.trim();
    if (!clean) return;

    const match = findProductByBarcode(clean);
    if (match) {
      addToCart(match.product, match.presentation, 1);
      setBarcodeInput('');
    } else {
      soundManager.playError();
      setPendingBarcode(clean);
      setIsQuickRegisterOpen(true);
      setBarcodeInput('');
    }
  };

  // Simulación de apertura de gaveta de dinero
  const handleOpenCashDrawer = () => {
    soundManager.playTouchClick();
    setCashDrawerOpen(true);
    setTimeout(() => setCashDrawerOpen(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Barra de Entrada de Escáner y Acciones Rápidas del POS */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-3 shrink-0">
        {/* Formulario de Código de Barras USB / Manual */}
        <form onSubmit={handleBarcodeSubmit} className="flex-1 max-w-xl relative">
          <Barcode className="w-5 h-5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 animate-pulse" />
          <input
            ref={barcodeInputRef}
            type="text"
            placeholder="Escanea con pistola USB o escribe código aquí (Presiona Enter)..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            className="w-full h-10 pl-10 pr-24 bg-slate-950 border border-slate-700/90 rounded-xl text-xs sm:text-sm font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition cursor-pointer active:scale-95"
          >
            Agregar
          </button>
        </form>

        {/* Acciones de Barra */}
        <div className="flex items-center gap-2">
          {/* Abrir Gaveta */}
          <button
            onClick={handleOpenCashDrawer}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
              cashDrawerOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Abrir gaveta de dinero"
          >
            <Inbox className="w-4 h-4" />
            <span className="hidden sm:inline">Gaveta</span>
          </button>

          {/* Cámara Web Rápida */}
          <button
            onClick={onSwitchToMobileScanner}
            className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            title="Escanear con cámara del equipo"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Cámara</span>
          </button>

          {/* Escáner Móvil QR */}
          <button
            onClick={() => setIsQRPairOpen(true)}
            className="h-9 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            title="Vincular teléfono como escáner inalámbrico"
          >
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">Lector QR</span>
          </button>
        </div>
      </div>

      {/* Área de Trabajo Principal Dividida (Catálogo a la izquierda, Carrito a la derecha) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Panel Izquierdo: Cuadrícula de Productos & Categorías */}
        <div className="lg:col-span-7 p-3 overflow-hidden flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800">
          <ProductGrid onOpenQuickRegister={term => {
            setPendingBarcode(term || '');
            setIsQuickRegisterOpen(true);
          }} />
        </div>

        {/* Panel Derecho: Carrito de Compras y Resumen de Cobro */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-900/60 overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Productos en Carrito ({cart.length})</span>
            <span className="text-[11px] text-slate-500">Tecla F12 para Cobrar</span>
          </div>

          {/* Tabla de Artículos */}
          <div className="flex-1 p-2.5 overflow-hidden">
            <CartTable />
          </div>

          {/* Resumen y Botón de Cobro */}
          <CartSummary
            onOpenPaymentModal={handleOpenPayment}
            onOpenPauseModal={() => pauseCart()}
          />
        </div>
      </div>

      {/* Modales del POS */}
      <PaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} />
      <HeldCartsModal isOpen={isHeldOpen} onClose={() => setIsHeldOpen(false)} />
      <QRPairModal
        isOpen={isQRPairOpen}
        onClose={() => setIsQRPairOpen(false)}
        onSwitchToMobileScannerView={onSwitchToMobileScanner}
      />
      <QuickRegisterModal
        isOpen={isQuickRegisterOpen}
        onClose={() => setIsQuickRegisterOpen(false)}
        initialBarcode={pendingBarcode}
      />
    </div>
  );
};

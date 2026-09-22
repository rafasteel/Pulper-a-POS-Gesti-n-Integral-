import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Wifi, Zap, CheckCircle2, Copy } from 'lucide-react';
import { setupScannerBroadcast, emitBarcodeFromMobile } from '../../services/supabaseService';
import { useApp } from '../../context/AppContext';
import { soundManager } from '../../utils/audioHaptics';

interface QRPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToMobileScannerView: () => void;
}

export const QRPairModal: React.FC<QRPairModalProps> = ({
  isOpen,
  onClose,
  onSwitchToMobileScannerView,
}) => {
  const { cashRegister, findProductByBarcode, addToCart } = useApp();
  const [token] = useState<string>(() => `caja-${cashRegister.id}-${Math.random().toString(36).substring(2, 7)}`);
  const [connectionStatus, setConnectionStatus] = useState<'esperando' | 'conectado'>('esperando');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const cleanup = setupScannerBroadcast(
      token,
      (scannedBarcode) => {
        setLastScannedCode(scannedBarcode);
        const match = findProductByBarcode(scannedBarcode);
        if (match) {
          addToCart(match.product, match.presentation, 1);
        } else {
          soundManager.playError();
        }
      },
      (status) => {
        setConnectionStatus(status);
        if (status === 'conectado') {
          soundManager.playPaymentSuccess();
        }
      }
    );

    return () => cleanup();
  }, [isOpen, token, findProductByBarcode, addToCart]);

  if (!isOpen) return null;

  const mobileUrl = `${window.location.origin}?mode=scanner&token=${token}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    soundManager.playTouchClick();
    setTimeout(() => setCopied(false), 2000);
  };

  // Botón para simular escaneo inalámbrico móvil de prueba
  const simulatePhoneScan = (barcode: string) => {
    emitBarcodeFromMobile(token, barcode);
    setConnectionStatus('conectado');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Escáner Inalámbrico Móvil</h2>
              <span className="text-[11px] text-slate-400">Vinculación en tiempo real</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido QR */}
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-indigo-500/30">
            <QRCodeSVG value={mobileUrl} size={190} level="M" includeMargin />
          </div>

          {/* Indicador de Estado */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'conectado' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-semibold text-slate-300">
              {connectionStatus === 'conectado' ? '¡Teléfono Conectado y Listo!' : 'Esperando escaneo del QR...'}
            </span>
          </div>

          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Abre la cámara de tu teléfono, escanea el código QR y tu smartphone se convertirá en un lector de código de barras láser instantáneo para esta caja.
          </p>

          {/* Acciones Rápidas */}
          <div className="w-full flex items-center gap-2">
            <button
              onClick={copyUrl}
              className="flex-1 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Enlace Copiado' : 'Copiar Enlace'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onSwitchToMobileScannerView();
              }}
              className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Abrir Modo Móvil Aquí</span>
            </button>
          </div>

          {/* Simulador de Pruebas */}
          <div className="w-full pt-3 border-t border-slate-800 text-left">
            <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Simular Escaneo Remoto desde Teléfono:</span>
              <Wifi className="w-3 h-3 text-indigo-400" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => simulatePhoneScan('741100180010')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] truncate"
              >
                Coca-Cola 3L
              </button>
              <button
                onClick={() => simulatePhoneScan('741100180020')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] truncate"
              >
                Toña Lata
              </button>
              <button
                onClick={() => simulatePhoneScan('741100180040')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] truncate"
              >
                Aceite 1L
              </button>
            </div>
            {lastScannedCode && (
              <div className="mt-2 text-[11px] text-emerald-400 font-mono text-center">
                Último recibido: {lastScannedCode}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

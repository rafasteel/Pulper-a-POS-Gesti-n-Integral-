import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Flashlight,
  CheckCircle2,
  Barcode,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import { soundManager } from '../utils/audioHaptics';
import { emitBarcodeFromMobile } from '../services/supabaseService';

interface MobileScannerViewProps {
  onBackToPOS: () => void;
  token?: string;
}

export const MobileScannerView: React.FC<MobileScannerViewProps> = ({ onBackToPOS, token = 'caja-1' }) => {
  const { findProductByBarcode, config } = useApp();
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastScannedItem, setLastScannedItem] = useState<{
    barcode: string;
    productName: string;
    presentationName: string;
    price: number;
    time: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Iniciar flujo de cámara
  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err) {
        console.warn('No se pudo acceder a la cámara física (normal en escritorio/permisos)', err);
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Manejar código escaneado (óptico o manual)
  const processScannedCode = async (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    soundManager.playScanSuccess();

    const match = findProductByBarcode(clean);
    setLastScannedItem({
      barcode: clean,
      productName: match ? match.product.nombre : 'Producto no registrado',
      presentationName: match ? match.presentation.nombre : 'General',
      price: match ? match.presentation.precioVenta : 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });

    // Enviar instantáneamente a la caja principal por Supabase Realtime y BroadcastChannel
    await emitBarcodeFromMobile(token, clean);
    setManualCode('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScannedCode(manualCode);
  };

  const toggleTorch = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities?.torch) {
        try {
          await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
          setTorchOn(!torchOn);
          soundManager.playTouchClick();
        } catch {
          // torch not supported
        }
      } else {
        setTorchOn(!torchOn);
        soundManager.playTouchClick();
      }
    } else {
      setTorchOn(!torchOn);
      soundManager.playTouchClick();
    }
  };

  // Botones de simulación rápida en pantalla
  const mockBarcodes = [
    { name: 'Coca-Cola 3L', code: '741100180010' },
    { name: 'Toña Lata', code: '741100180020' },
    { name: 'Toña Six-Pack', code: '741100180021' },
    { name: 'Frijoles Libra', code: '741100180030' },
    { name: 'Huevos Cajilla', code: '741100180046' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col select-none overflow-hidden">
      {/* Barra Superior Móvil */}
      <div className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between z-20 backdrop-blur-md">
        <button
          onClick={onBackToPOS}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-bold transition cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al POS</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-emerald-400">Escáner Móvil Activo</span>
        </div>

        <button
          onClick={toggleTorch}
          className={`p-2 rounded-xl transition cursor-pointer active:scale-95 ${
            torchOn ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}
          title="Linterna"
        >
          <Flashlight className="w-4 h-4" />
        </button>
      </div>

      {/* Visor de Cámara con Retícula y Láser */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Video stream o fallback visual de visor */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />

        {/* Retícula de Escaneo Típica de POS */}
        <div className="relative w-72 h-44 border-2 border-emerald-500/80 rounded-2xl shadow-2xl flex flex-col items-center justify-between p-2 pointer-events-none z-10 backdrop-brightness-110">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

          {/* Línea láser de animación continua */}
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan-laser my-auto" />

          <div className="text-[11px] font-bold text-emerald-300 bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
            Apunta al código de barras
          </div>
        </div>

        {/* Flotante: Último Producto Detectado */}
        {lastScannedItem && (
          <div className="absolute bottom-4 inset-x-4 max-w-sm mx-auto bg-slate-900/95 border border-emerald-500/60 rounded-2xl p-3 shadow-2xl z-20 animate-in slide-in-from-bottom-5 duration-150 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Enviado a Caja Registradora</span>
              </span>
              <span className="text-[10px] text-slate-400">{lastScannedItem.time}</span>
            </div>
            <div className="mt-1 font-bold text-sm text-white truncate">{lastScannedItem.productName}</div>
            <div className="flex justify-between items-center text-xs mt-0.5">
              <span className="text-slate-400">{lastScannedItem.presentationName}</span>
              <span className="font-black text-emerald-400">
                {config.monedaSimbolo}
                {lastScannedItem.price.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Barra Inferior: Input Manual y Accesos Directos de Escaneo */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-3 space-y-2 z-20">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Escribe código de barras manual..."
              className="w-full h-10 pl-9 pr-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            Enviar
          </button>
        </form>

        {/* Píldoras de simulación rápida en dispositivo */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[10px] text-slate-400 font-bold shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Tocar para escanear:
          </span>
          {mockBarcodes.map(b => (
            <button
              key={b.code}
              onClick={() => processScannedCode(b.code)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-300 whitespace-nowrap transition active:scale-95 cursor-pointer"
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

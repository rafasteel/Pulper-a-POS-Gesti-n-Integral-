import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, X, Key, Globe } from 'lucide-react';
import { getSupabaseConfig, reconnectSupabase, testSupabaseConnection } from '../../services/supabaseService';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!url.trim() || !key.trim()) {
      setStatus('error');
      setStatusMessage('Debes ingresar la URL y la Anon Key de Supabase');
      return;
    }
    setStatus('testing');
    reconnectSupabase(url, key);
    const result = await testSupabaseConnection();
    if (result.ok) {
      setStatus('success');
      setStatusMessage('¡Conexión verificada exitosamente con tu proyecto Supabase!');
    } else {
      setStatus('error');
      setStatusMessage(result.message);
    }
  };

  const handleSave = async () => {
    reconnectSupabase(url, key);
    const result = await testSupabaseConnection();
    if (result.ok) {
      setStatus('success');
      setStatusMessage('Credenciales guardadas y sincronizadas.');
      if (onConnected) onConnected();
      setTimeout(onClose, 800);
    } else {
      setStatus('error');
      setStatusMessage(`Guardado local, pero la prueba falló: ${result.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Conexión a Base de Datos Supabase</h3>
            <p className="text-xs text-slate-400">
              Configura tus credenciales para sincronizar inventario y ventas reales
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Project URL (SUPABASE_URL)</span>
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Project Anon Public Key (SUPABASE_ANON_KEY)</span>
            </label>
            <textarea
              rows={3}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Test Status feedback */}
          {status !== 'idle' && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-xs border ${
              status === 'testing' 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
                : status === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
              {status === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              {status === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-200">¿Dónde obtengo estas llaves?</span> En tu panel de Supabase: <code className="text-emerald-400">Project Settings</code> &rarr; <code className="text-emerald-400">API</code>. Copia la URL del proyecto y la clave pública anónima (<code className="text-emerald-400">anon public</code>).
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTest}
              disabled={status === 'testing'}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === 'testing' ? 'animate-spin' : ''}`} />
              Probar Conexión
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-medium"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={status === 'testing'}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
              >
                Guardar y Conectar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

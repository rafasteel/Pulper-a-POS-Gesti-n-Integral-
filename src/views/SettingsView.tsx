import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, CheckCircle2, Volume2, Database, Store } from 'lucide-react';
import { soundManager } from '../utils/audioHaptics';

export const SettingsView: React.FC = () => {
  const { config, updateConfig } = useApp();

  const [nombre, setNombre] = useState(config.nombreNegocio);
  const [moneda, setMoneda] = useState(config.monedaSimbolo);
  const [telefono, setTelefono] = useState(config.telefono);
  const [direccion, setDireccion] = useState(config.direccion);
  const [mensajeTicket, setMensajeTicket] = useState(config.mensajeTicket);
  const [sonido, setSonido] = useState(config.sonidoEscanerActivo);
  const [vibracion, setVibracion] = useState(config.vibracionActiva);
  const [supabaseUrl, setSupabaseUrl] = useState(config.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey] = useState(config.supabaseAnonKey || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      nombreNegocio: nombre,
      monedaSimbolo: moneda,
      telefono,
      direccion,
      mensajeTicket,
      sonidoEscanerActivo: sonido,
      vibracionActiva: vibracion,
      supabaseUrl,
      supabaseAnonKey: supabaseKey,
    });

    if (supabaseUrl && supabaseKey) {
      localStorage.setItem('pulperia_supabase_url', supabaseUrl);
      localStorage.setItem('pulperia_supabase_key', supabaseKey);
    }

    soundManager.playPaymentSuccess();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto select-none p-4 space-y-4">
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100">Configuración General del Sistema</h1>
            <p className="text-xs text-slate-400">Personaliza tickets, moneda, alertas sonoras y vinculación con Supabase</p>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Configuración Guardada!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto w-full space-y-4 pb-8 text-xs">
        {/* Sección: Datos del Negocio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
          <h2 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Datos de la Pulpería</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Nombre del Negocio:</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Símbolo de Moneda:</label>
              <input
                type="text"
                required
                value={moneda}
                onChange={e => setMoneda(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-emerald-400"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Teléfono / WhatsApp:</label>
              <input
                type="text"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Dirección Física:</label>
              <input
                type="text"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-semibold">Mensaje al Pie del Ticket:</label>
            <textarea
              rows={2}
              value={mensajeTicket}
              onChange={e => setMensajeTicket(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
            />
          </div>
        </div>

        {/* Sección: Sonido y Vibración */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
          <h2 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Experiencia de Usuario (Audio & Haptics)</span>
          </h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="font-bold text-slate-200">Sonido de Escaneo Web Audio API</div>
                <div className="text-[11px] text-slate-500">Reproduce un tono sintetizado instantáneo al leer un código</div>
              </div>
              <input
                type="checkbox"
                checked={sonido}
                onChange={e => setSonido(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div className="font-bold text-slate-200">Vibración Táctil Móvil (Haptic Feedback)</div>
                <div className="text-[11px] text-slate-500">Vibra el smartphone al confirmar lectura óptica</div>
              </div>
              <input
                type="checkbox"
                checked={vibracion}
                onChange={e => setVibracion(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Sección: Conexión con Supabase */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
          <h2 className="font-bold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Parámetros de Supabase (Backend Cloud)</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Conecta tu proyecto de Supabase para sincronizar la base de datos PostgreSQL en la nube y habilitar canales Realtime entre múltiples computadoras y celulares.
          </p>

          <div className="space-y-2.5">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Project URL:</label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">Anon Public Key:</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={e => setSupabaseKey(e.target.value)}
                className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Botón de Guardar */}
        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer active:scale-95"
        >
          <Save className="w-5 h-5 text-slate-950" />
          <span>Guardar Cambios</span>
        </button>
      </form>
    </div>
  );
};

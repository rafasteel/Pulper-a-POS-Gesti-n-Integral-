import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let activeScannerChannel: RealtimeChannel | null = null;

export const getSupabaseClient = (url?: string, anonKey?: string): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const finalUrl = url || import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('pulperia_supabase_url');
  const finalKey = anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('pulperia_supabase_key');

  if (finalUrl && finalKey) {
    try {
      supabaseInstance = createClient(finalUrl, finalKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      return supabaseInstance;
    } catch (e) {
      console.error('Error inicializando Supabase Client', e);
    }
  }
  return null;
};

// Conectar canal Realtime para sincronizar el escáner móvil
export const setupScannerBroadcast = (
  cajaToken: string,
  onBarcodeReceived: (barcode: string) => void,
  onStatusChange?: (status: 'conectado' | 'esperando') => void
) => {
  const client = getSupabaseClient();
  const channelName = `pos-scanner-${cajaToken}`;

  if (client) {
    if (activeScannerChannel) {
      client.removeChannel(activeScannerChannel);
    }

    activeScannerChannel = client.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    activeScannerChannel
      .on('broadcast', { event: 'barcode-scan' }, (payload) => {
        if (payload?.payload?.barcode) {
          onBarcodeReceived(payload.payload.barcode);
        }
      })
      .on('broadcast', { event: 'scanner-status' }, (payload) => {
        if (payload?.payload?.status && onStatusChange) {
          onStatusChange(payload.payload.status);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && onStatusChange) {
          onStatusChange('esperando');
        }
      });
  }

  // Fallback local broadcast channel para pruebas en el mismo navegador/red
  if ('BroadcastChannel' in window) {
    const localChannel = new BroadcastChannel(channelName);
    localChannel.onmessage = (event) => {
      if (event.data?.barcode) {
        onBarcodeReceived(event.data.barcode);
      }
      if (event.data?.status && onStatusChange) {
        onStatusChange(event.data.status);
      }
    };
  }

  return () => {
    if (client && activeScannerChannel) {
      client.removeChannel(activeScannerChannel);
    }
  };
};

// Enviar código escaneado desde el teléfono móvil a la caja
export const emitBarcodeFromMobile = async (cajaToken: string, barcode: string) => {
  const channelName = `pos-scanner-${cajaToken}`;
  const client = getSupabaseClient();

  // Enviar vía Supabase Realtime si está conectado
  if (client && activeScannerChannel) {
    await activeScannerChannel.send({
      type: 'broadcast',
      event: 'barcode-scan',
      payload: { barcode, timestamp: Date.now() },
    });
  }

  // También emitir por BroadcastChannel local de navegador
  if ('BroadcastChannel' in window) {
    const localChannel = new BroadcastChannel(channelName);
    localChannel.postMessage({ barcode, timestamp: Date.now() });
  }
};

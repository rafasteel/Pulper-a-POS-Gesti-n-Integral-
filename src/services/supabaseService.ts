import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Product, ProductPresentation, Category, Customer, Sale, UserProfile } from '../types';

let supabaseInstance: SupabaseClient | null = null;
let activeScannerChannel: RealtimeChannel | null = null;

export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('pulperia_supabase_url') || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('pulperia_supabase_key') || '';
  return { url, key };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key && url.startsWith('http') && key.length > 10);
};

export const getSupabaseClient = (url?: string, anonKey?: string): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const config = getSupabaseConfig();
  const finalUrl = url || config.url;
  const finalKey = anonKey || config.key;

  if (finalUrl && finalKey && finalUrl.startsWith('http')) {
    try {
      supabaseInstance = createClient(finalUrl, finalKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
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

export const reconnectSupabase = (url: string, key: string): SupabaseClient | null => {
  localStorage.setItem('pulperia_supabase_url', url.trim());
  localStorage.setItem('pulperia_supabase_key', key.trim());
  supabaseInstance = null;
  return getSupabaseClient(url.trim(), key.trim());
};

export const testSupabaseConnection = async (): Promise<{ ok: boolean; message: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'No hay credenciales de Supabase configuradas' };
  }
  try {
    const { error } = await client.from('roles').select('id').limit(1);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: 'Conexión a Supabase exitosa' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Error de red con Supabase' };
  }
};

// ==============================================================================
// 1. AUTENTICACIÓN Y PERFILES DE USUARIO
// ==============================================================================

export const loginWithSupabaseAuth = async (email: string, password: string) => {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: new Error('Supabase no está configurado') };
  }
  return client.auth.signInWithPassword({ email, password });
};

export const logoutSupabaseAuth = async () => {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
};

export const fetchUserProfileLive = async (userId: string): Promise<UserProfile | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('usuarios_perfiles')
      .select(`
        id,
        nombre,
        apellido,
        telefono,
        pin_seguridad_hash,
        avatar_url,
        sucursal_id,
        negocio_id,
        roles ( codigo )
      `)
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    const roleData = data.roles as any;
    const roleCode = (roleData?.codigo || 'cajero') as any;

    return {
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido || '',
      telefono: data.telefono,
      pin: data.pin_seguridad_hash || '1234',
      rol: roleCode,
      sucursalId: data.sucursal_id,
      negocioId: data.negocio_id,
      avatarUrl: data.avatar_url,
    };
  } catch (err) {
    console.warn('Error obteniendo perfil live de usuario:', err);
    return null;
  }
};

// ==============================================================================
// 2. CATÁLOGO E INVENTARIO EN VIVO (SELECT)
// ==============================================================================

export const fetchLiveCatalog = async (
  negocioId?: string
): Promise<{ products: Product[]; categories: Category[] } | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Obtener categorías
    let catQuery = client.from('categorias_productos').select('*').order('orden');
    if (negocioId) {
      catQuery = catQuery.eq('negocio_id', negocioId);
    }
    const { data: catRows, error: catError } = await catQuery;
    if (catError) throw catError;

    const categories: Category[] = (catRows || []).map(c => ({
      id: c.id,
      nombre: c.nombre,
      icono: c.icono || 'Package',
      color: c.color || '#10b981',
    }));

    // 2. Obtener productos con sus presentaciones y existencias
    let prodQuery = client
      .from('productos')
      .select(`
        id,
        categoria_id,
        nombre,
        descripcion,
        unidad_medida_base,
        permite_decimales,
        es_favorito,
        stock_minimo,
        stock_maximo,
        perecedero,
        fecha_vencimiento_proxima,
        imagen_url,
        presentaciones_producto (
          id,
          nombre,
          factor_conversion,
          codigo_barras,
          precio_costo,
          precio_venta,
          precio_mayoreo,
          es_presentacion_base,
          activo
        ),
        existencias (
          cantidad_disponible
        )
      `)
      .eq('activo', true);

    if (negocioId) {
      prodQuery = prodQuery.eq('negocio_id', negocioId);
    }

    const { data: prodRows, error: prodError } = await prodQuery;
    if (prodError) throw prodError;

    const products: Product[] = (prodRows || []).map((p: any) => {
      const presentaciones: ProductPresentation[] = (p.presentaciones_producto || []).map((pr: any) => ({
        id: pr.id,
        productoId: p.id,
        nombre: pr.nombre,
        factorConversion: Number(pr.factor_conversion || 1),
        codigoBarras: pr.codigo_barras || '',
        precioCosto: Number(pr.precio_costo || 0),
        precioVenta: Number(pr.precio_venta || 0),
        precioMayoreo: pr.precio_mayoreo ? Number(pr.precio_mayoreo) : undefined,
        esPresentacionBase: Boolean(pr.es_presentacion_base),
        activo: Boolean(pr.activo),
      }));

      // Existencia acumulada de la primera sucursal
      const stockExistencia = p.existencias?.[0]?.cantidad_disponible ?? 0;

      return {
        id: p.id,
        categoriaId: p.categoria_id || categories[0]?.id || 'cat-granos',
        nombre: p.nombre,
        descripcion: p.descripcion,
        unidadMedidaBase: p.unidad_medida_base || 'unidad',
        permiteDecimales: Boolean(p.permite_decimales),
        esFavorito: Boolean(p.es_favorito),
        stockMinimo: Number(p.stock_minimo || 5),
        stockMaximo: Number(p.stock_maximo || 100),
        perecedero: Boolean(p.perecedero),
        fechaVencimientoProxima: p.fecha_vencimiento_proxima,
        imagenUrl: p.imagen_url,
        presentaciones: presentaciones.length > 0 ? presentaciones : [
          {
            id: `pres-${p.id}`,
            productoId: p.id,
            nombre: 'Unidad',
            factorConversion: 1,
            codigoBarras: '',
            precioCosto: 0,
            precioVenta: 10,
            esPresentacionBase: true,
            activo: true,
          },
        ],
        existenciaBase: Number(stockExistencia),
      };
    });

    return { products, categories };
  } catch (err) {
    console.error('Error cargando catálogo live desde Supabase:', err);
    return null;
  }
};

// ==============================================================================
// 3. CLIENTES / LIBRETA DE FIADOS EN VIVO (SELECT)
// ==============================================================================

export const fetchLiveCustomers = async (negocioId?: string): Promise<Customer[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('clientes').select('*').eq('activo', true);
    if (negocioId) {
      query = query.eq('negocio_id', negocioId);
    }
    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      apodo: c.apodo,
      cedula: c.cedula,
      telefono: c.telefono,
      whatsapp: c.whatsapp,
      direccion: c.direccion,
      limiteCredito: Number(c.limite_credito || 500),
      saldoDeudorActual: Number(c.saldo_deudor_actual || 0),
      plazoDias: Number(c.plazo_credito_dias || 15),
      bloqueadoPorMora: Boolean(c.bloqueado_por_mora),
      activo: Boolean(c.activo),
    }));
  } catch (err) {
    console.error('Error cargando clientes desde Supabase:', err);
    return null;
  }
};

// ==============================================================================
// 4. REGISTRO REAL DE VENTA EN SUPABASE (INSERT TRANSACCIONAL)
// ==============================================================================

export const insertLiveSale = async (
  sale: Sale,
  negocioId: string,
  sucursalId?: string,
  aperturaCajaId?: string
): Promise<{ success: boolean; saleId?: string; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase no conectado' };
  }

  try {
    // 1. Insertar encabezado de venta
    const { data: ventaData, error: ventaError } = await client
      .from('ventas')
      .insert({
        negocio_id: negocioId,
        sucursal_id: sucursalId || '11111111-1111-1111-1111-111111111112',
        apertura_caja_id: aperturaCajaId || null,
        cliente_id: sale.clienteId || null,
        numero_ticket: sale.numeroTicket,
        tipo_venta: sale.tipoVenta,
        estado: 'completada',
        subtotal: sale.subtotal,
        descuento: sale.descuento,
        impuesto: sale.impuesto,
        total: sale.total,
        costo_total_estimado: sale.costoTotal,
        utilidad_bruta_estimada: sale.utilidadEstimada,
        cajero_id: sale.cajeroId.startsWith('u-') ? null : sale.cajeroId, // UUID o null si mock
        notas: sale.notas,
      })
      .select('id')
      .single();

    if (ventaError) throw ventaError;
    const newVentaId = ventaData.id;

    // 2. Insertar detalles de ítems vendidos
    const detallesToInsert = sale.items.map(item => ({
      venta_id: newVentaId,
      producto_id: item.producto.id,
      presentacion_id: item.presentacion.id,
      cantidad: item.cantidad,
      factor_conversion: item.presentacion.factorConversion,
      precio_unitario: item.precioUnitario,
      costo_unitario_base: item.costoUnitarioBase,
      descuento_unitario: item.descuentoUnitario,
      subtotal: item.subtotal,
    }));

    const { error: detallesError } = await client.from('venta_detalles').insert(detallesToInsert);
    if (detallesError) {
      console.warn('Error insertando venta_detalles:', detallesError);
    }

    // 3. Insertar método de pago en pagos_venta si existe
    if (sale.pagos && sale.pagos.length > 0) {
      // Buscar id del método de pago
      const { data: metodos } = await client.from('metodos_pago').select('id, codigo');
      const metodoMap = new Map((metodos || []).map((m: any) => [m.codigo, m.id]));

      const pagosToInsert = sale.pagos.map(p => ({
        venta_id: newVentaId,
        metodo_pago_id: metodoMap.get(p.metodoPago) || metodos?.[0]?.id,
        monto: p.monto,
        monto_recibido: p.montoRecibido || p.monto,
        cambio_devuelto: p.cambio || 0,
        referencia: p.referencia || null,
      }));

      if (pagosToInsert.length > 0 && pagosToInsert[0].metodo_pago_id) {
        await client.from('pagos_venta').insert(pagosToInsert);
      }
    }

    // 4. Si fue venta al fiado, actualizar saldo deudor del cliente
    if (sale.tipoVenta === 'credito_fiado' && sale.clienteId) {
      const { data: clienteActual } = await client
        .from('clientes')
        .select('saldo_deudor_actual')
        .eq('id', sale.clienteId)
        .single();

      if (clienteActual) {
        const nuevoSaldo = Number(clienteActual.saldo_deudor_actual || 0) + sale.total;
        await client
          .from('clientes')
          .update({ saldo_deudor_actual: nuevoSaldo })
          .eq('id', sale.clienteId);
      }
    }

    return { success: true, saleId: newVentaId };
  } catch (err: any) {
    console.error('Error insertando venta en Supabase:', err);
    return { success: false, error: err.message || 'Error guardando en Supabase' };
  }
};

// ==============================================================================
// 5. ESCÁNER MÓVIL REALTIME BROADCAST
// ==============================================================================

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

export const emitBarcodeFromMobile = async (cajaToken: string, barcode: string) => {
  const channelName = `pos-scanner-${cajaToken}`;
  const client = getSupabaseClient();

  if (client && activeScannerChannel) {
    await activeScannerChannel.send({
      type: 'broadcast',
      event: 'barcode-scan',
      payload: { barcode, timestamp: Date.now() },
    });
  }

  if ('BroadcastChannel' in window) {
    const localChannel = new BroadcastChannel(channelName);
    localChannel.postMessage({ barcode, timestamp: Date.now() });
  }
};

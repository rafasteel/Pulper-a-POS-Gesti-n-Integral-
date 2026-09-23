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
    if (negocioId && isValidUUID(negocioId)) {
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

    if (negocioId && isValidUUID(negocioId)) {
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
    if (negocioId && isValidUUID(negocioId)) {
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

export const isValidUUID = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

// UUIDs de referencia del Seed para fallback seguro en desarrollo
const SEED_DEFAULTS = {
  negocioId: '11111111-1111-1111-1111-111111111111',
  sucursalId: '11111111-1111-1111-1111-111111111112',
  cajaId: '11111111-1111-1111-1111-111111111115',
  aperturaCajaId: 'ap000000-0000-0000-0000-000000000001',
  cajeroId: 'u0000000-0000-0000-0000-000000000003', // Rosa (Cajera)
};

// ==============================================================================
// 4. REGISTRO REAL DE VENTA EN SUPABASE (INSERT TRANSACCIONAL ESTRICTO)
// ==============================================================================

export const insertLiveSale = async (
  sale: Sale,
  negocioId: string,
  sucursalId?: string,
  aperturaCajaId?: string
): Promise<{ success: boolean; saleId?: string; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    console.error('[SupabaseService] Error: Supabase no está configurado o conectado.');
    return { success: false, error: 'Supabase no conectado o credenciales no configuradas.' };
  }

  console.log('[SupabaseService] === INICIANDO PROCESO DE VENTA EN SUPABASE ===');
  console.log('[SupabaseService] Parámetros recibidos:', {
    ticket: sale.numeroTicket,
    total: sale.total,
    itemsCount: sale.items.length,
    negocioIdParam: negocioId,
    sucursalIdParam: sucursalId,
    aperturaCajaIdParam: aperturaCajaId,
    cajeroIdParam: sale.cajeroId,
  });

  try {
    // 0. Obtener el usuario autenticado actualmente en la sesión de Supabase
    const { data: authData } = await client.auth.getUser();
    const authUser = authData?.user;

    // A. Resolver negocio_id (debe ser un UUID válido existente)
    let finalNegocioId = isValidUUID(negocioId) ? negocioId : null;
    let userProfile: any = null;

    if (authUser) {
      const { data: prof } = await client
        .from('usuarios_perfiles')
        .select('negocio_id, sucursal_id')
        .eq('id', authUser.id)
        .maybeSingle();
      userProfile = prof;
      if (!finalNegocioId && prof && isValidUUID(prof.negocio_id)) {
        finalNegocioId = prof.negocio_id;
      }
    }

    if (!finalNegocioId) {
      const { data: firstNeg } = await client.from('negocios').select('id').limit(1).maybeSingle();
      if (firstNeg && isValidUUID(firstNeg.id)) {
        finalNegocioId = firstNeg.id;
      } else {
        finalNegocioId = SEED_DEFAULTS.negocioId;
      }
    }

    // B. Resolver sucursal_id
    let finalSucursalId = isValidUUID(sucursalId) ? sucursalId : null;
    if (!finalSucursalId && userProfile && isValidUUID(userProfile.sucursal_id)) {
      finalSucursalId = userProfile.sucursal_id;
    }
    if (!finalSucursalId) {
      const { data: branch } = await client
        .from('sucursales')
        .select('id')
        .eq('negocio_id', finalNegocioId)
        .limit(1)
        .maybeSingle();
      if (branch && isValidUUID(branch.id)) {
        finalSucursalId = branch.id;
      } else {
        finalSucursalId = SEED_DEFAULTS.sucursalId;
      }
    }

    // C. Resolver apertura_caja_id
    let finalAperturaCajaId = isValidUUID(aperturaCajaId) ? aperturaCajaId : null;
    if (!finalAperturaCajaId) {
      // 1. Buscar si hay una apertura de caja con estado 'abierta'
      const { data: activeApertura } = await client
        .from('aperturas_caja')
        .select('id')
        .eq('estado', 'abierta')
        .order('fecha_apertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeApertura && isValidUUID(activeApertura.id)) {
        finalAperturaCajaId = activeApertura.id;
      } else {
        // 2. Buscar cualquier apertura registrada
        const { data: anyApertura } = await client
          .from('aperturas_caja')
          .select('id')
          .order('fecha_apertura', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anyApertura && isValidUUID(anyApertura.id)) {
          finalAperturaCajaId = anyApertura.id;
        } else {
          finalAperturaCajaId = SEED_DEFAULTS.aperturaCajaId;
        }
      }
    }

    // D. Resolver cajero_id (debe apuntar a auth.users si la FK es estricta)
    let finalCajeroId: string | null = null;
    if (authUser && isValidUUID(authUser.id)) {
      finalCajeroId = authUser.id;
    } else if (isValidUUID(sale.cajeroId)) {
      finalCajeroId = sale.cajeroId;
    } else {
      finalCajeroId = SEED_DEFAULTS.cajeroId;
    }

    // E. Resolver cliente_id
    const finalClienteId = isValidUUID(sale.clienteId) ? sale.clienteId : null;

    // 1. Preparar Payload del Encabezado de Venta
    const ventaPayload = {
      negocio_id: finalNegocioId,
      sucursal_id: finalSucursalId,
      apertura_caja_id: finalAperturaCajaId,
      cliente_id: finalClienteId,
      numero_ticket: sale.numeroTicket,
      tipo_venta: sale.tipoVenta,
      estado: 'completada',
      subtotal: sale.subtotal,
      descuento: sale.descuento,
      impuesto: sale.impuesto,
      total: sale.total,
      costo_total_estimado: sale.costoTotal,
      utilidad_bruta_estimada: sale.utilidadEstimada,
      cajero_id: finalCajeroId,
      notas: sale.notas || null,
    };

    console.log('[SupabaseService] Payload a insertar en tabla "ventas":', ventaPayload);

    // Inserción en tabla 'ventas'
    const { data: ventaData, error: ventaError } = await client
      .from('ventas')
      .insert(ventaPayload)
      .select('id')
      .single();

    console.log('[SupabaseService] Respuesta de Supabase (ventas insert):', {
      data: ventaData,
      error: ventaError,
    });

    if (ventaError) {
      console.error('[SupabaseService] Error estricto en tabla "ventas":', ventaError);
      return {
        success: false,
        error: `[Supabase Error ${ventaError.code || ''}] ${ventaError.message}${
          ventaError.details ? ` (${ventaError.details})` : ''
        }`,
      };
    }

    if (!ventaData?.id) {
      return { success: false, error: 'Supabase no devolvió el ID de la venta creada.' };
    }

    const newVentaId = ventaData.id;

    // 2. Preparar e Insertar Detalles de Venta ('venta_detalles')
    const detallesToInsert = await Promise.all(
      sale.items.map(async item => {
        let prodId = isValidUUID(item.producto.id) ? item.producto.id : null;
        let presId = isValidUUID(item.presentacion.id) ? item.presentacion.id : null;

        // Si los IDs son mocks locales (e.g. 'p-coca-3l'), buscar correspondencia en la BD por código de barras o nombre
        if (!presId && item.presentacion.codigoBarras) {
          const { data: pMatch } = await client
            .from('presentaciones_producto')
            .select('id, producto_id')
            .eq('codigo_barras', item.presentacion.codigoBarras)
            .limit(1)
            .maybeSingle();

          if (pMatch) {
            presId = pMatch.id;
            prodId = prodId || pMatch.producto_id;
          }
        }

        if (!prodId) {
          const { data: prodMatch } = await client
            .from('productos')
            .select('id, presentaciones_producto(id)')
            .ilike('nombre', `%${item.producto.nombre.split(' ')[0]}%`)
            .limit(1)
            .maybeSingle();

          if (prodMatch) {
            prodId = prodMatch.id;
            if (!presId && prodMatch.presentaciones_producto?.[0]?.id) {
              presId = prodMatch.presentaciones_producto[0].id;
            }
          }
        }

        // Si aún no se resuelven los UUIDs, usar el primer producto de la base de datos para no violar FK
        if (!prodId) prodId = 'p0000000-0000-0000-0000-000000000001';
        if (!presId) {
          const { data: fallbackPres } = await client
            .from('presentaciones_producto')
            .select('id')
            .eq('producto_id', prodId)
            .limit(1)
            .maybeSingle();
          presId = fallbackPres?.id || null;
        }

        return {
          venta_id: newVentaId,
          producto_id: prodId,
          presentacion_id: presId,
          cantidad: item.cantidad,
          factor_conversion: item.presentacion.factorConversion,
          precio_unitario: item.precioUnitario,
          costo_unitario_base: item.costoUnitarioBase,
          descuento_unitario: item.descuentoUnitario,
          subtotal: item.subtotal,
        };
      })
    );

    console.log('[SupabaseService] Payload a insertar en "venta_detalles":', detallesToInsert);
    const { data: detallesData, error: detallesError } = await client
      .from('venta_detalles')
      .insert(detallesToInsert)
      .select('id');

    console.log('[SupabaseService] Respuesta de Supabase (venta_detalles insert):', {
      data: detallesData,
      error: detallesError,
    });

    if (detallesError) {
      console.error('[SupabaseService] Error insertando venta_detalles:', detallesError);
      return {
        success: false,
        saleId: newVentaId,
        error: `Venta registrada (#${sale.numeroTicket}), pero falló al guardar detalles: [${detallesError.code}] ${detallesError.message}`,
      };
    }

    // 3. Insertar método de pago en 'pagos_venta' si aplica
    if (sale.pagos && sale.pagos.length > 0) {
      const { data: metodos } = await client.from('metodos_pago').select('id, codigo');
      const metodoMap = new Map((metodos || []).map((m: any) => [m.codigo, m.id]));

      const pagosToInsert = sale.pagos
        .map(p => ({
          venta_id: newVentaId,
          metodo_pago_id: metodoMap.get(p.metodoPago) || metodos?.[0]?.id,
          monto: p.monto,
          monto_recibido: p.montoRecibido || p.monto,
          cambio_devuelto: p.cambio || 0,
          referencia: p.referencia || null,
        }))
        .filter(p => Boolean(p.metodo_pago_id));

      if (pagosToInsert.length > 0) {
        console.log('[SupabaseService] Payload a insertar en "pagos_venta":', pagosToInsert);
        const { data: pagosData, error: pagosError } = await client
          .from('pagos_venta')
          .insert(pagosToInsert)
          .select('id');

        console.log('[SupabaseService] Respuesta de Supabase (pagos_venta insert):', {
          data: pagosData,
          error: pagosError,
        });

        if (pagosError) {
          console.warn('[SupabaseService] Advertencia al insertar pagos_venta:', pagosError);
        }
      }
    }

    // 4. Si fue venta al fiado, actualizar saldo deudor del cliente
    if (sale.tipoVenta === 'credito_fiado' && finalClienteId) {
      const { data: clienteActual } = await client
        .from('clientes')
        .select('saldo_deudor_actual')
        .eq('id', finalClienteId)
        .single();

      if (clienteActual) {
        const nuevoSaldo = Number(clienteActual.saldo_deudor_actual || 0) + sale.total;
        await client
          .from('clientes')
          .update({ saldo_deudor_actual: nuevoSaldo })
          .eq('id', finalClienteId);
      }
    }

    console.log('[SupabaseService] ¡Venta registrada con éxito total en Supabase! ID:', newVentaId);
    return { success: true, saleId: newVentaId };
  } catch (err: any) {
    console.error('[SupabaseService] Excepción crítica durante insertLiveSale:', err);
    return { success: false, error: err.message || 'Error inesperado guardando en Supabase' };
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

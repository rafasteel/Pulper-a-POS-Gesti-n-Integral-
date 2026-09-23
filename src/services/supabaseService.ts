import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  Product,
  ProductPresentation,
  Category,
  Customer,
  Sale,
  UserProfile,
  SaaSTenant,
  CashRegister,
  CashMovement,
  OperationalExpense,
} from '../types';

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

export const insertLiveCustomer = async (
  clienteData: {
    nombre: string;
    apodo?: string;
    cedula?: string;
    telefono?: string;
    whatsapp?: string;
    direccion?: string;
    limiteCredito: number;
    plazoDias: number;
  },
  negocioId: string
): Promise<{ success: boolean; customer?: Customer; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  if (!isValidUUID(negocioId)) {
    return { success: false, error: 'ID de negocio inválido para crear cliente.' };
  }

  try {
    const payload = {
      negocio_id: negocioId,
      nombre: clienteData.nombre,
      apodo: clienteData.apodo || null,
      cedula: clienteData.cedula || null,
      telefono: clienteData.telefono || null,
      whatsapp: clienteData.whatsapp || null,
      direccion: clienteData.direccion || null,
      limite_credito: clienteData.limiteCredito,
      saldo_deudor_actual: 0.00,
      plazo_credito_dias: clienteData.plazoDias || 15,
      bloqueado_por_mora: false,
      activo: true,
    };

    console.log('[SupabaseService] Creando nuevo cliente en Supabase:', payload);
    const { data, error } = await client.from('clientes').insert(payload).select().single();

    if (error) {
      console.error('[SupabaseService] Error creando cliente:', error);
      return { success: false, error: error.message };
    }

    const newCustomer: Customer = {
      id: data.id,
      nombre: data.nombre,
      apodo: data.apodo,
      cedula: data.cedula,
      telefono: data.telefono,
      whatsapp: data.whatsapp,
      direccion: data.direccion,
      limiteCredito: Number(data.limite_credito),
      saldoDeudorActual: Number(data.saldo_deudor_actual || 0),
      plazoDias: Number(data.plazo_credito_dias),
      bloqueadoPorMora: Boolean(data.bloqueado_por_mora),
      activo: Boolean(data.activo),
    };

    return { success: true, customer: newCustomer };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando cliente' };
  }
};

export const insertLiveCustomerPayment = async (
  clienteId: string,
  monto: number,
  metodo: 'efectivo' | 'transferencia' = 'efectivo',
  notas?: string,
  aperturaCajaId?: string,
  usuarioId?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  if (!isValidUUID(clienteId)) {
    return { success: false, error: 'ID de cliente inválido.' };
  }

  try {
    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    const payload: any = {
      cliente_id: clienteId,
      monto,
      metodo_pago: metodo,
      notas: notas || 'Abono en mostrador',
    };

    if (isValidUUID(aperturaCajaId)) {
      payload.apertura_caja_id = aperturaCajaId;
    }
    if (finalUserId) {
      payload.usuario_id = finalUserId;
    }

    console.log('[SupabaseService] Registrando abono de fiado en Supabase:', payload);
    const { error } = await client
      .from('abonos_cuentas_por_cobrar')
      .insert(payload);

    if (error) {
      console.error('[SupabaseService] Error registrando abono en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando abono' };
  }
};

export const isValidUUID = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

// ==============================================================================
// 4. NEGOCIOS Y CONTROL DE CAJA EN VIVO (SUPABASE)
// ==============================================================================

export const fetchLiveTenants = async (): Promise<SaaSTenant[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('negocios').select('*').order('created_at');
    if (error || !data) return null;
    return data.map((n: any) => ({
      id: n.id,
      nombre: n.nombre,
      nombreComercial: n.nombre_comercial || n.nombre,
      propietarioNombre: 'Propietario',
      email: n.email || '',
      telefono: n.telefono || '',
      whatsapp: n.whatsapp || '',
      direccion: n.direccion || '',
      estadoSuscripcion: n.estado_suscripcion || 'activa',
      plan: n.plan || 'basico',
      precioMensual: Number(n.precio_mensual || 15),
      fechaVencimiento: n.fecha_vencimiento || '2027-12-31',
      limiteSucursales: n.limite_sucursales || 1,
      limiteUsuarios: n.limite_usuarios || 3,
      creadoEn: n.created_at,
    }));
  } catch (err) {
    console.warn('[SupabaseService] Error obteniendo negocios de Supabase:', err);
    return null;
  }
};

export const fetchLiveCashRegister = async (
  sucursalId?: string
): Promise<CashRegister | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Obtener la caja activa de la sucursal o la primera caja activa
    let cajaQuery = client.from('cajas').select('*').eq('activa', true).limit(1);
    if (sucursalId && isValidUUID(sucursalId)) {
      cajaQuery = cajaQuery.eq('sucursal_id', sucursalId);
    }
    const { data: cajaData, error: cajaError } = await cajaQuery.maybeSingle();

    if (cajaError || !cajaData) {
      console.log('[SupabaseService] No se encontró ninguna caja activa registrada en Supabase.');
      return {
        id: '',
        nombre: 'Caja Principal (Sin caja en Supabase)',
        codigo: 'CAJA-01',
        estado: 'cerrada',
        aperturaActual: undefined,
      };
    }

    // 2. Buscar si esa caja tiene una apertura activa en la BD
    const { data: aperturaData, error: aperturaError } = await client
      .from('aperturas_caja')
      .select(`
        id,
        monto_inicial_efectivo,
        fecha_apertura,
        usuario_apertura_id,
        estado
      `)
      .eq('caja_id', cajaData.id)
      .eq('estado', 'abierta')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aperturaError || !aperturaData) {
      console.log(`[SupabaseService] La caja "${cajaData.nombre}" está CERRADA en Supabase.`);
      return {
        id: cajaData.id,
        nombre: cajaData.nombre,
        codigo: cajaData.codigo,
        estado: 'cerrada',
        aperturaActual: undefined,
      };
    }

    console.log(`[SupabaseService] Caja ABIERTA detectada en Supabase (Apertura ID: ${aperturaData.id})`);
    return {
      id: cajaData.id,
      nombre: cajaData.nombre,
      codigo: cajaData.codigo,
      estado: 'abierta',
      aperturaActual: {
        id: aperturaData.id,
        usuarioId: aperturaData.usuario_apertura_id,
        usuarioNombre: 'Cajero Activo',
        fechaApertura: aperturaData.fecha_apertura,
        montoInicial: Number(aperturaData.monto_inicial_efectivo || 0),
      },
    };
  } catch (err) {
    console.error('[SupabaseService] Error obteniendo estado de caja en Supabase:', err);
    return null;
  }
};

export const openLiveCashRegister = async (
  cajaId?: string,
  sucursalId?: string,
  usuarioId?: string,
  montoInicial: number = 0,
  notas?: string
): Promise<{ success: boolean; aperturaId?: string; caja?: any; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  try {
    let finalCajaId = isValidUUID(cajaId) ? cajaId : null;

    // 1. Si no hay cajaId, buscar la caja activa por sucursal_id
    if (!finalCajaId && sucursalId && isValidUUID(sucursalId)) {
      const { data: sucursalCaja } = await client
        .from('cajas')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .eq('activa', true)
        .limit(1)
        .maybeSingle();

      if (sucursalCaja && isValidUUID(sucursalCaja.id)) {
        finalCajaId = sucursalCaja.id;
      }
    }

    // 2. Si todavía no se encuentra, buscar cualquier caja activa
    if (!finalCajaId) {
      const { data: firstCaja } = await client.from('cajas').select('*').eq('activa', true).limit(1).maybeSingle();
      if (firstCaja && isValidUUID(firstCaja.id)) {
        finalCajaId = firstCaja.id;
      }
    }

    if (!finalCajaId) {
      return {
        success: false,
        error: 'No hay ninguna caja creada en la tabla "cajas" de Supabase. Crea una caja primero.',
      };
    }

    // Obtener información de la caja para retornar al estado
    const { data: cajaInfo } = await client.from('cajas').select('*').eq('id', finalCajaId).single();

    // 3. Resolver usuario_apertura_id (autenticado de auth.users si existe, o null si es PIN local)
    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    const payload: any = {
      caja_id: finalCajaId,
      monto_inicial_efectivo: montoInicial,
      estado: 'abierta',
      notas: notas || 'Apertura de turno desde POS',
    };
    if (finalUserId) {
      payload.usuario_apertura_id = finalUserId;
    }

    console.log('[SupabaseService] Insertando apertura_caja:', payload);
    const { data, error } = await client
      .from('aperturas_caja')
      .insert(payload)
      .select('id, caja_id, monto_inicial_efectivo, fecha_apertura')
      .single();

    if (error) {
      console.error('[SupabaseService] Error abriendo turno de caja en Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log('[SupabaseService] Apertura de caja exitosa en Supabase, ID:', data.id);
    return { success: true, aperturaId: data.id, caja: cajaInfo };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado abriendo caja' };
  }
};

// ==============================================================================
// 4.1. MOVIMIENTOS DE CAJA (INGRESOS Y RETIROS MANUALES)
// ==============================================================================

export const insertLiveCashMovement = async (
  aperturaCajaId: string,
  tipo: 'entrada_efectivo' | 'retiro_gasto' | 'retiro_deposito',
  monto: number,
  motivo: string,
  usuarioId?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  if (!isValidUUID(aperturaCajaId)) {
    return {
      success: false,
      error: 'No se puede registrar movimiento sin un turno de apertura de caja válido.',
    };
  }

  try {
    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    const payload: any = {
      apertura_caja_id: aperturaCajaId,
      tipo,
      monto,
      motivo,
    };
    if (finalUserId) {
      payload.usuario_id = finalUserId;
    }

    console.log('[SupabaseService] Insertando movimiento_caja:', payload);
    const { data, error } = await client.from('movimientos_caja').insert(payload).select().single();

    if (error) {
      console.error('[SupabaseService] Error insertando movimiento_caja:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando movimiento de caja' };
  }
};

export const fetchLiveCashMovements = async (
  aperturaCajaId?: string
): Promise<CashMovement[] | null> => {
  const client = getSupabaseClient();
  if (!client || !aperturaCajaId || !isValidUUID(aperturaCajaId)) return null;

  try {
    const { data, error } = await client
      .from('movimientos_caja')
      .select('*')
      .eq('apertura_caja_id', aperturaCajaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((m: any) => ({
      id: m.id,
      aperturaId: m.apertura_caja_id,
      tipo: m.tipo,
      monto: Number(m.monto),
      motivo: m.motivo,
      usuarioNombre: 'Cajero',
      fecha: m.created_at,
    }));
  } catch (err) {
    console.error('[SupabaseService] Error consultando movimientos_caja:', err);
    return null;
  }
};

// ==============================================================================
// 4.2. GASTOS OPERATIVOS (INSERT & SELECT)
// ==============================================================================

export const insertLiveExpense = async (
  expenseData: {
    descripcion: string;
    monto: number;
    categoria: string;
    pagadoDesdeCaja?: boolean;
    comprobanteUrl?: string;
  },
  negocioId: string,
  sucursalId?: string,
  aperturaCajaId?: string,
  usuarioId?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  if (!isValidUUID(negocioId)) {
    return { success: false, error: 'ID de negocio inválido para registrar gasto.' };
  }

  try {
    let finalSucursalId = isValidUUID(sucursalId) ? sucursalId : null;
    if (!finalSucursalId) {
      const { data: firstSuc } = await client
        .from('sucursales')
        .select('id')
        .eq('negocio_id', negocioId)
        .limit(1)
        .maybeSingle();

      if (firstSuc && isValidUUID(firstSuc.id)) {
        finalSucursalId = firstSuc.id;
      }
    }

    if (!finalSucursalId) {
      return {
        success: false,
        error: 'No se encontró una sucursal válida para asociar el gasto.',
      };
    }

    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    const payload: any = {
      negocio_id: negocioId,
      sucursal_id: finalSucursalId,
      descripcion: expenseData.descripcion,
      monto: expenseData.monto,
      categoria: expenseData.categoria || 'otros',
      pagado_desde_caja: expenseData.pagadoDesdeCaja ?? true,
      comprobante_url: expenseData.comprobanteUrl || null,
      fecha_gasto: new Date().toISOString().split('T')[0],
    };

    if (isValidUUID(aperturaCajaId)) {
      payload.apertura_caja_id = aperturaCajaId;
    }
    if (finalUserId) {
      payload.usuario_id = finalUserId;
    }

    console.log('[SupabaseService] Insertando gasto operativo:', payload);
    const { data, error } = await client.from('gastos').insert(payload).select().single();

    if (error) {
      console.error('[SupabaseService] Error insertando gasto en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando gasto' };
  }
};

export const fetchLiveExpenses = async (
  negocioId?: string,
  sucursalId?: string
): Promise<OperationalExpense[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('gastos').select('*').order('created_at', { ascending: false });
    if (negocioId && isValidUUID(negocioId)) {
      query = query.eq('negocio_id', negocioId);
    }
    if (sucursalId && isValidUUID(sucursalId)) {
      query = query.eq('sucursal_id', sucursalId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((g: any) => ({
      id: g.id,
      descripcion: g.descripcion,
      monto: Number(g.monto),
      categoria: g.categoria,
      pagadoDesdeCaja: Boolean(g.pagado_desde_caja),
      fecha: g.created_at || g.fecha_gasto,
      usuarioNombre: 'Cajero / Admin',
    }));
  } catch (err) {
    console.error('[SupabaseService] Error consultando gastos:', err);
    return null;
  }
};

export const closeLiveCashRegister = async (
  aperturaId: string,
  usuarioId: string,
  montoDeclarado: number,
  montoEsperado: number,
  diferencia: number,
  desglose?: any,
  notas?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  try {
    if (!isValidUUID(aperturaId)) {
      return { success: false, error: 'ID de apertura de caja inválido.' };
    }

    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    if (!finalUserId) {
      return {
        success: false,
        error: 'No se puede cerrar caja en Supabase sin un usuario autenticado válido.',
      };
    }

    // 1. Marcar apertura_caja como cerrada
    const { error: updateError } = await client
      .from('aperturas_caja')
      .update({ estado: 'cerrada' })
      .eq('id', aperturaId);

    if (updateError) {
      console.error('[SupabaseService] Error actualizando aperturas_caja:', updateError);
      return { success: false, error: updateError.message };
    }

    // 2. Registrar en cierres_caja
    const { error: insertCloseError } = await client.from('cierres_caja').insert({
      apertura_id: aperturaId,
      usuario_cierre_id: finalUserId,
      monto_declarado_efectivo: montoDeclarado,
      monto_esperado_efectivo: montoEsperado,
      diferencia_efectivo: diferencia,
      desglose_monedas_billetes: desglose || null,
      notas_cajero: notas || null,
    });

    if (insertCloseError) {
      console.warn('[SupabaseService] Advertencia en cierres_caja:', insertCloseError);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error cerrando caja' };
  }
};

// ==============================================================================
// 5. REGISTRO REAL DE VENTA EN SUPABASE (INSERT TRANSACCIONAL ESTRICTO)
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

  console.log('[SupabaseService] === INICIANDO VALIDACIÓN ESTRICTA DE VENTA ===');

  try {
    // 0. Obtener usuario autenticado en Supabase si existe
    const { data: authData } = await client.auth.getUser();
    const authUser = authData?.user;

    // A. Resolver y validar negocio_id real
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
      }
    }

    if (!finalNegocioId || !isValidUUID(finalNegocioId)) {
      return {
        success: false,
        error: 'No se encontró un ID de Negocio (UUID) válido en Supabase. Debes crear un negocio primero.',
      };
    }

    // B. Resolver y validar sucursal_id real
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
      }
    }

    if (!finalSucursalId || !isValidUUID(finalSucursalId)) {
      return {
        success: false,
        error: 'No se encontró una Sucursal (UUID) válida en Supabase para este negocio. Debes dar de alta una sucursal.',
      };
    }

    // C. Resolver y validar apertura_caja_id real
    let finalAperturaCajaId = isValidUUID(aperturaCajaId) ? aperturaCajaId : null;
    if (!finalAperturaCajaId) {
      const { data: activeApertura } = await client
        .from('aperturas_caja')
        .select('id')
        .eq('estado', 'abierta')
        .order('fecha_apertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeApertura && isValidUUID(activeApertura.id)) {
        finalAperturaCajaId = activeApertura.id;
      }
    }

    if (!finalAperturaCajaId || !isValidUUID(finalAperturaCajaId)) {
      return {
        success: false,
        error: 'No hay ningún turno de caja abierto en Supabase. Debes abrir caja primero en el panel de Control de Caja.',
      };
    }

    // D. Resolver cajero_id
    let finalCajeroId: string | null = null;
    if (authUser && isValidUUID(authUser.id)) {
      finalCajeroId = authUser.id;
    } else if (isValidUUID(sale.cajeroId)) {
      finalCajeroId = sale.cajeroId;
    }

    // E. Resolver cliente_id
    const finalClienteId = isValidUUID(sale.clienteId) ? sale.clienteId : null;

    // F. Validar estrictamente los productos y presentaciones del carrito
    for (const item of sale.items) {
      if (!isValidUUID(item.producto.id)) {
        return {
          success: false,
          error: `El producto "${item.producto.nombre}" tiene un ID simulado (${item.producto.id}). Solo se permiten productos reales con UUID de Supabase.`,
        };
      }
      if (!isValidUUID(item.presentacion.id)) {
        return {
          success: false,
          error: `La presentación "${item.presentacion.nombre}" del producto "${item.producto.nombre}" tiene un ID simulado (${item.presentacion.id}). Debe provenir de la tabla "presentaciones_producto" de Supabase.`,
        };
      }
    }

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

    console.log('[SupabaseService] Insertando venta real en "ventas":', ventaPayload);

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

    // 2. Insertar Detalles de Venta ('venta_detalles')
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

    console.log('[SupabaseService] Insertando detalles en "venta_detalles":', detallesToInsert);
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
        console.log('[SupabaseService] Insertando pagos en "pagos_venta":', pagosToInsert);
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

    console.log('[SupabaseService] ¡Venta real registrada con éxito en Supabase! ID:', newVentaId);
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

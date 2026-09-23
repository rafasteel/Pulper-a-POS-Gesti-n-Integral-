import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  BusinessConfig,
  Product,
  ProductPresentation,
  Category,
  CartItem,
  Sale,
  Customer,
  CashRegister,
  CashMovement,
  CashClosingReport,
  KardexMovement,
  OperationalExpense,
  SaaSTenant,
  SubscriptionStatus,
  SubscriptionPlan,
  Supplier,
  Purchase,
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_USERS,
  INITIAL_REGISTER,
  INITIAL_TENANTS,
} from '../utils/mockData';
import { soundManager } from '../utils/audioHaptics';
import confetti from 'canvas-confetti';
import {
  isSupabaseConfigured,
  loginWithSupabaseAuth,
  logoutSupabaseAuth,
  fetchUserProfileLive,
  fetchLiveCatalog,
  fetchLiveCustomers,
  insertLiveSale,
  fetchLiveTenants,
  fetchLiveCashRegister,
  openLiveCashRegister,
  closeLiveCashRegister,
  insertLiveCashMovement,
  fetchLiveCashMovements,
  insertLiveExpense,
  fetchLiveExpenses,
  insertLiveCustomer,
  insertLiveCustomerPayment,
  insertLiveProduct,
  insertLivePresentation,
  deleteLivePresentation,
  updateLiveProduct,
  fetchLiveKardex,
  updateLiveTenantStatus,
  updateLiveTenantPlan,
  insertLiveTenant,
  fetchLiveSuppliers,
  insertLiveSupplier,
  fetchLivePurchases,
  insertLivePurchase,
  saveLivePhysicalAudit,
  isValidUUID,
} from '../services/supabaseService';

interface HeldCart {
  id: string;
  nombre: string;
  items: CartItem[];
  fechaHora: string;
  total: number;
}

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  users: UserProfile[];
  config: BusinessConfig;
  updateConfig: (newConfig: Partial<BusinessConfig>) => void;
  
  // Autenticación Real & Sesión
  isAuthenticated: boolean;
  isSupabaseConnected: boolean;
  isProcessingSale: boolean;
  isLoadingLiveCatalog: boolean;
  loginWithPinCode: (pin: string, userId?: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  logout: () => Promise<void>;
  lockScreen: () => void;
  syncLiveCatalog: () => Promise<void>;

  // SaaS Multi-Tenant & Subscription Management (100% Cloud)
  tenants: SaaSTenant[];
  currentTenant: SaaSTenant;
  switchTenant: (tenantId: string) => void;
  toggleTenantSubscription: (tenantId: string, status?: SubscriptionStatus) => Promise<{ success: boolean; error?: string }>;
  updateTenantPlan: (tenantId: string, plan: SubscriptionPlan) => Promise<{ success: boolean; error?: string }>;
  addNewTenant: (tenantData: Omit<SaaSTenant, 'id' | 'creadoEn'>) => Promise<{ success: boolean; tenant?: SaaSTenant; error?: string }>;
  isCurrentTenantSuspended: boolean;

  categories: Category[];
  products: Product[];
  customers: Customer[];
  cashRegister: CashRegister;
  cart: CartItem[];
  heldCarts: HeldCart[];
  salesHistory: Sale[];
  cashMovements: CashMovement[];
  cashClosings: CashClosingReport[];
  kardex: KardexMovement[];
  expenses: OperationalExpense[];
  suppliers: Supplier[];
  purchases: Purchase[];
  
  // Cart Actions
  addToCart: (product: Product, presentation: ProductPresentation, qty?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  setDiscount: (itemId: string, discount: number) => void;
  clearCart: () => void;
  pauseCart: (nombre?: string) => void;
  resumeCart: (heldId: string) => void;
  deleteHeldCart: (heldId: string) => void;

  // Sale & Cash
  completeSale: (paymentInfo: {
    metodo: 'efectivo' | 'tarjeta' | 'transferencia' | 'fiado' | 'mixto';
    montoRecibido?: number;
    clienteId?: string;
    referencia?: string;
  }) => Promise<{ success: boolean; sale?: Sale; error?: string }>;
  
  // Barcode & Product (100% Cloud)
  findProductByBarcode: (barcode: string) => { product: Product; presentation: ProductPresentation } | null;
  quickRegisterProduct: (data: {
    nombre: string;
    codigoBarras?: string;
    precioCosto: number;
    precioVenta: number;
    categoriaId?: string;
    stockInicial: number;
    permiteDecimales?: boolean;
    esFavorito?: boolean;
    stockMinimo?: number;
    stockMaximo?: number;
    unidadMedidaBase?: string;
  }) => Promise<{ success: boolean; product?: Product; error?: string }>;
  updateProduct: (product: Product) => Promise<{ success: boolean; error?: string }>;
  addPresentationToProduct: (productoId: string, data: {
    nombre: string;
    factorConversion: number;
    codigoBarras?: string;
    precioCosto: number;
    precioVenta: number;
  }) => Promise<{ success: boolean; presentation?: ProductPresentation; error?: string }>;
  deletePresentationFromProduct: (presId: string) => Promise<{ success: boolean; error?: string }>;

  // Physical Audit (100% Cloud)
  applyPhysicalAuditAdjustment: (counts: Record<string, number>, notas?: string) => Promise<{ success: boolean; error?: string }>;

  // Purchases & Suppliers (100% Cloud)
  addNewSupplier: (data: {
    nombreComercial: string;
    razonSocial?: string;
    ruc?: string;
    contactoNombre?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    diasCredito?: number;
  }) => Promise<{ success: boolean; supplier?: Supplier; error?: string }>;
  registerPurchase: (data: {
    proveedorId: string;
    numeroFactura?: string;
    tipoPago: 'contado' | 'credito';
    observaciones?: string;
    items: {
      productoId: string;
      presentacionId: string;
      cantidad: number;
      factorConversion: number;
      costoUnitario: number;
      subtotal: number;
    }[];
  }) => Promise<{ success: boolean; purchaseId?: string; error?: string }>;

  // Cash Operations
  addCashMovement: (tipo: 'entrada_efectivo' | 'retiro_gasto' | 'retiro_deposito', monto: number, motivo: string) => Promise<{ success: boolean; error?: string }>;
  closeCashRegisterBlind: (montoDeclarado: number, desglose?: Record<string, number>, notas?: string) => Promise<CashClosingReport>;
  openCashRegister: (montoInicial: number) => Promise<{ success: boolean; error?: string }>;

  // Credit & Fiado
  registerCustomerPayment: (clienteId: string, monto: number, metodo?: 'efectivo' | 'transferencia', notas?: string) => Promise<{ success: boolean; error?: string }>;
  addNewCustomer: (cliente: Omit<Customer, 'id' | 'saldoDeudorActual' | 'bloqueadoPorMora' | 'activo'>) => Promise<{ success: boolean; customer?: Customer; error?: string }>;

  // Expenses
  addExpense: (expense: Omit<OperationalExpense, 'id' | 'usuarioNombre' | 'fecha'>) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('pulperia_auth_user'));
  });
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('pulperia_auth_user');
    return saved ? JSON.parse(saved) : INITIAL_USERS[2]; // Rosa (Cajera) por defecto
  });
  const [users] = useState<UserProfile[]>(INITIAL_USERS);
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false);
  const [isLoadingLiveCatalog, setIsLoadingLiveCatalog] = useState<boolean>(false);
  const isSupabaseConnected = isSupabaseConfigured();
  
  // Estado de Inquilinos SaaS (100% Cloud)
  const [tenants, setTenants] = useState<SaaSTenant[]>(() => {
    const saved = localStorage.getItem('pulperia_saas_tenants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every((t: any) => isValidUUID(t.id) && !String(t.id).startsWith('tenant-'))
        ) {
          return parsed;
        }
      } catch (e) {
        // ignore error
      }
    }
    localStorage.removeItem('pulperia_saas_tenants');
    return INITIAL_TENANTS;
  });

  const [currentTenantId, setCurrentTenantId] = useState<string>(() => {
    const saved = localStorage.getItem('pulperia_active_tenant_id');
    if (saved && isValidUUID(saved) && !saved.startsWith('tenant-')) {
      return saved;
    }
    return INITIAL_TENANTS[0].id;
  });

  const currentTenant = tenants.find(t => t.id === currentTenantId) || tenants[0];
  const isCurrentTenantSuspended = currentTenant.estadoSuscripcion === 'suspendida';

  const [config, setConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('pulperia_config');
    const base = saved ? JSON.parse(saved) : INITIAL_CONFIG;
    return { ...base, nombreNegocio: currentTenant.nombre };
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pulperia_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.every((p: any) => isValidUUID(p.id) && !String(p.id).startsWith('prod-'))
        ) {
          return parsed;
        }
      } catch (e) {
        // ignore error
      }
    }
    localStorage.removeItem('pulperia_products');
    return [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('pulperia_customers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((c: any) => isValidUUID(c.id))) {
          return parsed;
        }
      } catch (e) {
        // ignore error
      }
    }
    localStorage.removeItem('pulperia_customers');
    return [];
  });

  const [cashRegister, setCashRegister] = useState<CashRegister>(INITIAL_REGISTER);

  // Auto-saneamiento estricto de carrito contra IDs simulados
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pulperia_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (item: any) =>
              item?.producto &&
              isValidUUID(item.producto.id) &&
              !String(item.producto.id).startsWith('prod-') &&
              item?.presentacion &&
              isValidUUID(item.presentacion.id) &&
              !String(item.presentacion.id).startsWith('pres-')
          )
        ) {
          return parsed;
        }
      } catch (e) {
        // ignore error
      }
    }
    localStorage.removeItem('pulperia_cart');
    return [];
  });

  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    const saved = localStorage.getItem('pulperia_held_carts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: any) =>
            Array.isArray(c.items) &&
            c.items.every(
              (item: any) =>
                item?.producto &&
                isValidUUID(item.producto.id) &&
                !String(item.producto.id).startsWith('prod-') &&
                item?.presentacion &&
                isValidUUID(item.presentacion.id) &&
                !String(item.presentacion.id).startsWith('pres-')
            )
          );
        }
      } catch (e) {
        // ignore error
      }
    }
    localStorage.removeItem('pulperia_held_carts');
    return [];
  });

  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('pulperia_sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosingReport[]>([]);
  const [kardex, setKardex] = useState<KardexMovement[]>([]);
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Guardar en localStorage para persistencia offline
  useEffect(() => {
    localStorage.setItem('pulperia_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pulperia_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('pulperia_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pulperia_held_carts', JSON.stringify(heldCarts));
  }, [heldCarts]);

  useEffect(() => {
    localStorage.setItem('pulperia_sales', JSON.stringify(salesHistory));
  }, [salesHistory]);

  // Persistencia SaaS Multi-Tenant
  useEffect(() => {
    localStorage.setItem('pulperia_saas_tenants', JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem('pulperia_active_tenant_id', currentTenantId);
  }, [currentTenantId]);

  const switchTenant = (tenantId: string) => {
    const found = tenants.find(t => t.id === tenantId);
    if (found) {
      setCurrentTenantId(tenantId);
      setConfig(prev => ({
        ...prev,
        nombreNegocio: found.nombre,
      }));
    }
  };

  // Mutación en vivo de suscripción SaaS (Supabase)
  const toggleTenantSubscription = async (
    tenantId: string,
    status?: SubscriptionStatus
  ): Promise<{ success: boolean; error?: string }> => {
    const target = tenants.find(t => t.id === tenantId);
    const nuevoEstado = status || (target?.estadoSuscripcion === 'suspendida' ? 'activa' : 'suspendida');
    const nuevoVence = nuevoEstado === 'activa' && target && new Date(target.fechaVencimiento) < new Date()
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : target?.fechaVencimiento;

    if (isSupabaseConfigured() && isValidUUID(tenantId)) {
      const res = await updateLiveTenantStatus(tenantId, nuevoEstado, nuevoVence);
      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error };
      }
    }

    setTenants(prev =>
      prev.map(t => {
        if (t.id === tenantId) {
          return {
            ...t,
            estadoSuscripcion: nuevoEstado,
            fechaVencimiento: nuevoVence || t.fechaVencimiento,
          };
        }
        return t;
      })
    );

    soundManager.playTouchClick();
    return { success: true };
  };

  const updateTenantPlan = async (
    tenantId: string,
    plan: SubscriptionPlan
  ): Promise<{ success: boolean; error?: string }> => {
    const precio = plan === 'basico' ? 15 : plan === 'pro' ? 29 : 49;

    if (isSupabaseConfigured() && isValidUUID(tenantId)) {
      const res = await updateLiveTenantPlan(tenantId, plan, precio);
      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error };
      }
    }

    setTenants(prev =>
      prev.map(t => {
        if (t.id === tenantId) {
          return {
            ...t,
            plan,
            precioMensual: precio,
          };
        }
        return t;
      })
    );

    soundManager.playTouchClick();
    return { success: true };
  };

  const addNewTenant = async (
    tenantData: Omit<SaaSTenant, 'id' | 'creadoEn'>
  ): Promise<{ success: boolean; tenant?: SaaSTenant; error?: string }> => {
    if (isSupabaseConfigured()) {
      const res = await insertLiveTenant(tenantData);
      if (!res.success || !res.tenant) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error registrando negocio en Supabase' };
      }

      setTenants(prev => [res.tenant!, ...prev]);
      soundManager.playPaymentSuccess();
      return { success: true, tenant: res.tenant };
    }

    return { success: false, error: 'Supabase no está configurado en .env.local. No se permiten datos locales simulados.' };
  };

  // Sincronización 100% en vivo con Supabase
  const syncLiveCatalog = async () => {
    if (!isSupabaseConfigured()) return;
    setIsLoadingLiveCatalog(true);
    try {
      // 1. Sincronizar catálogo real de Supabase (sin fallback a mock data)
      const liveData = await fetchLiveCatalog(currentTenantId);
      if (liveData) {
        const cleanProds = liveData.products.filter(p => isValidUUID(p.id) && !p.id.startsWith('prod-'));
        setProducts(cleanProds);
        setCategories(liveData.categories);
      }
      
      // 2. Sincronizar clientes reales de Supabase
      const liveCustomers = await fetchLiveCustomers(currentTenantId);
      if (liveCustomers) {
        setCustomers(liveCustomers.filter(c => isValidUUID(c.id)));
      }

      // 3. Sincronizar negocios/tenants de Supabase
      const liveTenants = await fetchLiveTenants();
      if (liveTenants && liveTenants.length > 0) {
        const cleanTenants = liveTenants.filter(t => isValidUUID(t.id));
        setTenants(cleanTenants);
      }

      // 4. Sincronizar estado de apertura de caja de la sucursal activa
      const activeSucursalId = currentUser.sucursalId;
      const liveRegister = await fetchLiveCashRegister(activeSucursalId);
      if (liveRegister) {
        setCashRegister(liveRegister);
        if (liveRegister.aperturaActual?.id) {
          const liveMovs = await fetchLiveCashMovements(liveRegister.aperturaActual.id);
          if (liveMovs) {
            setCashMovements(liveMovs);
          }
        }
      }

      // 5. Sincronizar gastos operativos de Supabase
      const liveExpenses = await fetchLiveExpenses(currentTenantId, activeSucursalId);
      if (liveExpenses) {
        setExpenses(liveExpenses);
      }

      // 6. Sincronizar proveedores y compras de Supabase
      const liveSuppliers = await fetchLiveSuppliers(currentTenantId);
      if (liveSuppliers) {
        setSuppliers(liveSuppliers);
      }

      const livePurchases = await fetchLivePurchases(currentTenantId, activeSucursalId);
      if (livePurchases) {
        setPurchases(livePurchases);
      }

      // 7. Sincronizar Kardex inmutable de Supabase
      const liveKardex = await fetchLiveKardex(currentTenantId, activeSucursalId);
      if (liveKardex) {
        setKardex(liveKardex);
      }
    } catch (err) {
      console.warn('Aviso: Error sincronizando datos con Supabase:', err);
    } finally {
      setIsLoadingLiveCatalog(false);
    }
  };

  useEffect(() => {
    syncLiveCatalog();
  }, [currentTenantId, currentUser.sucursalId]);

  // Autenticación por PIN táctil
  const loginWithPinCode = async (pin: string, userId?: string) => {
    let targetUser = userId ? users.find(u => u.id === userId) : users.find(u => u.pin === pin);
    if (!targetUser) {
      targetUser = users.find(u => u.pin === pin);
    }

    if (targetUser && targetUser.pin === pin) {
      setCurrentUser(targetUser);
      setIsAuthenticated(true);
      localStorage.setItem('pulperia_auth_user', JSON.stringify(targetUser));
      if (targetUser.negocioId) {
        switchTenant(targetUser.negocioId);
      }
      return { success: true, user: targetUser };
    }
    return { success: false, error: 'PIN incorrecto. Intente nuevamente.' };
  };

  // Autenticación por Correo y Contraseña
  const loginWithEmail = async (emailToAuth: string, pass: string) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await loginWithSupabaseAuth(emailToAuth, pass);
      if (error) {
        return { success: false, error: error.message };
      }
      if (data?.user) {
        const liveProfile = await fetchUserProfileLive(data.user.id);
        const activeProfile: UserProfile = liveProfile || {
          id: data.user.id,
          nombre: data.user.user_metadata?.nombre || emailToAuth.split('@')[0],
          apellido: data.user.user_metadata?.apellido || '',
          email: data.user.email,
          rol: (data.user.user_metadata?.rol || 'cajero') as any,
          pin: '1234',
        };
        setCurrentUser(activeProfile);
        setIsAuthenticated(true);
        localStorage.setItem('pulperia_auth_user', JSON.stringify(activeProfile));
        if (activeProfile.negocioId) {
          switchTenant(activeProfile.negocioId);
        }
        return { success: true, user: activeProfile };
      }
    }

    // Modo local / Fallback para cuentas de prueba del Seed
    const matchingMock = users.find(u => u.email?.toLowerCase() === emailToAuth.toLowerCase());
    if (matchingMock) {
      setCurrentUser(matchingMock);
      setIsAuthenticated(true);
      localStorage.setItem('pulperia_auth_user', JSON.stringify(matchingMock));
      if (matchingMock.negocioId) {
        switchTenant(matchingMock.negocioId);
      }
      return { success: true, user: matchingMock };
    }

    return { success: false, error: 'Credenciales inválidas o no registradas' };
  };

  const logout = async () => {
    await logoutSupabaseAuth();
    setIsAuthenticated(false);
    localStorage.removeItem('pulperia_auth_user');
  };

  const lockScreen = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pulperia_auth_user');
  };

  const updateConfig = (newConfig: Partial<BusinessConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('pulperia_config', JSON.stringify(updated));
      soundManager.setSoundEnabled(updated.sonidoEscanerActivo);
      soundManager.setHapticsEnabled(updated.vibracionActiva);
      return updated;
    });
  };

  // Buscar producto y presentación por código de barras
  const findProductByBarcode = (barcode: string): { product: Product; presentation: ProductPresentation } | null => {
    const cleanBarcode = barcode.trim();
    for (const prod of products) {
      for (const pres of prod.presentaciones) {
        if (pres.codigoBarras === cleanBarcode) {
          return { product: prod, presentation: pres };
        }
      }
    }
    return null;
  };

  // Agregar al carrito
  const addToCart = (product: Product, presentation: ProductPresentation, qty: number = 1) => {
    soundManager.playScanSuccess();
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.producto.id === product.id && item.presentacion.id === presentation.id
      );

      if (existingIndex > -1) {
        const copy = [...prev];
        const item = copy[existingIndex];
        const newQty = item.cantidad + qty;
        copy[existingIndex] = {
          ...item,
          cantidad: newQty,
          subtotal: Number((newQty * item.precioUnitario - item.descuentoUnitario * newQty).toFixed(2)),
        };
        return copy;
      } else {
        const newItem: CartItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          producto: product,
          presentacion: presentation,
          cantidad: qty,
          precioUnitario: presentation.precioVenta,
          descuentoUnitario: 0,
          subtotal: Number((qty * presentation.precioVenta).toFixed(2)),
          costoUnitarioBase: presentation.precioCosto / presentation.factorConversion,
        };
        return [newItem, ...prev];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    soundManager.playTouchClick();
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    soundManager.playTouchClick();
    setCart(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const finalQty = item.producto.permiteDecimales ? Number(qty.toFixed(2)) : Math.round(qty);
          return {
            ...item,
            cantidad: finalQty,
            subtotal: Number((finalQty * item.precioUnitario - item.descuentoUnitario * finalQty).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  const setDiscount = (itemId: string, discount: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            descuentoUnitario: discount,
            subtotal: Number((item.cantidad * item.precioUnitario - discount * item.cantidad).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    soundManager.playTouchClick();
    setCart([]);
  };

  // Pausar venta (ticket en espera)
  const pauseCart = (nombreTicket?: string) => {
    if (cart.length === 0) return;
    soundManager.playTouchClick();
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const newHeld: HeldCart = {
      id: `held-${Date.now()}`,
      nombre: nombreTicket || `Ticket #${heldCarts.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      items: cart,
      fechaHora: new Date().toISOString(),
      total,
    };
    setHeldCarts(prev => [newHeld, ...prev]);
    setCart([]);
  };

  // Recuperar venta en espera
  const resumeCart = (heldId: string) => {
    const target = heldCarts.find(h => h.id === heldId);
    if (!target) return;
    soundManager.playTouchClick();
    setCart(target.items);
    setHeldCarts(prev => prev.filter(h => h.id !== heldId));
  };

  const deleteHeldCart = (heldId: string) => {
    soundManager.playTouchClick();
    setHeldCarts(prev => prev.filter(h => h.id !== heldId));
  };

  // Completar venta y descontar existencias con lógica de factores de conversión
  const completeSale = async (paymentInfo: {
    metodo: 'efectivo' | 'tarjeta' | 'transferencia' | 'fiado' | 'mixto';
    montoRecibido?: number;
    clienteId?: string;
    referencia?: string;
  }): Promise<{ success: boolean; sale?: Sale; error?: string }> => {
    if (isProcessingSale) {
      return { success: false, error: 'Procesando venta previa...' };
    }
    setIsProcessingSale(true);

    try {
      // Verificación SaaS: Bloqueo de ventas si la suscripción está suspendida
      if (isCurrentTenantSuspended && currentUser.rol !== 'superadmin') {
        soundManager.playError();
        return {
          success: false,
          error: 'Suscripción suspendida. El negocio no tiene permitido registrar nuevas ventas hasta regularizar su pago.',
        };
      }

      // Verificación estricta de caja abierta
      if (cashRegister.estado !== 'abierta' || !cashRegister.aperturaActual?.id || !isValidUUID(cashRegister.aperturaActual.id)) {
        soundManager.playError();
        return {
          success: false,
          error: 'No se puede procesar la venta: La caja se encuentra cerrada o sin un turno válido en Supabase. Debes abrir caja primero.',
        };
      }

      if (cart.length === 0) {
        soundManager.playError();
        return { success: false, error: 'El carrito está vacío' };
      }

      const subtotal = cart.reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0);
      const totalDescuento = cart.reduce((sum, i) => sum + i.descuentoUnitario * i.cantidad, 0);
      const total = Number((subtotal - totalDescuento).toFixed(2));
      const costoTotal = cart.reduce(
        (sum, i) => sum + i.cantidad * i.presentacion.factorConversion * i.costoUnitarioBase,
        0
      );
      const utilidadEstimada = Number((total - costoTotal).toFixed(2));

      let cliente: Customer | undefined;
      if (paymentInfo.clienteId) {
        cliente = customers.find(c => c.id === paymentInfo.clienteId);
        if (paymentInfo.metodo === 'fiado' && cliente) {
          if (cliente.saldoDeudorActual + total > cliente.limiteCredito) {
            soundManager.playError();
            return {
              success: false,
              error: `Límite de crédito excedido. Límite: ${config.monedaSimbolo}${cliente.limiteCredito}, Deuda actual: ${config.monedaSimbolo}${cliente.saldoDeudorActual}`,
            };
          }
        }
      }

      const ticketNumber = `T-${String(salesHistory.length + 1).padStart(5, '0')}`;
      const newSale: Sale = {
        id: `sale-${Date.now()}`,
        numeroTicket: ticketNumber,
        fechaHora: new Date().toISOString(),
        clienteId: cliente?.id,
        clienteNombre: cliente ? `${cliente.nombre} (${cliente.apodo || ''})` : undefined,
        cajeroId: currentUser.id,
        cajeroNombre: `${currentUser.nombre} ${currentUser.apellido}`,
        tipoVenta: paymentInfo.metodo === 'fiado' ? 'credito_fiado' : 'contado',
        items: [...cart],
        subtotal,
        descuento: totalDescuento,
        impuesto: 0,
        total,
        costoTotal,
        utilidadEstimada,
        pagos: [
          {
            metodoPago: paymentInfo.metodo,
            monto: total,
            montoRecibido: paymentInfo.montoRecibido,
            cambio: paymentInfo.montoRecibido ? Math.max(0, paymentInfo.montoRecibido - total) : 0,
            referencia: paymentInfo.referencia,
          },
        ],
        estado: 'completada',
      };

      // 1. Guardar en Supabase si está configurado
      if (isSupabaseConfigured()) {
        const sucursalId = currentUser.sucursalId;
        const aperturaCajaId = cashRegister.aperturaActual?.id;

        console.log('[AppContext] Enviando venta a Supabase con parámetros:', {
          ticket: newSale.numeroTicket,
          total: newSale.total,
          currentTenantId,
          sucursalId,
          aperturaCajaId,
          cajeroId: currentUser.id,
        });

        const insertResult = await insertLiveSale(
          newSale,
          currentTenantId,
          sucursalId,
          aperturaCajaId
        );

        console.log('[AppContext] Respuesta recibida de Supabase insertLiveSale:', insertResult);

        // MANEJO ESTRICTO DE ERRORES: Si la inserción en Supabase falla, abortar de inmediato.
        // No limpiar el carrito ni simular éxito en el POS.
        if (!insertResult.success) {
          soundManager.playError();
          setIsProcessingSale(false);
          return {
            success: false,
            error: insertResult.error || 'Error al guardar la venta en Supabase.',
          };
        }

        if (insertResult.saleId) {
          newSale.id = insertResult.saleId;
        }
      }

      // 2. Descontar inventario en unidades base y registrar en Kardex
      const updatedProducts = [...products];
      const newKardexEntries: KardexMovement[] = [];

      cart.forEach(item => {
        const prodIndex = updatedProducts.findIndex(p => p.id === item.producto.id);
        if (prodIndex > -1) {
          const prod = updatedProducts[prodIndex];
          const descontarBase = item.cantidad * item.presentacion.factorConversion;
          const saldoAnterior = prod.existenciaBase;
          const saldoNuevo = Number((saldoAnterior - descontarBase).toFixed(2));

          updatedProducts[prodIndex] = {
            ...prod,
            existenciaBase: saldoNuevo,
          };

          newKardexEntries.push({
            id: `kdx-${Date.now()}-${item.id}`,
            fecha: new Date().toISOString(),
            productoId: prod.id,
            productoNombre: `${prod.nombre} (${item.presentacion.nombre})`,
            tipo: 'venta',
            cantidadBase: -descontarBase,
            saldoAnterior,
            saldoNuevo,
            costoUnitarioBase: item.costoUnitarioBase,
            referencia: `Venta Ticket ${ticketNumber}`,
            usuario: currentUser.nombre,
          });
        }
      });

      setProducts(updatedProducts);
      setKardex(prev => [...newKardexEntries, ...prev]);

      // 3. Si fue fiado, actualizar la deuda del cliente
      if (paymentInfo.metodo === 'fiado' && cliente) {
        setCustomers(prev =>
          prev.map(c => {
            if (c.id === cliente?.id) {
              return {
                ...c,
                saldoDeudorActual: Number((c.saldoDeudorActual + total).toFixed(2)),
              };
            }
            return c;
          })
        );
      }

      // 4. Registrar venta y limpiar carrito
      setSalesHistory(prev => [newSale, ...prev]);
      setCart([]);

      // 5. Feedback audiovisual
      soundManager.playPaymentSuccess();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {
        // ignorar si no soporta
      }

      return { success: true, sale: newSale };
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Registro en vivo de producto en Supabase (100% Cloud)
  const quickRegisterProduct = async (data: {
    nombre: string;
    codigoBarras?: string;
    precioCosto: number;
    precioVenta: number;
    categoriaId?: string;
    stockInicial: number;
    permiteDecimales?: boolean;
    esFavorito?: boolean;
    stockMinimo?: number;
    stockMaximo?: number;
    unidadMedidaBase?: string;
  }): Promise<{ success: boolean; product?: Product; error?: string }> => {
    if (isSupabaseConfigured()) {
      const res = await insertLiveProduct(data, currentTenantId, currentUser.sucursalId);
      if (!res.success || !res.product) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error creando producto en Supabase' };
      }

      setProducts(prev => [res.product!, ...prev]);
      soundManager.playPaymentSuccess();
      return { success: true, product: res.product };
    }

    // Fallback con UUID si no está conectado
    const prodId = crypto.randomUUID ? crypto.randomUUID() : '11111111-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0');
    const presId = crypto.randomUUID ? crypto.randomUUID() : '22222222-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0');
    const newPresentation: ProductPresentation = {
      id: presId,
      productoId: prodId,
      nombre: 'Unidad',
      factorConversion: 1,
      codigoBarras: data.codigoBarras || '',
      precioCosto: data.precioCosto,
      precioVenta: data.precioVenta,
      esPresentacionBase: true,
      activo: true,
    };

    const newProduct: Product = {
      id: prodId,
      categoriaId: data.categoriaId || '',
      nombre: data.nombre,
      unidadMedidaBase: data.unidadMedidaBase || 'unidad',
      permiteDecimales: data.permiteDecimales ?? false,
      esFavorito: data.esFavorito ?? true,
      stockMinimo: data.stockMinimo ?? 5,
      stockMaximo: data.stockMaximo ?? 50,
      perecedero: false,
      existenciaBase: data.stockInicial,
      presentaciones: [newPresentation],
    };

    setProducts(prev => [newProduct, ...prev]);
    return { success: true, product: newProduct };
  };

  const updateProduct = async (updated: Product): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured() && isValidUUID(updated.id)) {
      const res = await updateLiveProduct(updated, currentUser.sucursalId);
      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error };
      }
    }
    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    return { success: true };
  };

  const addPresentationToProduct = async (
    productoId: string,
    data: {
      nombre: string;
      factorConversion: number;
      codigoBarras?: string;
      precioCosto: number;
      precioVenta: number;
    }
  ): Promise<{ success: boolean; presentation?: ProductPresentation; error?: string }> => {
    if (isSupabaseConfigured() && isValidUUID(productoId)) {
      const res = await insertLivePresentation(productoId, data);
      if (!res.success || !res.presentation) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error insertando presentación en Supabase' };
      }

      setProducts(prev =>
        prev.map(p => {
          if (p.id === productoId) {
            return {
              ...p,
              presentaciones: [...p.presentaciones, res.presentation!],
            };
          }
          return p;
        })
      );
      soundManager.playPaymentSuccess();
      return { success: true, presentation: res.presentation };
    }

    const localPres: ProductPresentation = {
      id: crypto.randomUUID ? crypto.randomUUID() : '33333333-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0'),
      productoId,
      nombre: data.nombre,
      factorConversion: data.factorConversion,
      codigoBarras: data.codigoBarras || '',
      precioCosto: data.precioCosto,
      precioVenta: data.precioVenta,
      esPresentacionBase: false,
      activo: true,
    };
    setProducts(prev =>
      prev.map(p => (p.id === productoId ? { ...p, presentaciones: [...p.presentaciones, localPres] } : p))
    );
    return { success: true, presentation: localPres };
  };

  const deletePresentationFromProduct = async (
    presId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured() && isValidUUID(presId)) {
      const res = await deleteLivePresentation(presId);
      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error };
      }
    }

    setProducts(prev =>
      prev.map(p => ({
        ...p,
        presentaciones: p.presentaciones.filter(pr => pr.id !== presId),
      }))
    );
    return { success: true };
  };

  // Conteo Físico y Auditoría en Supabase
  const applyPhysicalAuditAdjustment = async (
    counts: Record<string, number>,
    notas?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      const sucursalId = currentUser.sucursalId;
      if (!sucursalId || !isValidUUID(sucursalId)) {
        return { success: false, error: 'No se puede guardar ajuste físico: Sucursal no configurada.' };
      }

      const res = await saveLivePhysicalAudit(sucursalId, counts, products, currentUser.id, notas);
      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error aplicando ajuste en Supabase' };
      }

      // Re-sincronizar Kardex y Catálogo desde Supabase
      const liveData = await fetchLiveCatalog(currentTenantId);
      if (liveData) setProducts(liveData.products);

      const liveKardex = await fetchLiveKardex(currentTenantId, sucursalId);
      if (liveKardex) setKardex(liveKardex);

      soundManager.playPaymentSuccess();
      return { success: true };
    }

    // Fallback local
    setProducts(prev =>
      prev.map(p => (counts[p.id] !== undefined ? { ...p, existenciaBase: counts[p.id] } : p))
    );
    return { success: true };
  };

  // Proveedores y Compras
  const addNewSupplier = async (data: {
    nombreComercial: string;
    razonSocial?: string;
    ruc?: string;
    contactoNombre?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    diasCredito?: number;
  }): Promise<{ success: boolean; supplier?: Supplier; error?: string }> => {
    if (isSupabaseConfigured()) {
      const res = await insertLiveSupplier(data, currentTenantId);
      if (!res.success || !res.supplier) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error registrando proveedor en Supabase' };
      }
      setSuppliers(prev => [res.supplier!, ...prev]);
      soundManager.playPaymentSuccess();
      return { success: true, supplier: res.supplier };
    }

    const localSup: Supplier = {
      id: crypto.randomUUID ? crypto.randomUUID() : '44444444-0000-0000-0000-' + Date.now().toString(16).padStart(12, '0'),
      negocioId: currentTenantId,
      nombreComercial: data.nombreComercial,
      razonSocial: data.razonSocial,
      ruc: data.ruc,
      contactoNombre: data.contactoNombre,
      telefono: data.telefono,
      email: data.email,
      direccion: data.direccion,
      diasCredito: data.diasCredito || 0,
      saldoPendiente: 0,
      activo: true,
    };
    setSuppliers(prev => [localSup, ...prev]);
    return { success: true, supplier: localSup };
  };

  const registerPurchase = async (data: {
    proveedorId: string;
    numeroFactura?: string;
    tipoPago: 'contado' | 'credito';
    observaciones?: string;
    items: {
      productoId: string;
      presentacionId: string;
      cantidad: number;
      factorConversion: number;
      costoUnitario: number;
      subtotal: number;
    }[];
  }): Promise<{ success: boolean; purchaseId?: string; error?: string }> => {
    if (isSupabaseConfigured()) {
      const res = await insertLivePurchase(data, currentTenantId, currentUser.sucursalId, currentUser.id);
      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error guardando compra en Supabase' };
      }

      // Re-sincronizar catálogo para reflejar nuevo stock de inmediato
      const liveData = await fetchLiveCatalog(currentTenantId);
      if (liveData) setProducts(liveData.products);

      const livePurchases = await fetchLivePurchases(currentTenantId, currentUser.sucursalId);
      if (livePurchases) setPurchases(livePurchases);

      const liveKardex = await fetchLiveKardex(currentTenantId, currentUser.sucursalId);
      if (liveKardex) setKardex(liveKardex);

      soundManager.playPaymentSuccess();
      return { success: true, purchaseId: res.purchaseId };
    }

    return { success: false, error: 'Supabase no está conectado para registrar compras.' };
  };

  // Movimientos de efectivo (entradas y salidas de caja en Supabase)
  const addCashMovement = async (
    tipo: 'entrada_efectivo' | 'retiro_gasto' | 'retiro_deposito',
    monto: number,
    motivo: string
  ): Promise<{ success: boolean; error?: string }> => {
    soundManager.playTouchClick();

    if (isSupabaseConfigured()) {
      const aperturaId = cashRegister.aperturaActual?.id;
      if (!aperturaId || !isValidUUID(aperturaId)) {
        soundManager.playError();
        return {
          success: false,
          error: 'No se puede registrar movimiento: La caja se encuentra cerrada o sin apertura activa.',
        };
      }

      const res = await insertLiveCashMovement(aperturaId, tipo, monto, motivo, currentUser.id);
      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error };
      }

      // Recargar lista actualizada de movimientos desde Supabase
      const liveMovs = await fetchLiveCashMovements(aperturaId);
      if (liveMovs) {
        setCashMovements(liveMovs);
      } else {
        const movement: CashMovement = {
          id: res.data?.id || `mov-${Date.now()}`,
          aperturaId,
          tipo,
          monto,
          motivo,
          usuarioNombre: currentUser.nombre,
          fecha: new Date().toISOString(),
        };
        setCashMovements(prev => [movement, ...prev]);
      }

      soundManager.playPaymentSuccess();
      return { success: true };
    }

    // Modo local / Fallback
    const movement: CashMovement = {
      id: `mov-${Date.now()}`,
      aperturaId: cashRegister.aperturaActual?.id || 'ap-local',
      tipo,
      monto,
      motivo,
      usuarioNombre: currentUser.nombre,
      fecha: new Date().toISOString(),
    };
    setCashMovements(prev => [movement, ...prev]);
    soundManager.playPaymentSuccess();
    return { success: true };
  };

  // Cierre de caja ciego (Blind close)
  const closeCashRegisterBlind = async (
    montoDeclarado: number,
    desglose?: Record<string, number>,
    notas?: string
  ): Promise<CashClosingReport> => {
    const fondoInicial = cashRegister.aperturaActual?.montoInicial || 0;

    // Calcular ventas en efectivo del turno
    const ventasEfectivo = salesHistory
      .filter(s => s.tipoVenta === 'contado' && s.pagos.some(p => p.metodoPago === 'efectivo'))
      .reduce((sum, s) => {
        const pagoEf = s.pagos.find(p => p.metodoPago === 'efectivo');
        return sum + (pagoEf?.monto || 0);
      }, 0);

    const ventasTarjeta = salesHistory
      .filter(s => s.pagos.some(p => p.metodoPago === 'tarjeta'))
      .reduce((sum, s) => sum + (s.pagos.find(p => p.metodoPago === 'tarjeta')?.monto || 0), 0);

    const ventasTransf = salesHistory
      .filter(s => s.pagos.some(p => p.metodoPago === 'transferencia'))
      .reduce((sum, s) => sum + (s.pagos.find(p => p.metodoPago === 'transferencia')?.monto || 0), 0);

    const ventasFiado = salesHistory
      .filter(s => s.tipoVenta === 'credito_fiado')
      .reduce((sum, s) => sum + s.total, 0);

    const entradasExtra = cashMovements
      .filter(m => m.tipo === 'entrada_efectivo')
      .reduce((sum, m) => sum + m.monto, 0);

    const retiros = cashMovements
      .filter(m => m.tipo === 'retiro_gasto' || m.tipo === 'retiro_deposito')
      .reduce((sum, m) => sum + m.monto, 0);

    const abonos = 0; // Calculado de abonos en efectivo

    // Monto esperado = Fondo + Ventas Efectivo + Entradas - Retiros + Abonos
    const montoEsperado = Number((fondoInicial + ventasEfectivo + entradasExtra - retiros + abonos).toFixed(2));
    const diferencia = Number((montoDeclarado - montoEsperado).toFixed(2));

    const aperturaIdActual = cashRegister.aperturaActual?.id || '';

    // Si Supabase está configurado y hay apertura válida, cerrar en la nube
    if (isSupabaseConfigured() && isValidUUID(aperturaIdActual)) {
      await closeLiveCashRegister(
        aperturaIdActual,
        currentUser.id,
        montoDeclarado,
        montoEsperado,
        diferencia,
        desglose,
        notas
      );
    }

    const report: CashClosingReport = {
      id: `close-${Date.now()}`,
      aperturaId: aperturaIdActual,
      cajeroNombre: currentUser.nombre,
      fechaCierre: new Date().toISOString(),
      montoInicial: fondoInicial,
      montoDeclaradoEfectivo: montoDeclarado,
      montoEsperadoEfectivo: montoEsperado,
      diferenciaEfectivo: diferencia,
      totalVentasEfectivo: ventasEfectivo,
      totalVentasTarjeta: ventasTarjeta,
      totalVentasTransferencia: ventasTransf,
      totalVentasFiado: ventasFiado,
      totalEntradasExtra: entradasExtra,
      totalRetirosGastos: retiros,
      totalAbonosFiado: abonos,
      desgloseBilletes: desglose,
      notas,
    };

    setCashClosings(prev => [report, ...prev]);
    setCashRegister(prev => ({ ...prev, estado: 'cerrada', aperturaActual: undefined }));
    soundManager.playPaymentSuccess();
    return report;
  };

  const openCashRegister = async (montoInicial: number): Promise<{ success: boolean; error?: string }> => {
    soundManager.playTouchClick();

    if (isSupabaseConfigured()) {
      const activeSucursalId = currentUser.sucursalId;
      console.log('[AppContext] Abriendo caja en Supabase...', {
        cajaId: cashRegister.id,
        sucursalId: activeSucursalId,
        cajeroId: currentUser.id,
        montoInicial,
      });

      const res = await openLiveCashRegister(
        cashRegister.id,
        activeSucursalId,
        currentUser.id,
        montoInicial,
        'Apertura de turno desde POS'
      );

      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error };
      }

      // Sincronizar estado actualizado desde Supabase
      const liveReg = await fetchLiveCashRegister(activeSucursalId);
      if (liveReg && liveReg.estado === 'abierta') {
        setCashRegister(liveReg);
      } else if (res.aperturaId) {
        setCashRegister({
          id: res.caja?.id || cashRegister.id,
          nombre: res.caja?.nombre || cashRegister.nombre || 'Caja Mostrador',
          codigo: res.caja?.codigo || cashRegister.codigo || 'CAJA-01',
          estado: 'abierta',
          aperturaActual: {
            id: res.aperturaId!,
            usuarioId: currentUser.id,
            usuarioNombre: `${currentUser.nombre} ${currentUser.apellido}`,
            fechaApertura: new Date().toISOString(),
            montoInicial,
          },
        });
      }

      // Cargar movimientos de la nueva apertura
      if (res.aperturaId) {
        const liveMovs = await fetchLiveCashMovements(res.aperturaId);
        if (liveMovs) {
          setCashMovements(liveMovs);
        } else {
          setCashMovements([]);
        }
      }

      soundManager.playPaymentSuccess();
      return { success: true };
    }

    // Modo local / Sin Supabase
    setCashRegister({
      id: 'caja-local-01',
      nombre: 'Caja Mostrador',
      codigo: 'CAJA-01',
      estado: 'abierta',
      aperturaActual: {
        id: `ap-${Date.now()}`,
        usuarioId: currentUser.id,
        usuarioNombre: `${currentUser.nombre} ${currentUser.apellido}`,
        fechaApertura: new Date().toISOString(),
        montoInicial,
      },
    });

    soundManager.playPaymentSuccess();
    return { success: true };
  };

  // Abonos de Fiados (Live en Supabase)
  const registerCustomerPayment = async (
    clienteId: string,
    monto: number,
    metodo: 'efectivo' | 'transferencia' = 'efectivo',
    notas?: string
  ): Promise<{ success: boolean; error?: string }> => {
    soundManager.playTouchClick();

    if (isSupabaseConfigured()) {
      const aperturaId = cashRegister.aperturaActual?.id;
      const res = await insertLiveCustomerPayment(
        clienteId,
        monto,
        metodo,
        notas,
        aperturaId,
        currentUser.id
      );

      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error registrando abono en Supabase.' };
      }

      // Si fue pagado en efectivo y hay caja abierta, registrar entrada de efectivo
      if (metodo === 'efectivo' && aperturaId && isValidUUID(aperturaId)) {
        await insertLiveCashMovement(
          aperturaId,
          'entrada_efectivo',
          monto,
          `Abono de fiado: ${notas || 'Pago de cliente'}`,
          currentUser.id
        );
        const liveMovs = await fetchLiveCashMovements(aperturaId);
        if (liveMovs) setCashMovements(liveMovs);
      }

      // Sincronizar clientes actualizados desde Supabase
      const liveCust = await fetchLiveCustomers(currentTenantId);
      if (liveCust) {
        setCustomers(liveCust);
      } else {
        setCustomers(prev =>
          prev.map(c => {
            if (c.id === clienteId) {
              const nuevoSaldo = Math.max(0, Number((c.saldoDeudorActual - monto).toFixed(2)));
              return {
                ...c,
                saldoDeudorActual: nuevoSaldo,
                bloqueadoPorMora: nuevoSaldo > c.limiteCredito,
              };
            }
            return c;
          })
        );
      }

      soundManager.playPaymentSuccess();
      return { success: true };
    }

    // Modo local
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === clienteId) {
          const nuevoSaldo = Math.max(0, Number((c.saldoDeudorActual - monto).toFixed(2)));
          return {
            ...c,
            saldoDeudorActual: nuevoSaldo,
            bloqueadoPorMora: nuevoSaldo > c.limiteCredito,
          };
        }
        return c;
      })
    );

    if (metodo === 'efectivo') {
      addCashMovement('entrada_efectivo', monto, `Abono de fiado: ${notas || 'Pago de cliente'}`);
    }
    soundManager.playPaymentSuccess();
    return { success: true };
  };

  const addNewCustomer = async (
    clienteData: Omit<Customer, 'id' | 'saldoDeudorActual' | 'bloqueadoPorMora' | 'activo'>
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> => {
    soundManager.playTouchClick();

    if (isSupabaseConfigured()) {
      const res = await insertLiveCustomer(clienteData, currentTenantId);
      if (!res.success || !res.customer) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error al guardar cliente en Supabase.' };
      }

      setCustomers(prev => [...prev, res.customer!]);
      soundManager.playPaymentSuccess();
      return { success: true, customer: res.customer };
    }

    // Modo local
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      ...clienteData,
      saldoDeudorActual: 0,
      bloqueadoPorMora: false,
      activo: true,
    };
    setCustomers(prev => [...prev, newCust]);
    soundManager.playPaymentSuccess();
    return { success: true, customer: newCust };
  };

  const addExpense = async (
    expenseData: Omit<OperationalExpense, 'id' | 'usuarioNombre' | 'fecha'>
  ): Promise<{ success: boolean; error?: string }> => {
    soundManager.playTouchClick();

    if (isSupabaseConfigured()) {
      const sucursalId = currentUser.sucursalId;
      const aperturaId = cashRegister.aperturaActual?.id;

      const res = await insertLiveExpense(
        expenseData,
        currentTenantId,
        sucursalId,
        aperturaId,
        currentUser.id
      );

      if (!res.success) {
        soundManager.playError();
        return { success: false, error: res.error || 'Error al guardar gasto en Supabase.' };
      }

      // Si fue pagado desde caja y la caja está abierta, registrar movimiento de caja
      if (expenseData.pagadoDesdeCaja && aperturaId && isValidUUID(aperturaId)) {
        await insertLiveCashMovement(
          aperturaId,
          'retiro_gasto',
          expenseData.monto,
          `Gasto: ${expenseData.descripcion}`,
          currentUser.id
        );
        const liveMovs = await fetchLiveCashMovements(aperturaId);
        if (liveMovs) setCashMovements(liveMovs);
      }

      // Recargar gastos desde Supabase
      const liveExp = await fetchLiveExpenses(currentTenantId, sucursalId);
      if (liveExp) {
        setExpenses(liveExp);
      } else {
        const expense: OperationalExpense = {
          id: res.data?.id || `exp-${Date.now()}`,
          ...expenseData,
          fecha: new Date().toISOString(),
          usuarioNombre: currentUser.nombre,
        };
        setExpenses(prev => [expense, ...prev]);
      }

      soundManager.playPaymentSuccess();
      return { success: true };
    }

    // Modo local
    const expense: OperationalExpense = {
      id: `exp-${Date.now()}`,
      ...expenseData,
      fecha: new Date().toISOString(),
      usuarioNombre: currentUser.nombre,
    };
    setExpenses(prev => [expense, ...prev]);

    if (expenseData.pagadoDesdeCaja) {
      addCashMovement('retiro_gasto', expenseData.monto, `Gasto: ${expenseData.descripcion}`);
    }
    soundManager.playPaymentSuccess();
    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        config,
        updateConfig,
        isAuthenticated,
        isSupabaseConnected,
        isProcessingSale,
        isLoadingLiveCatalog,
        loginWithPinCode,
        loginWithEmail,
        logout,
        lockScreen,
        syncLiveCatalog,
        tenants,
        currentTenant,
        switchTenant,
        toggleTenantSubscription,
        updateTenantPlan,
        addNewTenant,
        isCurrentTenantSuspended,
        categories,
        products,
        customers,
        cashRegister,
        cart,
        heldCarts,
        salesHistory,
        cashMovements,
        cashClosings,
        kardex,
        expenses,
        suppliers,
        purchases,
        addToCart,
        removeFromCart,
        updateQuantity,
        setDiscount,
        clearCart,
        pauseCart,
        resumeCart,
        deleteHeldCart,
        completeSale,
        findProductByBarcode,
        quickRegisterProduct,
        updateProduct,
        addPresentationToProduct,
        deletePresentationFromProduct,
        applyPhysicalAuditAdjustment,
        addNewSupplier,
        registerPurchase,
        addCashMovement,
        closeCashRegisterBlind,
        openCashRegister,
        registerCustomerPayment,
        addNewCustomer,
        addExpense,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
};

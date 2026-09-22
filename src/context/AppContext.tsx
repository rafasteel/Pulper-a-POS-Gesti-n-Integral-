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
} from '../types';
import {
  INITIAL_CONFIG,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_REGISTER,
} from '../utils/mockData';
import { soundManager } from '../utils/audioHaptics';
import confetti from 'canvas-confetti';

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
  }) => { success: boolean; sale?: Sale; error?: string };
  
  // Barcode & Product
  findProductByBarcode: (barcode: string) => { product: Product; presentation: ProductPresentation } | null;
  quickRegisterProduct: (data: {
    nombre: string;
    codigoBarras: string;
    precioCosto: number;
    precioVenta: number;
    categoriaId: string;
    stockInicial: number;
  }) => Product;
  updateProduct: (product: Product) => void;

  // Cash Operations
  addCashMovement: (tipo: 'entrada_efectivo' | 'retiro_gasto' | 'retiro_deposito', monto: number, motivo: string) => void;
  closeCashRegisterBlind: (montoDeclarado: number, desglose?: Record<string, number>, notas?: string) => CashClosingReport;
  openCashRegister: (montoInicial: number) => void;

  // Credit & Fiado
  registerCustomerPayment: (clienteId: string, monto: number, metodo: 'efectivo' | 'transferencia', notas?: string) => void;
  addNewCustomer: (cliente: Omit<Customer, 'id' | 'saldoDeudorActual' | 'bloqueadoPorMora' | 'activo'>) => Customer;

  // Expenses
  addExpense: (expense: Omit<OperationalExpense, 'id' | 'usuarioNombre' | 'fecha'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[1]); // Rosa (Cajera)
  const [users] = useState<UserProfile[]>(INITIAL_USERS);
  const [config, setConfig] = useState<BusinessConfig>(() => {
    const saved = localStorage.getItem('pulperia_config');
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pulperia_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('pulperia_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });
  const [cashRegister, setCashRegister] = useState<CashRegister>(INITIAL_REGISTER);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pulperia_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    const saved = localStorage.getItem('pulperia_held_carts');
    return saved ? JSON.parse(saved) : [];
  });
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('pulperia_sales');
    return saved ? JSON.parse(saved) : [];
  });
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [cashClosings, setCashClosings] = useState<CashClosingReport[]>([]);
  const [kardex, setKardex] = useState<KardexMovement[]>([]);
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);

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
  const completeSale = (paymentInfo: {
    metodo: 'efectivo' | 'tarjeta' | 'transferencia' | 'fiado' | 'mixto';
    montoRecibido?: number;
    clienteId?: string;
    referencia?: string;
  }) => {
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

    // 1. Descontar inventario en unidades base y registrar en Kardex
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

    // 2. Si fue fiado, actualizar la deuda del cliente
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

    // 3. Registrar venta y limpiar carrito
    setSalesHistory(prev => [newSale, ...prev]);
    setCart([]);

    // 4. Feedback audiovisual
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
  };

  // Registro ultra-rápido de producto no catalogado
  const quickRegisterProduct = (data: {
    nombre: string;
    codigoBarras: string;
    precioCosto: number;
    precioVenta: number;
    categoriaId: string;
    stockInicial: number;
  }): Product => {
    const prodId = `prod-${Date.now()}`;
    const presId = `pres-${Date.now()}`;
    const newPresentation: ProductPresentation = {
      id: presId,
      productoId: prodId,
      nombre: 'Unidad',
      factorConversion: 1,
      codigoBarras: data.codigoBarras,
      precioCosto: data.precioCosto,
      precioVenta: data.precioVenta,
      esPresentacionBase: true,
      activo: true,
    };

    const newProduct: Product = {
      id: prodId,
      categoriaId: data.categoriaId,
      nombre: data.nombre,
      unidadMedidaBase: 'unidad',
      permiteDecimales: false,
      esFavorito: true,
      stockMinimo: 5,
      stockMaximo: 50,
      perecedero: false,
      existenciaBase: data.stockInicial,
      presentaciones: [newPresentation],
    };

    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  // Movimientos de efectivo (entradas y salidas de caja)
  const addCashMovement = (
    tipo: 'entrada_efectivo' | 'retiro_gasto' | 'retiro_deposito',
    monto: number,
    motivo: string
  ) => {
    soundManager.playTouchClick();
    const movement: CashMovement = {
      id: `mov-${Date.now()}`,
      aperturaId: cashRegister.aperturaActual?.id || 'aper-01',
      tipo,
      monto,
      motivo,
      usuarioNombre: currentUser.nombre,
      fecha: new Date().toISOString(),
    };
    setCashMovements(prev => [movement, ...prev]);
  };

  // Cierre de caja ciego (Blind close)
  const closeCashRegisterBlind = (
    montoDeclarado: number,
    desglose?: Record<string, number>,
    notas?: string
  ): CashClosingReport => {
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

    const report: CashClosingReport = {
      id: `close-${Date.now()}`,
      aperturaId: cashRegister.aperturaActual?.id || 'aper-01',
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

  const openCashRegister = (montoInicial: number) => {
    soundManager.playTouchClick();
    setCashRegister({
      id: 'caja-1',
      nombre: 'Caja Principal (Mostrador)',
      codigo: 'CAJA-01',
      estado: 'abierta',
      aperturaActual: {
        id: `aper-${Date.now()}`,
        usuarioId: currentUser.id,
        usuarioNombre: `${currentUser.nombre} ${currentUser.apellido}`,
        fechaApertura: new Date().toISOString(),
        montoInicial,
      },
    });
  };

  // Abonos de Fiados
  const registerCustomerPayment = (
    clienteId: string,
    monto: number,
    metodo: 'efectivo' | 'transferencia',
    notas?: string
  ) => {
    soundManager.playPaymentSuccess();
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
  };

  const addNewCustomer = (
    clienteData: Omit<Customer, 'id' | 'saldoDeudorActual' | 'bloqueadoPorMora' | 'activo'>
  ): Customer => {
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      ...clienteData,
      saldoDeudorActual: 0,
      bloqueadoPorMora: false,
      activo: true,
    };
    setCustomers(prev => [...prev, newCust]);
    return newCust;
  };

  const addExpense = (expenseData: Omit<OperationalExpense, 'id' | 'usuarioNombre' | 'fecha'>) => {
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
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        config,
        updateConfig,
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

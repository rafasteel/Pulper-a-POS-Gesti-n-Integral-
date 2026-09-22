import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Navbar, NavTab } from './components/layout/Navbar';
import { POSView } from './views/POSView';
import { MobileScannerView } from './views/MobileScannerView';
import { InventoryView } from './views/InventoryView';
import { PhysicalAuditView } from './views/PhysicalAuditView';
import { PriceKioskView } from './views/PriceKioskView';
import { CashControlView } from './views/CashControlView';
import { CreditFiadoView } from './views/CreditFiadoView';
import { ExpensesView } from './views/ExpensesView';
import { CopilotView } from './views/CopilotView';
import { SettingsView } from './views/SettingsView';
import { QRPairModal } from './components/pos/QRPairModal';
import { HeldCartsModal } from './components/pos/HeldCartsModal';
import { SuperAdminView } from './views/SuperAdminView';
import { SubscriptionLockedScreen } from './components/common/SubscriptionLockedScreen';
import { LoginView } from './views/LoginView';
import { useApp } from './context/AppContext';

const MainApp: React.FC = () => {
  const { isCurrentTenantSuspended, currentUser, isAuthenticated } = useApp();
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'superadmin' || window.location.pathname.includes('/superadmin')) {
      return 'superadmin';
    }
    return 'pos';
  });
  const [isQRPairOpen, setIsQRPairOpen] = useState(false);
  const [isHeldOpen, setIsHeldOpen] = useState(false);
  const [isStandaloneMobileScanner, setIsStandaloneMobileScanner] = useState(false);
  const [scannerToken, setScannerToken] = useState('caja-1');

  // Detectar si se abrió directamente desde el código QR en un teléfono móvil o ruta superadmin
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'scanner') {
      setIsStandaloneMobileScanner(true);
      setScannerToken(params.get('token') || 'caja-1');
    }
    if (params.get('tab') === 'superadmin' || window.location.pathname.includes('/superadmin')) {
      setActiveTab('superadmin');
    }
  }, []);

  // Si no ha iniciado sesión, mostrar la pantalla de login con teclado táctil por PIN y Supabase
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Si es el modo escáner móvil puro (abierto por QR en celular)
  if (isStandaloneMobileScanner) {
    return (
      <MobileScannerView
        token={scannerToken}
        onBackToPOS={() => {
          setIsStandaloneMobileScanner(false);
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  // Vista de Super Administrador SaaS (Master Platform Owner)
  if (activeTab === 'superadmin') {
    return <SuperAdminView onBackToPOS={() => setActiveTab('pos')} />;
  }

  // Si la pulpería actual está suspendida por falta de pago y no es Super Admin, mostrar bloqueo de suscripción
  if (isCurrentTenantSuspended && currentUser.rol !== 'superadmin') {
    return <SubscriptionLockedScreen />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Barra de Encabezado Superior */}
      <Header
        onOpenQRPairModal={() => setIsQRPairOpen(true)}
        onOpenHeldCartsModal={() => setIsHeldOpen(true)}
      />

      {/* Navegación Modular */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Vista Activa */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'pos' && (
          <POSView onSwitchToMobileScanner={() => setActiveTab('scanner_movil')} />
        )}
        {activeTab === 'scanner_movil' && (
          <MobileScannerView token="caja-1" onBackToPOS={() => setActiveTab('pos')} />
        )}
        {activeTab === 'inventario' && <InventoryView />}
        {activeTab === 'conteo' && <PhysicalAuditView />}
        {activeTab === 'kiosco' && <PriceKioskView />}
        {activeTab === 'caja' && <CashControlView />}
        {activeTab === 'fiados' && <CreditFiadoView />}
        {activeTab === 'gastos' && <ExpensesView />}
        {activeTab === 'copilot' && <CopilotView />}
        {activeTab === 'config' && <SettingsView />}
      </main>

      {/* Modales Globales */}
      <QRPairModal
        isOpen={isQRPairOpen}
        onClose={() => setIsQRPairOpen(false)}
        onSwitchToMobileScannerView={() => {
          setIsQRPairOpen(false);
          setActiveTab('scanner_movil');
        }}
      />
      <HeldCartsModal isOpen={isHeldOpen} onClose={() => setIsHeldOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

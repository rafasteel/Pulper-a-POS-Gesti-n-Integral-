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

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [isQRPairOpen, setIsQRPairOpen] = useState(false);
  const [isHeldOpen, setIsHeldOpen] = useState(false);
  const [isStandaloneMobileScanner, setIsStandaloneMobileScanner] = useState(false);
  const [scannerToken, setScannerToken] = useState('caja-1');

  // Detectar si se abrió directamente desde el código QR en un teléfono móvil
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'scanner') {
      setIsStandaloneMobileScanner(true);
      setScannerToken(params.get('token') || 'caja-1');
    }
  }, []);

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

import React from 'react';
import {
  ShoppingCart,
  QrCode,
  Package,
  ClipboardCheck,
  Search,
  DollarSign,
  Users,
  Receipt,
  Brain,
  Settings,
  Building2,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { soundManager } from '../../utils/audioHaptics';

export type NavTab =
  | 'pos'
  | 'scanner_movil'
  | 'inventario'
  | 'compras'
  | 'conteo'
  | 'kiosco'
  | 'caja'
  | 'fiados'
  | 'gastos'
  | 'copilot'
  | 'config'
  | 'superadmin';

interface TabItem {
  id: NavTab;
  label: string;
  icon: any;
  hotkey?: string;
  badge?: string;
}

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { currentUser } = useApp();

  const tabs: TabItem[] = [
    { id: 'pos', label: 'POS Venta', icon: ShoppingCart, hotkey: 'F1' },
    { id: 'scanner_movil', label: 'Cámara Escáner', icon: QrCode },
    { id: 'inventario', label: 'Inventario & Kardex', icon: Package },
    { id: 'compras', label: 'Compras & Proveedores', icon: Truck },
    { id: 'conteo', label: 'Conteo Físico', icon: ClipboardCheck },
    { id: 'kiosco', label: 'Kiosco Precios', icon: Search },
    { id: 'caja', label: 'Caja & Arqueo', icon: DollarSign },
    { id: 'fiados', label: 'Libreta de Fiados', icon: Users },
    { id: 'gastos', label: 'Gastos', icon: Receipt },
    { id: 'copilot', label: 'Copiloto IA', icon: Brain, badge: 'Smart' },
    { id: 'config', label: 'Ajustes', icon: Settings },
  ];

  const handleSelect = (tab: NavTab) => {
    soundManager.playTouchClick();
    onTabChange(tab);
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none py-1.5">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleSelect(tab.id as NavTab)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 shrink-0 ${
              isActive
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[9px] px-1 py-0.2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded font-bold uppercase tracking-wider">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* Acceso a Super Admin SaaS */}
      <button
        onClick={() => handleSelect('superadmin')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 shrink-0 ml-auto ${
          activeTab === 'superadmin'
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
            : currentUser.rol === 'superadmin'
            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30'
            : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80'
        }`}
        title="Panel de Super Administrador SaaS (Gestión de Pulperías)"
      >
        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
        <span>Super Admin SaaS</span>
        <span className="text-[9px] px-1 py-0.2 bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded uppercase font-extrabold tracking-wider">
          Master
        </span>
      </button>
    </nav>
  );
};

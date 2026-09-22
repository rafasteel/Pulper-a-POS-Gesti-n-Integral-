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
} from 'lucide-react';
import { soundManager } from '../../utils/audioHaptics';

export type NavTab =
  | 'pos'
  | 'scanner_movil'
  | 'inventario'
  | 'conteo'
  | 'kiosco'
  | 'caja'
  | 'fiados'
  | 'gastos'
  | 'copilot'
  | 'config';

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
  const tabs: TabItem[] = [
    { id: 'pos', label: 'POS Venta', icon: ShoppingCart, hotkey: 'F1' },
    { id: 'scanner_movil', label: 'Cámara Escáner', icon: QrCode },
    { id: 'inventario', label: 'Inventario & Kardex', icon: Package },
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
    </nav>
  );
};

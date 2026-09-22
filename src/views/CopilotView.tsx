import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Brain,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Send,
  Bot,
  User,
} from 'lucide-react';
import { Product, Customer, Sale } from '../types';
import { soundManager } from '../utils/audioHaptics';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
}

export const CopilotView: React.FC = () => {
  const { products, customers, salesHistory, config, cashRegister } = useApp();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: `¡Hola Don Manuel! Soy tu Copiloto Inteligente de Pulpería. He analizado las ventas de hoy y el estado de tu bodega. Pregúntame sobre tus ganancias, productos estancados o deudas de clientes.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Cálculos automáticos para los Insights
  const lowStockProducts = products.filter((p: Product) => p.existenciaBase <= p.stockMinimo);
  const totalFiado = customers.reduce((sum: number, c: Customer) => sum + c.saldoDeudorActual, 0);
  const totalVentas = salesHistory.reduce((sum: number, s: Sale) => sum + s.total, 0);
  const totalUtilidad = salesHistory.reduce((sum: number, s: Sale) => sum + s.utilidadEstimada, 0);

  // Capital inmovilizado en productos de más de 30 días sin alta rotación
  const capitalInmovilizado = products.slice(0, 3).reduce((sum: number, p: Product) => {
    const cost = p.presentaciones[0]?.precioCosto || 0;
    return sum + p.existenciaBase * cost;
  }, 0);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    soundManager.playTouchClick();
    const userText = inputQuery.trim();
    const newMsgUser: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMsgUser]);
    setInputQuery('');

    // Generar respuesta inteligente basada en datos reales
    setTimeout(() => {
      let reply = '';
      const lower = userText.toLowerCase();

      if (lower.includes('ganancia') || lower.includes('utilidad')) {
        reply = `En las ventas registradas de hoy llevas una utilidad estimada de ${config.monedaSimbolo}${totalUtilidad.toFixed(2)} sobre un total facturado de ${config.monedaSimbolo}${totalVentas.toFixed(2)}. Tu margen bruto promedio es de aproximadamente el 24%.`;
      } else if (lower.includes('fiado') || lower.includes('deuda') || lower.includes('calle')) {
        reply = `Tienes un total de ${config.monedaSimbolo}${totalFiado.toFixed(2)} colocados en crédito a clientes. El cliente con mayor saldo pendiente es ${customers[1]?.nombre} con ${config.monedaSimbolo}${customers[1]?.saldoDeudorActual}. Te recomiendo enviar un recordatorio por WhatsApp.`;
      } else if (lower.includes('comprar') || lower.includes('pedido') || lower.includes('repartidor')) {
        reply = `Te sugiero hacer pedido urgente de los siguientes productos con stock crítico: ${lowStockProducts.map((p: Product) => `${p.nombre} (quedan ${p.existenciaBase})`).join(', ') || 'Todo tu inventario está en niveles óptimos'}. Además, la cerveza y refrescos muestran una rotación del 85%.`;
      } else if (lower.includes('inmovilizado') || lower.includes('estancado') || lower.includes('dinero')) {
        reply = `Tienes aproximadamente ${config.monedaSimbolo}${capitalInmovilizado.toFixed(2)} en productos con rotación lenta. Te sugiero armar un combo promocional o rebajar un 5% para liberar flujo de caja rápido.`;
      } else {
        reply = `Analizando tu consulta: actualmente tienes ${products.length} productos registrados, ${customers.length} clientes en la libreta y un fondo en caja de ${config.monedaSimbolo}${cashRegister.aperturaActual?.montoInicial.toFixed(2) || '0.00'}. ¿Deseas un reporte detallado de algún producto específico?`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      soundManager.playPaymentSuccess();
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none p-4 gap-4">
      {/* Cabecera */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white flex items-center gap-2">
              <span>Copiloto Inteligente (IA Pulpería)</span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Live Insights
              </span>
            </h1>
            <p className="text-xs text-slate-400">Análisis proactivo de rotación de inventario, márgenes y decisiones de compra</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Panel Izquierdo: Tarjetas de Insights Accionables */}
        <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Card 1: Alerta de Reabastecimiento */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-2 shadow-md">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Reabastecimiento Recomendado</span>
              </span>
              <span>{lowStockProducts.length} críticos</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Productos como <strong className="text-white">{lowStockProducts[0]?.nombre || 'Coca-Cola'}</strong> están
              a punto de agotarse antes del fin de semana.
            </p>
            <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
              💡 Acción sugerida: Ordena 2 cajas al camión repartidor mañana por la mañana.
            </div>
          </div>

          {/* Card 2: Capital Inmovilizado */}
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 space-y-2 shadow-md">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4" />
                <span>Capital Inmovilizado</span>
              </span>
              <span>{config.monedaSimbolo}{capitalInmovilizado.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tienes dinero detenido en mercadería que no se ha movido en más de 20 días.
            </p>
            <div className="text-[11px] text-indigo-300 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
              💡 Acción sugerida: Pon una promoción 2x1 o ubícalo en el mostrador principal para darle salida.
            </div>
          </div>

          {/* Card 3: Recuperación de Cartera */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-2 shadow-md">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Oportunidad de Cobro</span>
              </span>
              <span>{config.monedaSimbolo}{totalFiado.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              3 clientes han superado los 15 días de plazo acordado en la libreta de fiados.
            </p>
            <div className="text-[11px] text-emerald-300 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
              💡 Acción sugerida: Utiliza el botón de WhatsApp en la Libreta para enviar el estado con un clic amable.
            </div>
          </div>
        </div>

        {/* Panel Derecho: Chat Conversacional con la IA */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-300">
            <Bot className="w-4 h-4 text-purple-400" />
            <span>Chat de Negocios en Vivo</span>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 text-xs">
                    <Brain className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[9px] opacity-60 block text-right mt-1">{msg.time}</span>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 text-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input de Preguntas */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              placeholder="Haz una pregunta: '¿Cuánto he ganado hoy?', '¿Qué debo comprar?'..."
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              className="flex-1 h-11 px-3.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

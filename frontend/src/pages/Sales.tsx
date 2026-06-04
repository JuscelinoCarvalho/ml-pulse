import { useEffect, useState } from "react";
import { sales } from "../api/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, ShoppingBag, DollarSign, Star } from "lucide-react";

interface Dashboard {
  user: { nickname: string };
  period_days: number;
  summary: { revenue: number; orders: number; units_sold: number; ticket_avg: number };
  daily_series: { date: string; revenue: number; orders: number }[];
  top_products: { title: string; units: number; revenue: number }[];
  reputation: { level: string; transactions_completed: number; ratings_positive: number };
  recent_orders: { id: number; date: string; status: string; total: number; buyer: string }[];
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Sales() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    sales
      .dashboard(days)
      .then((r) => setData(r.data))
      .catch((e) =>
        setError(e.response?.data?.detail || "Erro ao carregar dados.")
      )
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  if (error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        {error.includes("Mercado Livre") && (
          <a href="/settings" className="bg-ml-yellow px-4 py-2 rounded-lg font-semibold">
            Conectar conta ML
          </a>
        )}
      </div>
    );
  if (!data) return null;

  const cards = [
    { label: "Faturamento", value: fmt(data.summary.revenue), icon: DollarSign, color: "text-green-600" },
    { label: "Pedidos", value: data.summary.orders, icon: ShoppingBag, color: "text-blue-600" },
    { label: "Unidades Vendidas", value: data.summary.units_sold, icon: TrendingUp, color: "text-purple-600" },
    { label: "Ticket Médio", value: fmt(data.summary.ticket_avg), icon: Star, color: "text-yellow-600" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Vendas</h1>
          {data.user?.nickname && (
            <p className="text-gray-500 text-sm">{data.user.nickname}</p>
          )}
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border">
            <c.icon className={`${c.color} mb-2`} size={20} />
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="font-semibold text-gray-800 mb-4">Faturamento por dia</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.daily_series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Line type="monotone" dataKey="revenue" stroke="#3483FA" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top produtos */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Top Produtos</h2>
          <div className="space-y-3">
            {data.top_products.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                  <p className="text-xs text-gray-500">{p.units} un · {fmt(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pedidos recentes */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="font-semibold text-gray-800 mb-4">Pedidos Recentes</h2>
          <div className="space-y-3">
            {data.recent_orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-800">{o.buyer}</p>
                  <p className="text-xs text-gray-400">{o.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{fmt(o.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    o.status === "paid" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

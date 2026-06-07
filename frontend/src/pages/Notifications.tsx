import { useEffect, useState } from "react";
import { notifications } from "../api/client";
import { Bell, RefreshCw } from "lucide-react";

interface Notification {
  id: number;
  topic: string | null;
  resource: string | null;
  ml_user_id: string | null;
  attempts: number;
  sent_at: string | null;
  received_at: string | null;
  created_at: string | null;
  processed: boolean;
}

const TOPICS = [
  { value: "", label: "Todos os tópicos" },
  { value: "orders_v2", label: "Pedidos" },
  { value: "items", label: "Anúncios" },
  { value: "questions", label: "Perguntas" },
  { value: "messages", label: "Mensagens" },
  { value: "shipments", label: "Envios" },
];

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString("pt-BR") : "—";

const topicColor = (topic: string | null) => {
  switch (topic) {
    case "orders_v2":
      return "bg-green-100 text-green-700";
    case "items":
      return "bg-blue-100 text-blue-700";
    case "questions":
      return "bg-purple-100 text-purple-700";
    case "messages":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

export default function Notifications() {
  const [data, setData] = useState<Notification[]>([]);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    notifications
      .list(topic || undefined)
      .then((r) => setData(r.data.notifications))
      .catch((e) => setError(e.response?.data?.detail || "Erro ao carregar."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [topic]);

  const callbackUrl = `${window.location.origin}/api/notifications`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={22} /> Notificações
          </h1>
          <p className="text-gray-500 text-sm">
            Webhooks recebidos do Mercado Livre
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {/* URL de callback para configurar no painel ML */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <p className="text-sm font-medium text-gray-700 mb-1">
          URL de callback (configure no painel de desenvolvedor do ML)
        </p>
        <code className="text-sm bg-gray-100 px-3 py-1.5 rounded block text-gray-800 break-all">
          {callbackUrl}
        </code>
      </div>

      {/* Filtro por tópico */}
      <div className="flex items-center gap-3">
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-xl p-10 shadow-sm border text-center text-gray-500">
          Nenhuma notificação recebida ainda.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tópico</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Enviado</th>
                <th className="px-4 py-3 font-medium">Recebido</th>
                <th className="px-4 py-3 font-medium text-center">Tentativas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${topicColor(n.topic)}`}
                    >
                      {n.topic || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs break-all">
                    {n.resource || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(n.sent_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(n.created_at)}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{n.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

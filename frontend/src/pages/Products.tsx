import { useState } from "react";
import { products } from "../api/client";
import { Search, TrendingUp, ExternalLink } from "lucide-react";

interface SearchResult {
  summary: {
    total_found: number;
    price_min: number;
    price_max: number;
    price_avg: number;
    top_sellers: { nickname: string; total_sold: number }[];
    keyword_cloud: { word: string; count: number }[];
  };
  items: {
    id: string;
    title: string;
    price: number;
    sold_quantity: number;
    condition: string;
    thumbnail: string;
    permalink: string;
    seller_nickname: string;
    shipping_free: boolean;
    opportunity_score: number;
  }[];
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Products() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await products.search(query);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erro na busca.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pesquisa de Produtos</h1>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: fone de ouvido bluetooth"
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ml-blue"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-ml-blue text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Search size={18} />
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {result && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Encontrados", value: result.summary.total_found.toLocaleString() },
              { label: "Preço Mín.", value: fmt(result.summary.price_min) },
              { label: "Preço Máx.", value: fmt(result.summary.price_max) },
              { label: "Preço Médio", value: fmt(result.summary.price_avg) },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-xl p-4 shadow-sm border text-center">
                <div className="text-xl font-bold text-gray-900">{c.value}</div>
                <div className="text-xs text-gray-500">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Produtos */}
            <div className="md:col-span-2 space-y-3">
              <h2 className="font-semibold text-gray-800">Produtos ({result.items.length})</h2>
              {result.items.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border flex gap-4 items-start">
                  <img src={item.thumbnail} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm line-clamp-2">{item.title}</p>
                    <p className="text-lg font-bold text-ml-blue mt-1">{fmt(item.price)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{item.sold_quantity} vendidos</span>
                      {item.shipping_free && <span className="text-green-600 font-medium">Frete grátis</span>}
                      <span>{item.seller_nickname}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                      <TrendingUp size={12} className="text-yellow-600" />
                      <span className="text-xs font-bold text-yellow-700">{item.opportunity_score}</span>
                    </div>
                    <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={16} className="text-gray-400 hover:text-ml-blue" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h3 className="font-semibold text-gray-800 mb-3">Top Vendedores</h3>
                {result.summary.top_sellers.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span className="text-gray-700">{s.nickname}</span>
                    <span className="font-semibold">{s.total_sold} vendas</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h3 className="font-semibold text-gray-800 mb-3">Palavras-chave</h3>
                <div className="flex flex-wrap gap-2">
                  {result.summary.keyword_cloud.map((k) => (
                    <span
                      key={k.word}
                      style={{ fontSize: `${Math.min(14 + k.count, 20)}px` }}
                      className="text-ml-blue font-medium cursor-pointer hover:underline"
                      onClick={() => setQuery(k.word)}
                    >
                      {k.word}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

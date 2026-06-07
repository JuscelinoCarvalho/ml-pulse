import { useState } from "react";
import { products } from "../api/client";
import { Search, TrendingUp, ExternalLink, Tag, Users, ChevronLeft, ChevronRight } from "lucide-react";

interface SearchResult {
  summary: {
    total_found: number;
    analyzed: number;
    price_min: number;
    price_max: number;
    price_avg: number;
    top_brands: { brand: string; count: number }[];
    keyword_cloud: { word: string; count: number }[];
    active_domain: { id: string; name: string | null } | null;
    domain_options: { id: string; name: string | null }[];
  };
  items: {
    id: string;
    title: string;
    brand: string | null;
    price: number;
    price_max: number;
    offers_count: number;
    thumbnail: string;
    permalink: string;
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
  const [sortBy, setSortBy] = useState<"opportunity" | "price_asc" | "price_desc" | "title">("opportunity");
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [offset, setOffset] = useState(0);
  const [activeQuery, setActiveQuery] = useState("");
  // domínio enviado à API: undefined = autodetectar, "all" = sem filtro, ou um domain_id
  const [domainParam, setDomainParam] = useState<string | undefined>(undefined);

  const runSearch = async (q: string, lim: number, off: number, dom?: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    setBrandFilter(null);
    try {
      const { data } = await products.search(q, lim, off, dom);
      setResult(data);
      setActiveQuery(q);
      setOffset(off);
      setDomainParam(dom);
    } catch (err: any) {
      setResult(null);
      setError(
        err.response?.data?.detail || "Erro ao buscar produtos. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query, pageSize, 0, undefined); // nova busca = autodetecta categoria
  };

  const changePageSize = (n: number) => {
    setPageSize(n);
    runSearch(activeQuery || query, n, 0, domainParam);
  };

  const changeDomain = (value: string) => {
    runSearch(activeQuery || query, pageSize, 0, value);
  };

  // Limite de offset da busca do ML (paginação profunda é restrita)
  const MAX_OFFSET = 1000;
  const total = result?.summary.total_found ?? 0;
  const pageEnd = Math.min(offset + pageSize, total);
  const hasPrev = offset > 0;
  const hasNext = offset + pageSize < Math.min(total, MAX_OFFSET);

  const displayedItems = (() => {
    if (!result) return [];
    let items = result.items;
    if (brandFilter) items = items.filter((i) => i.brand === brandFilter);
    const sorted = [...items];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return (a.price || Infinity) - (b.price || Infinity); // sem oferta vai pro fim
        case "price_desc":
          return b.price - a.price;
        case "title":
          return (a.title || "").localeCompare(b.title || "", "pt-BR");
        default:
          return b.opportunity_score - a.opportunity_score;
      }
    });
    return sorted;
  })();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pesquisa de Produtos</h1>
        <p className="text-gray-500 text-sm">
          Busca no catálogo do Mercado Livre com preço e concorrência reais
        </p>
      </div>

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

      {loading && (
        <div className="p-8 text-center text-gray-500">
          Analisando catálogo e ofertas...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && !loading && (
        <>
          {result.summary.domain_options.length > 0 && (
            <div className="flex items-center gap-2 text-sm bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
              <Tag size={15} className="text-ml-blue flex-shrink-0" />
              <span className="text-gray-600">Categoria:</span>
              <select
                value={result.summary.active_domain?.id ?? "all"}
                onChange={(e) => changeDomain(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm font-medium text-gray-800 bg-white"
              >
                {result.summary.domain_options.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || d.id}
                  </option>
                ))}
                <option value="all">Todas as categorias</option>
              </select>
              <span className="text-xs text-gray-400">
                (detectada automaticamente — refine se precisar)
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Encontrados", value: result.summary.total_found.toLocaleString("pt-BR") },
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
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-semibold text-gray-800">
                  Produtos ({displayedItems.length})
                  {brandFilter && (
                    <button
                      onClick={() => setBrandFilter(null)}
                      className="ml-2 text-xs font-normal text-ml-blue underline"
                    >
                      {brandFilter} ✕
                    </button>
                  )}
                </h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="border rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="opportunity">Maior oportunidade</option>
                  <option value="price_asc">Menor preço</option>
                  <option value="price_desc">Maior preço</option>
                  <option value="title">Título (A-Z)</option>
                </select>
              </div>
              {displayedItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border flex gap-4 items-start">
                  <img
                    src={item.thumbnail}
                    alt=""
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm line-clamp-2">{item.title}</p>
                    {item.offers_count > 0 ? (
                      <p className="text-lg font-bold text-ml-blue mt-1">
                        {fmt(item.price)}
                        {item.price_max > item.price && (
                          <span className="text-xs font-normal text-gray-400">
                            {" "}– {fmt(item.price_max)}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">Sem ofertas ativas</p>
                    )}
                    <div className="flex items-center flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      {item.brand && (
                        <span className="flex items-center gap-1">
                          <Tag size={12} /> {item.brand}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {item.offers_count} {item.offers_count === 1 ? "vendedor" : "vendedores"}
                      </span>
                      {item.shipping_free && (
                        <span className="text-green-600 font-medium">Frete grátis</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg" title="Score de oportunidade">
                      <TrendingUp size={12} className="text-yellow-600" />
                      <span className="text-xs font-bold text-yellow-700">{item.opportunity_score}</span>
                    </div>
                    <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={16} className="text-gray-400 hover:text-ml-blue" />
                    </a>
                  </div>
                </div>
              ))}

              {/* Paginação */}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                    {total > 0 ? `${offset + 1}–${pageEnd} de ${total.toLocaleString("pt-BR")}` : "—"}
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => changePageSize(Number(e.target.value))}
                    className="border rounded-lg px-2 py-1 text-sm"
                  >
                    <option value={50}>50 / pág.</option>
                    <option value={100}>100 / pág.</option>
                    <option value={200}>200 / pág.</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runSearch(activeQuery, pageSize, Math.max(0, offset - pageSize), domainParam)}
                    disabled={!hasPrev || loading}
                    className="flex items-center gap-1 border rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} /> Anterior
                  </button>
                  <button
                    onClick={() => runSearch(activeQuery, pageSize, offset + pageSize, domainParam)}
                    disabled={!hasNext || loading}
                    className="flex items-center gap-1 border rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Próxima <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h3 className="font-semibold text-gray-800 mb-3">Top Marcas</h3>
                {result.summary.top_brands.length === 0 && (
                  <p className="text-xs text-gray-400">Sem dados de marca.</p>
                )}
                {result.summary.top_brands.length > 0 && (
                  <button
                    onClick={() => setBrandFilter(null)}
                    className={`w-full flex justify-between text-sm py-1 border-b transition ${
                      brandFilter === null ? "text-ml-blue font-semibold" : "text-gray-700 hover:text-ml-blue"
                    }`}
                  >
                    <span>Todas as marcas</span>
                    <span>{result.summary.analyzed}</span>
                  </button>
                )}
                {result.summary.top_brands.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => setBrandFilter(b.brand)}
                    className={`w-full flex justify-between text-sm py-1 border-b last:border-0 transition ${
                      brandFilter === b.brand ? "text-ml-blue font-semibold" : "text-gray-700 hover:text-ml-blue"
                    }`}
                  >
                    <span className="truncate text-left">{b.brand}</span>
                    <span className="font-semibold">{b.count}</span>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h3 className="font-semibold text-gray-800 mb-3">Palavras-chave</h3>
                <div className="flex flex-wrap gap-2">
                  {result.summary.keyword_cloud.map((k) => (
                    <span
                      key={k.word}
                      style={{ fontSize: `${Math.min(14 + k.count, 22)}px` }}
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

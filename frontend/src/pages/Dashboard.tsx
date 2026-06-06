import { Link } from "react-router-dom";
import { Search, BarChart2 } from "lucide-react";

export default function Dashboard() {
  const cards = [
    {
      to: "/products",
      icon: Search,
      title: "Pesquisa de Produtos",
      desc: "Busque produtos no ML, analise preços, concorrência e oportunidades.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      to: "/sales",
      icon: BarChart2,
      title: "Análise de Vendas",
      desc: "Dashboard com faturamento, pedidos, ticket médio e top produtos da sua conta.",
      color: "bg-green-50 text-green-600",
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">
          ML <span className="text-ml-blue">Pulse</span>
        </h1>
        <p className="text-gray-500 mt-1">Escolha um módulo para começar</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition group"
          >
            <div className={`inline-flex p-3 rounded-xl ${c.color} mb-4`}>
              <c.icon size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-ml-blue transition">
              {c.title}
            </h2>
            <p className="text-gray-500 text-sm mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>

    </div>
  );
}

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-ml-dark text-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="text-xl font-black">
            ML <span className="text-ml-yellow">Pulse</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-300">
            <Link to="/privacy" className="hover:text-white">
              Privacidade
            </Link>
            <Link to="/terms" className="hover:text-white">
              Termos
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-medium transition"
            >
              <ArrowLeft size={15} />
              Voltar ao painel
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">
          Última atualização: {updatedAt}
        </p>
        <article className="prose-legal space-y-5 text-gray-700 leading-relaxed">
          {children}
        </article>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-gray-400">
          ML Pulse — ferramenta independente de análise de dados do Mercado
          Livre. Não possui vínculo oficial com o Mercado Livre.
        </div>
      </footer>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900 mt-4">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

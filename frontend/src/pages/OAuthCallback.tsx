import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { auth } from "../api/client";

/**
 * O Mercado Livre redireciona para a raiz do domínio (https://jussa.com.br)
 * com ?code=...&state=... Este componente captura o code, troca pelos tokens
 * no backend e redireciona de volta para as configurações.
 */
export default function OAuthCallback() {
  const [error, setError] = useState("");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return; // garante troca única (code é uso único no ML)
    done.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");
    const codeVerifier = sessionStorage.getItem("ml_code_verifier");

    // Remove o code da URL para evitar reuso em refresh/re-render.
    window.history.replaceState({}, "", window.location.pathname);

    if (oauthError || !code) {
      window.location.replace("/settings?ml_error=1");
      return;
    }

    auth
      .mlExchange(code, state, codeVerifier)
      .then(() => {
        sessionStorage.removeItem("ml_code_verifier");
        window.location.replace("/settings?ml_connected=1");
      })
      .catch((e) => {
        setError(
          e.response?.data?.detail ||
            "Não foi possível concluir a conexão com o Mercado Livre. Tente novamente."
        );
      });
  }, []);

  return (
    <div className="min-h-screen bg-ml-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="text-2xl font-black text-ml-blue mb-4">
          ML <span className="text-ml-yellow">Pulse</span>
        </div>
        {error ? (
          <div className="flex flex-col items-center gap-3 text-red-600">
            <AlertCircle size={28} />
            <p className="text-sm break-words">{error}</p>
            <a
              href="/settings"
              className="text-sm text-ml-blue underline mt-2"
            >
              Voltar às configurações
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <Loader2 size={28} className="animate-spin text-ml-blue" />
            <p className="text-sm">Conectando sua conta ao Mercado Livre...</p>
          </div>
        )}
      </div>
    </div>
  );
}

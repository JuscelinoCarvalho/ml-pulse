import { useEffect, useState } from "react";
import { auth } from "../api/client";
import { CheckCircle, Link2, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";

interface MLStatus {
  status: "connected" | "expired" | "disconnected";
  nickname?: string | null;
  ml_user_id?: string | null;
  expires_at?: string | null;
  detail?: string | null;
}

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [ml, setMl] = useState<MLStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const justConnected = params.get("ml_connected") === "1";
  const mlError = params.get("ml_error");

  const loadStatus = () => {
    setChecking(true);
    auth
      .mlStatus()
      .then((r) => setMl(r.data))
      .catch(() => setMl({ status: "disconnected", detail: "Não foi possível verificar." }))
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    auth.me().then((r) => setUser(r.data)).catch(() => {});
    loadStatus();
  }, []);

  const handleConnectML = async () => {
    const { data } = await auth.mlConnect();
    // Guarda o code_verifier (PKCE) para reenviar após o redirect do ML.
    sessionStorage.setItem("ml_code_verifier", data.code_verifier);
    window.location.href = data.auth_url;
  };

  const fmtDate = (v?: string | null) =>
    v ? new Date(v).toLocaleString("pt-BR") : "—";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      {justConnected && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <p className="text-green-800 font-medium">
            Conta do Mercado Livre conectada com sucesso!
          </p>
        </div>
      )}

      {mlError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800">
            Erro ao conectar com o Mercado Livre. Tente novamente.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
        <h2 className="font-semibold text-gray-800">Conta</h2>
        {user && (
          <div className="text-sm text-gray-600">
            <p>
              <span className="font-medium">E-mail:</span> {user.email}
            </p>
            <p className="mt-1">
              <span className="font-medium">Status:</span>{" "}
              <span className={user.is_verified ? "text-green-600" : "text-yellow-600"}>
                {user.is_verified ? "Verificado" : "Não verificado"}
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Mercado Livre</h2>
          <button
            onClick={loadStatus}
            disabled={checking}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
            Verificar
          </button>
        </div>

        {checking ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={18} className="animate-spin" />
            Validando token com o Mercado Livre...
          </div>
        ) : ml?.status === "connected" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle size={18} />
              Conectado e válido
            </div>
            <div className="text-sm text-gray-600">
              {ml.nickname && (
                <p>
                  <span className="font-medium">Conta:</span> {ml.nickname}
                </p>
              )}
              <p className="mt-1">
                <span className="font-medium">Token expira em:</span>{" "}
                {fmtDate(ml.expires_at)}
              </p>
            </div>
            <button
              onClick={handleConnectML}
              className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              <Link2 size={15} />
              Reconectar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600 font-medium">
              <AlertCircle size={18} />
              {ml?.status === "expired"
                ? "Token expirado — reconecte a conta"
                : "Nenhuma conta conectada"}
            </div>
            {ml?.detail && <p className="text-sm text-gray-500">{ml.detail}</p>}
            <button
              onClick={handleConnectML}
              className="flex items-center gap-2 bg-ml-yellow text-gray-900 font-semibold px-4 py-2 rounded-lg hover:brightness-95"
            >
              <Link2 size={16} />
              {ml?.status === "expired" ? "Reconectar conta ML" : "Conectar conta ML"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

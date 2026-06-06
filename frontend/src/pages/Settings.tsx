import { useEffect, useState } from "react";
import { auth } from "../api/client";
import { CheckCircle, Link2, AlertCircle } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const mlConnected = params.get("ml_connected") === "1";
  const mlError = params.get("ml_error");

  useEffect(() => {
    auth.me().then((r) => setUser(r.data)).catch(() => {});
  }, []);

  const handleConnectML = async () => {
    const { data } = await auth.mlConnect();
    window.location.href = data.auth_url;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

      {mlConnected && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <p className="text-green-800 font-medium">Conta do Mercado Livre conectada com sucesso!</p>
        </div>
      )}

      {mlError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800">Erro ao conectar com o Mercado Livre. Tente novamente.</p>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
        <h2 className="font-semibold text-gray-800">Conta</h2>
        {user && (
          <div className="text-sm text-gray-600">
            <p><span className="font-medium">E-mail:</span> {user.email}</p>
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
        <h2 className="font-semibold text-gray-800">Mercado Livre</h2>
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <CheckCircle size={18} />
          Integração ativa — buscas utilizam a conta oficial do sistema
        </div>
      </div>
    </div>
  );
}

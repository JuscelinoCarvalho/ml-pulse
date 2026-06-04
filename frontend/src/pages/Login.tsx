import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await auth.requestOtp(email);
      navigate("/verify", { state: { email } });
    } catch {
      setError("Erro ao enviar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ml-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-ml-blue mb-1">ML <span className="text-ml-yellow">Pulse</span></div>
          <p className="text-gray-500 text-sm">Análise inteligente do Mercado Livre</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ml-blue"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ml-blue text-white font-semibold py-3 rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Receber código de acesso"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Acesso gratuito via código enviado ao e-mail. Sem senha.
        </p>
      </div>
    </div>
  );
}

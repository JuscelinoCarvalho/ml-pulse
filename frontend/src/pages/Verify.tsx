import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../api/client";
import { useAuthStore } from "../store/auth";

const RESEND_COOLDOWN = 60;

export default function Verify() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? "";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await auth.verifyOtp(email, fullCode);
      setTokens(data.access_token, data.refresh_token);
      navigate("/dashboard");
    } catch {
      setError("Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    setError("");
    setCode(["", "", "", "", "", ""]);
    try {
      await auth.requestOtp(email);
      setResendSuccess(true);
      setResendCooldown(RESEND_COOLDOWN);
      refs.current[0]?.focus();
    } catch {
      setError("Erro ao reenviar o código. Tente novamente.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ml-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-ml-blue mb-1">ML <span className="text-ml-yellow">Pulse</span></div>
          <p className="text-gray-600 mt-2">Código enviado para</p>
          <p className="font-semibold text-gray-800">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-ml-blue"
              />
            ))}
          </div>

          {error && <p className="text-center text-red-500 text-sm">{error}</p>}
          {resendSuccess && <p className="text-center text-green-600 text-sm">Novo código enviado!</p>}

          <button
            type="submit"
            disabled={loading || code.join("").length < 6}
            className="w-full bg-ml-blue text-white font-semibold py-3 rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>

        <div className="text-center mt-4">
          {resendCooldown > 0 ? (
            <p className="text-sm text-gray-400">
              Reenviar código em <span className="font-semibold text-gray-600">{resendCooldown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-sm text-ml-blue hover:underline disabled:opacity-50"
            >
              {resendLoading ? "Reenviando..." : "Reenviar código"}
            </button>
          )}
        </div>

        <button
          onClick={() => navigate("/login")}
          className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600"
        >
          Usar outro e-mail
        </button>
      </div>
    </div>
  );
}

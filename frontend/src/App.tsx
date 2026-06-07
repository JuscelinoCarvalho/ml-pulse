import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Search, BarChart2, Home, Bell, Shield, FileText, Settings as SettingsIcon, LogOut } from "lucide-react";
import { useAuthStore } from "./store/auth";
import { auth } from "./api/client";

import Login from "./pages/Login";
import Verify from "./pages/Verify";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import OAuthCallback from "./pages/OAuthCallback";

function Layout({ children }: { children: React.ReactNode }) {
  const { logout, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    auth.me().then((r) => setUser(r.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", icon: Home, label: "Início" },
    { to: "/products", icon: Search, label: "Produtos" },
    { to: "/sales", icon: BarChart2, label: "Vendas" },
    { to: "/notifications", icon: Bell, label: "Notificações" },
    { to: "/settings", icon: SettingsIcon, label: "Config." },
  ];

  const legalItems = [
    { to: "/privacy", icon: Shield, label: "Privacidade" },
    { to: "/terms", icon: FileText, label: "Termos de Uso" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-ml-dark text-white flex flex-col fixed h-full">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="text-xl font-black">
            ML <span className="text-ml-yellow">Pulse</span>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-ml-blue text-white"
                    : "text-gray-300 hover:bg-white/10"
                }`
              }
            >
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
            <p className="px-3 pb-1 text-[10px] uppercase tracking-wide text-gray-500">
              Legal
            </p>
            {legalItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-ml-blue text-white"
                      : "text-gray-300 hover:bg-white/10"
                  }`
                }
              >
                <n.icon size={18} />
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-300 hover:bg-white/10 transition"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  // O ML redireciona para a raiz com ?code=... — intercepta antes do roteamento.
  const search = new URLSearchParams(window.location.search);
  if (search.has("code") || search.has("error")) {
    return <OAuthCallback />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

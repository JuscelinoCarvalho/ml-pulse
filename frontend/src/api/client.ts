import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post("/api/auth/refresh", { refresh_token: refresh });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const auth = {
  requestOtp: (email: string) => api.post("/auth/request-otp", { email }),
  verifyOtp: (email: string, code: string) => api.post("/auth/verify-otp", { email, code }),
  me: () => api.get("/auth/me"),
  mlConnect: () => api.get("/auth/ml/connect"),
  mlStatus: () => api.get("/auth/ml/status"),
  mlExchange: (code: string, state?: string | null, codeVerifier?: string | null) =>
    api.post("/auth/ml/exchange", { code, state, code_verifier: codeVerifier }),
};

export const products = {
  search: (q: string, limit = 50, offset = 0, domain?: string) =>
    api.get("/products/search", { params: { q, limit, offset, domain } }),
  getItem: (id: string) => api.get(`/products/item/${id}`),
  trends: () => api.get("/products/trends"),
};

export const sales = {
  dashboard: (days = 30) => api.get("/sales/dashboard", { params: { days } }),
  orders: (days = 7) => api.get("/sales/orders", { params: { days } }),
};

export const notifications = {
  list: (topic?: string, limit = 50) =>
    api.get("/notifications", { params: { topic, limit } }),
};

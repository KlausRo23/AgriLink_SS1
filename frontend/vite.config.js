import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
server: {
  port: 5174,
  proxy: {
    "/ss1": {
      target: "https://army-trade-luxury.ngrok-free.dev",
      changeOrigin: true,
      secure: true,
      rewrite: (path) => path.replace(/^\/ss1/, ""),
      headers: { "ngrok-skip-browser-warning": "true" },
      configure: (proxy) => {
        proxy.on("proxyReq", (proxyReq, req) => {
          proxyReq.removeHeader("origin"); // SS1's CORS allowlist never gets involved
          console.log("[proxy] →", req.method, req.url);
        });
        proxy.on("proxyRes", (proxyRes, req) => {
          console.log("[proxy] ←", proxyRes.statusCode, req.url);
        });
        proxy.on("error", (err) => console.log("[proxy] error:", err.message));
      },
    },
  },
},
});
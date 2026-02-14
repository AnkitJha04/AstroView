import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/proxy/hubble": {
        target: "https://hubblesite.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/hubble/, "")
      },
      "/proxy/jwst": {
        target: "https://webbtelescope.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/jwst/, "")
      }
    }
  }
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import { devBanner } from "@replit/vite-plugin-dev-banner";
import runtimeErrorModal from "@replit/vite-plugin-runtime-error-modal";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Custom plugin to replace Google Analytics ID in HTML
function htmlEnvPlugin() {
  return {
    name: 'html-env-plugin',
    transformIndexHtml(html: string) {
      return html.replace(
        /__GA_MEASUREMENT_ID__/g,
        process.env.VITE_GA_MEASUREMENT_ID || ''
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devBanner(),
    runtimeErrorModal(),
    htmlEnvPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@db": path.resolve(__dirname, "server", "db"),
      "@assets": path.resolve(__dirname, "client", "src", "assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
  ],
  build: {
    // Raise the chunk size warning threshold to 600 kB
    // (html2canvas + jsPDF are legitimately large, only loaded on reports page)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Group React ecosystem into one vendor chunk
            if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
              return "vendor-react";
            }
            // Split Framer Motion separately — only needed for animations
            if (id.includes("/framer-motion/") || id.includes("/motion/")) {
              return "vendor-framer";
            }
            // Supabase SDK & dependencies
            if (id.includes("/@supabase/") || id.includes("/supabase-js/")) {
              return "vendor-supabase";
            }
            // Radix UI + shadcn components
            if (id.includes("/@radix-ui/")) {
              return "vendor-radix";
            }
          }
        },
      },
    },
  },
});

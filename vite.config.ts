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
        manualChunks: {
          // Group React ecosystem into one vendor chunk
          "vendor-react": ["react", "react-dom"],
          // Split Framer Motion separately — only needed for animations
          "vendor-framer": ["framer-motion"],
          // Supabase SDK
          "vendor-supabase": ["@supabase/supabase-js"],
          // Radix UI + shadcn components
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-label",
          ],
        },
      },
    },
  },
});

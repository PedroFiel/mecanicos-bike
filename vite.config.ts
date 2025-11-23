import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separar bibliotecas grandes em chunks próprios
          if (id.includes("node_modules")) {
            if (id.includes("@tanstack/react-table")) {
              return "tanstack-table";
            }
            if (id.includes("@dnd-kit")) {
              return "dnd-kit";
            }
            if (id.includes("recharts")) {
              return "recharts";
            }
            if (id.includes("@tabler/icons-react")) {
              return "tabler-icons";
            }
            // Outras dependências grandes
            if (id.includes("node_modules")) {
              return "vendor";
            }
          }
        },

      },
    },
    chunkSizeWarningLimit: 600,
  },
});


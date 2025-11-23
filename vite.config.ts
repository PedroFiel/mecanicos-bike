import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { copyFileSync, existsSync, readdirSync, statSync, mkdirSync, cpSync } from "fs";
import { join } from "path";

function copyPrismaBinaries() {
  return {
    name: "copy-prisma-binaries",
    writeBundle() {
      const prismaDir = join(process.cwd(), "app/generated/prisma");
      const buildServerDir = join(process.cwd(), "build/server");
      const buildAssetsDir = join(buildServerDir, "assets");
      
      if (!existsSync(prismaDir)) {
        console.warn("⚠️  Prisma generated directory not found. Run 'prisma generate' first.");
        return;
      }

      if (!existsSync(buildAssetsDir)) {
        mkdirSync(buildAssetsDir, { recursive: true });
      }

      try {
        const files = readdirSync(prismaDir);
        const nodeFiles = files.filter((file) => {
          const filePath = join(prismaDir, file);
          return statSync(filePath).isFile() && file.endsWith(".node");
        });
        
        const copyTargets = [
          buildAssetsDir,
          buildServerDir,
        ];
        
        for (const file of nodeFiles) {
          const source = join(prismaDir, file);
          
          for (const targetDir of copyTargets) {
            const dest = join(targetDir, file);
            copyFileSync(source, dest);
          }
          
          console.log(`✓ Copied Prisma binary: ${file}`);
        }
        
        const prismaBuildDir = join(buildServerDir, "app/generated/prisma");
        if (!existsSync(join(buildServerDir, "app"))) {
          mkdirSync(join(buildServerDir, "app"), { recursive: true });
        }
        if (!existsSync(join(buildServerDir, "app/generated"))) {
          mkdirSync(join(buildServerDir, "app/generated"), { recursive: true });
        }
        
        cpSync(prismaDir, prismaBuildDir, { recursive: true });
        console.log(`✓ Copied Prisma Client directory to build`);
        
        if (nodeFiles.length === 0) {
          console.warn("⚠️  No Prisma .node files found to copy");
        } else {
          console.log(`✓ Successfully copied ${nodeFiles.length} Prisma binary file(s)`);
        }
      } catch (error) {
        console.error("❌ Error copying Prisma binaries:", error);
      }
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), copyPrismaBinaries()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
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


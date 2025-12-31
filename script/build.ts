import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");

  // Bundle the server code (needed to resolve all imports)
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    // Don't minify to preserve readability and avoid issues
    minify: false,
    // Keep all node_modules external (don't bundle dependencies)
    packages: "external",
    logLevel: "info",
    // No sourcemap for production
    sourcemap: false,
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

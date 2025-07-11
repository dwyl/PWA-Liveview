import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import fg from "fast-glob";
import { viteStaticCopy } from "vite-plugin-static-copy";

const rootDir = path.resolve(import.meta.dirname);
const staticDir = path.resolve(rootDir, "../priv/static");

const jsDir = path.resolve(rootDir, "js");
const srcImgDir = path.resolve(rootDir, "images");

const seoDir = path.resolve(rootDir, "seo");
const iconsDir = path.resolve(rootDir, "icons");

function getEntryPoints() {
  const entries = [];
  fg.sync([`${jsDir}/**/*.{js,jsx,ts,tsx}`]).forEach((file) => {
    if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      entries.push(path.resolve(rootDir, file));
    }
  });

  fg.sync([`${srcImgDir}/**/*.*`]).forEach((file) => {
    if (/\.(jpe?g|png|svg|webp)$/.test(file)) {
      entries.push(path.resolve(rootDir, file));
    }
  });

  return entries;
}

const buildOps = (mode) => ({
  target: ["esnext"],
  // Specify the directory to nest generated assets under (relative to build.outDir
  outDir: staticDir,
  cssCodeSplit: mode === "production", // Split CSS for better caching
  // cssMinify: mode === "production" && "lightningcss", // Use lightningcss for CSS minification
  rollupOptions: {
    input: mode === "production" ? getEntryPoints() : ["./js/app.js"],
    output: mode === "production" && {
      assetFileNames: "assets/[name]-[hash][extname]",
      chunkFileNames: "assets/[name]-[hash].js",
      entryFileNames: "assets/[name]-[hash].js",
    },
  },
  // generate a manifest file that contains a mapping of non-hashed asset filenames
  // to their hashed versions, which can then be used by a server framework
  // to render the correct asset links.
  manifest: mode === "production",
  path: ".vite/manifest.json",
  minify: mode === "production",
  emptyOutDir: true, // Remove old assets
  // sourcemap: mode === "development" ? "inline" : true,
  reportCompressedSize: true,
  assetsInlineLimit: 0,
});

const devServer = {
  cors: { origin: "http://localhost:4000" },
  allowedHosts: ["localhost"],
  strictPort: true,
  origin: "http://localhost:5173", // Vite dev server origin
  port: 5173, // Vite dev server port
  host: "localhost", // Vite dev server host
  // watch: {
  //   ignored: ["**/priv/static/**", "**/lib/**", "**/*.ex", "**/*.exs"],
  // },
};

function copyStaticAssetsDev() {
  console.log("[vite.config] Copying non-fingerprinted assets in dev mode...");

  const copyTargets = [
    {
      srcDir: seoDir,
      destDir: staticDir, // place directly into priv/static
    },
    {
      srcDir: iconsDir,
      destDir: path.resolve(staticDir, "icons"),
    },
  ];

  copyTargets.forEach(({ srcDir, destDir }) => {
    if (!fs.existsSync(srcDir)) {
      console.log(`[vite.config] Source dir not found: ${srcDir}`);
      return;
    }
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fg.sync(`${srcDir}/**/*.*`).forEach((srcPath) => {
      const relPath = path.relative(srcDir, srcPath);
      const destPath = path.join(destDir, relPath);
      const destSubdir = path.dirname(destPath);
      if (!fs.existsSync(destSubdir)) {
        fs.mkdirSync(destSubdir, { recursive: true });
      }

      fs.copyFileSync(srcPath, destPath);
    });
  });
}

const getBuildTargets = () => {
  const baseTargets = [];

  // Only add targets if source directories exist
  if (fs.existsSync(seoDir)) {
    baseTargets.push({
      src: path.resolve(seoDir, "**", "*"),
      dest: path.resolve(staticDir),
    });
  }

  if (fs.existsSync(iconsDir)) {
    baseTargets.push({
      src: path.resolve(iconsDir, "**", "*"),
      dest: path.resolve(staticDir, "icons"),
    });
  }

  // if (fs.existsSync(wasmDir)) {
  //   baseTargets.push({
  //     src: path.resolve(wasmDir, "**", "*.wasm"),
  //     dest: path.resolve(staticDir, "wasm"),
  //   });
  // }

  const devManifestPath = path.resolve(staticDir, "manifest.webmanifest");
  if (fs.existsSync(devManifestPath)) {
    //   baseTargets.push({
    //     src: devManifestPath,
    //     dest: staticDir,
    //   });
    fs.writeFileSync(devManifestPath, JSON.stringify(manifestOpts, null, 2));
  }

  return baseTargets;
};

export default defineConfig(({ command, mode }) => {
  if (command == "serve") {
    console.log("[vite.config] Running in development mode");
    copyStaticAssetsDev();
    process.stdin.on("close", () => process.exit(0));
    process.stdin.resume();
  }

  return {
    base: "/",
    plugins: [
      tailwindcss(),
      // mode === "production"
      viteStaticCopy({ targets: getBuildTargets() }),
      // : null,
    ],
    server: mode === "development" && devServer,
    build: buildOps(mode),
    publicDir: false,
  };
});

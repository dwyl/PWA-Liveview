import { context, build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const args = process.argv.slice(2);
const watch = args.includes("--watch");
const deploy = args.includes("--deploy");
console.log(args);

let opts = {
  entryPoints: [
    "./js/app.js",
    "./js/bins",
    "./js/counter",
    "./js/SolidComp",
    "./js/initYJS",
    "./js/onlineStatus",
    "./js/solHook",
    "./wasm/great_circle.wasm",
  ],
  bundle: true,
  logLevel: "info",
  target: "esnext",
  outdir: "../priv/static/assets",
  external: ["*.css", "fonts/*", "images/*"],
  loader: {
    ".js": "jsx",
    ".svg": "file",
    ".png": "file",
    ".jpg": "file",
    ".wasm": "file",
  },
  plugins: [solidPlugin()],
  nodePaths: ["../deps"],
  format: "esm",
};

if (deploy) {
  opts = {
    ...opts,
    minify: true,
    splitting: true,
    metafile: true,
  };
  await build(opts);
  // fs.writeFileSync("meta.json", JSON.stringify(result.metafile, null, 2));
  process.exit(0);
}

if (watch) {
  context(opts)
    .then(async (ctx) => {
      await ctx.watch();

      process.stdin.on("close", () => {
        process.exit(0);
      });

      process.stdin.resume();
    })
    .catch((error) => {
      console.log(`Build error: ${error}`);
      process.exit(1);
    });
}

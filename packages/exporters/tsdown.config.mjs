export default {
  entry: ["src/index.ts", "src/gltf.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  treeshake: true,
  platform: "neutral",
};

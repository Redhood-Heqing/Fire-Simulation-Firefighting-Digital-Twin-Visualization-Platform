import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const modelMetadata = {
  name: "library_complex_procedural_fallback",
  description: "程序化图书馆建筑群兜底模型。真实 Revit GLB 请放入 apps/web/public/models/library_complex.glb。",
  buildings: ["main-library", "east-annex", "west-hall", "plaza", "roads", "lake", "greenery"],
  floors: [-1, 1, 2, 3, 4, 5],
  fireDemoOrigin: { x: 9, y: 11.4, z: -4 }
};

writeFileSync(resolve(process.cwd(), "apps/server/mock-data/model-metadata.json"), JSON.stringify(modelMetadata, null, 2), "utf-8");
console.log("Generated mock model metadata.");

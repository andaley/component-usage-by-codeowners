import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../");

export default {
  rootDir: path.join(projectRoot, "sample-codebase"),
  crawlFrom: path.join(projectRoot, "sample-codebase/src"),
  includeSubComponents: true,
  importedFrom: /@acme\/design-system/,
  exclude: ["node_modules", "dist", "build"],
  processors: [],
};

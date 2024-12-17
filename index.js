#! /usr/bin/env node

import { Command } from "commander";
import scanner from "react-scanner";
import path from "path";
import fs from "fs";
import { createCodeownerProcessor } from "./processors/usageByCodeowner.js";

const DEFAULT_OUTPUT_DIR = "output";
const DEFAULT_OUTPUT_FILENAME = "usage-by-codeowner.json";

const program = new Command();

program
  .name("usage-by-codeowner-scanner")
  .description(
    "script to scan codebase for design system component usage by CODEOWNER"
  )
  .version("1.0.0")
  .requiredOption(
    "-c, --config <path>",
    "path to react-scanner config file (.js or .json)"
  )
  .requiredOption("--codeowners <path>", "path to CODEOWNERS file")
  .option(
    "-o, --output <path>",
    "path to output directory or file (defaults to ./output/usage-by-codeowner.json)"
  )
  .option("--debug", "enable debug logging")
  .parse(process.argv);

const options = program.opts();

const debug = (...args) => {
  if (options.debug) {
    console.debug("[DEBUG]", ...args);
  }
};

/**
 * Load react-scanner configuration from either a .js or .json file
 * @param {string} configPath - Path to the config file
 * @returns {Promise<Object>} The configuration object
 */
async function loadConfig(configPath) {
  const resolvedPath = path.resolve(configPath);

  try {
    if (path.extname(resolvedPath) === ".js") {
      const configModule = await import(resolvedPath);
      return configModule.default || configModule;
    }

    const configContent = fs.readFileSync(resolvedPath, "utf8");
    return JSON.parse(configContent);
  } catch (error) {
    throw new Error(`Error reading config file: ${error.message}`);
  }
}

/**
 * Resolve output path, handling both directory and file paths
 * @param {string} [outputPath] - User provided output path (optional)
 * @returns {string} Resolved output file path
 */
function resolveOutputPath(outputPath) {
  // If no output path provided, use default in output directory
  if (!outputPath) {
    const defaultPath = path.join(process.cwd(), DEFAULT_OUTPUT_DIR, DEFAULT_OUTPUT_FILENAME);
    const outputDir = path.dirname(defaultPath);
    !fs.existsSync(outputDir) && fs.mkdirSync(outputDir, { recursive: true });
    return defaultPath;
  }

  const resolvedPath = path.resolve(outputPath);

  // If path is an existing directory, append default filename
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    return path.join(resolvedPath, DEFAULT_OUTPUT_FILENAME);
  }

  // Create parent directory if it doesn't exist
  const parentDir = path.dirname(resolvedPath);
  !fs.existsSync(parentDir) && fs.mkdirSync(parentDir, { recursive: true });

  return resolvedPath;
}

async function main() {
  try {
    const userConfig = await loadConfig(options.config);
    debug("Loaded user config:", userConfig);

    const codeownersPath = path.resolve(options.codeowners);
    if (!fs.existsSync(codeownersPath)) {
      throw new Error(`CODEOWNERS file not found at ${options.codeowners}`);
    }
    global.CODEOWNERS_PATH = codeownersPath;
    debug("CODEOWNERS path:", codeownersPath);

    const outputPath = resolveOutputPath(options.output);
    debug("Output path:", outputPath);

    // Run react-scanner with custom processor chain
    const config = {
      ...userConfig,
      processors: [
        "raw-report",
        ({ prevResult }) => {
          const processor = createCodeownerProcessor(outputPath);
          return processor.processor({ prevResult });
        },
      ],
    };

    await scanner.run(config);
    console.log("Component usage analysis completed successfully.");
    console.log(`Results written to ${outputPath}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

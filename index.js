#! /usr/bin/env node

import { Command } from "commander";
import scanner from "react-scanner";
import path from "path";
import fs from "fs";
import { createCodeownerProcessor } from "./processors/usageByCodeowner.js";
import { fileURLToPath } from "url";

const DEFAULT_OUTPUT_FILENAME = "usage-by-codeowner.json";

const program = new Command();

program
  .name("usage-by-codeowner-scanner")
  .description(
    "CLI tool to scan codebase for design system component usage by CODEOWNER"
  )
  .version("1.0.0")
  .requiredOption(
    "-c, --config <path>",
    "path to react-scanner config file (.js or .json)"
  )
  .requiredOption("-o, --output <path>", "path to output directory or file")
  .requiredOption("--codeowners <path>", "path to CODEOWNERS file")
  .option("--debug", "keep temporary files for debugging")
  .parse(process.argv);

const options = program.opts();

const debug = (...args) => {
  if (options.debug) {
    console.log("[DEBUG]", ...args);
  }
};

/**
 * Load react-scanner configuration from either a .js or .json file
 * @param {string} configPath - Path to the config file
 * @returns {Promise<Object>} The configuration object
 */
async function loadConfig(configPath) {
  const resolvedPath = path.resolve(configPath);
  const ext = path.extname(resolvedPath);

  try {
    if (ext === ".js") {
      // For .js files, we need to import them as modules
      const configModule = await import(resolvedPath);
      return configModule.default || configModule;
    } else {
      // For .json files, we can read them directly
      const configContent = fs.readFileSync(resolvedPath, "utf8");
      return JSON.parse(configContent);
    }
  } catch (error) {
    throw new Error(`Error reading config file: ${error.message}`);
  }
}

/**
 * Resolve output path, handling both directory and file paths
 * @param {string} outputPath - User provided output path
 * @returns {string} Resolved output file path
 */
function resolveOutputPath(outputPath) {
  const resolvedPath = path.resolve(outputPath);

  // Check if path exists and is a directory
  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
    return path.join(resolvedPath, DEFAULT_OUTPUT_FILENAME);
  }

  // Check if path's parent directory exists and is a directory
  const parentDir = path.dirname(resolvedPath);
  if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
    return resolvedPath;
  }

  // If neither exists, treat the path as a file path and ensure its directory exists
  const targetDir = path.dirname(resolvedPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return resolvedPath;
}

// Read and parse the config file
let userConfig;
try {
  userConfig = await loadConfig(options.config);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Verify CODEOWNERS file exists
if (!fs.existsSync(path.resolve(options.codeowners))) {
  console.error("Error: CODEOWNERS file not found at", options.codeowners);
  process.exit(1);
}

// Resolve output path to absolute path, handling directories
const outputPath = resolveOutputPath(options.output);
debug("Output path:", outputPath);

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
debug("Output directory:", outputDir);

if (!fs.existsSync(outputDir)) {
  debug("Creating output directory");
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a temporary file for raw report
const tempOutputPath = path.join(outputDir, "temp-raw-report.json");
debug("Temporary output path:", tempOutputPath);

const config = {
  ...userConfig,
  processors: [["raw-report", { outputTo: tempOutputPath }]],
};

global.CODEOWNERS_PATH = path.resolve(options.codeowners);
debug("CODEOWNERS path:", global.CODEOWNERS_PATH);

// Run the scanner and process results
scanner
  .run(config)
  .then(async () => {
    try {
      const rawReport = JSON.parse(fs.readFileSync(tempOutputPath, "utf8"));
      debug("Raw report read successfully");

      // Process the raw report using our processor
      debug("Creating processor with output path:", outputPath);
      const processor = createCodeownerProcessor(outputPath);
      await processor.processor({ prevResult: rawReport });

      // Clean up temp file unless in debug mode
      if (!options.debug) {
        fs.unlinkSync(tempOutputPath);
      }

      console.log("Component usage analysis completed successfully.");
    } catch (error) {
      console.error("Error processing results:", error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Error running component usage analysis:", error);
    process.exit(1);
  });

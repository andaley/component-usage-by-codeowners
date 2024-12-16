import path from "path";
import fs from "fs";
import {
  getAllCodeowners,
  getFilepathsForCodeowner,
  isFileOwnedByCodeowner,
} from "../utils/codeowners.js";

/**
 * Process a single component's usage data
 * @param {string} componentName - Name of the component
 * @param {Object} data - Component usage data
 * @param {Set<string>} codeowners - Set of all codeowners
 * @param {Map<string, string[]>} codeownerFilePaths - Map of codeowners to their file paths
 * @returns {Object} Usage counts by codeowner
 */
const processComponentUsage = (componentName, data, codeowners, codeownerFilePaths) => {
  const usage = {};

  data.instances.forEach((instance) => {
    const filePath = instance.location.file;
    
    for (const owner of codeowners) {
      const ownerPaths = codeownerFilePaths.get(owner);
      if (isFileOwnedByCodeowner(filePath, ownerPaths)) {
        usage[owner] = (usage[owner] || 0) + 1;
      }
    }
  });

  return usage;
};

/**
 * Process component usage data and generate usage by codeowner
 * @param {Object} rawReport - Raw report from react-scanner
 * @returns {Promise<Object>} Component usage by codeowner
 */
const processUsageByCodeowner = async (rawReport) => {
  // Get all codeowners and their file paths
  const codeowners = await getAllCodeowners();
  const codeownerFilePaths = new Map();

  // Pre-fetch all file paths for each codeowner in parallel
  await Promise.all(
    Array.from(codeowners).map(async (owner) => {
      const paths = await getFilepathsForCodeowner(owner);
      codeownerFilePaths.set(owner, paths);
    })
  );

  // Process each component's usage data
  return Object.entries(rawReport).reduce((usageByCodeowner, [componentName, data]) => {
    usageByCodeowner[componentName] = processComponentUsage(
      componentName,
      data,
      codeowners,
      codeownerFilePaths
    );
    return usageByCodeowner;
  }, {});
};

/**
 * Create a processor object with a specific output path
 * @param {string} outputPath - Path where results should be stored
 * @returns {Object} Processor object
 */
const createCodeownerProcessor = (outputPath) => ({
  processor: async ({ prevResult }) => {
    if (!outputPath) {
      throw new Error("Output path is required");
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    !fs.existsSync(outputDir) && fs.mkdirSync(outputDir, { recursive: true });

    try {
      console.debug("Processing component usage by codeowner...");
      const results = await processUsageByCodeowner(prevResult);
      
      console.debug(`Writing results to ${outputPath}...`);
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.debug("Results written successfully.");
      
      return results;
    } catch (error) {
      console.error("Error processing component usage:", error);
      throw error;
    }
  },
});

export { createCodeownerProcessor };

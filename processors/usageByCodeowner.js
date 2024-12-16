import path from "path";
import fs from "fs";
import {
  getAllCodeowners,
  getFilepathsForCodeowner,
  isFileOwnedByCodeowner,
} from "../utils/codeowners.js";

/**
 * Process component usage data and generate usage by codeowner
 * @param {Object} rawReport - Raw report from react-scanner
 * @returns {Promise<Object>} Component usage by codeowner
 */
const processUsageByCodeowner = async (rawReport) => {
  const usageByCodeowner = {};
  const codeowners = await getAllCodeowners();
  const codeownerFilePaths = new Map();

  // Pre-fetch all file paths for each codeowner
  await Promise.all(
    Array.from(codeowners).map(async (owner) => {
      const paths = await getFilepathsForCodeowner(owner);
      codeownerFilePaths.set(owner, paths);
    })
  );

  // Process each component from the raw report
  Object.entries(rawReport).forEach(([componentName, data]) => {
    if (!usageByCodeowner[componentName]) {
      usageByCodeowner[componentName] = {};
    }

    // Process each instance of the component
    data.instances.forEach((instance) => {
      const filePath = instance.location.file;

      // Check which codeowner owns this file
      for (const owner of codeowners) {
        const ownerPaths = codeownerFilePaths.get(owner);
        if (isFileOwnedByCodeowner(filePath, ownerPaths)) {
          usageByCodeowner[componentName][owner] =
            (usageByCodeowner[componentName][owner] || 0) + 1;
        }
      }
    });
  });

  return usageByCodeowner;
};

/**
 * Create a processor object with a specific output path
 * @param {string} outputPath - Path where results should be stored
 * @returns {Object} Processor object
 */
const createCodeownerProcessor = (outputPath) => ({
  processor: async ({ prevResult }) => {
    // Validate output path
    if (!outputPath) {
      throw new Error("Output path is required");
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.debug(`Processing component usage by codeowner...`);
    const results = await processUsageByCodeowner(prevResult);
    console.debug(`Writing results to ${outputPath}...`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.debug(`Results written successfully.`);
    return results;
  },
});

export { createCodeownerProcessor };

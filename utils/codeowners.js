import path from "path";
import fs from "fs/promises";

// Cache for file paths and codeowners
const cache = {
  filepaths: new Map(),
  codeowners: null,
};

/**
 * Read and parse the CODEOWNERS file
 * @returns {Promise<string>} The contents of the CODEOWNERS file
 * @throws {Error} If the file cannot be read
 */
async function readCodeownersFile() {
  try {
    return await fs.readFile(global.CODEOWNERS_PATH, "utf8");
  } catch (error) {
    throw new Error(`Failed to read CODEOWNERS file: ${error.message}`);
  }
}

/**
 * Parse CODEOWNERS content into a map of paths and owners
 * @param {string} content - Content of CODEOWNERS file
 * @returns {Map<string, string[]>} Map of paths to owners
 */
function parseCodeowners(content) {
  const lines = content.split('\n');
  const pathOwners = new Map();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [pattern, ...owners] = trimmed.split(/\s+/);
      if (pattern && owners.length > 0) {
        // Remove leading slash if present
        const cleanPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;
        pathOwners.set(cleanPattern, owners);
      }
    }
  }

  return pathOwners;
}

/**
 * Convert a glob pattern to a regex pattern
 * @param {string} pattern - The glob pattern to convert
 * @returns {RegExp} The regex pattern
 */
function globToRegex(pattern) {
  return new RegExp(
    pattern
      .replace(/\*\*/g, '.*')  // ** matches any characters
      .replace(/\*/g, '[^/]*')  // * matches any characters except /
      .replace(/\?/g, '[^/]')   // ? matches any single character except /
      .replace(/\//g, '\\/')    // Escape forward slashes
      .replace(/\./g, '\\.')    // Escape dots
  );
}

/**
 * Get all filepaths associated with a codeowner
 * @param {string} owner - The codeowner to look up
 * @returns {Promise<string[]>} Array of filepaths
 */
const getFilepathsForCodeowner = async (owner) => {
  if (cache.filepaths.has(owner)) {
    return cache.filepaths.get(owner);
  }

  const content = await readCodeownersFile();
  const pathOwners = parseCodeowners(content);
  const paths = [];

  for (const [pattern, owners] of pathOwners.entries()) {
    if (owners.includes(owner)) {
      paths.push(pattern);
    }
  }

  cache.filepaths.set(owner, paths);
  return paths;
};

/**
 * Get all unique codeowners from the CODEOWNERS file
 * @returns {Promise<Set<string>>} Set of unique codeowners
 */
const getAllCodeowners = async () => {
  if (cache.codeowners) {
    return cache.codeowners;
  }

  const content = await readCodeownersFile();
  const pathOwners = parseCodeowners(content);
  const owners = new Set();

  for (const ownerList of pathOwners.values()) {
    for (const owner of ownerList) {
      owners.add(owner);
    }
  }

  cache.codeowners = owners;
  return owners;
};

/**
 * Check if a file is owned by a specific codeowner
 * @param {string} filePath - The file path to check
 * @param {string[]} ownerPaths - Array of paths owned by the codeowner
 * @returns {boolean} True if the file is owned by the codeowner
 */
const isFileOwnedByCodeowner = (filePath, ownerPaths) => {
  // Remove any leading slashes and normalize path
  const normalizedPath = filePath.replace(/^\/+/, '');
  
  return ownerPaths.some(pattern => {
    const regex = globToRegex(pattern);
    return regex.test(normalizedPath);
  });
};

export { getFilepathsForCodeowner, getAllCodeowners, isFileOwnedByCodeowner };

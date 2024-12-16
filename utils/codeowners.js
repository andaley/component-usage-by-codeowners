import path from "path";
import fs from "fs/promises";

// Cache for parsed CODEOWNERS data
const cache = new Map();

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
  const pathOwners = new Map();

  content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .forEach(line => {
      const [pattern, ...owners] = line.split(/\s+/);
      if (pattern && owners.length > 0) {
        // Remove leading slash if present
        const cleanPattern = pattern.replace(/^\/+/, '');
        pathOwners.set(cleanPattern, owners);
      }
    });

  return pathOwners;
}

// Common glob pattern replacements
const GLOB_PATTERNS = [
  [/\*\*/g, '.*'],     // ** matches any characters
  [/\*/g, '[^/]*'],    // * matches any characters except /
  [/\?/g, '[^/]'],     // ? matches any single character except /
  [/\//g, '\\/'],      // Escape forward slashes
  [/\./g, '\\.'],      // Escape dots
];

/**
 * Convert a glob pattern to a regex pattern
 * @param {string} pattern - The glob pattern to convert
 * @returns {RegExp} The regex pattern
 */
function globToRegex(pattern) {
  return new RegExp(
    GLOB_PATTERNS.reduce(
      (result, [pattern, replacement]) => result.replace(pattern, replacement),
      pattern
    )
  );
}

/**
 * Get all filepaths associated with a codeowner
 * @param {string} owner - The codeowner to look up
 * @returns {Promise<string[]>} Array of filepaths
 */
const getFilepathsForCodeowner = async (owner) => {
  const cacheKey = `paths:${owner}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const content = await readCodeownersFile();
  const pathOwners = parseCodeowners(content);
  const ownerPaths = [];

  for (const [pattern, owners] of pathOwners.entries()) {
    if (owners.includes(owner)) {
      ownerPaths.push(pattern);
    }
  }

  cache.set(cacheKey, ownerPaths);
  return ownerPaths;
};

/**
 * Get all unique codeowners from the CODEOWNERS file
 * @returns {Promise<Set<string>>} Set of unique codeowners
 */
const getAllCodeowners = async () => {
  const CACHE_KEY = 'allOwners';
  if (cache.has(CACHE_KEY)) {
    return cache.get(CACHE_KEY);
  }

  const content = await readCodeownersFile();
  const pathOwners = parseCodeowners(content);
  const owners = new Set(
    Array.from(pathOwners.values()).flat()
  );

  cache.set(CACHE_KEY, owners);
  return owners;
};

/**
 * Check if a file is owned by a specific codeowner
 * @param {string} filePath - The file path to check
 * @param {string[]} ownerPaths - Array of paths owned by the codeowner
 * @returns {boolean} True if the file is owned by the codeowner
 */
const isFileOwnedByCodeowner = (filePath, ownerPaths) => {
  const normalizedPath = filePath.replace(/^\/+/, '');
  return ownerPaths.some(pattern => globToRegex(pattern).test(normalizedPath));
};

export { getFilepathsForCodeowner, getAllCodeowners, isFileOwnedByCodeowner };

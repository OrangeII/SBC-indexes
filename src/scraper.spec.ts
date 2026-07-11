import { describe, it, expect, mock } from "bun:test";
import { SBNScraper, ScraperOptions } from "./scraper";
import { MakeDirectoryOptions, PathLike } from "node:fs";

function createScraper(options: Partial<ScraperOptions> = {}) {
  return new SBNScraper("Test", "https://example.com", options);
}

// mock file system functions to avoid actual file system operations during tests
mock.module("node:fs", () => {
  return {
    existsSync: (path: PathLike) => true,
    mkdirSync: (
      path: PathLike,
      options: MakeDirectoryOptions & {
        recursive: true;
      },
    ) => {
      // mocked from description: Synchronously creates a directory. Returns undefined, or if recursive is true, the first directory path created.
      return options.recursive ? path : undefined;
    },
  };
});

describe("SBNScraper", () => {
  describe("constructor", () => {
    it("should create an instance of SBNScraper with given options", () => {
      const options: ScraperOptions = {
        maxDepth: 5,
        maxLinks: 10,
        delay: 500,
        timeout: 5000,
        userAgent: "TestAgent/1.0",
      };
      const scraper = createScraper(options);
      expect(scraper).toBeInstanceOf(SBNScraper);
      expect(scraper.config.maxDepth).toEqual(options.maxDepth);
      expect(scraper.config.maxLinks).toEqual(options.maxLinks);
      expect(scraper.config.delay).toEqual(options.delay);
      expect(scraper.config.timeout).toEqual(options.timeout);
      expect(scraper.config.userAgent).toEqual(options.userAgent);
    });

    it("should initialize the index filename", () => {
      const scraper = createScraper();
      expect(scraper.indexFilename).toBeDefined();
      expect(scraper.indexFilename).toEqual("pages\\index_Test.md");
    });
  });
});

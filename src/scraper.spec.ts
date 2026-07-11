import { describe, it, expect } from "bun:test";
import { SBNScraper, ScraperOptions } from "./scraper";

function createScraper(options: Partial<ScraperOptions> = {}) {
  return new SBNScraper("Test Index", "https://example.com", options);
}

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
  });
});

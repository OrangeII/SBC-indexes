import { SBNScraper } from "./scraper.js";
import { readFileSync } from "fs";

async function main() {
  const config = readConfig();
  if (!config) {
    console.error("Failed to read configuration. Exiting.");
    return;
  }

  for (const index of config.indexes) {
    console.log(`\nScraping ${index.title} from ${index.base_url}...`);
    const scraper = new SBNScraper(index.title, index.base_url, {
      maxDepth: config.scraper_config.max_depth,
      maxLinks: config.scraper_config.max_links,
      delay: config.scraper_config.delay,
      timeout: config.scraper_config.timeout,
    });
    console.log("Starting SBN website scraping...");
    console.log("This may take several minutes.\n");

    try {
      await scraper.buildIndex("", index.base_url);
      console.log(`\nIndex saved to ${scraper.indexFilename}`);
    } catch (error) {
      console.error("Error during scraping:", error.message);
    }
  }
}

function readConfig() {
  try {
    const config = JSON.parse(readFileSync("./config.json", "utf-8"));
    return config;
  } catch (error) {
    console.error("Error reading config file:", error.message);
    return null;
  }
}

main();

import { SBNScraper } from "./scraper.js";

const BASE_URL = "https://norme.iccu.sbn.it";
const START_URL = "https://norme.iccu.sbn.it/index.php?title=Norme_comuni";
const TITLE = "norme comuni";

async function main() {
  const scraper = new SBNScraper(TITLE, BASE_URL, 10);

  console.log("Starting SBN website scraping...");
  console.log("This may take several minutes.\n");

  try {
    const index = await scraper.buildIndex("", START_URL);
    console.log(`\nIndex saved to ${scraper.indexFilename}`);
  } catch (error) {
    console.error("Error during scraping:", error.message);
  }
}

main();

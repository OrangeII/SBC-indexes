import { SBNScraper } from "./src/scraper.js";

const CONFIG_FILE = "./config.json";

async function main() {
  const config = await readConfig();
  if (!config) {
    console.error("Failed to read configuration. Exiting.");
    return;
  }

  const files = [];

  for (const index of config.indexes) {
    console.log(`\nScraping ${index.title} from ${index.base_url}...`);
    const scraper = new SBNScraper(
      index.title,
      config.scraper_config.base_url,
      {
        maxDepth: config.scraper_config.max_depth,
        maxLinks: config.scraper_config.max_links,
        delay: config.scraper_config.delay,
        timeout: config.scraper_config.timeout,
      },
    );
    console.log("Starting SBN website scraping...");
    console.log("This may take several minutes.\n");

    try {
      await scraper.buildIndex("", index.base_url);
      files.push({ title: index.title, filename: scraper.indexFilename });
      console.log(`\nIndex saved to ${scraper.indexFilename}`);
    } catch (error: any) {
      console.error("Error during scraping:", error.message);
    }
  }

  await writeIndexFile(files);
}

async function writeIndexFile(files: { title: string; filename: string }[]) {
  //remove extension from links
  //this is for github pages
  const indexContent = files
    .map((file) => `- [${file.title}](${file.filename.replace(/\.md$/, "")})`)
    .join("\n");
  await Bun.write("index.md", indexContent);
  console.log("Index file created: index.md");
}

async function readConfig() {
  try {
    console.log(`Reading configuration from ${CONFIG_FILE}...`);
    const config = await Bun.file(CONFIG_FILE).json();
    console.log("loaded configuration:", config);
    return config;
  } catch (error: any) {
    console.error("Error reading config file:", error.message);
    return null;
  }
}

main();

import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

export class SBNScraper {
  constructor(indexTitle, baseUrl, maxDepth = 20, maxLinks = 0) {
    this.indexTitle = indexTitle;
    this.baseUrl = baseUrl;
    this.maxDepth = maxDepth;
    this.maxLinks = maxLinks;
    this.visitedUrls = new Set();
    this.linkCount = 0;
    this.delay = 1000;
    this.indexFilename = `\.\\indexes\\index_${this.indexTitle.replace(
      /\s+/g,
      "_"
    )}.md`;
    this.indexContent = "";
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  maxVisitsReached() {
    if (this.maxLinks <= 0) return false;
    if (this.linkCount >= this.maxLinks) {
      console.log(
        `Reached maximum link limit of ${this.maxLinks}. Stopping crawl.`
      );
      return true;
    }
    return false;
  }

  async fetchPage(url) {
    try {
      await this.sleep(this.delay);
      console.log(`Fetching: ${url}`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error.message);
      return null;
    }
  }

  extractLinks(html, currentUrl) {
    const $ = cheerio.load(html);
    const links = [];

    // return empty if this is an anchor link
    if (currentUrl.includes("#")) {
      return links;
    }

    // Find the content div and extract links from ul > li > a elements
    $("#mw-content-text ul li a").each((index, element) => {
      const $link = $(element);
      const href = $link.attr("href");
      const title = $link.text().trim();

      if (href && title && !this.isReference($link)) {
        // Skip anchor links that point to different pages (contain # but don't start with #)
        if (href.includes("#") && !href.startsWith("#")) {
          return;
        }

        //exclude if one of ancestor elements has id 'mw-navigation'
        if ($link.closest("#mw-navigation").length > 0) {
          return;
        }

        let fullUrl = href;
        // if its an internal anchor, create the full URL
        if (href.startsWith("#")) {
          fullUrl = currentUrl + href;
        }

        // Convert relative URLs to absolute
        fullUrl = fullUrl.startsWith("http") ? fullUrl : this.baseUrl + fullUrl;

        // Only include links that are within the same domain
        if (fullUrl.includes("norme.iccu.sbn.it")) {
          links.push({
            title: title,
            url: fullUrl,
          });
        }
      }
    });

    return links;
  }

  isReference($link) {
    // the link is a reference if it or its parent has the class "reference"
    return (
      $link.hasClass("reference") ||
      $link.parent().hasClass("reference") ||
      $link.text().includes("par.") ||
      $link.text().includes("cap.")
    );
  }

  updateIndexFile(node, indent = 0) {
    if (!node) return;

    const indentStr = "  ".repeat(indent);
    const line = `${indentStr}- [${node.title}](${node.url})\n`;

    this.indexContent += line;
    fs.writeFileSync(this.indexFilename, this.indexContent);
  }

  async buildIndex(pageTitle, startUrl, depth = 0, visited = new Set()) {
    if (depth > this.maxDepth || visited.has(startUrl)) {
      return null;
    }

    if (this.maxVisitsReached()) {
      return null;
    }

    visited.add(startUrl);
    this.linkCount++;

    const html = await this.fetchPage(startUrl);
    if (!html) {
      return null;
    }

    // Extract page title
    const $ = cheerio.load(html);
    if (!pageTitle) {
      pageTitle = $("#firstHeading").text().trim() || "Unknown Title";
    }

    // Create current node and immediately save to file
    const currentNode = {
      title: pageTitle,
      url: startUrl,
      subPages: [],
    };

    // Update index file with current page
    this.updateIndexFile(currentNode, depth);

    const links = this.extractLinks(html, startUrl);
    const subPages = [];

    // Recursively process each link
    for (const link of links) {
      if (this.maxVisitsReached()) {
        break;
      }

      if (!visited.has(link.url)) {
        const subIndex = await this.buildIndex(
          link.title,
          link.url,
          depth + 1,
          visited
        );
        if (subIndex) {
          subPages.push(subIndex);
        } else {
          // Even if we can't recurse further, add the link and save it
          const leafNode = {
            title: link.title,
            url: link.url,
            subPages: [],
          };
          this.updateIndexFile(leafNode, depth + 1);
          subPages.push(leafNode);
        }
      }
    }

    currentNode.subPages = subPages;
    return currentNode;
  }
}

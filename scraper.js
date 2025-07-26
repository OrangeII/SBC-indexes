import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";

export class SBNScraper {
  constructor(indexTitle, baseUrl, options = {}) {
    this.indexTitle = indexTitle;
    this.baseUrl = baseUrl;
    this.config = {
      maxDepth: options.maxDepth || 20,
      maxLinks: options.maxLinks || 0,
      delay: options.delay || 1000,
      timeout: options.timeout || 10000,
      userAgent:
        options.userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    this.state = {
      visitedUrls: new Set(),
      linkCount: 0,
      indexContent: "",
    };

    this.indexFilename = this._generateIndexFilename();
    this._ensureIndexDirectory();
  }

  // Private helper methods
  _generateIndexFilename() {
    const sanitizedTitle = this.indexTitle.replace(/\s+/g, "_");
    return path.join(".", "indexes", `index_${sanitizedTitle}.md`);
  }

  _ensureIndexDirectory() {
    const dir = path.dirname(this.indexFilename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _isMaxVisitsReached() {
    if (this.config.maxLinks <= 0) return false;
    if (this.state.linkCount >= this.config.maxLinks) {
      console.log(
        `Reached maximum link limit of ${this.config.maxLinks}. Stopping crawl.`
      );
      return true;
    }
    return false;
  }

  _shouldSkipUrl(url, visited) {
    return visited.has(url) || this._isMaxVisitsReached();
  }

  _isAnchorLink(url) {
    return url.includes("#");
  }

  _isReference($link) {
    const text = $link.text();
    const hasReferenceClass =
      $link.hasClass("reference") || $link.parent().hasClass("reference");
    const hasReferenceText = text.includes("par.") || text.includes("cap.");

    return hasReferenceClass || hasReferenceText;
  }

  _isInNavigationSection($link) {
    return $link.closest("#mw-navigation").length > 0;
  }

  _isValidLink(href, title, $link) {
    if (!href || !title || this._isReference($link)) {
      return false;
    }

    // Skip anchor links that point to different pages
    if (href.includes("#") && !href.startsWith("#")) {
      return false;
    }

    // Exclude navigation links
    if (this._isInNavigationSection($link)) {
      return false;
    }

    return true;
  }

  _buildFullUrl(href, currentUrl) {
    if (href.startsWith("#")) {
      href = currentUrl + href;
    }

    return href.startsWith("http") ? href : this.baseUrl + href;
  }

  _isValidDomain(url) {
    return url.includes("norme.iccu.sbn.it");
  }

  // Public methods
  async fetchPage(url) {
    try {
      await this._sleep(this.config.delay);
      console.log(`Fetching: ${url}`);

      const response = await axios.get(url, {
        timeout: this.config.timeout,
        headers: {
          "User-Agent": this.config.userAgent,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error.message);
      return null;
    }
  }

  extractLinks(html, currentUrl) {
    // Skip processing if this is an anchor link
    if (this._isAnchorLink(currentUrl)) {
      return [];
    }

    const $ = cheerio.load(html);
    const links = [];

    $("#mw-content-text ul li a").each((index, element) => {
      const $link = $(element);
      const href = $link.attr("href");
      const title = $link.text().trim();

      if (this._isValidLink(href, title, $link)) {
        const fullUrl = this._buildFullUrl(href, currentUrl);

        if (this._isValidDomain(fullUrl)) {
          links.push({
            title: title,
            url: fullUrl,
          });
        }
      }
    });

    return links;
  }

  updateIndexFile(node, indent = 0) {
    if (!node) return;

    const indentStr = "  ".repeat(indent);
    const line = `${indentStr}- [${node.title}](${node.url})\n`;

    this.state.indexContent += line;
    fs.writeFileSync(this.indexFilename, this.state.indexContent);
  }

  extractPageTitle(html, fallbackTitle) {
    const $ = cheerio.load(html);
    return fallbackTitle || $("#firstHeading").text().trim() || "Unknown Title";
  }

  createNode(title, url) {
    return {
      title: title,
      url: url,
      subPages: [],
    };
  }

  async processSubLinks(links, depth, visited) {
    const subPages = [];

    for (const link of links) {
      if (this._isMaxVisitsReached()) {
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
          const leafNode = this.createNode(link.title, link.url);
          this.updateIndexFile(leafNode, depth + 1);
          subPages.push(leafNode);
        }
      }
    }

    return subPages;
  }

  async buildIndex(pageTitle, startUrl, depth = 0, visited = new Set()) {
    if (
      depth > this.config.maxDepth ||
      this._shouldSkipUrl(startUrl, visited)
    ) {
      return null;
    }

    visited.add(startUrl);
    this.state.linkCount++;

    const html = await this.fetchPage(startUrl);
    if (!html) {
      return null;
    }

    const finalTitle = this.extractPageTitle(html, pageTitle);
    const currentNode = this.createNode(finalTitle, startUrl);

    this.updateIndexFile(currentNode, depth);

    const links = this.extractLinks(html, startUrl);
    const subPages = await this.processSubLinks(links, depth, visited);

    currentNode.subPages = subPages;
    return currentNode;
  }

  // Utility methods for getting scraper state
  getStats() {
    return {
      linksVisited: this.state.linkCount,
      maxLinks: this.config.maxLinks,
      maxDepth: this.config.maxDepth,
      indexFile: this.indexFilename,
    };
  }

  resetState() {
    this.state = {
      visitedUrls: new Set(),
      linkCount: 0,
      indexContent: "",
    };
  }
}

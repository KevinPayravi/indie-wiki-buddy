#!/usr/bin/env node
// Print the getindie.wiki/changelog entry for a version in markdown
// Usage: node changelog-release-notes.js <version>

const CHANGELOG_URL = "https://getindie.wiki/changelog/";

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Expand a heading like "3.14.7 / 8" or "3.10.0 / 3.10.1" to its versions
function headingVersions(heading) {
  const parts = heading
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];
  const versions = [parts[0]];
  for (const part of parts.slice(1)) {
    if (part.includes(".")) {
      versions.push(part);
    } else {
      // Bare number: replace the last component of the first version
      versions.push(parts[0].replace(/\d+$/, part));
    }
  }
  return versions;
}

// Format: "Chrome release: August 11, 2026 · Firefox release: August 17, 2026"
// "N/A" used if not released on browser
function releaseDates(sectionHtml) {
  const dates = [];
  const regex = /alt="([^"]+) release date"[^>]*>\s*([^<]+)/g;
  let match;
  while ((match = regex.exec(sectionHtml)) !== null) {
    const date = match[2].replace(/\s+/g, " ").trim();
    dates.push(match[1] + " release: " + date);
  }
  return dates.join(" · ");
}

// Convert the section's <ul>/<li> tree to markdown bullets
function listsToMarkdown(sectionHtml) {
  const html = sectionHtml.replace(
    /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gs,
    "[$2]($1)",
  );
  const tokens = html.match(/<\/?(?:ul|li)\b[^>]*>|<[^>]+>|[^<]+/g) || [];
  const lines = [];
  let depth = -1;
  let current = null;
  const flush = () => {
    if (current && current.text.trim()) {
      const text = decodeEntities(current.text.replace(/\s+/g, " ").trim());
      lines.push("  ".repeat(current.depth) + "- " + text);
    }
    current = null;
  };
  for (const token of tokens) {
    if (/^<ul/i.test(token)) {
      flush();
      depth++;
    } else if (/^<\/ul/i.test(token)) {
      depth--;
    } else if (/^<li/i.test(token)) {
      flush();
      current = { depth: Math.max(depth, 0), text: "" };
    } else if (/^<\/li/i.test(token)) {
      flush();
    } else if (!token.startsWith("<") && current) {
      current.text += token;
    }
  }
  flush();
  return lines.join("\n");
}

async function main() {
  const versionArg = process.argv[2];
  const fileArg = process.argv[3];
  if (!versionArg) {
    console.error(
      "Usage: changelog-release-notes.js <version> [changelog-html-file]",
    );
    process.exit(2);
  }
  const version = versionArg.replace(/^v\.?/, "");

  let html;
  if (fileArg) {
    html = require("fs").readFileSync(fileArg, "utf8");
  } else {
    const response = await fetch(CHANGELOG_URL);
    if (!response.ok) {
      throw new Error("Failed to fetch changelog: HTTP " + response.status);
    }
    html = await response.text();
  }

  const sections = html.split(/<h2>/).slice(1);
  for (const section of sections) {
    const headingEnd = section.indexOf("</h2>");
    if (headingEnd === -1) continue;
    const heading = decodeEntities(section.slice(0, headingEnd)).trim();
    if (!headingVersions(heading).includes(version)) continue;

    const body = section.slice(headingEnd + "</h2>".length);
    const dates = releaseDates(body);
    const bullets = listsToMarkdown(body);
    const notes = [dates ? "_" + dates + "_" : "", bullets]
      .filter(Boolean)
      .join("\n\n");
    if (!notes) break;
    console.log(
      "From the [Indie Wiki Buddy changelog](https://getindie.wiki/changelog/):\n",
    );
    console.log(notes);
    return;
  }

  console.error("No changelog entry found for version " + version);
  process.exit(1);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});

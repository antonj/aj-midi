import { test, Page } from "@playwright/test";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import https from "https";
import http from "http";

const outputDir = path.join(process.cwd(), "output");
const midiDir = path.join(outputDir, "midi");

function clean(s: string | null): string {
  return s?.replaceAll("\n", " ").replaceAll(/\s+/g, " ").trim() ?? "";
}

type Part = {
  name: string;
  url: string;
  localPath?: string;
};

type Piece = {
  name: string;
  parts: Part[];
};

type Composer = {
  name: string;
  url: string;
  pieces: Piece[];
};

async function getWithRedirects(url: string): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    protocol
      .get(url, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400
        ) {
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(
              new Error(`Redirect received but no location header for ${url}`),
            );
            return;
          }
          // If relative URL, make it absolute
          const finalUrl = redirectUrl.startsWith("http")
            ? redirectUrl
            : new URL(redirectUrl, url).toString();

          getWithRedirects(finalUrl).then(resolve).catch(reject);
          return;
        }
        resolve(response);
      })
      .on("error", reject);
  });
}

async function downloadFile(
  url: string,
  outputPath: string,
): Promise<{ downloaded: boolean }> {
  // Check if file already exists
  try {
    await fs.access(outputPath);
    console.log(`File already exists, skipping download: ${outputPath}`);
    return { downloaded: false };
  } catch (error) {
    // File doesn't exist, proceed with download
  }

  return new Promise((resolve, reject) => {
    getWithRedirects(url)
      .then((response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`Failed to download ${url}: ${response.statusCode}`),
          );
          return;
        }

        const file = fsSync.createWriteStream(outputPath);
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log(`Downloaded: ${outputPath}`);
          resolve({ downloaded: true });
        });
        file.on("error", (err: Error) => {
          fsSync.unlink(outputPath, () => {});
          reject(err);
        });
      })
      .catch(reject);
  });
}

async function scrapeFiles(page: Page) {
  const baseUrl = "http://piano-midi.de/";

  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  await page.goto(baseUrl + "/midi_files.htm");

  const els = await page.locator("td.midi a").elementHandles();
  const composers = await Promise.all(
    els.map(async (el): Promise<Composer> => {
      const name = clean(await el.textContent());
      const href = await el.getAttribute("href");
      const url = baseUrl + href;
      return { name, url, pieces: [] };
    }),
  );

  // Process each composer and their pieces
  for (const composer of composers) {
    await page.goto(composer.url);
    const pieces: Piece[] = (await page.locator("h2").allTextContents()).map(
      (name) => ({
        name: clean(name),
        parts: [],
      }),
    );
    composer.pieces = pieces;

    for (const [i, table] of (
      await page.locator("h2 + table").all()
    ).entries()) {
      const piece = pieces[i];
      const parts = await table
        .locator("tr > td.midi:first-child a")
        .elementHandles();
      piece.parts = [];

      for (const part of parts) {
        const partName = clean(await part.textContent());
        const partHref = await part.getAttribute("href");
        const partUrl = baseUrl + partHref;

        piece.parts.push({
          name: partName,
          url: partUrl,
        });
      }
    }
  }

  // Save the scraped data
  await fs.writeFile(
    path.join(outputDir, "composers.json"),
    JSON.stringify(composers, null, 2),
  );
}

async function downloadFiles() {
  // Create midi directory
  await fs.mkdir(midiDir, { recursive: true });

  // Read the scraped data
  const composersData = await fs.readFile(
    path.join(outputDir, "composers.json"),
    "utf-8",
  );
  const composers: Composer[] = JSON.parse(composersData);

  console.log(`Found ${composers.length} composers to process`);

  // Download all MIDI files
  for (const composer of composers) {
    console.log(`Processing composer: ${composer.name}`);
    for (const piece of composer.pieces) {
      console.log(`  Processing piece: ${piece.name}`);
      for (const [i, part] of piece.parts.entries()) {
        const safeComposerName = composer.name
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        const safePieceName = piece.name
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        const safePartName = part.name
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        const filename = `${safeComposerName}_${safePartName}_${safePieceName}_${safePartName}_${i}.mid`;
        const localPath = path.join("midi", filename);
        const fullPath = path.join(outputDir, localPath);

        try {
          await downloadFile(part.url, fullPath);
          // Always set the localPath, regardless of whether the file was downloaded or already existed
          part.localPath = localPath;
          console.log(`    Processed: ${part.name} -> ${localPath}`);
        } catch (error) {
          console.error(`    Failed to process ${part.url}:`, error);
        }
      }
    }
  }

  // Save the updated data with local paths
  const outputPath = path.join(outputDir, "composers_with_local_files.json");
  await fs.writeFile(outputPath, JSON.stringify(composers, null, 2));
  console.log(`Saved updated data to ${outputPath}`);
}

test("scrape composers data", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  await scrapeFiles(page);
  await downloadFiles();
});

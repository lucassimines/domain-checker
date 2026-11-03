import fs from "node:fs/promises";

const INPUT_FILE = "domains.csv";
const OUTPUT_FILE = "domain-results.csv";

const DELAY_MS = 4000;
const MAX_RETRIES = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Read domains from CSV
async function readDomains() {
  const content = await fs.readFile(INPUT_FILE, "utf8");

  return [
    ...new Set(
      content
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .slice(1) // Skip header
        .map((line) => line.split(",")[0]?.trim().toLowerCase())
        .filter((domain) =>
          /^[a-z0-9]+(?:-[a-z0-9]+)*\.com\.br$/.test(domain ?? ""),
        ),
    ),
  ];
}

// Load previously checked domains
async function loadResults() {
  try {
    const content = await fs.readFile(OUTPUT_FILE, "utf8");

    return new Map(
      content
        .split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => {
          const [domain, status, code] = line.split(",");

          return [
            domain,
            {
              domain,
              status,
              code: code ?? "",
            },
          ];
        }),
    );
  } catch (error) {
    if (error.code === "ENOENT") return new Map();
    throw error;
  }
}

// Save all results, with available domains first
async function saveResults(results) {
  const statusOrder = {
    AVAILABLE: 0,
    REGISTERED: 1,
    UNKNOWN: 2,
    ERROR: 3,
  };

  const entries = [...results.values()].sort((a, b) => {
    const statusDiff =
      (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);

    if (statusDiff !== 0) return statusDiff;

    return a.domain.localeCompare(b.domain);
  });

  const csv = [
    "domain,status,code",
    ...entries.map(
      ({ domain, status, code }) => `${domain},${status},${code ?? ""}`,
    ),
  ];

  await fs.writeFile(OUTPUT_FILE, csv.join("\n") + "\n");
}

// Check domain availability using Registro.br
async function checkDomain(domain) {
  const url = `https://registro.br/v2/ajax/avail/raw/${domain}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 429) {
        return {
          domain,
          status: "ERROR",
          code: 429,
          rateLimited: true,
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const code = Number(data.status);

      // Registro.br endpoint is undocumented.
      // Confirm status mappings against current responses.
      const status =
        code === 0 ? "AVAILABLE" : code === 2 ? "REGISTERED" : "UNKNOWN";

      return { domain, status, code };
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        return {
          domain,
          status: "ERROR",
          code: "",
          error: error.message,
        };
      }

      await sleep(DELAY_MS * (attempt + 2));
    }
  }
}

// Main
async function main() {
  const domains = await readDomains();
  const results = await loadResults();

  // Skip already checked domains
  const pending = domains.filter((domain) => {
    const previous = results.get(domain);

    return !previous || !["AVAILABLE", "REGISTERED"].includes(previous.status);
  });

  console.log(`Total domains: ${domains.length}`);
  console.log(`Previously checked: ${domains.length - pending.length}`);
  console.log(`Pending: ${pending.length}\n`);

  for (const [index, domain] of pending.entries()) {
    const result = await checkDomain(domain);

    results.set(domain, result);

    // Save progress after every check
    await saveResults(results);

    const icon =
      result.status === "AVAILABLE"
        ? "✅"
        : result.status === "REGISTERED"
          ? "❌"
          : "⚠️";

    console.log(
      `[${index + 1}/${pending.length}] ` +
        `${icon} ${domain} - ${result.status}`,
    );

    // Stop if Registro.br rate limits requests
    if (result.rateLimited) {
      console.log("\nRate limited. Progress saved.");
      break;
    }

    if (index < pending.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const entries = [...results.values()];

  const available = entries.filter(
    (item) => item.status === "AVAILABLE",
  ).length;

  const registered = entries.filter(
    (item) => item.status === "REGISTERED",
  ).length;

  console.log("\n================================");
  console.log("SUMMARY");
  console.log("================================");
  console.log(`Available: ${available}`);
  console.log(`Registered: ${registered}`);
  console.log(`Total checked: ${entries.length}`);
  console.log(`Results saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);

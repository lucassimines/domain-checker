import fs from "node:fs/promises";

const INPUT_FILE = "domains.csv";
const OUTPUT_FILE = "domain-results.csv";
const DELAY_MS = 4000;
const MAX_RETRIES = 2;

const VERIFIED_STATUSES = new Set(["AVAILABLE", "REGISTERED"]);

const STATUS_ORDER = {
  AVAILABLE: 0,
  REGISTERED: 1,
  UNKNOWN: 2,
  ERROR: 3,
};

const DOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.com\.br$/;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readDomains() {
  const content = (await fs.readFile(INPUT_FILE, "utf8")).replace(
    /^\uFEFF/,
    "",
  );

  return [
    ...new Set(
      content
        .split(/\r?\n/)
        .map((line) => line.split(",")[0]?.trim().toLowerCase())
        .filter((domain) => DOMAIN_PATTERN.test(domain ?? "")),
    ),
  ];
}

async function loadResults() {
  let content;

  try {
    content = await fs.readFile(OUTPUT_FILE, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return new Map();
    throw error;
  }

  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);

  const headers = (lines.shift() ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase());

  const indexOf = (key) => headers.indexOf(key);

  if (indexOf("domain") === -1 || indexOf("status") === -1) {
    throw new Error(`${OUTPUT_FILE} must contain domain and status columns`);
  }

  const results = new Map();

  for (const line of lines) {
    const fields = line.split(",");

    const get = (key) =>
      indexOf(key) === -1 ? "" : (fields[indexOf(key)] ?? "").trim();

    const domain = get("domain").toLowerCase();

    if (!DOMAIN_PATTERN.test(domain)) continue;

    results.set(domain, {
      domain,
      status: get("status").toUpperCase(),
      code: get("code"),
      checked_at: get("checked_at"),
    });
  }

  return results;
}

async function saveResults(results) {
  const entries = [...results.values()].sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99) ||
      a.domain.localeCompare(b.domain),
  );

  const csv =
    [
      "domain,status,code,checked_at",
      ...entries.map(
        ({ domain, status, code, checked_at }) =>
          `${domain},${status},${code ?? ""},${checked_at ?? ""}`,
      ),
    ].join("\n") + "\n";

  // Write to a temporary file before replacing the original.
  const tempFile = `${OUTPUT_FILE}.${process.pid}.tmp`;

  try {
    await fs.writeFile(tempFile, csv, "utf8");
    await fs.rename(tempFile, OUTPUT_FILE);
  } finally {
    await fs.rm(tempFile, { force: true });
  }
}

async function checkDomain(domain) {
  const url = `https://registro.br/v2/ajax/avail/raw/${domain}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
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

      // Status mapping for the Registro.br endpoint.
      const status =
        code === 0 ? "AVAILABLE" : code === 2 ? "REGISTERED" : "UNKNOWN";

      return {
        domain,
        status,
        code: Number.isFinite(code) ? code : "",
      };
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

async function main() {
  const domains = await readDomains();
  const results = await loadResults();

  // Only check domains that have not been verified.
  const pending = domains.filter(
    (domain) => !VERIFIED_STATUSES.has(results.get(domain)?.status),
  );

  console.log(`Imported domains: ${domains.length}`);
  console.log(`Stored domains: ${results.size}`);
  console.log(`Already verified (skipped): ${domains.length - pending.length}`);
  console.log(`Pending: ${pending.length}\n`);

  for (const [index, domain] of pending.entries()) {
    const result = {
      ...(await checkDomain(domain)),
      checked_at: new Date().toISOString(),
    };

    results.set(domain, result);

    // Save after each check so progress is not lost.
    await saveResults(results);

    const icon =
      result.status === "AVAILABLE"
        ? "✅"
        : result.status === "REGISTERED"
          ? "❌"
          : "⚠️";

    console.log(
      `[${index + 1}/${pending.length}] ${icon} ${domain} - ${result.status}`,
    );

    if (result.rateLimited) {
      console.log("\nRate limited. Progress saved.");
      break;
    }

    if (index < pending.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const entries = [...results.values()];

  console.log("\n================================");
  console.log("SUMMARY (ALL STORED DOMAINS)");
  console.log("================================");

  console.log(
    `Available: ${entries.filter((item) => item.status === "AVAILABLE").length}`,
  );
  console.log(
    `Registered: ${entries.filter((item) => item.status === "REGISTERED").length}`,
  );
  console.log(`Total stored: ${entries.length}`);
  console.log(`Results saved to: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const process = require("node:process");
const { URL } = require("node:url");

const { chromium } = require("playwright");

const DEFAULT_OUT_DIR = path.join("보관함", "다운로드");
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RATE_LIMIT_MS = 1_000;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const records = await readJsonlInput(options.input);
  if (records.length === 0) {
    throw new Error("입력 JSONL에서 처리할 URL이 없습니다.");
  }

  const repoRoot = path.resolve(__dirname, "..", "..");
  const outRoot = path.resolve(repoRoot, options.outDir);
  const hostLastRequestAt = new Map();
  const robotsCache = new Map();

  const browser = await launchBrowser(options);
  const context = await browser.newContext();

  const results = [];
  try {
    for (const record of records) {
      const result = await processOneUrl({
        context,
        outRoot,
        record,
        options,
        hostLastRequestAt,
        robotsCache,
      });
      results.push(result);
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const successCount = results.filter((entry) => entry.ok).length;
  const failureCount = results.length - successCount;
  const summary = {
    total: results.length,
    successCount,
    failureCount,
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failureCount > 0) {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = {
    input: "",
    outDir: DEFAULT_OUT_DIR,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    rateLimitMs: DEFAULT_RATE_LIMIT_MS,
    headless: true,
    channel: null,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--input" || arg === "-i") {
      options.input = mustGetValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--out-dir") {
      options.outDir = mustGetValue(args, i, arg);
      i += 1;
      continue;
    }
    if (arg === "--timeout-ms") {
      options.timeoutMs = toPositiveInt(mustGetValue(args, i, arg), arg);
      i += 1;
      continue;
    }
    if (arg === "--rate-limit-ms") {
      options.rateLimitMs = toPositiveInt(mustGetValue(args, i, arg), arg);
      i += 1;
      continue;
    }
    if (arg === "--headless") {
      options.headless = parseBoolean(mustGetValue(args, i, arg), arg);
      i += 1;
      continue;
    }
    if (arg === "--headed") {
      options.headless = false;
      continue;
    }
    if (arg === "--channel") {
      options.channel = normalizeChannel(mustGetValue(args, i, arg));
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    }

    throw new Error(`알 수 없는 인자: ${arg}`);
  }

  if (!options.input) {
    throw new Error("필수 인자 누락: --input <jsonl-path>");
  }

  return options;
}

function mustGetValue(args, index, optionName) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${optionName} 값이 필요합니다.`);
  }
  return value;
}

function toPositiveInt(value, optionName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} 값은 양의 정수여야 합니다.`);
  }
  return parsed;
}

function parseBoolean(value, optionName) {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }
  throw new Error(`${optionName} 값은 true/false 여야 합니다.`);
}

function normalizeChannel(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.toLowerCase();
  if (["none", "default", "bundled", "auto"].includes(normalized)) {
    return null;
  }

  return raw;
}

function printHelpAndExit() {
  console.log(
    [
      "Usage:",
      "  node tools/js/sncouncil-minutes-downloader.js --input <jsonl-path> [options]",
      "",
      "Options:",
      "  --out-dir <path>         Output root directory (default: 보관함/다운로드)",
      "  --timeout-ms <number>    Navigation timeout in ms (default: 30000)",
      "  --rate-limit-ms <number> Delay per host between requests (default: 1000)",
      "  --headless <bool>        true | false (default: true)",
      "  --headed                 Shortcut for --headless false",
      "  --channel <name>         Browser channel (default: bundled chromium)",
      "                           Use none|default|bundled|auto to clear channel",
      "  --help                   Show this message",
      "",
      "Input JSONL format:",
      "  - Plain URL line",
      "  - JSON object containing one of: url, source_url, page_url",
    ].join("\n")
  );
  process.exit(0);
}

async function readJsonlInput(inputPath) {
  const absolute = path.resolve(inputPath);
  const raw = await fsp.readFile(absolute, "utf8");
  const lines = raw.split(/\r?\n/u);
  const records = [];

  for (let index = 0; index < lines.length; index += 1) {
    const original = lines[index];
    const line = original.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    let url = "";
    if (line.startsWith("{")) {
      const parsed = JSON.parse(line);
      url = String(parsed.url || parsed.source_url || parsed.page_url || "").trim();
    } else {
      url = line;
    }

    if (!url) {
      throw new Error(`입력 ${index + 1}행: URL을 찾지 못했습니다.`);
    }

    const normalized = normalizeHttpUrl(url);
    records.push({
      lineNumber: index + 1,
      sourceLine: original,
      url: normalized,
    });
  }

  return records;
}

function normalizeHttpUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`http/https URL만 허용됩니다: ${rawUrl}`);
  }
  return parsed.toString();
}

async function launchBrowser(options) {
  const launchOptions = {
    headless: options.headless,
  };

  if (options.channel) {
    launchOptions.channel = options.channel;
  }

  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const channelText = options.channel || "bundled-chromium";
    throw new Error(`브라우저 실행 실패(channel=${channelText}): ${detail}`);
  }
}

async function processOneUrl({
  context,
  outRoot,
  record,
  options,
  hostLastRequestAt,
  robotsCache,
}) {
  const pageUrl = new URL(record.url);
  const robotsInfo = await checkRobots(pageUrl, robotsCache);

  if (!robotsInfo.allowed) {
    return {
      ok: false,
      lineNumber: record.lineNumber,
      url: record.url,
      error: "robots.txt disallow",
      robotsUrl: robotsInfo.robotsUrl,
    };
  }

  await waitForHostRateLimit(hostLastRequestAt, pageUrl.host, options.rateLimitMs);

  const page = await context.newPage();
  try {
    await page.goto(record.url, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs,
    });

    await page.waitForSelector("#canvas", { timeout: options.timeoutMs });
    await page.waitForFunction(
      () => {
        const node = document.querySelector("#canvas");
        return Boolean(node && node.innerText && node.innerText.trim().length > 100);
      },
      { timeout: options.timeoutMs }
    );

    const extracted = await page.evaluate(() => {
      const canvas = document.querySelector("#canvas");
      const text = canvas ? canvas.innerText.replace(/\r\n/g, "\n").trimEnd() : "";

      const hwpAnchor = Array.from(document.querySelectorAll("a[href]")).find((anchor) =>
        /\/record\/HwpDownload\.do\?key=/i.test(anchor.getAttribute("href") || "")
      );

      const landingAnchor = Array.from(document.querySelectorAll("a[href]")).find((anchor) =>
        /\/kr\/assembly\/late\.do/i.test(anchor.getAttribute("href") || "")
      );

      return {
        title: (document.title || "").trim(),
        text,
        hwpUrl: hwpAnchor ? hwpAnchor.href : null,
        landingUrl: landingAnchor ? landingAnchor.href : null,
      };
    });

    if (!extracted.text) {
      throw new Error("회의록 본문 추출 실패(#canvas 비어 있음)");
    }

    const result = await persistExtractedText({
      outRoot,
      pageUrl,
      extracted,
      robotsInfo,
    });

    return {
      ok: true,
      lineNumber: record.lineNumber,
      url: record.url,
      savedFile: result.savedFile,
      metaFile: result.metaFile,
      status: result.status,
      contentSha256: result.meta.content_sha256,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      lineNumber: record.lineNumber,
      url: record.url,
      error: message,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function checkRobots(pageUrl, robotsCache) {
  if (robotsCache.has(pageUrl.host)) {
    return robotsCache.get(pageUrl.host);
  }

  const robotsUrl = `${pageUrl.protocol}//${pageUrl.host}/robots.txt`;
  try {
    const response = await fetch(robotsUrl);
    if (!response.ok) {
      const info = {
        allowed: true,
        robotsChecked: false,
        robotsUrl,
        reason: `http-${response.status}`,
      };
      robotsCache.set(pageUrl.host, info);
      return info;
    }

    const body = await response.text();
    const pathWithQuery = `${pageUrl.pathname}${pageUrl.search}`;
    const allowed = isAllowedByRobots(body, pathWithQuery);

    const info = {
      allowed,
      robotsChecked: true,
      robotsUrl,
      reason: allowed ? "allowed" : "disallowed",
    };
    robotsCache.set(pageUrl.host, info);
    return info;
  } catch {
    const info = {
      allowed: true,
      robotsChecked: false,
      robotsUrl,
      reason: "fetch-failed",
    };
    robotsCache.set(pageUrl.host, info);
    return info;
  }
}

function isAllowedByRobots(content, pathWithQuery) {
  const rules = parseRobotsRules(content);
  if (rules.length === 0) {
    return true;
  }

  let bestRule = null;
  for (const rule of rules) {
    if (!matchesRobotsPattern(rule.pattern, pathWithQuery)) {
      continue;
    }
    if (!bestRule || rule.pattern.length > bestRule.pattern.length) {
      bestRule = rule;
    }
  }

  if (!bestRule) {
    return true;
  }

  return bestRule.type !== "disallow";
}

function parseRobotsRules(content) {
  const lines = content.split(/\r?\n/u);
  const rules = [];
  let appliesToWildcard = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*/u, "").trim();
    if (!line) {
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      appliesToWildcard = value === "*";
      continue;
    }

    if (!appliesToWildcard) {
      continue;
    }

    if (key === "allow" || key === "disallow") {
      rules.push({
        type: key,
        pattern: value,
      });
    }
  }

  return rules;
}

function matchesRobotsPattern(pattern, pathWithQuery) {
  if (!pattern) {
    return false;
  }

  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
    .replace(/\*/gu, ".*")
    .replace(/\\\$/gu, "$");

  const regex = new RegExp(`^${escaped}`);
  return regex.test(pathWithQuery);
}

async function waitForHostRateLimit(hostLastRequestAt, host, rateLimitMs) {
  const last = hostLastRequestAt.get(host);
  if (typeof last === "number") {
    const elapsed = Date.now() - last;
    const waitMs = rateLimitMs - elapsed;
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }
  hostLastRequestAt.set(host, Date.now());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function persistExtractedText({ outRoot, pageUrl, extracted, robotsInfo }) {
  const hostDir = path.join(outRoot, pageUrl.hostname);
  await fsp.mkdir(hostDir, { recursive: true });

  const fileStem = buildFileStem(extracted.title, pageUrl);
  const initialTextPath = path.join(hostDir, `${fileStem}.txt`);
  const contentBuffer = Buffer.from(extracted.text, "utf8");
  const contentHash = sha256(contentBuffer);

  let textPath = initialTextPath;
  let status = "new";
  if (await fileExists(initialTextPath)) {
    const existingHash = await sha256File(initialTextPath);
    if (existingHash === contentHash) {
      status = "unchanged";
    } else {
      status = "content-changed-saved-new-copy";
      const suffix = Date.now().toString();
      textPath = path.join(hostDir, `${fileStem}_${suffix}.txt`);
      await fsp.writeFile(textPath, contentBuffer);
    }
  } else {
    await fsp.writeFile(textPath, contentBuffer);
  }

  const relativeTextPath = toPosix(path.relative(path.resolve(__dirname, "..", ".."), textPath));
  const meta = {
    source_url: pageUrl.toString(),
    landing_url: extracted.landingUrl || null,
    download_url: extracted.hwpUrl || null,
    download_method: "playwright:#canvas innerText export",
    collected_at: toKstIsoString(new Date()),
    content_sha256: contentHash,
    content_length: contentBuffer.length,
    saved_file: relativeTextPath,
    source_title: extracted.title,
    robots_checked: robotsInfo.robotsChecked,
    robots_url: robotsInfo.robotsUrl,
    license: pageUrl.hostname.endsWith(".go.kr")
      ? "KOGL Type 1 (assumed; verify per page)"
      : "unknown",
    verified_existing_file: status === "unchanged",
    status,
  };

  const metaPath = `${textPath}.meta.json`;
  await fsp.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  return {
    savedFile: relativeTextPath,
    metaFile: toPosix(path.relative(path.resolve(__dirname, "..", ".."), metaPath)),
    status,
    meta,
  };
}

function buildFileStem(title, pageUrl) {
  const normalizedTitle = (title || "record").replace(/\(\d{4}\.\d{2}\.\d{2}\.?\)/gu, "").trim();
  const safeTitle = sanitizeFileName(normalizedTitle || "record");
  const key = pageUrl.searchParams.get("key");
  const keySuffix = key
    ? key.slice(0, 12)
    : sha256(Buffer.from(pageUrl.toString(), "utf8")).slice(0, 12);
  return `${safeTitle}_${keySuffix}`;
}

function sanitizeFileName(input) {
  return input
    .replace(/[<>:"/\\|?*\u0000-\u001F]/gu, " ")
    .replace(/\s+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/[. ]+$/gu, "")
    .slice(0, 120);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function sha256File(filePath) {
  const data = await fsp.readFile(filePath);
  return sha256(data);
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function toKstIsoString(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1_000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const hour = String(kst.getUTCHours()).padStart(2, "0");
  const minute = String(kst.getUTCMinutes()).padStart(2, "0");
  const second = String(kst.getUTCSeconds()).padStart(2, "0");
  const millis = String(kst.getUTCMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millis}+09:00`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

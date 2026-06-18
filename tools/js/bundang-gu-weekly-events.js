#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const process = require("node:process");
const { URL } = require("node:url");

const { chromium } = require("playwright");
const config = require("./bundang-gu.config");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const locationText = (await fsp.readFile(config.paths.locationFile, "utf8")).trim();

  if (!locationText.includes(config.region.keyword)) {
    throw new Error(`location.txt 지역(${locationText})이 ${config.region.keyword}가 아닙니다.`);
  }

  const weekKeys = parseWeekKeys(options.weeks);
  if (weekKeys.length === 0) {
    throw new Error("최소 1개 주차 키가 필요합니다. (--weeks)");
  }

  const listItems = await collectWeeklyPosts(weekKeys, options);
  const targetItems = filterByWeeks(listItems, weekKeys);

  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const hostLastRequestAt = new Map();
  const robotsCache = new Map();

  const processed = [];
  try {
    for (const item of targetItems) {
      const one = await processOneItem({
        context,
        options,
        item,
        hostLastRequestAt,
        robotsCache,
      });
      processed.push(one);
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const validation = validateResult({ weekKeys, targetItems, processed, options });

  if (!options.dryRun) {
    await upsertMonthlyDocuments(processed, options);
  }

  const report = {
    status: validation.failedChecks.length ? "incomplete" : "complete",
    requested_week_keys: weekKeys,
    collected_week_keys: [...new Set(targetItems.map((item) => item.weekKey))],
    missing_nums: validation.missingNums,
    failed_checks: validation.failedChecks,
    total_items: targetItems.length,
    processed_items: processed.length,
    dry_run: options.dryRun,
    entries: processed.map((item) => ({
      num: item.num,
      week_key: item.weekKey,
      source_url: item.sourceUrl || null,
      preview_url: item.previewUrl || null,
      download_url: item.downloadUrl || null,
      ok: item.ok,
      error: item.error || null,
      row_count: item.rows ? item.rows.length : 0,
    })),
  };

  console.log(JSON.stringify(report, null, 2));

  if (validation.failedChecks.length) {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = {
    weeks: "",
    timeoutMs: config.defaults.timeoutMs,
    rateLimitMs: config.defaults.rateLimitMs,
    headless: config.defaults.headless,
    dryRun: false,
    migrateMode: config.defaults.migrateMode,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--weeks") {
      options.weeks = mustGetValue(args, i, arg);
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

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--migrate") {
      options.migrateMode = mustGetValue(args, i, arg);
      i += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    }

    throw new Error(`알 수 없는 인자: ${arg}`);
  }

  if (!options.weeks) {
    throw new Error("필수 인자 누락: --weeks YYYY-MM-DD~YYYY-MM-DD[, ...]");
  }

  if (!["move", "copy", "skip"].includes(options.migrateMode)) {
    throw new Error("--migrate 값은 move|copy|skip 만 허용됩니다.");
  }

  return options;
}

function printHelpAndExit() {
  console.log(
    [
      "Usage:",
      "  node tools/js/bundang-gu-weekly-events.js --weeks <range[,range...]>",
      "",
      "Options:",
      "  --weeks <csv>          ex) 2026-06-01~2026-06-07,2026-06-08~2026-06-14",
      "  --timeout-ms <number>  Navigation timeout (default: 30000)",
      "  --rate-limit-ms <n>    Per-host delay (default: 1000)",
      "  --headless <bool>      true|false (default: true)",
      "  --headed               Shortcut for --headless false",
      "  --dry-run              Validate without writing files",
      "  --migrate <mode>       move|copy|skip (default: move)",
      "  --help                 Show this help",
    ].join("\n")
  );
  process.exit(0);
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

function parseWeekKeys(raw) {
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [startRaw, endRaw] = token.split("~").map((v) => v.trim());
      const start = normalizeDate(startRaw);
      const end = normalizeDate(endRaw);
      if (!start || !end) {
        throw new Error(`주차 키 형식 오류: ${token}`);
      }
      if (end < start) {
        throw new Error(`주차 키 경계 오류: ${token}`);
      }
      return `${start}~${end}`;
    });
}

function normalizeDate(raw) {
  if (!raw) {
    return null;
  }
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!m) {
    return null;
  }
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const date = new Date(`${iso}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return iso;
}

async function collectWeeklyPosts(weekKeys, options) {
  const listUrl = new URL(config.board.listPath, config.board.baseUrl);
  const robotsInfo = await checkRobots(listUrl, new Map());
  if (!robotsInfo.allowed) {
    throw new Error("robots.txt disallow: 목록 페이지 접근 불가");
  }

  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const collected = [];

  try {
    for (let fpage = 1; fpage <= config.defaults.maxPages; fpage += 1) {
      const url = new URL(listUrl.toString());
      url.searchParams.set("fpage", String(fpage));
      url.searchParams.set("searchOpt1", "");
      url.searchParams.set("searchName", "");
      url.searchParams.set("orderby1", "b_ref");
      url.searchParams.set("orderby2", "Desc");

      await page.goto(url.toString(), {
        waitUntil: "domcontentloaded",
        timeout: options.timeoutMs,
      });

      const rows = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll("a[href*='actionMode=view'][href*='fboard=board_event1']"));
        return anchors.map((anchor) => {
          const href = anchor.getAttribute("href") || "";
          const text = (anchor.textContent || "").trim();
          const titleAttr = (anchor.getAttribute("title") || "").trim();
          const rowText = (anchor.closest("tr")?.innerText || "").replace(/\r\n/g, "\n");
          return { href, text, titleAttr, rowText };
        });
      });

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        const fullUrl = new URL(row.href, url.toString()).toString();
        const titleSource = row.titleAttr || row.text;
        const weekKey = extractWeekKey(titleSource) || extractWeekKey(row.rowText);
        const num = extractNum(fullUrl);
        if (!weekKey || !num) {
          continue;
        }

        const postDate = extractPostDate(row.rowText);
        collected.push({
          num,
          weekKey,
          postDate,
          sourceUrl: fullUrl,
          title: row.text,
        });
      }

      const hasAll = weekKeys.every((wk) => collected.some((entry) => entry.weekKey === wk));
      if (hasAll) {
        break;
      }
    }
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  return dedupeByNum(collected);
}

function extractWeekKey(text) {
  const compact = String(text || "").replace(/\s+/gu, " ").trim();

  const fullYear = compact.match(
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*[-~–]\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/u
  );
  if (fullYear) {
    const s = `${fullYear[1]}-${String(Number(fullYear[2])).padStart(2, "0")}-${String(Number(fullYear[3])).padStart(2, "0")}`;
    const e = `${fullYear[4]}-${String(Number(fullYear[5])).padStart(2, "0")}-${String(Number(fullYear[6])).padStart(2, "0")}`;
    return `${s}~${e}`;
  }

  const sameYear = compact.match(
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*[-~–]\s*(\d{1,2})월\s*(\d{1,2})일/u
  );
  if (sameYear) {
    const year = sameYear[1];
    const s = `${year}-${String(Number(sameYear[2])).padStart(2, "0")}-${String(Number(sameYear[3])).padStart(2, "0")}`;
    const e = `${year}-${String(Number(sameYear[4])).padStart(2, "0")}-${String(Number(sameYear[5])).padStart(2, "0")}`;
    return `${s}~${e}`;
  }

  const dottedSameYear = compact.match(
    /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*[-~–]\s*(\d{1,2})\.\s*(\d{1,2})\./u
  );
  if (dottedSameYear) {
    const year = dottedSameYear[1];
    const s = `${year}-${String(Number(dottedSameYear[2])).padStart(2, "0")}-${String(Number(dottedSameYear[3])).padStart(2, "0")}`;
    const e = `${year}-${String(Number(dottedSameYear[4])).padStart(2, "0")}-${String(Number(dottedSameYear[5])).padStart(2, "0")}`;
    return `${s}~${e}`;
  }

  const dottedCrossYear = compact.match(
    /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*[-~–]\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./u
  );
  if (dottedCrossYear) {
    const s = `${dottedCrossYear[1]}-${String(Number(dottedCrossYear[2])).padStart(2, "0")}-${String(Number(dottedCrossYear[3])).padStart(2, "0")}`;
    const e = `${dottedCrossYear[4]}-${String(Number(dottedCrossYear[5])).padStart(2, "0")}-${String(Number(dottedCrossYear[6])).padStart(2, "0")}`;
    return `${s}~${e}`;
  }

  return null;
}

function extractNum(url) {
  try {
    const parsed = new URL(url);
    const num = parsed.searchParams.get("num");
    return num ? String(num) : null;
  } catch {
    return null;
  }
}

function extractPostDate(text) {
  const m = text.match(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/u);
  if (!m) {
    return "";
  }
  return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}`;
}

function dedupeByNum(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!map.has(entry.num)) {
      map.set(entry.num, entry);
    }
  }
  return [...map.values()];
}

function filterByWeeks(entries, weekKeys) {
  const set = new Set(weekKeys);
  return entries.filter((entry) => set.has(entry.weekKey));
}

async function processOneItem({ context, options, item, hostLastRequestAt, robotsCache }) {
  const detailUrl = new URL(item.sourceUrl);
  let resolvedPreviewUrl = "";
  let resolvedDownloadUrl = "";
  const robotsInfo = await checkRobots(detailUrl, robotsCache);
  if (!robotsInfo.allowed) {
    return {
      ...item,
      ok: false,
      error: "robots.txt disallow",
    };
  }

  await waitForHostRateLimit(hostLastRequestAt, detailUrl.host, options.rateLimitMs);

  const page = await context.newPage();
  try {
    await page.goto(detailUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs,
    });

    let details = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));

      const download = links.find((a) => /\/fboard\/common\/download\.asp\?/i.test(a.getAttribute("href") || ""));
      const preview = links.find((a) => /\/fboard\/common\/d_view\.asp\?/i.test(a.getAttribute("href") || ""));
      const html = document.documentElement ? document.documentElement.innerHTML : "";

      const previewFallback = (html.match(/\/fboard\/common\/d_view\.asp[^"'\s<>]+/i) || [""])[0];
      const downloadFallback = (html.match(/\/fboard\/common\/download\.asp[^"'\s<>]+/i) || [""])[0];

      const getField = (name) => {
        const re = new RegExp(`${name}=([^&]+)`, "i");
        const rawPreviewHref =
          (preview ? preview.getAttribute("href") || "" : "") || previewFallback || "";
        const fromPreview = decodeURIComponent(rawPreviewHref.match(re)?.[1] || "");
        return fromPreview || "";
      };

      const normalizeHtmlUrl = (value) =>
        String(value || "")
          .replace(/&amp;/giu, "&")
          .replace(/[\r\n\t]/gu, "")
          .trim();

      return {
        downloadUrl: normalizeHtmlUrl(download ? download.getAttribute("href") || "" : downloadFallback),
        previewUrl: normalizeHtmlUrl(preview ? preview.getAttribute("href") || "" : previewFallback),
        fIdx: getField("f_idx"),
        filenameRe: getField("filename_re"),
      };
    });

    if (!details.previewUrl || !details.downloadUrl || !details.fIdx || !details.filenameRe) {
      const html = await page.content();
      const normalize = (value) => String(value || "").replace(/&amp;/giu, "&");

      if (!details.previewUrl) {
        const matched = html.match(/\/fboard\/common\/d_view\.asp[^"'\s<>]*/iu);
        if (matched) {
          details.previewUrl = normalize(matched[0]);
        }
      }

      if (!details.downloadUrl) {
        const matched = html.match(/\/fboard\/common\/download\.asp[^"'\s<>]*/iu);
        if (matched) {
          details.downloadUrl = normalize(matched[0]);
        }
      }

      if (!details.fIdx) {
        const matched = html.match(/f_idx=(\d+)/iu);
        if (matched) {
          details.fIdx = matched[1];
        }
      }

      if (!details.filenameRe) {
        const matched = html.match(/filename_re=([^&"'\s<>]+)/iu);
        if (matched) {
          details.filenameRe = decodeURIComponent(matched[1]);
        }
      }
    }

    const previewUrl =
      toAbsoluteUrl(details.previewUrl, config.board.baseUrl) ||
      buildPreviewUrl(item.num, details.filenameRe);
    const downloadUrl =
      toAbsoluteUrl(details.downloadUrl, config.board.baseUrl) ||
      buildDownloadUrl(details.fIdx);
    resolvedPreviewUrl = previewUrl;
    resolvedDownloadUrl = downloadUrl;

    if (!previewUrl) {
      throw new Error(
        `preview URL을 찾지 못했습니다. num=${item.num} details=${JSON.stringify({
          previewRaw: details.previewUrl,
          downloadRaw: details.downloadUrl,
          fIdx: details.fIdx,
          filenameRe: details.filenameRe,
        })}`
      );
    }
    if (!downloadUrl) {
      throw new Error(`download URL을 찾지 못했습니다. num=${item.num}`);
    }

    const table = await extractTableFromPreview({
      context,
      previewUrl,
      timeoutMs: options.timeoutMs,
      hostLastRequestAt,
      rateLimitMs: options.rateLimitMs,
    });
    const maskedRows = table.rows.map(maskRowPii);

    const persisted = await persistRawArtifacts({
      context,
      item,
      previewUrl,
      downloadUrl,
      fIdx: details.fIdx,
      filenameRe: details.filenameRe,
      textRows: maskedRows,
      hostLastRequestAt,
      options,
    });

    return {
      ...item,
      ok: true,
      previewUrl,
      downloadUrl,
      fIdx: persisted.fIdx,
      filenameRe: persisted.filenameRe,
      rows: maskedRows,
      savedHwp: persisted.savedHwp,
      savedMeta: persisted.savedMeta,
    };
  } catch (error) {
    return {
      ...item,
      ok: false,
      previewUrl: resolvedPreviewUrl || null,
      downloadUrl: resolvedDownloadUrl || null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function buildPreviewUrl(num, filenameRe) {
  if (!num || !filenameRe) {
    return "";
  }

  const encoded = encodeURIComponent(filenameRe);
  return `${config.board.baseUrl}/fboard/common/d_view.asp?cIdx=${config.board.cIdx}&fboard=${config.board.id}&num=${encodeURIComponent(num)}&actionMode=download&filename_re=${encoded}`;
}

function buildDownloadUrl(fIdx) {
  if (!fIdx) {
    return "";
  }
  return `${config.board.baseUrl}/fboard/common/download.asp?fboard=${config.board.id}&f_idx=${encodeURIComponent(fIdx)}`;
}

async function extractTableFromPreview({ context, previewUrl, timeoutMs, hostLastRequestAt, rateLimitMs }) {
  const page = await context.newPage();
  try {
    const previewHost = new URL(previewUrl).host;
    await waitForHostRateLimit(hostLastRequestAt, previewHost, rateLimitMs);
    await page.goto(previewUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const started = Date.now();
    let rows = [];

    while (Date.now() - started < timeoutMs) {
      const frames = page.frames();
      const frame =
        frames.find((candidate) => /\.view\.xhtml/i.test(candidate.url())) ||
        frames.find((candidate) => /view\.xhtml|fileupload\/result/i.test(candidate.url()));

      if (!frame) {
        await page.waitForTimeout(300);
        continue;
      }

      rows = await frame
        .evaluate(() => {
          const tableRows = Array.from(document.querySelectorAll("table tr"));
          return tableRows
            .map((tr) =>
              Array.from(tr.querySelectorAll("th,td")).map((cell) =>
                (cell.innerText || "").replace(/\s+/g, " ").trim()
              )
            )
            .filter((cells) => cells.length >= 3);
        })
        .catch(() => []);

      if (rows.length > 0) {
        break;
      }
      await page.waitForTimeout(300);
    }

    if (rows.length === 0) {
      throw new Error("preview table 파싱 결과가 비어 있습니다.");
    }

    const normalized = normalizeRows(rows);
    return { rows: normalized };
  } finally {
    await page.close().catch(() => {});
  }
}

function normalizeRows(rawRows) {
  const out = [];
  for (const cells of rawRows) {
    if (cells.length < 3) {
      continue;
    }

    if (/일시|시간|행사명|대상|장소|주관|비고/u.test(cells.join(" "))) {
      continue;
    }

    const padded = [...cells, "", "", "", "", "", ""];
    out.push({
      dateTime: padded[0],
      time: padded[1],
      eventName: padded[2],
      target: padded[3],
      place: padded[4],
      host: padded[5],
      note: padded[6],
    });
  }
  return out;
}

function maskRowPii(row) {
  const note = String(row.note || "");
  const hasDeptPhone = config.pii.deptPhonePattern.test(note);
  config.pii.deptPhonePattern.lastIndex = 0;

  if (hasDeptPhone) {
    return row;
  }

  let masked = note
    .replace(config.pii.extensionPattern, "〔담당자〕")
    .replace(config.pii.personalPattern, (m) => {
      if (m.includes("과") || m.includes("팀") || m.includes("동")) {
        return m;
      }
      return "〔담당자〕";
    })
    .replace(/〔담당자〕\s*〔담당자〕/gu, "〔담당자〕")
    .trim();

  if (!masked && note) {
    masked = "〔담당자〕";
  }

  return {
    ...row,
    note: masked || row.note,
  };
}

async function persistRawArtifacts({ context, item, previewUrl, downloadUrl, fIdx, filenameRe, textRows, hostLastRequestAt, options }) {
  const hostDir = path.join(config.paths.downloadRoot, config.board.host);
  const legacyDir = path.join(hostDir, config.board.id);

  await fsp.mkdir(hostDir, { recursive: true });
  if (options.migrateMode !== "skip") {
    await migrateLegacyFiles(legacyDir, hostDir, options.migrateMode);
  }

  const resolvedFIdx = String(fIdx || extractQueryParam(downloadUrl, "f_idx") || item.num);
  const resolvedFile = sanitizeFileName(filenameRe || `weekly_${item.num}.hwp`);
  const stem = `${config.board.id}_${resolvedFIdx}_${resolvedFile.replace(/\.hwp$/iu, "")}`;

  const hwpPath = path.join(hostDir, `${stem}.hwp`);
  const metaPath = `${hwpPath}.meta.json`;

  let hwpBuffer = null;
  if (!options.dryRun) {
    const downloadHost = new URL(downloadUrl).host;
    await waitForHostRateLimit(hostLastRequestAt, downloadHost, options.rateLimitMs);
    hwpBuffer = await downloadBinary(downloadUrl, context, item.sourceUrl);
    if (!(await fileExists(hwpPath))) {
      await fsp.writeFile(hwpPath, hwpBuffer);
    }
  }

  const now = toKstIsoString(new Date());
  let existingMeta = {};
  if (await fileExists(metaPath)) {
    try {
      existingMeta = JSON.parse(await fsp.readFile(metaPath, "utf8"));
    } catch {
      existingMeta = {};
    }
  }

  const hash = hwpBuffer ? sha256(hwpBuffer) : existingMeta.sha256 || "";
  const meta = {
    board: config.board.id,
    num: item.num,
    f_idx: resolvedFIdx,
    filename_re: filenameRe || "",
    week_key: item.weekKey,
    source_page_url: item.sourceUrl,
    source_url: downloadUrl,
    preview_url: previewUrl,
    extraction_method: "preview-view.xhtml",
    row_count: textRows.length,
    collected_at: now,
    sha256: hash,
  };

  if (!options.dryRun) {
    await fsp.writeFile(metaPath, `${JSON.stringify({ ...existingMeta, ...meta }, null, 2)}\n`, "utf8");
  }

  return {
    fIdx: resolvedFIdx,
    filenameRe: filenameRe || "",
    savedHwp: toPosix(path.relative(REPO_ROOT, hwpPath)),
    savedMeta: toPosix(path.relative(REPO_ROOT, metaPath)),
  };
}

async function migrateLegacyFiles(legacyDir, hostDir, mode) {
  if (!(await fileExists(legacyDir))) {
    return;
  }

  const entries = await fsp.readdir(legacyDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const src = path.join(legacyDir, entry.name);
    const dst = path.join(hostDir, entry.name);
    if (await fileExists(dst)) {
      continue;
    }

    if (mode === "move") {
      await fsp.rename(src, dst);
      continue;
    }

    if (mode === "copy") {
      await fsp.copyFile(src, dst);
    }
  }
}

function extractQueryParam(urlText, key) {
  try {
    const parsed = new URL(urlText);
    return parsed.searchParams.get(key);
  } catch {
    return null;
  }
}

function toAbsoluteUrl(value, baseUrl) {
  const raw = String(value || "")
    .replace(/[\r\n\t]/gu, " ")
    .trim()
    .split(/\s+/u)[0];

  if (!raw) {
    return "";
  }
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return "";
  }
}

async function downloadBinary(url, context, referer) {
  if (context?.request) {
    const response = await context.request.get(url, {
      timeout: config.defaults.timeoutMs,
      headers: {
        Referer: referer || config.board.baseUrl,
      },
    });
    if (!response.ok()) {
      throw new Error(`원본 다운로드 실패(${response.status()}): ${url}`);
    }
    return Buffer.from(await response.body());
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(config.defaults.timeoutMs),
    headers: {
      Referer: referer || config.board.baseUrl,
    },
  });
  if (!response.ok) {
    throw new Error(`원본 다운로드 실패(${response.status}): ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function upsertMonthlyDocuments(processed, options) {
  const grouped = new Map();

  for (const item of processed) {
    if (!item.ok) {
      continue;
    }

    const month = item.weekKey.slice(0, 7);
    if (!grouped.has(month)) {
      grouped.set(month, []);
    }
    grouped.get(month).push(item);
  }

  for (const [month, items] of grouped.entries()) {
    const outPath = path.join(config.paths.resultRoot, `${month} ${config.region.shortName} 주간행사계획.md`);
    await fsp.mkdir(path.dirname(outPath), { recursive: true });

    const next = buildMonthMarkdown(month, items);

    if (await fileExists(outPath)) {
      const bakPath = `${outPath}.bak`;
      await fsp.copyFile(outPath, bakPath);
    }

    await fsp.writeFile(outPath, next, "utf8");
  }
}

function buildMonthMarkdown(month, items) {
  const sorted = [...items].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  const lines = [];

  lines.push("<!--");
  lines.push("source_type: weekly_event_plan");
  lines.push(`region: ${config.region.fullName}`);
  lines.push(`board_url: ${new URL(config.board.listPath, config.board.baseUrl).toString()}`);
  lines.push(`collected_at: ${toKstIsoString(new Date())}`);
  lines.push("pii_note: 비고 컬럼 담당자 실명·개인 내선번호 마스킹(〔담당자〕); 부서 대표 연락처 비마스킹");
  lines.push("status: complete");
  lines.push("-->");
  lines.push("");
  lines.push(`# ${config.region.shortName} 주간행사계획 (${month})`);
  lines.push("");
  lines.push("## 게시된 주간행사계획 목록");
  lines.push("");
  lines.push("| 게시번호 | 기간 | 게시일 | 원문 HWP | 뷰어 |");
  lines.push("|---|---|---|---|---|");
  for (const item of sorted) {
    const [start, end] = item.weekKey.split("~");
    lines.push(`| ${item.num} | ${start} ~ ${end} | ${item.postDate || ""} | [다운로드](${item.downloadUrl}) | [미리보기](${item.previewUrl}) |`);
  }

  for (const item of sorted) {
    const [start, end] = item.weekKey.split("~");
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(`## 주간행사 상세 — ${start} ~ ${end} (num=${item.num})`);
    lines.push("");
    lines.push("| 일시 | 시간 | 행사명 | 대상 | 장소 | 주관 | 비고 |");
    lines.push("|---|---|---|---|---|---|---|");

    for (const row of item.rows) {
      lines.push(
        `| ${escapeCell(row.dateTime)} | ${escapeCell(row.time)} | ${escapeCell(row.eventName)} | ${escapeCell(row.target)} | ${escapeCell(row.place)} | ${escapeCell(row.host)} | ${escapeCell(row.note)} |`
      );
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function escapeCell(value) {
  return String(value || "").replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ").trim();
}

function validateResult({ weekKeys, targetItems, processed, options }) {
  const failedChecks = [];
  const missingNums = [];

  if (!weekKeys.every((wk) => /^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$/u.test(wk))) {
    failedChecks.push("V0_invalid_week_key_format");
  }

  const collectedWeekSet = new Set(targetItems.map((item) => item.weekKey));
  if (collectedWeekSet.size !== weekKeys.length) {
    failedChecks.push("V1_list_count_mismatch");
  }

  const okItems = processed.filter((item) => item.ok);
  if (okItems.length !== targetItems.length) {
    failedChecks.push("V2_detail_count_mismatch");
  }

  const numSetList = new Set(targetItems.map((item) => item.num));
  const numSetDetail = new Set(okItems.map((item) => item.num));
  if (numSetList.size !== numSetDetail.size || [...numSetList].some((num) => !numSetDetail.has(num))) {
    failedChecks.push("V3_num_set_mismatch");
  }

  if ([...new Set(weekKeys)].some((wk) => !collectedWeekSet.has(wk))) {
    failedChecks.push("V4_week_key_mismatch");
  }

  if (okItems.some((item) => item.rows.some((row) => /주무관|담당자\s*[:]?\s*[가-힣]{2,4}/u.test(row.note)))) {
    failedChecks.push("V5_pii_unmasked");
  }

  if (okItems.some((item) => item.rows.some((row) => /031-\d{3,4}-\d{4}/u.test(row.note) && /〔담당자〕/u.test(row.note)))) {
    failedChecks.push("V6_dept_phone_masked");
  }

  const duplicateNum = hasDuplicate(okItems.map((item) => item.num));
  const duplicateWeek = hasDuplicate(okItems.map((item) => item.weekKey));
  if (duplicateNum || duplicateWeek) {
    failedChecks.push("V7_duplicate_num_or_week");
  }

  for (const item of okItems) {
    if (!item.savedHwp || !item.savedMeta) {
      missingNums.push(item.num);
    }

    if (!options.dryRun) {
      const hwpAbs = path.resolve(REPO_ROOT, item.savedHwp || "");
      const metaAbs = path.resolve(REPO_ROOT, item.savedMeta || "");
      if (!(fs.existsSync(hwpAbs) && fs.existsSync(metaAbs))) {
        missingNums.push(item.num);
      }
      if (hwpAbs.includes(`${path.sep}${config.board.id}${path.sep}`)) {
        failedChecks.push("V8_legacy_subfolder_detected");
      }
    }
  }

  if (missingNums.length > 0) {
    failedChecks.push("V8_missing_hwp_or_meta");
  }

  return {
    failedChecks: [...new Set(failedChecks)],
    missingNums: [...new Set(missingNums)],
  };
}

function hasDuplicate(values) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      return true;
    }
    seen.add(value);
  }
  return false;
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

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFileName(input) {
  return String(input || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/gu, " ")
    .replace(/\s+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .replace(/[. ]+$/gu, "")
    .slice(0, 120);
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

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

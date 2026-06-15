#!/usr/bin/env node

const process = require("node:process");

const COUNCiL_ID = "SEONGNAM";
const TH = 9;
const DEFAULT_YEARS = [2023, 2024, 2025];
const STANDING_COMMITTEES = new Set([
  "의회운영위원회",
  "행정교육위원회",
  "경제환경위원회",
  "문화복지체육위원회",
  "도시건설위원회",
]);

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const years = options.years.length > 0 ? options.years : DEFAULT_YEARS;

  const rows = [];
  for (const year of years) {
    const sessionInfo = await fetchSessionYearList(year);
    const session = pickRegularSession(sessionInfo, year);
    const committees = await fetchCommitteeList(session.session);

    for (const committee of committees) {
      if (!STANDING_COMMITTEES.has(committee.title)) {
        continue;
      }

      const orders = await fetchOrderList(session.session, committee.code);
      for (const order of orders) {
        const key = extractRecordKey(order.title);
        if (!key) {
          continue;
        }

        const turn = stripHtml(order.title)
          .replace(/\(.*/u, "")
          .trim();

        rows.push({
          url: `https://www.sncouncil.go.kr/record/recordView.do?key=${key}`,
          year,
          round: `제${session.session}회`,
          meeting: committee.title,
          turn,
          round_type: session.sessionTypeRaw,
          session: session.session,
          committee_code: committee.code,
        });
      }
    }
  }

  for (const row of rows) {
    console.log(JSON.stringify(row));
  }
}

function parseArgs(args) {
  const options = { years: [] };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--year" || arg === "-y") {
      options.years.push(parseYear(mustGetValue(args, i, arg)));
      i += 1;
      continue;
    }
    if (arg === "--years") {
      const values = mustGetValue(args, i, arg)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map(parseYear);
      options.years.push(...values);
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    }

    throw new Error(`알 수 없는 인자: ${arg}`);
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

function parseYear(value) {
  const year = Number.parseInt(value, 10);
  if (!Number.isInteger(year) || year < 2000) {
    throw new Error(`연도 값이 잘못됨: ${value}`);
  }
  return year;
}

function printHelpAndExit() {
  console.log(
    [
      "Usage:",
      "  node tools/js/sncouncil-audit-url-collector.js [--year YYYY | --years YYYY,YYYY]",
      "",
      "Output:",
      "  JSONL to stdout",
    ].join("\n")
  );
  process.exit(0);
}

async function fetchSessionYearList(year) {
  const url = new URL("https://www.sncouncil.go.kr/record/sessionYearList.do");
  url.searchParams.set("councilId", COUNCiL_ID);
  url.searchParams.set("year", String(year));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`sessionYearList 실패(${year}): ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`sessionYearList 형식 오류(${year})`);
  }

  return data;
}

function pickRegularSession(items, year) {
  const sessions = items
    .map((item) => parseSessionNode(item))
    .filter(Boolean)
    .filter((item) => item.sessionTypeRaw.includes("정례회"));

  if (sessions.length === 0) {
    throw new Error(`정례회 없음: ${year}`);
  }

  sessions.sort((left, right) => left.session - right.session);
  return sessions[sessions.length - 1];
}

function parseSessionNode(item) {
  if (!item || typeof item.title !== "string") {
    return null;
  }

  const match = item.title.match(
    /^제(?<session>\d+)회\[(?<sessionType>[^\]]+)\]\((?<start>\d{4}\.\d{2}\.\d{2}\.?)\s*~\s*(?<end>\d{4}\.\d{2}\.\d{2}\.?)\)$/u
  );
  if (!match || !match.groups) {
    return null;
  }

  return {
    session: Number.parseInt(match.groups.session, 10),
    sessionTypeRaw: match.groups.sessionType.trim(),
  };
}

async function fetchCommitteeList(session) {
  const url = new URL("https://www.sncouncil.go.kr/record/committeeList.do");
  url.searchParams.set("councilId", COUNCiL_ID);
  url.searchParams.set("th", String(TH));
  url.searchParams.set("session", String(session));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`committeeList 실패(${session}): ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`committeeList 형식 오류(${session})`);
  }

  return data
    .map((item) => ({
      title: String(item.title || "").trim(),
      code: String(item.code || "").trim(),
    }))
    .filter((item) => item.title && item.code);
}

async function fetchOrderList(session, code) {
  const url = new URL("https://www.sncouncil.go.kr/record/orderList.do");
  url.searchParams.set("councilId", COUNCiL_ID);
  url.searchParams.set("th", String(TH));
  url.searchParams.set("session", String(session));
  url.searchParams.set("code", code);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`orderList 실패(${session}/${code}): ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`orderList 형식 오류(${session}/${code})`);
  }

  return data
    .map((item) => ({
      title: String(item.title || "").trim(),
    }))
    .filter((item) => item.title);
}

function extractRecordKey(html) {
  const match = String(html || "").match(/recordView\.do\?key=([a-f0-9]+)/iu);
  return match ? match[1] : null;
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .trim();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
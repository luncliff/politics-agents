const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

module.exports = {
  region: {
    keyword: "분당구",
    fullName: "대한민국 경기도 성남시 분당구",
    shortName: "분당구",
  },
  board: {
    id: "board_event1",
    cIdx: "329",
    host: "www.bundang-gu.go.kr",
    baseUrl: "https://www.bundang-gu.go.kr:10009",
    listPath: "/sub/content.asp?cIdx=329&fboard=board_event1",
  },
  paths: {
    locationFile: path.join(REPO_ROOT, "location.txt"),
    downloadRoot: path.join(REPO_ROOT, "보관함", "다운로드"),
    resultRoot: path.join(REPO_ROOT, "보관함", "결과"),
  },
  defaults: {
    timeoutMs: 30_000,
    rateLimitMs: 1_000,
    maxPages: 40,
    headless: true,
    migrateMode: "move",
  },
  pii: {
    deptPhonePattern: /\b0\d{1,2}-\d{3,4}-\d{4}\b/gu,
    extensionPattern: /(?:내선|☎|Tel|tel)\s*[:.]?\s*\d{3,4}/gu,
    personalPattern: /[가-힣]{2,4}\s*(?:주무관|담당|담당자|팀장|과장)?/gu,
  },
};

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dataDirectory = fileURLToPath(new URL("./data/", import.meta.url));
const reportsPath = fileURLToPath(new URL("./data/reports.json", import.meta.url));
const sessionCookie = "printcare_admin_session";
const sessionDuration = 8 * 60 * 60 * 1000;
const passwordSalt = randomBytes(16);
const sessions = new Map();
const statuses = ["확인 대기", "확인 중", "해결 완료"];
let writeQueue = Promise.resolve();

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function readAdminPassword() {
  if (process.env.REPORT_ADMIN_PASSWORD) return process.env.REPORT_ADMIN_PASSWORD;
  for (const filename of [".env.local", ".env"]) {
    try {
      const contents = await readFile(new URL(`./${filename}`, import.meta.url), "utf8");
      const assignment = contents.split(/\r?\n/).find((line) => line.trimStart().startsWith("REPORT_ADMIN_PASSWORD="));
      if (!assignment) continue;
      let value = assignment.slice(assignment.indexOf("=") + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value) return value;
    } catch {
      // The secure input may not have been configured on this machine yet.
    }
  }
  return "";
}

async function readReportsFile() {
  try {
    const value = JSON.parse(await readFile(reportsPath, "utf8"));
    if (!Array.isArray(value)) throw new Error("신고 데이터 형식이 올바르지 않습니다.");
    return value;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function getReports() {
  await writeQueue;
  return readReportsFile();
}

function updateReports(mutate) {
  const operation = writeQueue.then(async () => {
    const reports = await readReportsFile();
    const result = mutate(reports);
    if (result === null) return null;
    await mkdir(dataDirectory, { recursive: true });
    const temporaryPath = `${reportsPath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(reports, null, 2), "utf8");
    await rename(temporaryPath, reportsPath);
    return result;
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function addReport(report) {
  return updateReports((reports) => {
    reports.unshift(report);
    return report;
  });
}

function editReport(id, changes) {
  return updateReports((reports) => {
    const report = reports.find((item) => item.id === id);
    if (!report) return null;
    Object.assign(report, changes, { updatedAt: new Date().toISOString() });
    return report;
  });
}

function removeReport(id) {
  return updateReports((reports) => {
    const index = reports.findIndex((item) => item.id === id);
    if (index === -1) return null;
    return reports.splice(index, 1)[0];
  });
}

async function readJSONBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 12_000) throw httpError(413, "요청 내용이 너무 큽니다.");
    chunks.push(chunk);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw httpError(400, "요청 형식이 올바르지 않습니다.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError(400, "요청 형식이 올바르지 않습니다.");
  return body;
}

function sendJSON(response, statusCode, value, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(value));
}

function readSession(request) {
  const token = request.headers.cookie?.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
  const expiresAt = token && sessions.get(token);
  if (!expiresAt) return null;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return token;
}

function validateReportChanges(body) {
  const changes = {};
  if ("deviceNumber" in body) {
    const deviceNumber = Number(body.deviceNumber);
    if (!Number.isInteger(deviceNumber) || deviceNumber < 1 || deviceNumber > 10) throw httpError(400, "기기 번호는 1번부터 10번까지 선택해 주세요.");
    changes.deviceNumber = deviceNumber;
  }
  if ("symptom" in body) {
    if (typeof body.symptom !== "string" || !body.symptom.trim() || body.symptom.trim().length > 100) throw httpError(400, "문제 유형을 확인해 주세요.");
    changes.symptom = body.symptom.trim();
  }
  if ("description" in body) {
    if (typeof body.description !== "string" || !body.description.trim() || body.description.trim().length > 500) throw httpError(400, "상황 설명을 확인해 주세요.");
    changes.description = body.description.trim();
  }
  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length > 40) throw httpError(400, "이름 또는 별명을 확인해 주세요.");
    changes.name = body.name.trim();
  }
  if ("status" in body) {
    if (!statuses.includes(body.status)) throw httpError(400, "처리 상태를 확인해 주세요.");
    changes.status = body.status;
  }
  if (!Object.keys(changes).length) throw httpError(400, "변경할 항목이 없습니다.");
  return changes;
}

function adminCookie(request, token, maxAge) {
  const localHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(request.headers.host || "");
  return `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${localHost ? "" : "; Secure"}`;
}

function comparePassword(input, expected) {
  const inputHash = scryptSync(input, passwordSalt, 64);
  const expectedHash = scryptSync(expected, passwordSalt, 64);
  return timingSafeEqual(inputHash, expectedHash);
}

async function handleAPI(request, response) {
  const url = new URL(request.url || "/", "http://localhost");
  const { pathname } = url;

  if (pathname === "/api/admin/session" && request.method === "GET") {
    sendJSON(response, 200, { authenticated: Boolean(readSession(request)) });
    return true;
  }

  if (pathname === "/api/admin/login" && request.method === "POST") {
    const body = await readJSONBody(request);
    if (typeof body.password !== "string" || body.password.length > 256) throw httpError(400, "비밀번호를 확인해 주세요.");
    const expectedPassword = await readAdminPassword();
    if (!expectedPassword) throw httpError(503, "서버에 관리자 비밀번호가 설정되지 않았습니다.");
    if (!comparePassword(body.password, expectedPassword)) throw httpError(401, "비밀번호가 맞지 않습니다.");
    const token = randomBytes(32).toString("hex");
    sessions.set(token, Date.now() + sessionDuration);
    sendJSON(response, 200, { authenticated: true }, { "Set-Cookie": adminCookie(request, token, sessionDuration / 1000) });
    return true;
  }

  if (pathname === "/api/admin/logout" && request.method === "POST") {
    const token = readSession(request);
    if (token) sessions.delete(token);
    sendJSON(response, 200, { authenticated: false }, { "Set-Cookie": adminCookie(request, "", 0) });
    return true;
  }

  if (pathname === "/api/reports" && request.method === "GET") {
    sendJSON(response, 200, await getReports());
    return true;
  }

  if (pathname === "/api/reports" && request.method === "POST") {
    if (!request.headers["content-type"]?.includes("application/json")) throw httpError(415, "JSON 형식으로 보내주세요.");
    const body = await readJSONBody(request);
    const changes = validateReportChanges({
      deviceNumber: body.deviceNumber,
      symptom: body.symptom,
      description: body.description,
      name: body.name || "",
    });
    const report = {
      id: randomUUID(),
      ...changes,
      status: "확인 대기",
      createdAt: new Date().toISOString(),
    };
    await addReport(report);
    sendJSON(response, 201, report);
    return true;
  }

  const reportMatch = pathname.match(/^\/api\/reports\/([\w-]+)$/);
  if (reportMatch && ["PATCH", "DELETE"].includes(request.method)) {
    if (!readSession(request)) throw httpError(401, "관리자 로그인이 필요합니다.");
    const id = reportMatch[1];
    if (request.method === "DELETE") {
      const removed = await removeReport(id);
      if (!removed) throw httpError(404, "신고를 찾을 수 없습니다.");
      sendJSON(response, 200, { deleted: true });
      return true;
    }
    if (!request.headers["content-type"]?.includes("application/json")) throw httpError(415, "JSON 형식으로 보내주세요.");
    const changes = validateReportChanges(await readJSONBody(request));
    const updated = await editReport(id, changes);
    if (!updated) throw httpError(404, "신고를 찾을 수 없습니다.");
    sendJSON(response, 200, updated);
    return true;
  }

  if (pathname.startsWith("/api/")) {
    sendJSON(response, 405, { error: "허용되지 않은 요청입니다." });
    return true;
  }
  return false;
}

export default {
  plugins: [{
    name: "printcare-reports-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || "/", "http://localhost").pathname;
        if (!pathname.startsWith("/api/")) return next();
        try {
          if (!await handleAPI(request, response)) return next();
        } catch (error) {
          sendJSON(response, error.statusCode || 500, { error: error.statusCode ? error.message : "서버에서 처리하지 못했습니다." });
        }
      });
    },
  }],
};

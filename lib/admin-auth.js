import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { apiError } from "./api-utils.js";

const cookieName = "printcare_admin_session";
const sessionLengthMs = 8 * 60 * 60 * 1000;

function passwordHash(value) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left, right) {
  const leftHash = passwordHash(left);
  const rightHash = passwordHash(right);
  return timingSafeEqual(leftHash, rightHash);
}

function getPassword() {
  const password = process.env.REPORT_ADMIN_PASSWORD;
  if (!password) throw apiError(503, "Vercel에 REPORT_ADMIN_PASSWORD 환경 변수를 설정해 주세요.", true);
  return password;
}

function sign(payload, password) {
  return createHmac("sha256", password).update(`wow-printcare-admin-v1.${payload}`).digest("base64url");
}

function cookieToken(request) {
  const cookies = request.headers.cookie || "";
  const entry = cookies.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`));
  return entry ? entry.slice(cookieName.length + 1) : "";
}

export function setAdminSession(request, response) {
  const password = getPassword();
  const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + sessionLengthMs })).toString("base64url");
  const token = `${payload}.${sign(payload, password)}`;
  const host = (request.headers.host || "").split(":")[0];
  const secure = ["localhost", "127.0.0.1"].includes(host) ? "" : "; Secure";
  response.setHeader("Set-Cookie", `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionLengthMs / 1000}${secure}`);
}

export function clearAdminSession(request, response) {
  const host = (request.headers.host || "").split(":")[0];
  const secure = ["localhost", "127.0.0.1"].includes(host) ? "" : "; Secure";
  response.setHeader("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

export function checkAdminPassword(value) {
  const password = getPassword();
  if (typeof value !== "string" || value.length > 256 || !safeEqual(value, password)) {
    throw apiError(401, "비밀번호가 맞지 않습니다.");
  }
}

export function isAdminSessionValid(request) {
  try {
    const password = getPassword();
    const token = cookieToken(request);
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return false;
    const expected = sign(payload, password);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return false;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(session.expiresAt) && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(request) {
  if (!isAdminSessionValid(request)) throw apiError(401, "관리자 로그인이 필요합니다.");
}

import { apiError } from "./api-utils.js";

export async function supabaseRequest(path, { method = "GET", body, prefer } = {}) {
  const projectURL = process.env.SUPABASE_URL?.replace(/\/$/, "");
 const serviceKey =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!projectURL || !serviceKey) {
    throw apiError(503, "Vercel의 Supabase 환경 변수를 설정해 주세요.", true);
  }

  const headers = {
    apikey: serviceKey,
    Accept: "application/json",
  };
  if (!serviceKey.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }
  
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;

  let response;
  try {
    response = await fetch(`${projectURL}/rest/v1/${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw apiError(502, "Supabase에 연결하지 못했습니다.", true);
  }

  const text = await response.text();
  if (!response.ok) throw apiError(502, "Supabase 요청이 실패했습니다. 프로젝트 설정과 SQL 표를 확인해 주세요.", true);
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    throw apiError(502, "Supabase에서 올바른 응답을 받지 못했습니다.", true);
  }
}

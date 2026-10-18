import { requireAdmin } from "../lib/admin-auth.js";
import { apiError, readBody, sendError, sendJSON } from "../lib/api-utils.js";
import { validateReport, toClientReport } from "../lib/report-validation.js";
import { supabaseRequest } from "../lib/supabase.js";

function getReportId(request) {
  const url = new URL(request.url || "/api/reports", `https://${request.headers.host || "localhost"}`);
  const id = url.searchParams.get("id") || request.query?.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw apiError(400, "신고 번호가 올바르지 않습니다.");
  return id;
}

export default async function reportsAPI(request, response) {
  try {
    if (request.method === "GET") {
      const rows = await supabaseRequest("reports?select=*&order=created_at.desc");
      sendJSON(response, 200, rows.map(toClientReport));
      return;
    }

    if (request.method === "POST") {
      const changes = validateReport(readBody(request), { allowStatus: false });
      const rows = await supabaseRequest("reports", {
        method: "POST",
        body: changes,
        prefer: "return=representation",
      });
      if (!rows.length) throw apiError(502, "신고를 저장하지 못했습니다.", true);
      sendJSON(response, 201, toClientReport(rows[0]));
      return;
    }

    if (request.method === "PATCH") {
      requireAdmin(request);
      const id = getReportId(request);
      const changes = validateReport(readBody(request), { partial: true, allowStatus: true });
      const rows = await supabaseRequest(`reports?id=eq.${encodeURIComponent(id)}&select=*`, {
        method: "PATCH",
        body: { ...changes, updated_at: new Date().toISOString() },
        prefer: "return=representation",
      });
      if (!rows.length) throw apiError(404, "신고를 찾을 수 없습니다.");
      sendJSON(response, 200, toClientReport(rows[0]));
      return;
    }

    if (request.method === "DELETE") {
      requireAdmin(request);
      const id = getReportId(request);
      const rows = await supabaseRequest(`reports?id=eq.${encodeURIComponent(id)}&select=id`, {
        method: "DELETE",
        prefer: "return=representation",
      });
      if (!rows.length) throw apiError(404, "신고를 찾을 수 없습니다.");
      sendJSON(response, 200, { deleted: true });
      return;
    }

    response.setHeader("Allow", "GET, POST, PATCH, DELETE");
    sendJSON(response, 405, { error: "허용되지 않은 요청입니다." });
  } catch (error) {
    sendError(response, error);
  }
}

import { checkAdminPassword, setAdminSession } from "../../lib/admin-auth.js";
import { readBody, sendError, sendJSON } from "../../lib/api-utils.js";

export default async function adminLogin(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJSON(response, 405, { error: "허용되지 않은 요청입니다." });
    return;
  }
  try {
    const body = readBody(request);
    if (typeof body.password !== "string" || body.password.length > 256) {
      sendJSON(response, 400, { error: "비밀번호를 확인해 주세요." });
      return;
    }
    checkAdminPassword(body.password);
    setAdminSession(request, response);
    sendJSON(response, 200, { authenticated: true });
  } catch (error) {
    sendError(response, error);
  }
}

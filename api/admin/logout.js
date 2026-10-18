import { clearAdminSession } from "../../lib/admin-auth.js";
import { sendJSON } from "../../lib/api-utils.js";

export default function adminLogout(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJSON(response, 405, { error: "허용되지 않은 요청입니다." });
    return;
  }
  clearAdminSession(request, response);
  sendJSON(response, 200, { authenticated: false });
}

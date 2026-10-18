import { isAdminSessionValid } from "../../lib/admin-auth.js";
import { sendJSON } from "../../lib/api-utils.js";

export default function adminSession(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJSON(response, 405, { error: "허용되지 않은 요청입니다." });
    return;
  }
  sendJSON(response, 200, { authenticated: isAdminSessionValid(request) });
}

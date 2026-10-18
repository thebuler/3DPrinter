export function apiError(statusCode, message, expose = statusCode < 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = expose;
  return error;
}

export function sendJSON(response, statusCode, body) {
  response.setHeader("Cache-Control", "no-store");
  response.status(statusCode).json(body);
}

export function sendError(response, error) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = error.expose ? error.message : "서버에서 요청을 처리하지 못했습니다.";
  sendJSON(response, statusCode, { error: message });
}

export function readBody(request) {
  if (request.body && typeof request.body === "object" && !Array.isArray(request.body)) return request.body;
  if (typeof request.body === "string") {
    try {
      const body = JSON.parse(request.body);
      if (body && typeof body === "object" && !Array.isArray(body)) return body;
    } catch {
      // Return the same invalid-body error for malformed and non-object JSON.
    }
  }
  throw apiError(400, "요청 형식이 올바르지 않습니다.");
}

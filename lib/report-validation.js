import { apiError } from "./api-utils.js";

export const reportStatuses = ["확인 대기", "확인 중", "해결 완료"];

export function validateReport(body, { partial = false, allowStatus = false } = {}) {
  const changes = {};
  if (!partial || "deviceNumber" in body) {
    const deviceNumber = Number(body.deviceNumber);
    if (!Number.isInteger(deviceNumber) || deviceNumber < 1 || deviceNumber > 10) throw apiError(400, "기기 번호는 1번부터 10번까지 선택해 주세요.");
    changes.device_number = deviceNumber;
  }
  if (!partial || "symptom" in body) {
    if (typeof body.symptom !== "string" || !body.symptom.trim() || body.symptom.trim().length > 100) throw apiError(400, "문제 유형을 확인해 주세요.");
    changes.symptom = body.symptom.trim();
  }
  if (!partial || "description" in body) {
    if (typeof body.description !== "string" || !body.description.trim() || body.description.trim().length > 500) throw apiError(400, "상황 설명을 확인해 주세요.");
    changes.description = body.description.trim();
  }
  if (!partial || "name" in body) {
    const name = body.name ?? "";
    if (typeof name !== "string" || name.trim().length > 40) throw apiError(400, "이름 또는 별명을 확인해 주세요.");
    changes.name = name.trim();
  }
  if (allowStatus && "status" in body) {
    if (!reportStatuses.includes(body.status)) throw apiError(400, "처리 상태를 확인해 주세요.");
    changes.status = body.status;
  }
  if (!Object.keys(changes).length) throw apiError(400, "변경할 항목이 없습니다.");
  return changes;
}

export function toClientReport(row) {
  return {
    id: row.id,
    deviceNumber: row.device_number,
    symptom: row.symptom,
    description: row.description,
    name: row.name || "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}

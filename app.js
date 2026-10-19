const printerSelect = document.querySelector("#printer-select");
const reportDeviceNumber = document.querySelector("#report-device-number");
const reportForm = document.querySelector("#report-form");
const reportDescription = document.querySelector("#report-description");
const buildVolumes = {
  K1C: { label: "Creality K1C", size: "220 × 220 × 250", source: "https://www.creality.com/products/k1c-carbon-3d-printer" },
  "K1 Max": { label: "Creality K1 MAX", size: "300 × 300 × 300", source: "https://www.creality.com/products/creality-k1-max-3d-printer" },
  "K2 Pro Combo": { label: "Creality K2 Pro Combo", size: "300 × 300 × 300", source: "https://www.creality.com/products/k2-series" },
  "K2 Plus": { label: "Creality K2 PLUS", size: "350 × 350 × 350", source: "https://www.creality.com/products/creality-k2-plus-cfs-combo" },
};
const reportStatuses = ["확인 대기", "확인 중", "해결 완료"];
let adminAuthenticated = false;
let currentReports = [];
let editingReportId = null;

const pageNames = {
  home: "전체 보기",
  guide: "사용 안내",
  troubleshoot: "문제 해결",
  filament: "필라멘트 교체",
  removal: "출력물 분리",
  reports: "고장 신고",
};

const guideSteps = [
  ["01", "Creality Print에서 기종 선택", "담당 선생님께 사용 허가를 받은 뒤, Creality Print에서 실제 프린터와 같은 {model} 프로파일을 선택하세요.", "비슷한 이름의 다른 기종을 고르지 마세요. 정확한 프로파일이 없으면 슬라이싱을 멈추고 담당자에게 물어보세요."],
  ["02", "모델과 재료 준비", "승인된 3D 모델 파일을 열고, 학교에서 허용한 필라멘트를 선택하세요. 네 기종 모두 외부 스풀을 사용하므로 스풀이 걸리지 않고 풀리는지도 확인하세요.", "재료를 억지로 당기거나 밀지 말고, 뜨거운 노즐이나 움직이는 부품은 만지지 마세요."],
  ["03", "기본 설정으로 슬라이싱", "Creality Print의 기본 설정을 사용해 슬라이싱한 뒤, 기종별 최대 출력 크기 안에 모델과 받침 구조가 모두 들어오는지 미리보기에서 확인하세요.", "고급 설정을 임의로 바꾸지 마세요. 모델이 잘리거나 베드 밖에 있거나 예상 값이 이상하면 담당자에게 확인하세요."],
  ["04", "USB로 옮기고 파일 확인", "슬라이싱된 출력 파일을 학교에서 지정한 USB에 저장하고 안전하게 분리하세요. 프린터에서 파일을 고를 때 화면의 기종과 파일 이름이 맞는지 확인하세요.", "파일 종류나 메뉴가 안내와 다르면 임의로 다른 파일을 시작하지 말고 담당자에게 물어보세요."],
  ["05", "출력 시작과 첫 층 확인", "출력 시작 후 첫 층이 고르게 놓이는지 살펴보세요. 이상한 소리, 냄새, 연기, 오류 메시지가 있으면 바로 담당자를 부르세요.", "작동 중인 프린터를 혼자 두지 말고, 움직이는 부품과 뜨거운 부분에 손대지 마세요."],
  ["06", "식힌 뒤 결과물 분리", "출력이 끝나면 베드가 완전히 식은 것을 확인하세요. 학교에서 허용한 분리 도구를 사용해 결과물을 조심히 분리하고 작업 공간을 정리하세요.", "뜨거운 상태에서 분리하지 말고, 도구를 몸 쪽으로 강하게 밀지 마세요. 잘 떨어지지 않으면 담당자에게 요청하세요."],
];

const guideKeyTerms = [
  "승인된 3D 모델 파일", "허용한 필라멘트", "베드가 완전히 식은",
  "담당 선생님", "사용 허가", "뜨거운 노즐", "움직이는 부품",
  "기본 설정", "고급 설정", "오류 메시지", "분리 도구",
  "파일 이름", "첫 층", "최대 출력 크기", "Creality Print", "USB", "연기", "냄새",
];

const symptoms = [
  { title: "출력물이 베드에서 들떠요", icon: "↗", intro: "출력물 가장자리가 들리거나 출력 도중 떨어지는 경우예요.", steps: ["출력이 계속 진행 중이면 프린터 화면의 정지 기능을 사용하고 담당 선생님께 알려주세요.", "프린터가 멈춘 뒤에도 베드가 뜨거울 수 있으니 결과물이나 표면을 만지지 마세요.", "베드 표면에 이물질이 있는지 눈으로만 확인하고, 청소나 설정 변경은 담당자에게 요청하세요."], stop: "반복해서 들뜨거나 베드가 흔들리면 추가 출력을 시작하지 마세요." },
  { title: "필라멘트가 공급되지 않아요", icon: "⌁", intro: "필라멘트가 끊겼거나 공급 경로에서 멈춘 것처럼 보일 때 확인하세요.", steps: ["출력을 일시 정지하거나 정지하고, 필라멘트가 더 이상 이동하지 않는지 화면에서 확인하세요.", "필라멘트가 엉켰거나 끊어졌는지 외부에서 눈으로 살펴보세요. 강제로 잡아당기지 마세요.", "재료 교체·재장착 메뉴는 모델마다 다를 수 있어요. 담당자에게 모델명과 화면 상태를 알려주세요."], stop: "필라멘트가 단단히 걸렸거나 내부에 들어가 보이지 않으면 직접 분해하지 마세요." },
  { title: "노즐에서 재료가 나오지 않아요", icon: "⌄", intro: "출력은 진행되는데 재료가 나오지 않거나 가늘게 끊겨 나오는 경우예요.", steps: ["출력을 멈추고 프린터에 표시된 오류나 알림이 있는지 확인하세요.", "노즐 주변에 재료가 붙어 있는지는 멀리서 눈으로만 확인하세요. 노즐은 매우 뜨거울 수 있어요.", "막힘 제거, 노즐 청소, 부품 교체는 담당자에게 요청하세요. 선택한 모델명을 함께 알려주세요."], stop: "노즐을 바늘이나 공구로 찌르거나 손으로 만지지 마세요." },
  { title: "출력이 멈추거나 실패해요", icon: "Ⅱ", intro: "출력이 중간에 멈추거나 화면에 실패·오류가 나타날 때 확인하세요.", steps: ["프린터 화면의 오류 문구나 코드를 사진 또는 메모로 기록하세요. 사진 촬영은 담당자 지침을 따르세요.", "출력 작업을 반복 실행하지 말고, 현재 상태를 담당자에게 알려주세요.", "프린터 모델명, 멈춘 시점, 오류 문구를 고장 신고에 적어주세요."], stop: "전원을 반복해서 껐다 켜거나 오류를 임의로 초기화하지 마세요." },
  { title: "연결 또는 파일 전송이 안 돼요", icon: "⌘", intro: "프린터가 보이지 않거나 출력 파일을 보낼 수 없는 경우예요.", steps: ["프린터 모델과 화면에 표시된 연결 상태를 확인하세요.", "파일 이름과 파일 종류가 담당자의 안내와 일치하는지 확인하세요. 의심스러운 파일은 열지 마세요.", "연결 설정이나 네트워크를 임의로 변경하지 말고 담당자에게 화면의 메시지를 알려주세요."], stop: "개인 계정 비밀번호를 신고 내용이나 공용 프린터에 입력하지 마세요." },
  { title: "기타 오류 메시지가 발생했어요", icon: "!", intro: "목록에 없는 오류나 예상하지 못한 동작이 생겼을 때 이용하세요.", steps: ["화면의 오류 문구나 코드를 그대로 기록하세요.", "이상한 소리·냄새·연기·과도한 열이 있으면 주변 사람에게 알리고 즉시 담당자를 부르세요.", "안전 문제가 없다면 더 조작하지 말고, 모델명과 발생 시점을 고장 신고에 적어주세요."], stop: "연기, 타는 냄새, 비정상적인 열이 있으면 가까이 가지 말고 즉시 담당자에게 알리세요." },
];

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function formatReportDate(report) {
  if (report.createdAt) {
    const createdAt = new Date(report.createdAt);
    if (!Number.isNaN(createdAt.getTime())) {
      return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(createdAt);
    }
  }
  return report.date || "일시 확인 불가";
}

function formatRecentDate(report) {
  if (!report.createdAt) return report.date || "일시 확인 불가";
  const createdAt = new Date(report.createdAt);
  if (Number.isNaN(createdAt.getTime())) return "일시 확인 불가";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(createdAt);
}

async function renderReports() {
  let reports;
  try {
    const response = await fetch("/api/reports");
    if (!response.ok) throw new Error("신고 목록을 불러오지 못했습니다.");
    reports = await response.json();
    if (!Array.isArray(reports)) throw new Error("신고 목록 형식이 올바르지 않습니다.");
  } catch {
    document.querySelector("#report-count").textContent = "!";
    document.querySelector("#all-report-count").textContent = "!";
    document.querySelector("#report-list").innerHTML = '<div class="empty-reports">서버에서 신고 목록을 불러오지 못했어요. 연결을 확인해 주세요.</div>';
    document.querySelector("#recent-reports").innerHTML = '<div class="empty-reports">서버 연결을 확인해 주세요.</div>';
    return;
  }
  currentReports = reports;
  document.querySelector("#report-count").textContent = reports.length;
  document.querySelector("#all-report-count").textContent = reports.length;
  const list = document.querySelector("#report-list");
  const recent = document.querySelector("#recent-reports");
  if (!reports.length) {
    list.innerHTML = '<div class="empty-reports">아직 신고가 없어요. 문제가 생기면 내용을 남겨주세요.</div>';
    recent.innerHTML = '<div class="empty-reports">아직 등록된 신고가 없어요.</div>';
    return;
  }
  list.innerHTML = reports.map((report) => {
    const id = escapeHTML(report.id);
    const status = report.status || "확인 대기";
    const statusClass = status === "해결 완료" ? "status-resolved" : status === "확인 중" ? "status-in-progress" : "status-pending";
    const statusControl = adminAuthenticated
      ? `<select class="report-status-select ${statusClass}" data-status-report="${id}" aria-label="신고 처리 상태">${reportStatuses.map((item) => `<option${item === status ? " selected" : ""}>${item}</option>`).join("")}</select>`
      : `<span class="report-status ${statusClass}">${escapeHTML(status)}</span>`;
    const adminActions = adminAuthenticated
      ? `<div class="report-admin-actions"><button type="button" data-edit-report="${id}">수정</button><button type="button" class="delete-report" data-delete-report="${id}">삭제</button></div>`
      : "";
    return `<div class="report-row"><span class="report-device">${report.deviceNumber ? `${escapeHTML(report.deviceNumber)}번 기기` : "번호 미지정"}</span><div class="report-subject"><strong>${escapeHTML(report.symptom)}</strong><small>${escapeHTML(report.name || "익명")} · ${escapeHTML(report.description)}</small>${adminActions}</div>${statusControl}<span class="report-timestamp">${escapeHTML(formatReportDate(report))}</span></div>`;
  }).join("");
  recent.innerHTML = reports.slice(0, 2).map((report) => `<div class="recent-item"><span class="recent-dot"></span><strong>${escapeHTML(report.symptom)}</strong><span>${escapeHTML(formatRecentDate(report))}</span></div>`).join("");
}

function showPage(page) {
  document.querySelectorAll(".page-section").forEach((section) => {
    const active = section.id === `page-${page}`;
    section.hidden = !active;
    section.classList.toggle("active", active);
  });
  const activeNavPage = ["filament", "removal"].includes(page) ? "troubleshoot" : page;
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.page === activeNavPage));
  document.querySelector("#breadcrumb-current").textContent = pageNames[page] || pageNames.home;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setPrinter(model) {
  document.querySelectorAll(".current-printer").forEach((element) => { element.textContent = `Creality ${model}`; });
  updateBuildVolume(model);
  renderGuide();
}

function updateBuildVolume(model) {
  const volume = buildVolumes[model];
  document.querySelector("#volume-selection").textContent = volume.label;
  document.querySelector("#volume-size").textContent = volume.size;
  document.querySelector("#volume-source").href = volume.source;
}

function renderGuide() {
  const model = printerSelect.value;
  const terms = [...guideKeyTerms, `같은 ${model} 프로파일`]
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length)
    .join("|");
  const keyTermPattern = new RegExp(`(${terms})`, "g");
  const highlight = (text) => escapeHTML(text).replace(keyTermPattern, '<strong class="key-term">$1</strong>');
  document.querySelector("#steps-list").innerHTML = guideSteps.map(([number, title, description, tip]) => `<article class="step-card"><span class="step-num">${number}</span><div><h3>${title}</h3><p>${highlight(description.replaceAll("{model}", model))}</p><p class="step-tip">팁 / ${highlight(tip)}</p></div></article>`).join("");
}

function renderSymptoms() {
  const list = document.querySelector("#symptom-list");
  list.innerHTML = symptoms.map((symptom, index) => `<button class="symptom-button" type="button" data-symptom="${index}"><span class="symptom-glyph" aria-hidden="true">${symptom.icon}</span><span>${symptom.title}</span><span class="symptom-arrow" aria-hidden="true">→</span></button>`).join("");
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-symptom]");
    if (!button) return;
    list.querySelectorAll(".symptom-button").forEach((item) => item.classList.toggle("selected", item === button));
    const symptom = symptoms[Number(button.dataset.symptom)];
    document.querySelector("#solution-panel").innerHTML = `<div class="solution-content"><span class="solution-kicker">점검 / ${escapeHTML(printerSelect.value)}</span><h2>${symptom.title}</h2><p class="solution-intro">${symptom.intro}</p><div class="solution-steps">${symptom.steps.map((step, index) => `<div class="solution-step"><span>${String(index + 1).padStart(2, "0")}</span><p>${step}</p></div>`).join("")}</div><div class="stop-box"><strong>주의 /</strong> ${symptom.stop}</div></div>`;
  });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateAdminPanel(message) {
  document.querySelector("#admin-tools").open = adminAuthenticated;
  document.querySelector("#admin-login-form").hidden = adminAuthenticated;
  document.querySelector("#admin-session").hidden = !adminAuthenticated;
  if (message !== undefined) document.querySelector("#admin-message").textContent = message;
}

async function loadAdminSession() {
  try {
    const response = await fetch("/api/admin/session", { cache: "no-store" });
    const session = await response.json();
    adminAuthenticated = response.ok && session.authenticated === true;
  } catch {
    adminAuthenticated = false;
  }
  updateAdminPanel();
  await renderReports();
}

async function adminRequest(url, options) {
  const response = await fetch(url, options);
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    adminAuthenticated = false;
    updateAdminPanel("관리자 로그인이 필요합니다.");
    await renderReports();
  }
  if (!response.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
  return result;
}

function openEditDialog(id) {
  const report = currentReports.find((item) => item.id === id);
  if (!report || !adminAuthenticated) return;
  editingReportId = id;
  document.querySelector("#edit-device-number").value = String(report.deviceNumber);
  document.querySelector("#edit-symptom").value = report.symptom;
  document.querySelector("#edit-description").value = report.description;
  document.querySelector("#edit-name").value = report.name || "";
  document.querySelector("#edit-status").value = report.status || "확인 대기";
  document.querySelector("#edit-report-dialog").showModal();
}

document.querySelector("#admin-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const passwordInput = document.querySelector("#admin-password");
  const button = form.querySelector('[type="submit"]');
  const message = document.querySelector("#admin-message");
  button.disabled = true;
  message.textContent = "로그인 확인 중이에요.";
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput.value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "로그인하지 못했습니다.");
    adminAuthenticated = true;
    passwordInput.value = "";
    updateAdminPanel("관리자 로그인됨");
    await renderReports();
    showToast("관리자 기능을 사용할 수 있어요.");
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#admin-logout").addEventListener("click", async () => {
  try {
    await fetch("/api/admin/logout", { method: "POST" });
  } finally {
    adminAuthenticated = false;
    updateAdminPanel("로그아웃했어요.");
    await renderReports();
  }
});

document.querySelector("#report-list").addEventListener("change", async (event) => {
  const control = event.target.closest("[data-status-report]");
  if (!control) return;
  control.disabled = true;
  try {
    await adminRequest(`/api/reports?id=${encodeURIComponent(control.dataset.statusReport)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: control.value }),
    });
    await renderReports();
    showToast("신고 처리 상태를 변경했어요.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#report-list").addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit-report]");
  if (editButton) {
    openEditDialog(editButton.dataset.editReport);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-report]");
  if (!deleteButton || !window.confirm("이 신고를 삭제할까요? 삭제한 신고는 복구할 수 없습니다.")) return;
  try {
    await adminRequest(`/api/reports?id=${encodeURIComponent(deleteButton.dataset.deleteReport)}`, { method: "DELETE" });
    await renderReports();
    showToast("신고를 삭제했어요.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#edit-report-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity() || !editingReportId) return;
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    await adminRequest(`/api/reports?id=${encodeURIComponent(editingReportId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceNumber: Number(document.querySelector("#edit-device-number").value),
        symptom: document.querySelector("#edit-symptom").value.trim(),
        description: document.querySelector("#edit-description").value.trim(),
        name: document.querySelector("#edit-name").value.trim(),
        status: document.querySelector("#edit-status").value,
      }),
    });
    document.querySelector("#edit-report-dialog").close();
    editingReportId = null;
    await renderReports();
    showToast("신고 내용을 수정했어요.");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#cancel-edit").addEventListener("click", () => {
  document.querySelector("#edit-report-dialog").close();
  editingReportId = null;
});
document.querySelector("#close-edit-dialog").addEventListener("click", () => {
  document.querySelector("#edit-report-dialog").close();
  editingReportId = null;
});

document.querySelectorAll("[data-page]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const page = link.dataset.page;
    history.replaceState(null, "", `#${page}`);
    showPage(page);
  });
});

window.addEventListener("hashchange", () => showPage(location.hash.slice(1) || "home"));
printerSelect.addEventListener("change", () => setPrinter(printerSelect.value));
reportDescription.addEventListener("input", () => { document.querySelector("#char-count").textContent = `${reportDescription.value.length} / 500`; });

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!reportForm.reportValidity()) return;
  const submitButton = reportForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceNumber: Number(reportDeviceNumber.value),
        symptom: document.querySelector("#report-symptom").value,
        description: reportDescription.value.trim(),
        name: document.querySelector("#report-name").value.trim(),
      }),
    });
    if (!response.ok) throw new Error("신고를 저장하지 못했습니다.");
    await response.json();
    reportForm.reset();
    document.querySelector("#char-count").textContent = "0 / 500";
    await renderReports();
    showToast("신고를 서버에 저장했어요.");
  } catch {
    showToast("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(new Date()).toUpperCase();
renderGuide();
renderSymptoms();
loadAdminSession();
setPrinter(printerSelect.value);
showPage(location.hash.slice(1) || "home");

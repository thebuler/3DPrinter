# Vercel + Supabase 설정 안내

Vercel 배포에서 신고 목록을 공유하려면 데이터베이스를 한 번 연결해야 합니다. 신고 데이터와 관리자 인증은 서버에서만 처리하며, `SUPABASE_SERVICE_ROLE_KEY`는 브라우저 코드로 보내지 않습니다.

## 1. Supabase 프로젝트 만들기

1. Supabase에서 새 프로젝트를 만듭니다.
2. 프로젝트의 SQL Editor를 엽니다.
3. 이 프로젝트의 `supabase/schema.sql` 내용을 붙여 넣고 실행합니다.
4. Table Editor에 `reports` 표가 만들어졌는지 확인합니다.

이 표는 기기 번호, 신고 내용, 처리 상태, 등록·수정 시각을 저장합니다. Row Level Security를 켜고 익명 사용자 정책은 만들지 않습니다. Vercel 서버 함수만 비밀 `service_role` 키로 표에 접근합니다.

## 2. Vercel 환경 변수 설정하기

Vercel 프로젝트의 Settings → Environment Variables에 아래 값을 추가합니다. Preview와 Production 환경 모두에 설정한 뒤 다시 배포하세요.

- `SUPABASE_URL`: Supabase Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase의 비밀 `service_role` API 키
- `REPORT_ADMIN_PASSWORD`: 관리자 로그인 비밀번호

값은 Vercel 설정 화면에 직접 입력하세요. 채팅이나 소스 코드에 비밀 키를 붙여 넣지 마세요. `SUPABASE_SERVICE_ROLE_KEY`에 `VITE_` 접두사를 붙이면 안 됩니다.

## 3. 재배포하고 확인하기

GitHub에 변경 내용을 올린 뒤 Vercel에서 배포가 완료되면 고장 신고 페이지를 새로고침합니다. 신고 등록 후 목록에 나타나는지, 관리자 로그인 후 상태 변경이 되는지 확인합니다. 다른 PC에서도 같은 Vercel 주소를 열어 같은 목록이 보이면 연결된 것입니다.

Vercel 함수는 `api/` 폴더의 파일을 사용합니다. 기존 `vite.config.js`의 JSON 파일 API는 로컬 미리보기용이며, Vercel 배포에서는 `api/reports.js`와 `api/admin/` 함수가 Supabase에 연결합니다. 따라서 로컬 미리보기와 Vercel 사이트는 같은 데이터베이스를 자동 공유하지 않습니다.

## 기존 신고 기록

현재 서버의 `data/reports.json`은 Supabase로 자동 복사되지 않습니다. 기존 신고를 보존해야 하면 먼저 안전한 백업을 만들고, 별도의 가져오기 작업을 진행해야 합니다. ZIP에 있던 기존 `.env`나 신고 파일은 의도적으로 포함하지 않습니다.

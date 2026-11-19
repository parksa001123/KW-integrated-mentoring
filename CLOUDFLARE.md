# Cloudflare Workers 별도 배포

기존 운영 주소와 데이터베이스를 사용 중인 상태에서 별도 Worker를 먼저 검증합니다. 새 D1은 빈 상태이며 운영 멘토 명단과 학생 신청 이력은 승인된 이관 절차가 필요합니다.

1. Cloudflare 계정에서 D1 데이터베이스 `kw-integrated-mentoring`을 생성하고 UUID를 빌드 환경의 `KW_D1_DATABASE_ID`에 설정합니다.
2. `npm ci`와 `npm run build`를 실행합니다. 외부 배포 시 빌드 환경에 D1 UUID가 있는지 확인합니다.
3. Wrangler 인증 후 `npx wrangler d1 migrations apply kw-integrated-mentoring --remote --config dist/server/wrangler.json`으로 원격 DB에 스키마를 적용합니다. 필요한 경우 명령 실행 전 생성된 설정의 D1 항목에 `migrations_dir`을 프로젝트의 `drizzle` 경로로 지정합니다.
4. Worker 비밀값을 설정합니다. `ADMIN_PASSWORD_HASH`는 기존 코드가 사용하는 `salt:hex` 형식(PBKDF2-SHA-256, 100000회, 32바이트)입니다. `BACKUP_ENCRYPTION_KEY`는 별도의 무작위 비밀값이며, `CARE_SHEET_ENDPOINT`는 승인된 Apps Script 실행 URL입니다.
5. `npx wrangler deploy --config dist/server/wrangler.json`으로 별도 Worker를 배포합니다. 관리자 화면에서 학교 이메일 발송과 Drive 연결을 각각 등록합니다.
6. 공개 열람, 학교 이메일 수신과 학생 신청, 관리자 로그인과 신청 조회, Sheets 반영, Drive 파일 생성을 확인한 후 운영 주소를 전환합니다.

외부 호스팅 빌드는 요청 헤더 기반 ChatGPT 인증을 비활성화하며 학교 이메일과 관리자 비밀번호 인증을 사용합니다.

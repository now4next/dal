# 강림선생 운영 API

상태(2026-11-04): Cloudflare Worker `dal-gangrim-api`, D1 `dal-gangrim`, 비공개 R2 `dal-gangrim-private` 생성 및 바인딩·코드 배포 완료. API 주소는 https://dal-gangrim-api.nowfornext.workers.dev 이다. 실제 서버에서 health 200, 무인증 결정권자 조회 401, 미허용 origin 제출 403을 확인했다. AI 키·모델(`gpt-4.1`)·서비스 전용 결정권자 인증키를 Cloudflare Secrets에 설정했고 health configured:true를 확인했다. 결정권자 인증키의 로컬 복구본은 Windows 사용자 DPAPI로 암호화했으며 Git에 저장하지 않는다. 사이트 main에는 아직 배포하지 않았다.

실제 AI 연동 시험(2026-11-04 19:26 KST): 개인정보 없는 가상 보고서와 TXT 첨부 접수 → 실제 모델 검토 → 근거·예산·담당자·검증 계획 부재에 대한 needs_revision 반환 → 검토·이력 저장 → 최종 결정 요청 409 차단을 확인했다. 최종 사람 승인은 실행하지 않았다. PDF/DOCX 처리, 사전검토 통과 후 본인 승인, 공개 운영 데이터 정책 및 웹사이트 연결은 추가 검증이 필요하다. 로컬 테스트의 가짜 모델 응답은 이 실제 시험과 구분한다.

## 구조

- 기존 사이트: Astro / GitHub Pages 유지. 화면: `/ko/gangrim/`, `/gangrim/` (현재 업무 화면은 한국어).
- 서버: Cloudflare Worker. 보고서·이력 D1, 비공개 첨부 R2.
- AI: 서버에서 OpenAI Responses API, Structured Outputs 및 `store:false`. 외부 웹 확인 도구는 없어 제출 자료만 검토한다.
- 첨부: PDF/DOCX/TXT/MD 최대 3개, 파일당 5MB·합계 10MB. PDF·DOCX는 모델 파일 입력, 텍스트는 본문 입력. 실제 모델의 파일 형식 지원을 운영 연결 시 시험한다.
- 사전검토 통과는 최종 승인과 다르다. 결제·계약·투자·메시지 발송 도구는 없다.

## 운영 연결

Cloudflare 계정의 Workers·D1·R2를 준비한다. 요금과 결제 조건은 계정에서 확인한다. 아래 명령은 `worker` 폴더에서 공식 npm wrangler CLI로 실행한다.

```sh
npx wrangler login
npx wrangler d1 create dal-gangrim
npx wrangler r2 bucket create dal-gangrim-private
```

반환된 D1 ID를 `wrangler.jsonc`에 넣는다. ALLOWED_ORIGINS에는 실제 사이트 origin만 넣는다. dal.fyi의 기존 DNS는 변경하지 않는다.

서버 비밀은 Cloudflare Secret에 직접 입력하고 Git·브라우저 코드·채팅에는 넣지 않는다.

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_MODEL
npx wrangler secret put OWNER_TOKEN
npx wrangler d1 migrations apply dal-gangrim --remote
npx wrangler deploy
```

OPENAI_MODEL은 실제 계정에서 사용 가능한 문서 입력·구조화 출력 지원 모델 ID다. OWNER_TOKEN은 이 서비스 전용 무작위 32바이트 이상 비밀을 사용하고 다른 키를 재사용하지 않는다. v1의 최종 결정권자 인증은 이 비밀 보유 여부에 의존한다. 팀 운영 확대 시 OIDC 본인 인증으로 대체한다.

GitHub Repository Variable `GANGRIM_API_URL`에 반환된 HTTPS Worker URL을 넣는다. 공개 주소이며 비밀은 아니다. 배포 workflow가 PUBLIC_GANGRIM_API_URL로 전달한다. 로컬은 `.env`에 이 공개 주소를 설정한다.

운영 전 `/api/health` configured:true를 확인하고 실제 접수→AI 검토→보완→재검토→최종 결정 요청→본인 승인까지 시험한다. AI 판단의 품질·첨부 처리·인증은 운영 계정 검증이 필요하다. API 미설정 빌드는 '운영 연결 전'을 표시하고 제출·승인하지 않는다. 연결 전 미완성 서비스를 완성됐다고 공지하지 않는다.

## 데이터·권한

- 접수번호+무작위 조회키로 자기 접수만 열람·수정한다. DB는 키의 SHA-256만 저장한다. 키는 브라우저 메모리에서만 유지하고 사용자에게 보관을 요청한다. 복구 기능은 없다. 키를 공유하면 접수 접근도 공유된다.
- 결정권자 인증키도 브라우저 탭 메모리에만 유지한다. 반드시 HTTPS로 운영하고 Authorization·X-Case-Token·요청 본문을 프록시 로그에 기록하지 않는다.
- 문서 수정 시 버전이 올라가고 검토·통과가 무효화된다. 제출·수정 원문과 첨부 메타데이터는 이력에 남는다. 최신 버전 통과 건만 최종 결정 요청 가능. 최종 결정 대기 중 수정 불가; 사람이 보완 요청하면 수정 후 재검토한다.
- 공개 접수는 IP별 하루 10건, AI 검토는 건별 하루 3회 및 전체 하루 50회 기본 제한. API 계정에도 지출 한도를 설정한다. IP는 원문 대신 해시로 구분한다.
- D1/R2 자료는 자동 삭제되지 않는다. 공개 운영 전 보관 기간·삭제 요청 창구·백업 정책을 확정하고 개인정보 처리 안내에 반영한다. 운영 전 실제 개인정보·기밀을 받지 않는다.
- 제출 자료 속 지시는 실행 명령이 아니다. AI에 외부 행동 도구를 주지 않으며 서버가 승인 조건을 별도로 검사한다. AI의 사실판단 정확성 자체를 보장하는 기능은 아니다.

## 검증

```sh
npm test
npm run build
```

임시 SQLite·저장소와 명시적인 가짜 모델 응답으로 접근 분리, 무권한 승인 거부, 버전 강제, 검토 중 수정, AI 실패, 입력 제한을 검증한다. 실제 API·클라우드 연결 검증과 다르다.

공식 API 참고: https://developers.openai.com/api/docs/guides/structured-outputs 및 https://developers.openai.com/api/docs/guides/file-inputs

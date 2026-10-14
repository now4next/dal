# DAL · Data Analytics Lab

NFN 기업부설연구소 **Data Analytics Lab(DAL)** 웹사이트입니다. https://dal.fyi

- [Astro](https://astro.build) 정적 사이트, GitHub Actions로 GitHub Pages에 자동 배포
- 영어가 기본(`/`), 한국어는 `/ko/` 주소
- 글꼴 Pretendard, 아이콘 Lucide

## 페이지

| 영어 | 한국어 | 내용 |
|---|---|---|
| `/` | `/ko/` | 홈 |
| `/research/` | `/ko/research/` | 연구 영역 6개, 진단 도구, 방법론 |
| `/publications/` | `/ko/publications/` | 특허, 논문, 저서, 마일스톤 |
| `/people/` | `/ko/people/` | 연구책임자 프로필, 프로젝트, 연구 네트워크 |
| `/news/` | `/ko/news/` | 소식 목록과 글 |
| `/contact/` | `/ko/contact/` | 이메일, 주소 |

## 내용 업데이트하기

내용은 모두 `src/data/` 폴더의 JSON 파일에 있습니다. 파일만 고쳐서 `main`에 커밋하면 2~3분 뒤 사이트에 반영됩니다.
GitHub 웹에서 파일을 열고 연필 아이콘(Edit)으로 고친 뒤 **Commit changes**를 눌러도 됩니다.

| 파일 | 내용 |
|---|---|
| `publications.json` | 논문 · 학술발표 (`type`: `journal` / `conference` / `working`) |
| `patents.json` | 특허 (`featured: true`는 큰 카드로 따로 표시) |
| `news.json` | 소식 글 (`slug`가 주소가 됨: `/news/<slug>/`) |
| `milestones.json` | 마일스톤 |
| `projects.json` | 연구책임자 프로젝트 경력 (`tag`: `ai` / `platform` / `consulting`) |
| `books.json` | 저서 |
| `director.json` | 연구책임자 프로필, 학력, 경력 |
| `research.json` | 연구 영역, 진단 도구, 방법론 |
| `home.json` | 홈 수치, 파트너 목록 |
| `network.json` | 연구 네트워크 |
| `site.json` | 업데이트 날짜, 이메일, 주소 |

규칙

- 텍스트는 `{ "en": "...", "ko": "..." }` 형태로 두 언어를 함께 씁니다. 한쪽만 쓰면 두 언어 모두 그 값이 보입니다.
- 날짜는 `"2026"` 또는 `"2026-09"` 형식입니다. 목록은 최신순으로 자동 정렬됩니다.
- 내용을 고치면 `site.json`의 `updated` 날짜도 바꿔 주세요.
- JSON은 쉼표 하나만 빠져도 빌드가 실패합니다. 실패하면 저장소 **Actions** 탭에 빨간 표시가 생기고, 사이트는 이전 버전이 그대로 유지됩니다.

논문 예시

```json
{
  "type": "journal",
  "date": "2026-11",
  "title": "Paper title",
  "venue": "Journal name, 20(1), 1–20",
  "doi": "10.xxxx/xxxx"
}
```

## 로컬에서 실행

Node.js 22.12 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:4321 을 엽니다. 배포용 빌드는 `npm run build`이며 결과는 `dist/`에 생깁니다.

## 배포

`main`에 푸시하면 `.github/workflows/deploy.yml`이 빌드해서 GitHub Pages에 올립니다.
저장소 **Settings → Pages → Build and deployment**의 Source가 **GitHub Actions**여야 합니다.
사용자 도메인 `dal.fyi`는 `public/CNAME`과 Pages 설정에 지정되어 있습니다.

# DAL · Data Analytics Lab

NFN 기업부설연구소 **Data Analytics Lab(DAL)** 웹사이트입니다.
사람과 조직의 데이터로 경영 성과를 예측하는 연구(경영성과 예측, HR Analytics, 진단 과학, AI 피드백·코칭, AX)를 소개합니다.

- 기본 언어: **English** (오른쪽 위 `EN / KO` 버튼으로 한국어 전환, 선택은 브라우저에 저장)
- 별도 빌드 없는 정적 사이트 (HTML + CSS + JS)
- 사이트 주소(GitHub Pages): https://now4next.github.io/dal/

## 폴더 구조

```
index.html          페이지 전체 (레이아웃·스타일·고정 문구)
data/lab-data.js    계속 바뀌는 내용 (연구책임자 프로필, 프로젝트, 특허, 논문, 저서, 마일스톤)
```

## 내용 업데이트하기

새 논문·특허·프로젝트·마일스톤은 **`data/lab-data.js`만 수정**하면 됩니다.
홈의 특허·논문·마일스톤 목록, 연구책임자 요약 숫자, Director 페이지가 함께 갱신됩니다.

1. 파일 맨 위 `updated` 날짜를 오늘 날짜로 바꿉니다.
2. 알맞은 배열(`publications`, `patents`, `projects`, `books`, `milestones`)에 항목을 추가합니다.
3. 텍스트는 `{ en: "...", ko: "..." }` 형태로 두 언어를 함께 씁니다. 한쪽만 쓰면 두 언어 모두 그 값이 보입니다.
4. 커밋하고 `main`에 푸시하면 1~2분 뒤 사이트에 반영됩니다.

논문 예시:

```js
{
  type: "journal",            // "journal" | "conference" | "working"
  date: "2026-11",            // 정렬 기준 (최신순 자동 정렬)
  title: "Paper title",
  venue: "Journal name, 20(1), 1–20",
  doi: "10.xxxx/xxxx"         // 선택
}
```

GitHub 웹에서 `data/lab-data.js` → 연필 아이콘(Edit)으로 바로 수정하고 커밋해도 됩니다.

## 로컬에서 미리보기

`index.html`을 브라우저로 바로 열어도 되고, 로컬 서버로 볼 수도 있습니다.

```bash
python -m http.server 8765
```

브라우저에서 http://localhost:8765 를 엽니다.

## 배포 (GitHub Pages)

저장소 **Settings → Pages → Build and deployment**에서
Source를 `Deploy from a branch`, Branch를 `main` / `(root)`로 지정하면 됩니다.

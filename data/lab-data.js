/* =====================================================================
   DAL · Data Analytics Lab — content data (single source of truth)
   ---------------------------------------------------------------------
   이 파일만 수정하면 홈(특허·논문·마일스톤·연구책임자 요약)과
   Director 페이지가 함께 갱신됩니다.

   업데이트 방법
   1) 맨 위 `updated` 날짜를 바꿉니다.
   2) 해당 배열에 항목을 하나 추가합니다. (순서는 자동 정렬: 최신순)
   3) 모든 텍스트는 { en: "...", ko: "..." } 형태로 영어/한국어를 함께 씁니다.
      한쪽만 있으면 그 언어로 양쪽 모두 표시됩니다.

   publications[].type : "journal" | "conference" | "working"
   publications[].date : "YYYY" 또는 "YYYY-MM" (정렬 기준, 진행 중이면 "")
   projects[].tag      : "ai" | "platform" | "consulting"
   ===================================================================== */
window.DAL_DATA = {
  updated: "2026-10-14",

  director: {
    name: { en: "Byung Jun Kang", ko: "강병준" },
    initials: "BJ",
    role: { en: "Lab Director · CEO, NFN", ko: "연구책임자 · NFN 대표이사" },
    affiliation: {
      en: "NFN Corporate R&D Center · Data Analytics Lab",
      ko: "NFN 기업부설연구소 · Data Analytics Lab"
    },
    keywords: ["HR Analytics", "AI Agent", "BI Platform", "OD · OC", "Coaching"],
    summary: {
      en: "Leads NFN, a Business Intelligence Platform (BIP) company that runs an online SaaS platform. Through management consulting, NFN helps organizations see where they need to go (Awareness), builds standards they can measure (Assess), draws insight through analysis (Analytics) and supports them in putting it into practice (Action).",
      ko: "BIP(Business Intelligence Platform) 전문기업의 대표로, 경영컨설팅을 통해 조직이 나아갈 방향을 명확히 인식(Awareness)하도록 측정(Assess) 가능한 기준을 만들고, 분석(Analytics)으로 인사이트를 도출하여, 실행(Action)할 수 있도록 돕는 온라인 SaaS 플랫폼 서비스 기업을 이끌고 있습니다."
    },

    expertise: [
      { en: "AI agent planning, design & development (StratEdge, AI Assessment, AI Coaching)", ko: "AI Agent 기획·설계·개발 (StratEdge, AI Assessment, AI Coaching)" },
      { en: "HR platform planning, design & software development PM", ko: "HR Platform 기획·설계·개발 및 SW 개발 PM" },
      { en: "BI SaaS cloud platform planning & software development PM", ko: "BI SaaS Cloud Platform 기획 및 SW 개발 PM" },
      { en: "HR consulting, coaching & change management", ko: "HR Consulting & Coaching & Change Management" },
      { en: "Organizational Development (OD) process design", ko: "OD(Organizational Development) Process Design" },
      { en: "Organizational Culture (OC) index R&D & system integration", ko: "OC(Organizational Culture) Index R&D & System Integration" }
    ],

    education: [
      { title: { en: "Ph.D. Candidate, Business Administration", ko: "경영학 박사 Candidate" }, org: { en: "SDG MS, Geneva, Switzerland", ko: "스위스 제네바 SDG MS" } },
      { title: { en: "Ph.D. Candidate, AI Engineering", ko: "AI공학 박사 Candidate" }, org: { en: "aSSIST (Seoul School of Integrated Sciences & Technologies)", ko: "서울과학종합대학원(aSSIST)" } },
      { title: { en: "M.S. in AI Engineering · MBA", ko: "AI공학 석사 · MBA(경영학 석사)" }, org: { en: "aSSIST · SDG MS", ko: "aSSIST · SDG MS" } },
      { title: { en: "B.A. Economics & B.S. Biology (double degree)", ko: "경제학·생물학 학사 (복수학위)" }, org: { en: "Kyung Hee University", ko: "경희대학교" } }
    ],

    career: {
      current: [
        { title: { en: "CEO", ko: "대표이사(CEO)" }, org: { en: "NFN", ko: "NFN" } },
        { title: { en: "Head, AI4PM Initiative (EPM Engineering Researcher)", ko: "AI4PM 사업단장 (EPM 공학연구원)" }, org: { en: "Seoul National University", ko: "서울대학교" } },
        { title: { en: "EPM (Engineering Project Management) & CEPM", ko: "EPM(Engineering Project Management) & CEPM" }, org: { en: "College of Engineering, Seoul National University", ko: "서울대학교 공과대학" } },
        { title: { en: "Publisher", ko: "발행인" }, org: { en: "PM Times (online newspaper)", ko: "PM Times(피엠타임스) 온라인 신문사" } },
        { title: { en: "Certified Professional Coach", ko: "인증 전문코치" }, org: { en: "ICF PCC · KCA KPC", ko: "국제인증 PCC · 국내인증 KPC" } },
        { title: { en: "CBO / CHO (Business & Organization Director)", ko: "CBO/CHO 사업 및 조직 담당 이사" }, org: { en: "Magic Ecole", ko: "매직에꼴" } },
        { title: { en: "AX Strategy Lead", ko: "AX Strategy Lead" }, org: { en: "Lucas Meta", ko: "루카스메타" } }
      ],
      former: [
        { title: { en: "Co-CEO (CTO)", ko: "공동대표(CTO)" }, org: { en: "PSI Compass", ko: "PSI컴파스" } },
        { title: { en: "Senior Consultant", ko: "수석컨설턴트" }, org: { en: "WISDOM Holdings", ko: "WISDOM Holdings" } },
        { title: { en: "Investment Advisory Team", ko: "투자상담팀" }, org: { en: "Dongwon Securities", ko: "동원증권" } }
      ]
    }
  },

  /* 연구책임자 프로젝트 경력 — 위에 있을수록 먼저 표시됩니다 */
  projects: [
    { tag: "ai", client: { en: "Hyundai Capital", ko: "현대캐피탈" }, desc: { en: "AI Leadership Coaching Agent: design, development & co-coaching", ko: "AI Leadership Coaching Agent 설계·개발·Co-Coaching" } },
    { tag: "ai", client: { en: "Shinsegae Group", ko: "신세계그룹" }, desc: { en: "Leadership Assessment & AI Coaching Agent Service: design & development", ko: "Leadership Assessment & AI Coaching Agent Service 설계·개발" } },
    { tag: "platform", client: { en: "Hyundai Motor Group", ko: "현대자동차그룹" }, desc: { en: "Work Smart Index (WSI) development & online analytics system PM (100,000 employees, 200 overseas subsidiaries)", ko: "워크스마트 측정 지표(WSI) 개발 및 온라인 분석 시스템 개발 PM (10만 명, 200개 해외법인)" } },
    { tag: "platform", client: { en: "Hyundai Motor Group", ko: "현대자동차그룹" }, desc: { en: "Integrated Culture Survey design & web results dashboard system PM", ko: "조직문화통합진단(Culture Survey) 설계 및 웹 결과 분석 통합 대시보드 시스템 개발 PM" } },
    { tag: "platform", client: { en: "Hyundai Motor Group", ko: "현대자동차그룹" }, desc: { en: "Safety Culture Index development & results analytics system PM (40,000 employees, 2023–2024)", ko: "안전문화(Safety Culture) Index 개발 및 결과 분석 시스템 개발 PM (4만 명, 2023–2024)" } },
    { tag: "platform", client: { en: "Hanwha Group", ko: "한화그룹" }, desc: { en: "Integrated assessment system design & software development PM", ko: "통합 Assessment System 설계 및 SW 개발 PM" } },
    { tag: "platform", client: { en: "HL Group", ko: "HL그룹" }, desc: { en: "Integrated online assessment system for culture, leadership & compliance: design & software development PM", ko: "조직문화·리더십·컴플라이언스 통합 온라인 진단 시스템 설계 및 SW 개발 PM" } },
    { tag: "platform", client: { en: "DH Group", ko: "DH그룹" }, desc: { en: "Integrated HRD framework & LMS design and development PM", ko: "HRD 통합체계 구축 및 LMS 시스템 설계·개발 PM" } },
    { tag: "ai", client: { en: "Hyundai Motor Company", ko: "현대자동차" }, desc: { en: "HR Analytics machine learning algorithm R&D PM (hiring, selection & placement prediction modeling)", ko: "HR Analytics Machine Learning Algorithm R&D PM (채용·선발·보임 예측 모델링)" } },
    { tag: "platform", client: { en: "Hyundai Mobis", ko: "현대모비스" }, desc: { en: "Team leadership competency model (incl. statistical validation) & online system development and operation PM (2014–2023)", ko: "Team Leadership 역량 모델 개발(통계 검증 등) 및 온라인 시스템 개발·운영 PM (2014–2023)" } },
    { tag: "platform", client: { en: "Smilegate Group", ko: "스마일게이트 그룹" }, desc: { en: "Peer Review & Culture Survey metrics development & online system development and operation (2018–2024)", ko: "Peer Review & Culture Survey 측정 지표 개발 및 온라인 시스템 개발·운영 (2018–2024)" } },
    { tag: "consulting", client: { en: "KHNP", ko: "한국수력원자력" }, desc: { en: "Competency-based leadership assessment tool development consulting", ko: "역량기반 리더십 평가도구 개발 컨설팅" } },
    { tag: "platform", client: { en: "KEPCO KPS", ko: "한전KPS" }, desc: { en: "Leadership competency assessment & feedback system for grade 1–2 managers", ko: "1·2직급 리더십 역량 평가 및 피드백 시스템 개발" } },
    { tag: "platform", client: { en: "AJ Group", ko: "AJ그룹" }, desc: { en: "AMI organizational culture assessment consulting & system development", ko: "AMI 조직문화진단 개발 컨설팅 및 시스템 개발" } },
    { tag: "platform", client: { en: "Kakao Pay", ko: "카카오페이" }, desc: { en: "Performance goal management (KPI) system development", ko: "성과목표관리(KPI) 시스템 개발" } },
    { tag: "consulting", client: { en: "Woowa Brothers (Baemin)", ko: "우아한형제들(배달의민족)" }, desc: { en: "Leadership competency assessment & development", ko: "리더십 역량 진단 및 개발" } },
    { tag: "consulting", client: { en: "PHC Group", ko: "PHC그룹" }, desc: { en: "Leadership assessment tool & improvement measurement", ko: "리더십 진단도구 및 향상도 측정" } },
    { tag: "consulting", client: { en: "CJ CheilJedang BIO R&D Center", ko: "CJ제일제당 BIO기술연구소" }, desc: { en: "360° leadership assessment & feedback coaching", ko: "리더십 다면진단 및 피드백 코칭" } },
    { tag: "consulting", client: { en: "SK Telecom", ko: "SK텔레콤" }, desc: { en: "Shared-growth LIP: high-performing team behavior assessment & coaching workshops for team leaders", ko: "동반성장 LIP 팀장 고성과팀행동진단 및 코칭 워크샵" } },
    { tag: "consulting", client: { en: "KT", ko: "KT" }, desc: { en: "Team leader 360° leadership assessment & feedback workshops", ko: "팀장 리더십 다면진단 및 피드백 워크샵" } },
    { tag: "consulting", client: { en: "Samsung HRD Center", ko: "삼성인력개발원" }, desc: { en: "Assessment Center leadership coaching", ko: "Assessment Center 리더십 코칭" } },
    { tag: "consulting", client: { en: "Korea Labor Foundation", ko: "노사발전재단" }, desc: { en: "CEO leadership innovation coaching manual development", ko: "CEO 리더십 혁신코칭 매뉴얼 개발" } }
  ],

  patents: [
    {
      featured: true, /* 홈 특허 섹션의 큰 카드로 표시되는 특허 (사이드 목록에서는 제외) */
      date: "2026-03",
      title: { en: "Method for Predicting Business Performance Using Machine Learning and Apparatus Using the Same", ko: "머신러닝을 이용한 경영 성과 예측 방법 및 장치" },
      office: { en: "US patent · US 12,591,902 B2 · 2026.03.31", ko: "미국 특허 · US 12,591,902 B2 · 2026.03.31" }
    },
    {
      date: "2023-08",
      title: { en: "Method and Apparatus for Predicting Business Performance Using Machine Learning", ko: "머신러닝을 이용한 경영 성과 예측 방법 및 장치" },
      office: { en: "KR patent · No. 10-2573799 · 2023.08.29 (term to 2042.08.08)", ko: "국내 특허 · 제10-2573799호 · 2023.08.29 (존속 2042.08.08까지)" }
    },
    {
      date: "",
      title: { en: "Multi-modality Emotion Recognition Method and System", ko: "멀티모달리티 감정인식 방법 및 시스템" },
      office: { en: "KR patent · registered", ko: "국내 특허 · 등록" }
    }
  ],

  publications: [
    {
      type: "journal", date: "2026",
      title: "Individual Level Goal Clarity and Perceived Team Effectiveness: Perceived Shared Mental Model Mediation and Job Group Differences",
      venue: "Journal of Creativity and Innovation, 19(3), 59–87",
      doi: "10.22834/PDS.2026.19.3.59"
    },
    {
      type: "journal", date: "2026",
      title: "Development and Validation of the Shared Mental Model Scale",
      venue: "Korean Journal of Industrial and Organizational Psychology, 39(2), 267–285",
      doi: "10.24230/kjiop.v39i2.267-285"
    },
    {
      type: "journal", date: "2026-09",
      title: "The Strategic Importance of Team Effectiveness in the AI Era: An Integrated SER-M and Shared Mental Model Case Study of Toss",
      venue: "Journal of Mechanism Management (메커니즘 연구), 6(3)"
    },
    {
      type: "conference", date: "2026-08",
      title: "Vertical and Horizontal Coordinates of AI Project Management: A Two-Axis Integration of CPMAI and the PMBOK Guide (8th Edition)",
      venue: "ProjMAN – International Conference on Project MANagement"
    },
    {
      type: "conference", date: "2026-07",
      title: "Reconciling Two Time Logics: An Agile-CPMAI Integration Framework for Managing AI Projects",
      venue: "ProjMAN – International Conference on Project MANagement"
    },
    {
      type: "journal", date: "2026-06",
      title: "Asymmetric Competitive Advantage Strategy of Financial Underdog TOSS: Case Study Based on SER-M Management Strategy Model",
      venue: "Journal of Mechanism Management (메커니즘 연구), 6(2)"
    },
    {
      type: "conference", date: "2026-04",
      title: "A Study on Clarifying Project Manager's AI Competency and Systematizing: Focusing on the Development of Performance Indicators to Improve Project Outcome Prediction Accuracy",
      venue: "14th IPMA Research Conference (Project Management Practice in Disruptive Era), Bogotá, Colombia"
    },
    {
      type: "journal", date: "2024",
      title: "The Application of Generative AI in Project Management: Focusing on Text-Mining Projects for Human Resources",
      venue: "Procedia Computer Science, 278, 1993–2002"
    },
    {
      type: "working", date: "",
      title: "The Mediating Role of Shared Mental Models in the Relationship Between Goal Clarity and Team Effectiveness: A Multi-Group Path Analysis by Position",
      venue: { en: "Manuscript in progress", ko: "원고 작성 중" }
    }
  ],

  books: [
    {
      date: "2026-10",
      title: { en: "The Art of Self-Deception (나를 속이는 나)", ko: "나를 속이는 나 (The Art of Self-Deception)" },
      publisher: "BOOKK",
      desc: { en: "Humanities and psychology book that links the psychological concept of self-deception with social deception.", ko: "'자기기만'의 심리 개념과 사회적 기만을 연결해 구성한 인문·심리 도서" }
    },
    {
      date: "2026-01",
      title: { en: "살아본 뒤에야 비로소 읽히는 문장들 (Sentences You Can Only Read After Living Them)", ko: "살아본 뒤에야 비로소 읽히는 문장들" },
      publisher: "BOOKK",
      desc: { en: "Essays of humanistic reflection and practical wisdom. Pen name: Kang Rim (姜林).", ko: "인문학적 성찰과 삶의 지혜를 담은 에세이. 필명 강림(姜林)선생" }
    }
  ],

  /* 연구소 마일스톤 — 최신순 자동 정렬, 홈에는 최근 8개 표시 */
  milestones: [
    { date: "2023-08", text: { en: "KR patent No. 10-2573799 registered: ML business performance prediction", ko: "국내 특허 제10-2573799호 등록 · 머신러닝 경영성과 예측" } },
    { date: "2024", text: { en: "Procedia Computer Science: generative AI × HR text-mining projects", ko: "Procedia Computer Science 게재 · 생성형 AI × HR 텍스트마이닝" } },
    { date: "2025-12", text: { en: "Korea Corporate Awards, Grand Prize for Service Innovation (AI-based HR assessment platform)", ko: "대한민국 기업대상 서비스혁신 부문 대상 · AI 기반 HR 진단 플랫폼" } },
    { date: "2026-03", text: { en: "US patent US 12,591,902 B2 granted", ko: "미국 특허 US 12,591,902 B2 등록" } },
    { date: "2026-04", text: { en: "14th IPMA Research Conference, Bogotá: PM AI competency indicators", ko: "14th IPMA Research Conference 발표 · PM AI 역량 지표" } },
    { date: "2026-05", text: { en: "AI One-Flow launched: assessment, review & coaching in one flow", ko: "AI One-Flow 출시 · 진단–리뷰–코칭 통합" } },
    { date: "2026-06", text: { en: "Jamsil corporate R&D center officially recognized", ko: "잠실 기업부설연구소 인정" } },
    { date: "2026-07", text: { en: "Shared Mental Model scale published in KJIOP; Agile-CPMAI paper at ProjMAN", ko: "공유정신모형(SMM) 척도 학술지 게재 · ProjMAN Agile-CPMAI 발표" } },
    { date: "2026-08", text: { en: "ProjMAN: CPMAI × PMBOK 8th edition two-axis framework", ko: "ProjMAN 발표 · CPMAI × PMBOK 8판 2축 통합" } },
    { date: "2026-09", text: { en: "Journal of Mechanism Management: AI-era team effectiveness (Toss case)", ko: "메커니즘 연구 게재 · AI 시대 팀 효과성 (토스 사례)" } }
  ]
};

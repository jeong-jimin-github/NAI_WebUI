# NAI WebUI

NovelAI Image Generation API를 사용하는 비공식 WebUI입니다. NovelAI 공식 이미지 생성 화면의 어두운 3패널 작업 흐름을 참고하되, 공식 로고/에셋을 복제하지 않고 별도 구현했습니다.

## Deploy

**GitHub Pages:** https://jeong-jimin-github.github.io/NAI_WebUI/

`main` 브랜치에 push될 때 GitHub Actions가 `public/` 디렉터리를 GitHub Pages로 자동 배포합니다.

> GitHub Pages는 정적 호스팅이므로 `server.js`의 NovelAI API 프록시는 실행되지 않습니다. 완전한 API 기능은 아래 로컬/Node.js 실행 방식을 사용해야 합니다.

## 주요 기능

- **NovelAI Diffusion V5**: `nai-diffusion-5-curated`, `nai-diffusion-5-full`
- V4.5 / V4 / V3 / Furry V3 모델 선택
- Text-to-Image, Img2Img, Inpaint
- V4+/V5 Character Prompt + 좌표 지정, V5에서 UI상 최대 22개
- V4.5 Precise Reference
- V4/V4.5 Vibe Transfer (`/ai/encode-vibe` 자동 인코딩)
- Director Tools: Line Art, Sketch, Background Removal, Declutter, Colorize, Emotion
- NovelAI 전용 2x/4x Upscale
- 태그 자동완성 (EN/JP)
- V5 투명 배경/alpha 프롬프트 보조
- 생성 History, Pin, Download, 결과를 Director Tool 입력으로 재사용
- **Anlas 잔량 + 구독 티어 표시**, 생성/도구 사용 후 자동 갱신
- Persistent API Token 로그인과 Email/Password 로그인 모두 지원

## 인증

### Persistent API Token / Access Token

WebUI의 로그인 창에 토큰을 붙여 넣습니다. 기본값은 `sessionStorage`이며 브라우저를 닫으면 사라집니다. “이 브라우저에 토큰 저장”을 켠 경우에만 `localStorage`를 사용합니다.

### Email / Password

비밀번호를 서버에 저장하지 않습니다. 서버는 NovelAI 호환 access key를 메모리에서 파생해 `/user/login`으로 access token을 받고, 비밀번호 값은 요청 종료 후 유지하지 않습니다. 공개/공용 서버에 배포했다면 비밀번호 로그인보다 NovelAI Persistent API Token 사용을 권장합니다.

## 실행

```bash
npm install
npm start
```

기본 주소: `http://localhost:3000`

환경변수:

```bash
PORT=3000
```

Node.js 20 이상 권장.

## V5 기능 참고

2026-08-21 공개된 V5 기준으로 V5 Curated/Full을 지원합니다. V5 Full Inpaint는 지원하며, V5 Curated Inpaint는 V4.5 Curated Inpaint 모델로 자동 폴백합니다.

V5 출시 시점에는 Precise Reference와 Vibe Transfer가 아직 V5에 제공되지 않았으므로 WebUI에서도 V5 선택 시 해당 업로드 기능을 잠급니다. V4.5로 바꾸면 Precise Reference와 Vibe Transfer를 사용할 수 있습니다.

## 서버 API 프록시

브라우저가 NovelAI 비밀 토큰을 제3자 CORS 프록시에 노출하지 않도록 같은 서버에서 아래 allow-list 엔드포인트만 전달합니다.

- `/api/nai/generate` → NovelAI image generate
- `/api/nai/augment` → Director Tools
- `/api/nai/upscale` → NovelAI upscale
- `/api/nai/encode-vibe` → Vibe encoding
- `/api/nai/tags` → tag suggestions
- `/api/nai/subscription` → Anlas / subscription

서버는 요청 본문이나 인증 토큰을 로그로 출력하지 않습니다.

## 주의

이 프로젝트는 NovelAI/Anlatan의 공식 제품이 아닙니다. API 사양 또는 모델 기능이 변경되면 일부 옵션 조정이 필요할 수 있습니다.

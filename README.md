# NAI WebUI

NovelAI Image Generation API를 사용하는 **완전 정적 비공식 WebUI**입니다. 별도 Node/Render/Vercel 서버 없이 GitHub Pages에서 직접 작동합니다.

## Deploy

**GitHub Pages:** https://jeong-jimin-github.github.io/NAI_WebUI/

`main` 브랜치에 push될 때 GitHub Actions가 `public/` 디렉터리를 GitHub Pages로 자동 배포합니다.

정적 페이지의 `static-adapter.js`가 기존 `/api/...` 호출을 브라우저 안에서 NovelAI 공식 API로 직접 연결합니다. 별도 CORS 프록시나 사용자 소유 백엔드는 사용하지 않습니다.

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
- GitHub Pages 정적 호스팅에서 직접 실행

## 인증

### Persistent API Token / Access Token

WebUI의 로그인 창에 토큰을 붙여 넣습니다. 기본값은 `sessionStorage`이며 브라우저를 닫으면 사라집니다. “이 브라우저에 토큰 저장”을 켠 경우에만 `localStorage`를 사용합니다.

NovelAI의 사용자용 API 클라이언트는 사용자의 Persistent API Token을 요청하는 방식을 권장하므로 이 방식을 우선 권장합니다.

### Email / Password

ID/비밀번호 방식도 정적 페이지에서 지원합니다. BLAKE2b + Argon2id access key 계산을 **브라우저 내부에서 수행**한 뒤 NovelAI의 `/user/login`에 직접 요청합니다.

- 비밀번호를 GitHub Pages나 별도 서버에 저장하지 않습니다.
- 비밀번호는 access key 계산 중 브라우저 메모리에서만 사용합니다.
- 로그인 후 받은 access token만 세션에 유지합니다.

## 정적 구조

브라우저에서 직접 호출하는 공식 호스트:

- `https://image.novelai.net/ai/generate-image`
- `https://image.novelai.net/ai/augment-image`
- `https://image.novelai.net/ai/encode-vibe`
- `https://image.novelai.net/ai/generate-image/suggest-tags`
- `https://api.novelai.net/ai/upscale`
- `https://api.novelai.net/user/subscription`
- `https://api.novelai.net/user/login`

따라서 `server.js`, Express, 서버 환경변수, API 프록시가 필요하지 않습니다.

## 로컬에서 열기

정적 파일 서버 아무 것이나 사용할 수 있습니다. 예:

```bash
python -m http.server 8000 -d public
```

그 후 `http://localhost:8000`을 엽니다.

## V5 기능 참고

2026-08-21 공개된 V5 기준으로 V5 Curated/Full을 지원합니다. V5 Full Inpaint는 지원하며, V5 Curated Inpaint는 V4.5 Curated Inpaint 모델로 자동 폴백합니다.

V5 출시 시점에는 Precise Reference와 Vibe Transfer가 아직 V5에 제공되지 않았으므로 WebUI에서도 V5 선택 시 해당 업로드 기능을 잠급니다. V4.5로 바꾸면 Precise Reference와 Vibe Transfer를 사용할 수 있습니다.

## 주의

이 프로젝트는 NovelAI/Anlatan의 공식 제품이 아닙니다. API 사양 또는 CORS 정책이 변경되면 정적 클라이언트의 일부 기능도 함께 조정해야 할 수 있습니다.

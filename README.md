# NAI WebUI

NovelAI Image Generation API를 브라우저에서 직접 호출하는 **비공식 정적 WebUI**입니다. 백엔드·프록시·서버 환경변수 없이 GitHub Pages에서 동작합니다.

이 코드베이스는 원본 저장소의 기능을 [SPEC.md](./SPEC.md)로 추출한 뒤 **전부 지우고 처음부터 다시 구현**한 것입니다. 원본 클라이언트 코드, 공식 사이트 HTML/CSS, 공식 갤러리 에셋은 포함하지 않습니다.

NovelAI / Anlatan의 공식 제품이 아닙니다.

## 로컬 실행

```bash
npm start
```

또는

```bash
python -m http.server 8000 -d public
```

브라우저에서 `http://localhost:8000` 을 엽니다.

## 인증

1. **Persistent API Token** (권장): NovelAI 설정에서 발급한 토큰을 붙여 넣습니다. 기본은 세션 저장입니다. “Remember token”을 켠 경우에만 이 브라우저의 `localStorage`에 남습니다.
2. **Email / Password**: 브라우저 안에서 BLAKE2b + Argon2id로 access key를 계산한 뒤 `https://api.novelai.net/user/login`에 요청합니다. 비밀번호는 저장하지 않습니다.

## 주요 기능

- Diffusion V4.5 / V5 (Curated, Full)
- Text-to-Image, Img2Img, Inpaint
- Character prompts (V4.5 최대 6, V5 최대 22)
- V4.5 Precise Reference, Vibe Transfer
- Director Tools + 2×/4× Upscale
- 태그 자동완성 (로컬 KO/EN, Danbooru 목록, 공식 suggest-tags)
- Anlas / 구독 티어, 히스토리, 핀, 다운로드

V5에서는 Precise Reference와 Vibe Transfer가 잠깁니다. V5 Curated Inpaint는 V4.5 Curated Inpaint 모델로 폴백합니다.

## 배포

`main`에 push하면 GitHub Actions가 `public/`을 GitHub Pages로 배포합니다.

## 주의

API 스키마나 CORS 정책이 바뀌면 정적 클라이언트의 해당 호출을 함께 고쳐야 합니다. 자세한 동작은 `SPEC.md`를 기준으로 합니다.

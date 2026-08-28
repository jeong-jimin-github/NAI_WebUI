# NAI WebUI — 기능 명세

이 문서는 비공식 NovelAI Image Generation WebUI의 **동작 명세**다.  
구현은 이 명세만 따른다. 원본 소스, 공식 사이트 HTML/CSS, 공식 런타임, 갤러리 에셋을 재사용하지 않는다.

제품은 NovelAI/Anlatan 공식 클라이언트가 아니다. 브라우저에서 NovelAI 공개 API를 직접 호출하는 정적 WebUI다.

---

## 1. 제품 목표

- 서버/프록시/백엔드 없이 GitHub Pages(또는 아무 정적 파일 서버)에서 동작한다.
- 사용자가 자신의 NovelAI Persistent API Token 또는 이메일/비밀번호로 인증한다.
- Text-to-Image, Img2Img, Inpaint, Character Prompt, Precise Reference, Vibe Transfer, Director Tools, Upscale을 제공한다.
- 생성 결과 히스토리, 핀, 다운로드, Director Tool 재사용을 제공한다.
- 구독 티어와 Anlas 잔량을 표시한다.

비목표:

- NovelAI 공식 UI/HTML/CSS/JS 복제
- 사용자 소유 백엔드, CORS 프록시, 서버 환경변수
- 비밀번호를 서버나 저장소에 보관
- 공식 사이트 갤러리 이미지 재배포

---

## 2. 런타임 / 배포

| 항목 | 값 |
|---|---|
| 형태 | 정적 사이트 (`public/` 루트) |
| 실행 | `python -m http.server` 또는 동등한 정적 서버 |
| 배포 | `main` push 시 GitHub Actions가 `public/` 을 GitHub Pages로 배포 |
| 의존성 | 런타임 npm 패키지 없음. 브라우저는 CDN으로 JSZip, hash-wasm만 로드 |
| 모듈 | ES modules |

브라우저가 직접 호출하는 공식 호스트:

| 용도 | URL |
|---|---|
| 이미지 생성 | `POST https://image.novelai.net/ai/generate-image` |
| Director Tools | `POST https://image.novelai.net/ai/augment-image` |
| Vibe 인코딩 | `POST https://image.novelai.net/ai/encode-vibe` |
| 태그 제안 | `GET https://image.novelai.net/ai/generate-image/suggest-tags` |
| 업스케일 | `POST https://api.novelai.net/ai/upscale` |
| 구독/Anlas | `GET https://api.novelai.net/user/subscription` |
| 구독 폴백 | `GET https://text.novelai.net/user/subscription` |
| 로그인 | `POST https://api.novelai.net/user/login` |

모든 요청:

- `mode: 'cors'`
- `credentials: 'omit'`
- `cache: 'no-store'`
- 인증 필요 시 `Authorization: Bearer <token>`
- JSON body는 `Content-Type: application/json`

구현은 `/api/...` 로컬 프록시 흉내나 `window.fetch` 몽키패치를 쓰지 않는다. 전용 API 클라이언트가 위 호스트를 직접 호출한다.

---

## 3. 인증

### 3.1 Persistent API Token / Access Token

1. 로그인 모달의 Token 탭에 토큰을 붙여 넣는다.
2. 클라이언트는 토큰으로 구독 API를 호출해 유효성을 확인한다.
3. 성공 시 토큰을 `sessionStorage` 키 `naiToken`에 저장한다.
4. “이 브라우저에 토큰 저장”이 켜진 경우에만 `localStorage` 키 `naiToken`에도 저장한다. 기본은 세션만.
5. 페이지 로드 시 `sessionStorage` → `localStorage` 순으로 토큰을 복원한다.
6. Logout은 두 저장소의 `naiToken`을 지우고 구독 상태를 비운다.

구독 조회가 네트워크/5xx로 실패해도 401/403이 아니면, 토큰을 즉시 거절하지 않는다. `text.novelai.net`으로 한 번 더 조회한다. 둘 다 실패하면 **degraded** 연결: 토큰은 유지하고 구독 표시는 보류한다. 실제 생성 요청에서 다시 검증된다. 401/403은 토큰 오류로 처리한다.

### 3.2 Email / Password

비밀번호는 브라우저 메모리에서만 사용하고 저장하지 않는다. 로그인 성공 후 access token만 세션에 둔다. Remember 체크는 토큰 탭에만 적용한다. 비밀번호 로그인은 기본적으로 세션 전용이다.

Access key 유도 (NovelAI 공개 로그인 프로토콜):

1. `preSalt = password[0..6) + email + "novelai_data_access_key"`
2. `salt = BLAKE2b(preSalt, digest 128 bit)` → hex를 바이트로
3. Argon2id:
   - password: 원문 비밀번호
   - salt: 위 바이트
   - parallelism: 1
   - iterations: 2
   - memorySize: 1953 KiB
   - hashLength: 64
4. 해시를 Base64url (`+`→`-`, `/`→`_`, padding 제거) 후 앞 64자
5. `POST /user/login` body `{ "key": "<accessKey>" }`
6. 응답의 `accessToken`을 사용하고 구독을 조회한다.

### 3.3 구독 요약

원본 구독 JSON에서:

- `tier`: 0 Paper, 1 Tablet, 2 Scroll, 3 Opus. 그 외 `Tier N`
- `anlas` = `trainingStepsLeft.fixedTrainingStepsLeft` + `trainingStepsLeft.purchasedTrainingSteps`
- `active` = `data.active` 또는 `tier > 0`
- `expiresAt`, `perks`는 보관만 하고 UI에 필수는 아님

UI:

- 사이드바 Anlas 칩: 잔량. 클릭 시 재조회(미로그인 시 모달)
- 중앙 상단: 티어 이름 또는 `Not signed in` / `Connected`
- Login/Logout 버튼

---

## 4. 모델과 능력

지원 모델 (드롭다운 라벨 / id / 패밀리):

| ID | 라벨 | 패밀리 | params_version | Precise Ref | Vibe | Autocomplete | Transparent BG | 캐릭터 상한 |
|---|---|---|---|---|---|---|---|---|
| `nai-diffusion-4-5-curated` | NAI Diffusion V4.5 Curated | V4.5 | 3 | O | O | O | X | 6 |
| `nai-diffusion-4-5-full` | NAI Diffusion V4.5 Full | V4.5 | 3 | O | O | O | X | 6 |
| `nai-diffusion-5-curated` | NAI Diffusion V5 Curated | V5 | 4 | X | X | O | O | 22 |
| `nai-diffusion-5-full` | NAI Diffusion V5 Full | V5 | 4 | X | X | O | O | 22 |

기본 모델: V4.5 Curated.

모델 전환 시:

- Precise/Vibe 미지원이면 해당 업로드 UI를 숨기고 안내 문구를 보여 준다.
- Transparent BG 토글은 V5에서만 보인다. 다른 모델로 바꾸면 끈다.
- 캐릭터 개수가 새 상한을 넘으면 추가는 막고 기존 항목은 유지한다(생성 시 상한만큼만 보낸다).

### Dataset 모드

별도 모델이 아니라 프롬프트 접두 태그다.

- Anime: 추가 없음
- Furry: 프롬프트에 `fur dataset`이 없으면 앞에 붙인다
- Background: 프롬프트에 `background dataset`이 없으면 앞에 붙인다

### Inpaint 모델 매핑

| 선택 모델 | Inpaint 요청 모델 |
|---|---|
| `nai-diffusion-5-curated` | `nai-diffusion-4-5-curated-inpainting` (폴백) |
| `nai-diffusion-5-full` | `nai-diffusion-5-full-inpainting` |
| 이미 `-inpainting`으로 끝나면 | 그대로 |
| 그 외 | `{model}-inpainting` |

### V5 제약 (출시 시점 기준)

- Precise Reference / Vibe Transfer는 V5에서 잠근다. V4.5로 바꾸면 사용 가능.
- V5 Full Inpaint 지원. V5 Curated Inpaint는 V4.5 Curated Inpaint로 폴백.

---

## 5. 프롬프트

### 5.1 필드

- Base Prompt 탭: Prefix (고급), Main, Suffix (고급)
- Undesired Content 탭: Negative
- 최종 positive = Prefix + Main + Suffix 를 쉼표로 연결 (빈 칸 제외)
- 글자 수 표시는 최종 positive 길이
- Prefix/Suffix는 기본적으로 접힌 고급 필드. 프리셋은 네 필드 모두 저장/복원

### 5.2 Quality Tags

켜져 있으면 모델별 품질 태그를 positive 끝에 붙인다. 기본 ON.

| 모델 | 태그 |
|---|---|
| V5 Curated | `masterpiece, very aesthetic, no text, rating:general` |
| V5 Full | `masterpiece, very aesthetic, no text` |
| V4.5 Curated | `location, masterpiece, no text, rating:general` |
| V4.5 Full | `very aesthetic, masterpiece, no text` |
| 그 외 | `masterpiece, very aesthetic` |

### 5.3 Transparent BG (V5)

켜면 positive 끝에 `transparent background, has alpha, alpha transparency`를 붙인다.

### 5.4 UC Preset

사용자 Negative 앞에 아래 프리셋을 붙인다. 기본 0 Heavy.

0. Heavy: `lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, negative space, blank page`
1. Light: `lowres, worst quality, bad quality, jpeg artifacts, very displeasing, logo, watermark`
2. Human: `lowres, bad anatomy, bad hands, extra digits, missing fingers, worst quality, bad quality, jpeg artifacts, multiple views, logo, watermark`
3. Heavy + Furry: `lowres, artistic error, worst quality, bad quality, jpeg artifacts, chromatic aberration, multiple views, logo, watermark, bad anatomy, bad hands, @_@, mismatched pupils, glowing eyes`

### 5.5 프롬프트 프리셋

localStorage 키 `novelweb.presets.v1`에 배열로 저장.

항목: `{ id, name, prefix, main, suffix, negative, updatedAt }`

동작: 목록 선택, Load, Save(이름 prompt, 동명이면 덮어쓰기 확인), Delete(확인). 선택 항목 더블클릭은 Load.

---

## 6. 캐릭터 프롬프트

각 캐릭터: `{ name, prompt, uc, x, y }`  
좌표는 0–1. 기본 `(0.5, 0.5)`.

- V4.5 최대 6, V5 최대 22
- 빈 prompt 캐릭터는 요청에서 제외
- Position 모드:
  - **AI’s Choice**: `v4_prompt.use_coords = false`
  - **Custom**: `v4_prompt.use_coords = true` (하나 이상 캐릭터가 있을 때)
- 기본 Position: AI’s Choice

요청 필드:

```
parameters.v4_prompt = {
  caption: { base_caption: <positive>, char_captions: [{ char_caption, centers: [{x,y}] }] },
  use_coords: <boolean>,
  use_order: true,
  legacy_uc: false
}
parameters.v4_negative_prompt = {
  caption: { base_caption: <negative>, char_captions: [{ char_caption: uc or "", centers }] },
  use_coords: false,
  use_order: false,
  legacy_uc: false
}
```

---

## 7. 이미지 설정

| 필드 | 기본 | 범위 |
|---|---|---|
| Width / Height | 832 × 1216 | 64–4096, 64 스냅 |
| Steps | 28 | 1–50 |
| Guidance (scale) | 6 | 1–10, 0.1 |
| Sampler | `k_euler_ancestral` | 아래 목록 |
| Seed | -1 (랜덤) | -1이면 생성 시 0..4294967287 정수. 생성 후 UI는 다시 -1 |
| Noise Schedule | `karras` | karras / native / exponential / polyexponential |
| CFG Rescale | 0 | 0–1, 0.05 |
| Images (`n_samples`) | 1 | 1–4 |
| Variety+ | ON | V4.5만 의미 있음. ON이면 `skip_cfg_above_sigma = 58` |

Sampler:

- `k_euler_ancestral` (Euler Ancestral)
- `k_euler` (Euler)
- `k_dpmpp_2m` (DPM++ 2M)
- `k_dpmpp_sde` (DPM++ SDE)
- `k_dpmpp_2m_sde` (DPM++ 2M SDE)
- `k_dpmpp_2s_ancestral` (DPM++ 2S Ancestral)
- `ddim_v3` (DDIM)

`k_euler_ancestral`일 때 추가로:

- `deliberate_euler_ancestral_bug: false`
- `prefer_brownian: true`

공통 parameters:

- `legacy: false`, `legacy_v3_extend: false`
- `params_version`: 모델 테이블
- `extra_noise_seed` = seed
- `add_original_image: true`
- `legacy_uc: false`

해상도 프리셋:

| 이름 | W | H |
|---|---|---|
| Portrait | 832 | 1216 |
| Landscape | 1216 | 832 |
| Square | 1024 | 1024 |
| Large Portrait | 1024 | 1536 |
| Large Landscape | 1536 | 1024 |
| Large Square | 1472 | 1472 |
| Wallpaper Portrait | 1088 | 1920 |
| Wallpaper Landscape | 1920 | 1088 |
| Small Square | 640 | 640 |

W/H 스왑 버튼. Reset은 기본값으로 되돌리고 프롬프트도 비운다.

### Anlas 비용 추정 (버튼 표시)

정확한 서버 계산이 아니며 UI 힌트다.

- Opus + txt2img + `n_samples=1` + `steps≤28` + `width*height ≤ 1024*1024` → 0
- 그 외: `ceil(n_samples * max(1, (width*height*steps) / (1024*1024*28)))`  
  img2img/inpaint/director/upscale는 최소 1

생성/도구 성공 후 구독을 조용히 재조회한다.

---

## 8. Img2Img / Inpaint

베이스 이미지가 있으면 txt2img 대신 해당 액션을 쓴다.

Img2Img:

- `action: "img2img"`
- `parameters.image`: base64 (data URL 헤더 없음)
- `strength` 기본 0.70, `noise` 기본 0.00 (0–1, 0.01)

Inpaint:

- `action: "infill"`
- 모델은 Inpaint 매핑 사용
- `parameters.image`, `parameters.mask`
- `add_original_image: true`
- `inpaintImg2ImgStrength` = strength 슬라이더
- `noise` = noise 슬라이더
- 마스크 없으면 에러

업로드: 파일 선택 + 드래그앤드롭. 미리보기에 픽셀 크기 표시.

---

## 9. Precise Reference (V4.5)

이미지 여러 장. 추가 시 기본:

- `type`: `character` | `style` | `character&style` (기본 character)
- `strength`: 1 (0–1)
- `fidelity`: 1 (0–1). 요청에는 `director_reference_secondary_strength_values = 1 - fidelity`

요청 (Vibe와 동시에 있으면 Precise가 우선, Vibe는 보내지 않음):

```
director_reference_images: [base64...]
director_reference_descriptions: [{ caption: { base_caption: <type>, char_captions: [] }, legacy_uc: false }]
director_reference_information_extracted: [1, ...]
director_reference_strength_values: [strength...]
director_reference_secondary_strength_values: [1-fidelity...]
```

한 번에 파일 최대 8장 추가.

---

## 10. Vibe Transfer (V4 / V4.5)

이미지마다 생성 직전 `POST /ai/encode-vibe`:

```
{ image: <base64>, information_extracted: <0-1>, model: <current model> }
```

응답은 바이너리 토큰. Base64로 바꿔 넣는다.

```
reference_image_multiple: [encoded tokens]
reference_strength_multiple: [strength...]  // 기본 strength 0.6, information 1
normalize_reference_strength_multiple: true
```

V5에서는 UI 잠금. Precise가 있으면 Vibe는 생략.

---

## 11. Director Tools / Upscale

소스 이미지 1장 필요. 선택된 생성 결과를 소스로 넣을 수 있다.

Augment (`/ai/augment-image`) body:

```
{ req_type, width, height, image }
```

| 도구 | req_type | 추가 필드 |
|---|---|---|
| Line Art | `lineart` | |
| Sketch | `sketch` | |
| Background Removal | `bg-removal` | |
| Declutter | `declutter` | |
| Colorize | `colorize` | `prompt`, `defry` (0–5, 기본 0) |
| Emotion | `emotion` | `prompt` = `"<emotion>;;<optional extra>"`, `defry` |

Emotion 목록: neutral, happy, sad, angry, scared, surprised, tired, excited, nervous, thinking, confused, shy, disgusted, smug, pained, amazed, amused, embarrassed, guilty, proud, loving, relaxed, disappointed, devious.

Upscale (`/ai/upscale`):

```
{ image, width, height, scale }  // scale 2 또는 4
```

성공 시 결과를 히스토리에 넣고 뷰어에 표시한다.

---

## 12. 생성 요청 최상위 형태

```
{
  input: <positive prompt string>,
  model: <model or inpaint model>,
  action: "generate" | "img2img" | "infill",
  parameters: { ... }
}
```

응답:

- ZIP (`PK` 매직)이면 엔트리를 이미지로 추출
- 그 외 이미지 바이트면 PNG/해당 MIME으로 1장
- object URL로 표시. 히스토리 삭제 시 URL.revokeObjectURL

프롬프트가 비어 있고 베이스 이미지도 없으면 생성하지 않는다. 미로그인이면 로그인 모달.

단축키: `Ctrl/Cmd + Enter` 생성. `Escape` 모달/제안 닫기.

동시 생성 방지: busy 플래그.

---

## 13. 태그 자동완성

활성 프롬프트 필드의 **마지막 콤마 구간**을 쿼리로 쓴다. 입력 디바운스 ~80ms.

소스 (중복 태그 소문자 키로 합치고 최대 18–20개):

1. 로컬 EN/KO 사전 (시작 일치 우선, 포함 일치 다음)
2. 커뮤니티 Danbooru CSV (`https://raw.githubusercontent.com/DCP-arca/NAI-Auto-Generator/main/assets/danbooru_tags_post_count.csv`, 줄 형식 `tag[count]`, `_`→공백)
3. 로그인 시 공식 API: `GET /ai/generate-image/suggest-tags?model=&prompt=&lang=en`

키보드: ↓↑ 이동, Enter/Tab 적용(하이라이트 있을 때), Escape 닫기.  
적용 시 마지막 토큰을 태그로 바꾸고 콤마+공백을 붙인다.

패널 스크롤 또는 필드 바깥 클릭 시 닫기.

---

## 14. 결과 / 히스토리 / 핀

세션 메모리만. 새로고침 시 결과는 사라진다.

각 결과: `{ id, blob, url, filename, model, prompt, action, seed, pinned, createdAt }`

- 뷰어: 최신 그룹이 위. 클릭 선택. 선택 카드 강조
- 액션: Pin, Director Tool로 보내기, Download
- Pin 스트립: 핀된 항목 최대 12개 썸네일
- History 패널: 최대 100개. 핀 표시. 클릭 시 선택
- History 접기/펼치기
- Clear: object URL 해제 후 빈 상태
- Zoom: 0.4–2.0, Fit은 1.0
- Deselect: 선택 해제

빈 상태: 원본 장식 UI. 공식/원본 갤러리 이미지를 포함하지 않는다. “프롬프트를 입력하고 Generate” 안내.

---

## 15. 레이아웃

3열 (데스크톱):

1. 왼쪽 설정 패널 (~400px): 모델, 프롬프트, 캐릭터, 이미지 설정, img2img, reference, director. 하단 고정 Generate 버튼
2. 가운데 캔버스: 티어, 핀, 결과, 줌
3. 오른쪽 히스토리 (~220px)

모바일 (≤820px): 세로 스택. 히스토리는 가로 스크롤 썸네일. Generate는 sticky. 터치 타깃 ≥44px. 본문 ≥16px.

다크 테마 고정. 색은 남색 잉크 + 양피지 골드 계열을 **독자 토큰**으로 정의한다. 공식 클래스명/CSS를 복사하지 않는다.

접근성: skip link, 모달 dialog, aria-busy, 축소 모션 존중.

---

## 16. 오류 / 토스트

- API 에러는 JSON `error`/`message` 또는 status text
- 401/403에 토큰/구독 확인 안내를 덧붙인다
- 토스트는 화면 하단, 성공/실패 구분, 자동 소멸
- CORS/네트워크 실패는 “브라우저에서 NovelAI API에 직접 연결하지 못했다”고 설명한다

---

## 17. 프로젝트 파일 (재구현 후)

```
SPEC.md                 이 명세 (구현 중 유지)
README.md               사용/배포 안내
package.json            check / start 스크립트
.gitignore
.github/workflows/pages.yml
.github/workflows/ci.yml
scripts/serve.mjs       로컬 정적 서버
scripts/check.mjs       문법/필수 DOM id 검사
public/index.html
public/styles.css
public/js/*.js          ES 모듈. 원본 단일 파일 구조를 답습하지 않음
```

금지:

- 원본 `app.js` / `static-adapter.js` / `auth-resilience.js` / `nai-global.css` 재사용
- `.verify/`, `.nai-official-html/`, 공식 사이트 덤프
- NovelAI 공식 갤러리 webp 재배포
- `window.fetch`를 `/api` 라우트로 가로채는 어댑터

허용:

- NovelAI 공개 API 계약 (엔드포인트, 로그인 KDF, 요청 필드)
- CDN 라이브러리 JSZip, hash-wasm
- 공개 Danbooru 태그 CSV URL
- 사용자가 이미 가진 `localStorage.naiToken` 호환

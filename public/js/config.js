export const MODELS = [
  {
    id: 'nai-diffusion-4-5-curated',
    label: 'NAI Diffusion V4.5 Curated',
    family: 'v45',
    paramsVersion: 3,
    precise: true,
    vibe: true,
    autocomplete: true,
    alpha: false,
    maxCharacters: 6,
  },
  {
    id: 'nai-diffusion-4-5-full',
    label: 'NAI Diffusion V4.5 Full',
    family: 'v45',
    paramsVersion: 3,
    precise: true,
    vibe: true,
    autocomplete: true,
    alpha: false,
    maxCharacters: 6,
  },
  {
    id: 'nai-diffusion-5-curated',
    label: 'NAI Diffusion V5 Curated',
    family: 'v5',
    paramsVersion: 4,
    precise: false,
    vibe: false,
    autocomplete: true,
    alpha: true,
    maxCharacters: 22,
  },
  {
    id: 'nai-diffusion-5-full',
    label: 'NAI Diffusion V5 Full',
    family: 'v5',
    paramsVersion: 4,
    precise: false,
    vibe: false,
    autocomplete: true,
    alpha: true,
    maxCharacters: 22,
  },
];

export const DEFAULT_MODEL = 'nai-diffusion-4-5-curated';

export const QUALITY_TAGS = {
  'nai-diffusion-5-curated': 'masterpiece, very aesthetic, no text, rating:general',
  'nai-diffusion-5-full': 'masterpiece, very aesthetic, no text',
  'nai-diffusion-4-5-curated': 'location, masterpiece, no text, rating:general',
  'nai-diffusion-4-5-full': 'very aesthetic, masterpiece, no text',
};

export const UC_PRESETS = [
  {
    id: 0,
    label: 'Heavy',
    tags: 'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, negative space, blank page',
  },
  {
    id: 1,
    label: 'Light',
    tags: 'lowres, worst quality, bad quality, jpeg artifacts, very displeasing, logo, watermark',
  },
  {
    id: 2,
    label: 'Human',
    tags: 'lowres, bad anatomy, bad hands, extra digits, missing fingers, worst quality, bad quality, jpeg artifacts, multiple views, logo, watermark',
  },
  {
    id: 3,
    label: 'Heavy + Furry',
    tags: 'lowres, artistic error, worst quality, bad quality, jpeg artifacts, chromatic aberration, multiple views, logo, watermark, bad anatomy, bad hands, @_@, mismatched pupils, glowing eyes',
  },
];

export const RESOLUTIONS = [
  { name: 'Portrait', width: 832, height: 1216 },
  { name: 'Landscape', width: 1216, height: 832 },
  { name: 'Square', width: 1024, height: 1024 },
  { name: 'Large Portrait', width: 1024, height: 1536 },
  { name: 'Large Landscape', width: 1536, height: 1024 },
  { name: 'Large Square', width: 1472, height: 1472 },
  { name: 'Wallpaper Portrait', width: 1088, height: 1920 },
  { name: 'Wallpaper Landscape', width: 1920, height: 1088 },
  { name: 'Small Square', width: 640, height: 640 },
];

export const SAMPLERS = [
  ['k_euler_ancestral', 'Euler Ancestral'],
  ['k_euler', 'Euler'],
  ['k_dpmpp_2m', 'DPM++ 2M'],
  ['k_dpmpp_sde', 'DPM++ SDE'],
  ['k_dpmpp_2m_sde', 'DPM++ 2M SDE'],
  ['k_dpmpp_2s_ancestral', 'DPM++ 2S Ancestral'],
  ['ddim_v3', 'DDIM'],
];

export const SCHEDULES = [
  ['karras', 'Karras'],
  ['native', 'Native'],
  ['exponential', 'Exponential'],
  ['polyexponential', 'Polyexponential'],
];

export const EMOTIONS = [
  'neutral', 'happy', 'sad', 'angry', 'scared', 'surprised', 'tired',
  'excited', 'nervous', 'thinking', 'confused', 'shy', 'disgusted', 'smug',
  'pained', 'amazed', 'amused', 'embarrassed', 'guilty', 'proud', 'loving',
  'relaxed', 'disappointed', 'devious',
];

export const TIER_NAMES = ['Paper', 'Tablet', 'Scroll', 'Opus'];

export const STORAGE = {
  token: 'naiToken',
  presets: 'novelweb.presets.v1',
};

export const COMMUNITY_TAGS_URL =
  'https://raw.githubusercontent.com/DCP-arca/NAI-Auto-Generator/main/assets/danbooru_tags_post_count.csv';

export const ALPHA_TAGS = 'transparent background, has alpha, alpha transparency';

export const TAG_LEXICON = [
  { en: '1girl', ko: '여자 1명', also: ['소녀', '여성 한 명'] },
  { en: '1boy', ko: '남자 1명', also: ['소년', '남성 한 명'] },
  { en: '2girls', ko: '여자 2명', also: [] },
  { en: 'solo', ko: '단독', also: ['혼자'] },
  { en: 'looking at viewer', ko: '정면', also: ['카메라 응시'] },
  { en: 'smile', ko: '미소', also: ['웃음'] },
  { en: 'blush', ko: '홍조', also: ['볼터치'] },
  { en: 'open mouth', ko: '입 벌림', also: [] },
  { en: 'closed mouth', ko: '입 다묾', also: [] },
  { en: 'long hair', ko: '긴 머리', also: ['장발'] },
  { en: 'short hair', ko: '짧은 머리', also: ['단발'] },
  { en: 'twintails', ko: '트윈테일', also: ['양갈래'] },
  { en: 'ponytail', ko: '포니테일', also: [] },
  { en: 'braid', ko: '땋은 머리', also: [] },
  { en: 'black hair', ko: '흑발', also: [] },
  { en: 'brown hair', ko: '갈색 머리', also: [] },
  { en: 'blonde hair', ko: '금발', also: [] },
  { en: 'pink hair', ko: '분홍 머리', also: [] },
  { en: 'blue hair', ko: '파란 머리', also: [] },
  { en: 'silver hair', ko: '은발', also: [] },
  { en: 'red eyes', ko: '적안', also: [] },
  { en: 'blue eyes', ko: '청안', also: [] },
  { en: 'green eyes', ko: '녹안', also: [] },
  { en: 'yellow eyes', ko: '황안', also: [] },
  { en: 'school uniform', ko: '교복', also: [] },
  { en: 'white shirt', ko: '흰 셔츠', also: [] },
  { en: 'skirt', ko: '치마', also: [] },
  { en: 'dress', ko: '원피스', also: [] },
  { en: 'jacket', ko: '재킷', also: [] },
  { en: 'hoodie', ko: '후드', also: [] },
  { en: 'thighhighs', ko: '사이하이', also: ['니삭스'] },
  { en: 'pantyhose', ko: '팬티스타킹', also: [] },
  { en: 'gloves', ko: '장갑', also: [] },
  { en: 'hat', ko: '모자', also: [] },
  { en: 'hair ornament', ko: '머리 장식', also: [] },
  { en: 'sitting', ko: '앉음', also: [] },
  { en: 'standing', ko: '서 있음', also: [] },
  { en: 'lying', ko: '누움', also: [] },
  { en: 'walking', ko: '걷기', also: [] },
  { en: 'full body', ko: '전신', also: [] },
  { en: 'upper body', ko: '상반신', also: [] },
  { en: 'cowboy shot', ko: '허벅지 샷', also: [] },
  { en: 'close-up', ko: '클로즈업', also: [] },
  { en: 'from side', ko: '옆모습', also: [] },
  { en: 'from behind', ko: '뒷모습', also: [] },
  { en: 'outdoors', ko: '실외', also: [] },
  { en: 'indoors', ko: '실내', also: [] },
  { en: 'classroom', ko: '교실', also: [] },
  { en: 'bedroom', ko: '침실', also: [] },
  { en: 'street', ko: '거리', also: [] },
  { en: 'city', ko: '도시', also: [] },
  { en: 'night', ko: '밤', also: [] },
  { en: 'sunset', ko: '석양', also: [] },
  { en: 'cherry blossoms', ko: '벚꽃', also: [] },
  { en: 'rain', ko: '비', also: [] },
  { en: 'snow', ko: '눈', also: [] },
  { en: 'holding', ko: '들고 있음', also: [] },
  { en: 'book', ko: '책', also: [] },
  { en: 'phone', ko: '휴대폰', also: [] },
  { en: 'sword', ko: '검', also: [] },
  { en: 'staff', ko: '지팡이', also: [] },
  { en: 'magic', ko: '마법', also: [] },
  { en: 'fantasy', ko: '판타지', also: [] },
  { en: 'science fiction', ko: 'SF', also: [] },
  { en: 'simple background', ko: '단순 배경', also: [] },
  { en: 'white background', ko: '흰 배경', also: [] },
  { en: 'transparent background', ko: '투명 배경', also: [] },
  { en: 'depth of field', ko: '심도', also: [] },
  { en: 'dramatic lighting', ko: '극적인 조명', also: [] },
  { en: 'backlighting', ko: '역광', also: [] },
  { en: 'volumetric lighting', ko: '볼류메트릭 조명', also: [] },
  { en: 'masterpiece', ko: '걸작', also: [] },
  { en: 'very aesthetic', ko: '미적', also: [] },
  { en: 'best quality', ko: '최상 품질', also: [] },
  { en: 'no text', ko: '글자 없음', also: [] },
  { en: 'rating:general', ko: '일반 등급', also: [] },
  { en: 'fur dataset', ko: '퍼리 데이터셋', also: [] },
  { en: 'background dataset', ko: '배경 데이터셋', also: [] },
];

export function modelById(id) {
  return MODELS.find(model => model.id === id) || MODELS[0];
}

export function inpaintModelId(id) {
  if (id === 'nai-diffusion-5-curated') return 'nai-diffusion-4-5-curated-inpainting';
  if (id === 'nai-diffusion-5-full') return 'nai-diffusion-5-full-inpainting';
  if (id.endsWith('-inpainting')) return id;
  return `${id}-inpainting`;
}

export function joinTags(...parts) {
  return parts.map(part => String(part || '').trim()).filter(Boolean).join(', ');
}

export function snap64(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 64;
  return Math.max(64, Math.min(4096, Math.round(n / 64) * 64));
}

export function randomSeed() {
  return Math.floor(Math.random() * 4294967288);
}

export function estimateAnlas({ width, height, steps, samples, action, opus }) {
  const n = Math.max(1, Math.min(4, Number(samples) || 1));
  const w = snap64(width);
  const h = snap64(height);
  const s = Number(steps) || 28;
  if (action !== 'generate') return Math.max(1, n);
  const free = opus && n === 1 && s <= 28 && w * h <= 1024 * 1024;
  if (free) return 0;
  return Math.ceil(n * Math.max(1, (w * h * s) / (1024 * 1024 * 28)));
}

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const MODELS = [
  ['nai-diffusion-4-5-curated', 'NAI Diffusion V4.5 Curated', 'V4.5'],
  ['nai-diffusion-4-5-full', 'NAI Diffusion V4.5 Full', 'V4.5'],
  ['nai-diffusion-5-curated', 'NAI Diffusion V5 Curated', 'V5'],
  ['nai-diffusion-5-full', 'NAI Diffusion V5 Full', 'V5'],
];

const MODEL_SUPPORT = {
  'nai-diffusion-4-5-curated': { precise: true, vibe: true, autocomplete: true, alpha: false, paramsVersion: 3 },
  'nai-diffusion-4-5-full': { precise: true, vibe: true, autocomplete: true, alpha: false, paramsVersion: 3 },
  'nai-diffusion-5-curated': { precise: false, vibe: false, autocomplete: false, alpha: true, paramsVersion: 4 },
  'nai-diffusion-5-full': { precise: false, vibe: false, autocomplete: false, alpha: true, paramsVersion: 4 },
};

const RESOLUTIONS = [
  ['세로', 832, 1216], ['가로', 1216, 832], ['정사각형', 1024, 1024],
  ['큰 세로', 1024, 1536], ['큰 가로', 1536, 1024], ['큰 정사각형', 1472, 1472],
  ['배경화면 세로', 1088, 1920], ['배경화면 가로', 1920, 1088], ['작은 정사각형', 640, 640],
];

const QUALITY = {
  'nai-diffusion-5-curated': 'masterpiece, very aesthetic, no text, rating:general',
  'nai-diffusion-5-full': 'masterpiece, very aesthetic, no text',
  'nai-diffusion-4-5-curated': 'location, masterpiece, no text, rating:general',
  'nai-diffusion-4-5-full': 'very aesthetic, masterpiece, no text',
};

const UC = [
  'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, negative space, blank page',
  'lowres, worst quality, bad quality, jpeg artifacts, very displeasing, logo, watermark',
  'lowres, bad anatomy, bad hands, extra digits, missing fingers, worst quality, bad quality, jpeg artifacts, multiple views, logo, watermark',
  'lowres, artistic error, worst quality, bad quality, jpeg artifacts, chromatic aberration, multiple views, logo, watermark, bad anatomy, bad hands, @_@, mismatched pupils, glowing eyes',
];

const PROMPT_LIBRARY = [
  { tag: '1girl', ko: '여자 한 명', aliases: ['소녀 한 명', '여성 한 명'] },
  { tag: '2girls', ko: '여자 두 명', aliases: ['소녀 두 명'] },
  { tag: '1boy', ko: '남자 한 명', aliases: ['소년 한 명', '남성 한 명'] },
  { tag: 'solo', ko: '단독 인물', aliases: ['혼자', '솔로'] },
  { tag: 'looking at viewer', ko: '정면 응시', aliases: ['카메라 응시', '시선 고정'] },
  { tag: 'smile', ko: '미소', aliases: ['웃음', '밝은 표정'] },
  { tag: 'blush', ko: '홍조', aliases: ['부끄러움', '볼 붉힘'] },
  { tag: 'open mouth', ko: '입 벌림', aliases: ['입 열기'] },
  { tag: 'closed mouth', ko: '입 다묾', aliases: [] },
  { tag: 'long hair', ko: '긴 머리', aliases: ['장발'] },
  { tag: 'short hair', ko: '짧은 머리', aliases: ['단발', '숏컷'] },
  { tag: 'twintails', ko: '트윈테일', aliases: ['양갈래'] },
  { tag: 'ponytail', ko: '포니테일', aliases: ['묶은 머리'] },
  { tag: 'braid', ko: '땋은 머리', aliases: ['브레이드'] },
  { tag: 'black hair', ko: '검은 머리', aliases: [] },
  { tag: 'brown hair', ko: '갈색 머리', aliases: [] },
  { tag: 'blonde hair', ko: '금발', aliases: ['노란 머리'] },
  { tag: 'pink hair', ko: '분홍 머리', aliases: [] },
  { tag: 'blue hair', ko: '파란 머리', aliases: [] },
  { tag: 'silver hair', ko: '은발', aliases: ['회은색 머리'] },
  { tag: 'red eyes', ko: '붉은 눈', aliases: [] },
  { tag: 'blue eyes', ko: '푸른 눈', aliases: [] },
  { tag: 'green eyes', ko: '초록 눈', aliases: [] },
  { tag: 'yellow eyes', ko: '노란 눈', aliases: [] },
  { tag: 'school uniform', ko: '교복', aliases: ['학생복'] },
  { tag: 'shirt', ko: '셔츠', aliases: [] },
  { tag: 'white shirt', ko: '흰 셔츠', aliases: [] },
  { tag: 'skirt', ko: '치마', aliases: [] },
  { tag: 'dress', ko: '드레스', aliases: ['원피스'] },
  { tag: 'jacket', ko: '재킷', aliases: [] },
  { tag: 'hoodie', ko: '후드티', aliases: [] },
  { tag: 'thighhighs', ko: '허벅지 스타킹', aliases: ['니삭스'] },
  { tag: 'pantyhose', ko: '스타킹', aliases: [] },
  { tag: 'gloves', ko: '장갑', aliases: [] },
  { tag: 'hat', ko: '모자', aliases: [] },
  { tag: 'hair ornament', ko: '머리 장식', aliases: ['헤어 액세서리'] },
  { tag: 'sitting', ko: '앉아 있음', aliases: ['착석'] },
  { tag: 'standing', ko: '서 있음', aliases: [] },
  { tag: 'lying', ko: '누워 있음', aliases: [] },
  { tag: 'walking', ko: '걷기', aliases: [] },
  { tag: 'full body', ko: '전신', aliases: [] },
  { tag: 'upper body', ko: '상반신', aliases: ['허리 위'] },
  { tag: 'cowboy shot', ko: '허벅지 위 샷', aliases: ['코보이 샷'] },
  { tag: 'close-up', ko: '클로즈업', aliases: ['근접 샷'] },
  { tag: 'from side', ko: '측면 구도', aliases: ['옆모습'] },
  { tag: 'from behind', ko: '후면 구도', aliases: ['뒷모습'] },
  { tag: 'outdoors', ko: '실외', aliases: ['바깥'] },
  { tag: 'indoors', ko: '실내', aliases: ['안쪽'] },
  { tag: 'classroom', ko: '교실', aliases: [] },
  { tag: 'bedroom', ko: '침실', aliases: [] },
  { tag: 'street', ko: '거리', aliases: [] },
  { tag: 'city', ko: '도시', aliases: [] },
  { tag: 'night', ko: '밤', aliases: ['야간'] },
  { tag: 'sunset', ko: '노을', aliases: ['석양'] },
  { tag: 'cherry blossoms', ko: '벚꽃', aliases: [] },
  { tag: 'rain', ko: '비', aliases: [] },
  { tag: 'snow', ko: '눈', aliases: [] },
  { tag: 'holding', ko: '손에 듦', aliases: ['들고 있음'] },
  { tag: 'book', ko: '책', aliases: [] },
  { tag: 'phone', ko: '휴대폰', aliases: ['스마트폰'] },
  { tag: 'weapon', ko: '무기', aliases: [] },
  { tag: 'sword', ko: '검', aliases: ['칼'] },
  { tag: 'staff', ko: '지팡이', aliases: [] },
  { tag: 'magic', ko: '마법', aliases: [] },
  { tag: 'fantasy', ko: '판타지', aliases: [] },
  { tag: 'science fiction', ko: 'SF', aliases: ['공상과학'] },
  { tag: 'simple background', ko: '단순 배경', aliases: ['심플 배경'] },
  { tag: 'white background', ko: '흰 배경', aliases: [] },
  { tag: 'transparent background', ko: '투명 배경', aliases: ['배경 투명'] },
  { tag: 'depth of field', ko: '심도 표현', aliases: ['아웃포커싱'] },
  { tag: 'dramatic lighting', ko: '극적인 조명', aliases: ['드라마틱 라이팅'] },
  { tag: 'backlighting', ko: '역광', aliases: [] },
  { tag: 'volumetric lighting', ko: '볼류메트릭 조명', aliases: [] },
  { tag: 'masterpiece', ko: '고품질', aliases: ['명작풍'] },
  { tag: 'very aesthetic', ko: '미려한 화풍', aliases: ['심미적'] },
  { tag: 'best quality', ko: '최상 품질', aliases: [] },
  { tag: 'no text', ko: '텍스트 없음', aliases: ['문자 없음'] },
  { tag: 'rating:general', ko: '안전 등급', aliases: ['세이프'] },
  { tag: 'fur dataset', ko: '퍼리 데이터셋', aliases: ['퍼리'] },
  { tag: 'background dataset', ko: '배경 데이터셋', aliases: ['배경 전용'] },
];

const state = {
  token: sessionStorage.getItem('naiToken') || localStorage.getItem('naiToken') || '',
  subscription: null,
  characters: [],
  preciseRefs: [],
  vibeRefs: [],
  baseImage: null,
  maskImage: null,
  imageMode: 'img2img',
  toolImage: null,
  results: [],
  selectedResult: null,
  zoom: 1,
  busy: false,
  activePromptField: null,
};

const refs = {
  model: $('#modelSelect'), mode: $('#modeSelect'), width: $('#widthInput'), height: $('#heightInput'),
  steps: $('#stepsInput'), scale: $('#scaleInput'), sampler: $('#samplerSelect'), scheduler: $('#schedulerSelect'),
  quality: $('#qualityToggle'), alpha: $('#alphaToggle'), variety: $('#varietyToggle'), cfgRescale: $('#cfgRescaleInput'),
  samples: $('#samplesInput'), seed: $('#seedInput'), ucPreset: $('#ucPreset'),
  promptPrefix: $('#promptPrefixInput'), promptMain: $('#promptInput'), promptSuffix: $('#promptSuffixInput'), negative: $('#negativeInput'),
  generate: $('#generateButton'), results: $('#resultsStack'), viewer: $('#viewer'), empty: $('#emptyState'), history: $('#historyList'),
};

function init() {
  MODELS.forEach(([value, label, family]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = `${label} · ${family}`;
    refs.model.append(opt);
  });
  refs.model.value = 'nai-diffusion-4-5-curated';

  RESOLUTIONS.forEach(([name, w, h]) => {
    const b = document.createElement('button');
    b.className = 'res-button';
    b.textContent = name;
    b.dataset.w = w;
    b.dataset.h = h;
    b.title = `${w} × ${h}`;
    if (w === 832 && h === 1216) b.classList.add('active');
    $('#resolutionPresets').append(b);
  });

  wireEvents();
  updateModelSupport();
  updateRanges();
  updateAuthUi();
  renderCharacters();
  renderReferences();
  onPromptInput();
  if (state.token) refreshSubscription(true);
}

function wireEvents() {
  $$('.tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  $$('.res-button').forEach(b => b.addEventListener('click', () => {
    refs.width.value = b.dataset.w;
    refs.height.value = b.dataset.h;
    $$('.res-button').forEach(x => x.classList.toggle('active', x === b));
  }));
  refs.model.addEventListener('change', updateModelSupport);
  refs.steps.addEventListener('input', updateRanges);
  refs.scale.addEventListener('input', updateRanges);
  $('#strengthInput').addEventListener('input', updateRanges);
  $('#noiseInput').addEventListener('input', updateRanges);
  $('#randomSeed').addEventListener('click', () => refs.seed.value = randomSeed());
  $('#resetSettings').addEventListener('click', resetSettings);
  $('#addCharacter').addEventListener('click', addCharacter);
  $('#preciseInput').addEventListener('change', e => addReferenceFiles(e.target.files, 'precise'));
  $('#vibeInput').addEventListener('change', e => addReferenceFiles(e.target.files, 'vibe'));
  $('#baseImageInput').addEventListener('change', async e => { state.baseImage = await readImageFile(e.target.files[0]); renderSource('#basePreview', state.baseImage); });
  $('#maskInput').addEventListener('change', async e => { state.maskImage = await readImageFile(e.target.files[0]); renderSource('#maskPreview', state.maskImage); });
  $('#toolImageInput').addEventListener('change', async e => { state.toolImage = await readImageFile(e.target.files[0]); renderSource('#toolPreview', state.toolImage); });
  $$('[data-image-mode]').forEach(b => b.addEventListener('click', () => {
    state.imageMode = b.dataset.imageMode;
    $$('[data-image-mode]').forEach(x => x.classList.toggle('active', x === b));
    $('#maskArea').classList.toggle('hidden', state.imageMode !== 'inpaint');
  }));
  $$('.tool-buttons button').forEach(b => b.addEventListener('click', () => runDirectorTool(b.dataset.tool)));
  $('#useSelectedForTool').addEventListener('click', useSelectedForTool);
  refs.generate.addEventListener('click', generate);
  [refs.promptPrefix, refs.promptMain, refs.promptSuffix].forEach(input => {
    input.addEventListener('input', onPromptInput);
    input.addEventListener('focus', () => state.activePromptField = input);
  });
  refs.promptMain.addEventListener('focus', () => state.activePromptField = refs.promptMain);
  $('#authButton').addEventListener('click', () => state.token ? disconnect() : showAuth());
  $('#anlasButton').addEventListener('click', () => state.token ? refreshSubscription() : showAuth());
  $('[data-close-modal]').addEventListener('click', hideAuth);
  $('#authModal').addEventListener('click', e => { if (e.target.id === 'authModal') hideAuth(); });
  $$('[data-auth-tab]').forEach(b => b.addEventListener('click', () => switchAuth(b.dataset.authTab)));
  $('#tokenForm').addEventListener('submit', connectToken);
  $('#passwordForm').addEventListener('submit', connectPassword);
  $('#collapseHistory').addEventListener('click', () => {
    document.body.classList.toggle('history-collapsed');
    $('#collapseHistory').textContent = document.body.classList.contains('history-collapsed') ? '‹' : '›';
  });
  $('#clearHistory').addEventListener('click', clearHistory);
  $('#zoomIn').addEventListener('click', () => setZoom(state.zoom + .1));
  $('#zoomOut').addEventListener('click', () => setZoom(state.zoom - .1));
  $('#fitView').addEventListener('click', () => setZoom(1));
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate();
    if (e.key === 'Escape') { hideAuth(); hideSuggestions(); }
  });
  document.addEventListener('click', e => {
    if (!$('#tagSuggestions').contains(e.target) && !e.target.closest('.prompt-wrap')) hideSuggestions();
  });
}

function switchTab(name) {
  $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab-page').forEach(p => p.classList.toggle('active', p.dataset.page === name));
}

function updateRanges() {
  $('#stepsOut').value = refs.steps.value;
  $('#scaleOut').value = Number(refs.scale.value).toFixed(1);
  $('#strengthOut').value = Number($('#strengthInput').value).toFixed(2);
  $('#noiseOut').value = Number($('#noiseInput').value).toFixed(2);
}

function resetSettings() {
  refs.width.value = 832; refs.height.value = 1216; refs.steps.value = 28; refs.scale.value = 6;
  refs.sampler.value = 'k_euler'; refs.scheduler.value = 'karras'; refs.quality.checked = true;
  refs.alpha.checked = false; refs.variety.checked = true; refs.cfgRescale.value = 0; refs.samples.value = 1;
  refs.seed.value = -1; refs.ucPreset.value = 0; refs.promptPrefix.value = ''; refs.promptMain.value = '';
  refs.promptSuffix.value = ''; refs.negative.value = '';
  updateRanges(); updateModelSupport(); onPromptInput(); toast('설정을 초기화했습니다.');
}

function modelId() { return refs.model.value; }
function support(model = modelId()) { return MODEL_SUPPORT[model] || MODEL_SUPPORT['nai-diffusion-4-5-curated']; }
function isV5(model = modelId()) { return model.startsWith('nai-diffusion-5'); }
function isV45(model = modelId()) { return model.startsWith('nai-diffusion-4-5'); }
function canVibe(model = modelId()) { return !!support(model).vibe; }
function canPrecise(model = modelId()) { return !!support(model).precise; }
function canAutocomplete(model = modelId()) { return !!support(model).autocomplete; }
function canAlpha(model = modelId()) { return !!support(model).alpha; }

function updateModelSupport() {
  const model = modelId();
  const autocompleteOn = canAutocomplete(model), preciseOn = canPrecise(model), vibeOn = canVibe(model), alphaOn = canAlpha(model);
  $('#referenceTabButton').classList.toggle('hidden', !(preciseOn || vibeOn));
  if (!(preciseOn || vibeOn) && $('.tab.active')?.dataset.tab === 'reference') switchTab('prompt');
  $('#preciseCard').classList.toggle('hidden', !preciseOn);
  $('#vibeCard').classList.toggle('hidden', !vibeOn);
  $('#referenceNotice').classList.toggle('hidden', preciseOn || vibeOn);
  $('#alphaToggleRow').classList.toggle('hidden', !alphaOn);
  if (!alphaOn) refs.alpha.checked = false;
  $('#autocompleteHelp').classList.toggle('hidden', !autocompleteOn);
  $('#autocompleteDisabledHelp').classList.toggle('hidden', autocompleteOn);
  if (!autocompleteOn) hideSuggestions();
  $('#promptAutocompleteBadge').textContent = autocompleteOn ? '자동완성 사용 가능' : '자동완성 미지원';
  $('#promptAutocompleteBadge').classList.toggle('disabled', !autocompleteOn);
}

function randomSeed() { return Math.floor(Math.random() * 4294967288); }
function normalizeSeed() { const n = Number(refs.seed.value); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : randomSeed(); }
function snap64(n) { return Math.max(64, Math.min(4096, Math.round(Number(n || 64) / 64) * 64)); }
function appendTags(base, extra) { return [base.trim(), extra?.trim()].filter(Boolean).join(', '); }
function composePositivePrompt() {
  return [refs.promptPrefix.value, refs.promptMain.value, refs.promptSuffix.value].map(v => String(v || '').trim()).filter(Boolean).join(', ');
}

function addCharacter() {
  const max = isV5() ? 22 : 6;
  if (state.characters.length >= max) return toast(`현재 모델은 캐릭터 프롬프트를 최대 ${max}개까지 지원합니다.`, 'error');
  state.characters.push({ name: `캐릭터 ${state.characters.length + 1}`, prompt: '', negative: '', x: .5, y: .5 });
  renderCharacters();
}

function renderCharacters() {
  const root = $('#characterList'); root.innerHTML = '';
  state.characters.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'character-item';
    row.innerHTML = `<span class="num">${i + 1}</span><label><span>이름</span><input data-k="name" value="${escapeAttr(c.name)}"></label><label><span>프롬프트</span><textarea data-k="prompt">${escapeHtml(c.prompt)}</textarea></label><label><span>네거티브</span><textarea data-k="negative">${escapeHtml(c.negative)}</textarea></label><label><span>X (0–1)</span><input data-k="x" type="number" min="0" max="1" step="0.01" value="${c.x}"></label><label><span>Y (0–1)</span><input data-k="y" type="number" min="0" max="1" step="0.01" value="${c.y}"></label><button class="remove-char" title="삭제">×</button>`;
    $$('[data-k]', row).forEach(input => input.addEventListener('input', () => {
      const k = input.dataset.k; c[k] = ['x', 'y'].includes(k) ? Math.max(0, Math.min(1, Number(input.value))) : input.value;
    }));
    $('.remove-char', row).addEventListener('click', () => { state.characters.splice(i, 1); renderCharacters(); });
    root.append(row);
  });
  $('#charCount').textContent = state.characters.length;
  if (!state.characters.length) root.innerHTML = '<div class="history-empty">+ 캐릭터 버튼으로 캐릭터별 프롬프트를 추가하세요.</div>';
}

async function addReferenceFiles(fileList, type) {
  if (type === 'precise' && !canPrecise()) return toast('Precise Reference는 현재 모델에서 지원되지 않습니다.', 'error');
  if (type === 'vibe' && !canVibe()) return toast('Vibe Transfer는 현재 모델에서 지원되지 않습니다.', 'error');
  for (const file of [...fileList].slice(0, 8)) {
    const image = await readImageFile(file); if (!image) continue;
    if (type === 'precise') state.preciseRefs.push({ ...image, type: 'character', strength: 1, fidelity: 1 });
    else state.vibeRefs.push({ ...image, strength: .6, information: 1 });
  }
  renderReferences();
}

function renderReferences() { renderRefList('precise'); renderRefList('vibe'); $('#refCount').textContent = state.preciseRefs.length + state.vibeRefs.length; }
function renderRefList(type) {
  const arr = type === 'precise' ? state.preciseRefs : state.vibeRefs, root = $(`#${type}List`); root.innerHTML = '';
  arr.forEach((ref, i) => {
    const el = document.createElement('div'); el.className = 'ref-item';
    const controls = type === 'precise' ? `<label>종류<select data-k="type"><option value="character" ${ref.type === 'character' ? 'selected' : ''}>캐릭터</option><option value="style" ${ref.type === 'style' ? 'selected' : ''}>스타일</option><option value="character&style" ${ref.type === 'character&style' ? 'selected' : ''}>캐릭터 + 스타일</option></select></label><label>강도<input data-k="strength" type="number" min="0" max="1" step="0.05" value="${ref.strength}"></label><label>충실도<input data-k="fidelity" type="number" min="0" max="1" step="0.05" value="${ref.fidelity}"></label>` : `<label>강도<input data-k="strength" type="number" min="0" max="1" step="0.05" value="${ref.strength}"></label><label>정보 추출량<input data-k="information" type="number" min="0" max="1" step="0.05" value="${ref.information}"></label>`;
    el.innerHTML = `<img src="${ref.dataUrl}"><div class="ref-controls">${controls}</div><button class="ref-remove">×</button>`;
    $$('[data-k]', el).forEach(input => input.addEventListener('change', () => { ref[input.dataset.k] = input.type === 'number' ? Number(input.value) : input.value; }));
    $('.ref-remove', el).addEventListener('click', () => { arr.splice(i, 1); renderReferences(); }); root.append(el);
  });
}

async function buildPayload() {
  let prompt = composePositivePrompt();
  const model = modelId(), mode = refs.mode.value;
  if (mode === 'fur' && !prompt.toLowerCase().includes('fur dataset')) prompt = appendTags('fur dataset', prompt);
  if (mode === 'background' && !prompt.toLowerCase().includes('background dataset')) prompt = appendTags('background dataset', prompt);
  if (refs.quality.checked) prompt = appendTags(prompt, QUALITY[model] || 'masterpiece, very aesthetic');
  if (refs.alpha.checked && canAlpha(model)) prompt = appendTags(prompt, 'transparent background, has alpha, alpha transparency');

  let negative = appendTags(UC[Number(refs.ucPreset.value)] || UC[0], refs.negative.value.trim());
  const seed = normalizeSeed(), width = snap64(refs.width.value), height = snap64(refs.height.value), chars = state.characters.filter(c => c.prompt.trim());
  const parameters = { width, height, n_samples: Math.max(1, Math.min(4, Number(refs.samples.value || 1))), seed, extra_noise_seed: seed, sampler: refs.sampler.value, steps: Number(refs.steps.value), scale: Number(refs.scale.value), cfg_rescale: Number(refs.cfgRescale.value || 0), noise_schedule: refs.scheduler.value, legacy: false, legacy_v3_extend: false, params_version: support(model).paramsVersion };
  if (refs.sampler.value === 'k_euler_ancestral') { parameters.deliberate_euler_ancestral_bug = false; parameters.prefer_brownian = true; }
  if (refs.variety.checked && isV45(model)) parameters.skip_cfg_above_sigma = 58;

  const charCaptions = chars.map(c => ({ char_caption: c.prompt, centers: [{ x: c.x, y: c.y }] }));
  const negCharCaptions = chars.map(c => ({ char_caption: c.negative || '', centers: [{ x: c.x, y: c.y }] }));
  parameters.add_original_image = true; parameters.legacy_uc = false;
  parameters.v4_prompt = { caption: { base_caption: prompt, char_captions: charCaptions }, use_coords: chars.length > 0, use_order: true, legacy_uc: false };
  parameters.v4_negative_prompt = { caption: { base_caption: negative, char_captions: negCharCaptions }, use_coords: false, use_order: false, legacy_uc: false };

  if (canPrecise(model) && state.preciseRefs.length) {
    parameters.director_reference_images = state.preciseRefs.map(r => r.base64);
    parameters.director_reference_descriptions = state.preciseRefs.map(r => ({ caption: { base_caption: r.type, char_captions: [] }, legacy_uc: false }));
    parameters.director_reference_information_extracted = state.preciseRefs.map(() => 1);
    parameters.director_reference_strength_values = state.preciseRefs.map(r => Number(r.strength));
    parameters.director_reference_secondary_strength_values = state.preciseRefs.map(r => 1 - Number(r.fidelity));
  } else if (canVibe(model) && state.vibeRefs.length) {
    const tokens = [];
    for (let i = 0; i < state.vibeRefs.length; i++) {
      setBusy(true, `Vibe 인코딩 ${i + 1}/${state.vibeRefs.length}`);
      const r = state.vibeRefs[i], response = await api('/api/nai/encode-vibe', { image: r.base64, information_extracted: Number(r.information), model }, true);
      tokens.push(arrayBufferToBase64(await response.arrayBuffer()));
    }
    parameters.reference_image_multiple = tokens;
    parameters.reference_strength_multiple = state.vibeRefs.map(r => Number(r.strength));
    parameters.normalize_reference_strength_multiple = true;
  }

  let action = 'generate', payloadModel = model;
  if (state.baseImage && currentImageTabActive()) {
    if (state.imageMode === 'img2img') {
      action = 'img2img'; parameters.image = state.baseImage.base64; parameters.strength = Number($('#strengthInput').value); parameters.noise = Number($('#noiseInput').value);
    } else {
      if (!state.maskImage) throw new Error('Inpaint 마스크를 먼저 업로드하세요.');
      action = 'infill'; parameters.image = state.baseImage.base64; parameters.mask = state.maskImage.base64; parameters.add_original_image = true;
      parameters.inpaintImg2ImgStrength = Number($('#strengthInput').value); parameters.noise = Number($('#noiseInput').value); payloadModel = inpaintModel(model);
    }
  }
  return { input: prompt, model: payloadModel, action, parameters };
}

function currentImageTabActive() { return $('.tab.active')?.dataset.tab === 'image'; }
function inpaintModel(model) {
  if (model === 'nai-diffusion-5-curated') return 'nai-diffusion-4-5-curated-inpainting';
  if (model === 'nai-diffusion-5-full') return 'nai-diffusion-5-full-inpainting';
  if (model.endsWith('-inpainting')) return model;
  return `${model}-inpainting`;
}

async function generate() {
  if (state.busy) return; if (!state.token) return showAuth(); if (!composePositivePrompt().trim() && !state.baseImage) return toast('프롬프트를 입력하세요.', 'error');
  try {
    setBusy(true, '준비 중'); const payload = await buildPayload(); setBusy(true, '생성 중');
    const response = await api('/api/nai/generate', payload, true), images = await extractImages(response, `NAI_${Date.now()}`);
    if (!images.length) throw new Error('API 응답에서 이미지를 찾지 못했습니다.');
    addResults(images, { model: payload.model, prompt: payload.input, action: payload.action, seed: payload.parameters.seed }); refs.seed.value = -1; refreshSubscription(true);
  } catch (error) { toast(cleanError(error), 'error', 6000); } finally { setBusy(false); }
}

async function runDirectorTool(tool) {
  if (state.busy) return; if (!state.token) return showAuth(); if (!state.toolImage) return toast('Director Tool 원본 이미지를 선택하세요.', 'error');
  try {
    setBusy(true, `${tool} 실행 중`); const src = state.toolImage; let response;
    if (tool.startsWith('upscale')) { const scale = tool === 'upscale4' ? 4 : 2; response = await api('/api/nai/upscale', { image: src.base64, width: src.width, height: src.height, scale }, true); }
    else {
      const body = { req_type: tool, width: src.width, height: src.height, image: src.base64 };
      if (tool === 'colorize') { body.prompt = $('#toolPrompt').value; body.defry = Number($('#toolDefry').value || 0); }
      if (tool === 'emotion') { body.prompt = `${$('#emotionSelect').value};;${$('#toolPrompt').value}`; body.defry = Number($('#toolDefry').value || 0); }
      response = await api('/api/nai/augment', body, true);
    }
    const images = await extractImages(response, `NAI_${tool}_${Date.now()}`); addResults(images, { model: 'Director Tool', prompt: tool, action: tool, seed: null }); switchTab('prompt'); refreshSubscription(true);
  } catch (error) { toast(cleanError(error), 'error', 6000); } finally { setBusy(false); }
}

async function useSelectedForTool() { if (!state.selectedResult) return toast('먼저 생성 결과 하나를 클릭해 선택하세요.', 'error'); state.toolImage = await readBlobAsImage(state.selectedResult.blob, state.selectedResult.filename); renderSource('#toolPreview', state.toolImage); toast('선택한 결과를 Tool Source로 지정했습니다.', 'ok'); }
function addResults(images, meta) {
  refs.empty.classList.add('hidden'); refs.viewer.classList.remove('empty'); const group = document.createElement('div'); group.className = 'result-group';
  images.forEach(image => {
    const result = { ...image, ...meta, id: crypto.randomUUID(), pinned: false, createdAt: Date.now() }; state.results.unshift(result); state.selectedResult = result;
    const card = document.createElement('div'); card.className = 'result-card selected'; card.dataset.id = result.id;
    card.innerHTML = `<img src="${result.url}" alt="Generated image"><div class="result-actions"><button data-a="pin" title="고정">☆</button><button data-a="tool" title="도구로 보내기">↗</button><button data-a="download" title="다운로드">↓</button></div>`;
    $('img', card).addEventListener('click', () => selectResult(result.id)); $('[data-a=pin]', card).addEventListener('click', e => { e.stopPropagation(); togglePin(result.id); });
    $('[data-a=tool]', card).addEventListener('click', async e => { e.stopPropagation(); selectResult(result.id); await useSelectedForTool(); switchTab('tools'); }); $('[data-a=download]', card).addEventListener('click', e => { e.stopPropagation(); downloadResult(result); });
    $$('.result-card').forEach(x => x.classList.remove('selected')); group.append(card);
  });
  refs.results.prepend(group); renderHistory(); setZoom(state.zoom); toast(`${images.length}개 이미지 생성 완료`, 'ok');
}
function selectResult(id) { state.selectedResult = state.results.find(r => r.id === id) || null; $$('.result-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id)); }
function togglePin(id) { const r = state.results.find(x => x.id === id); if (!r) return; r.pinned = !r.pinned; renderPins(); renderHistory(); }
function renderPins() { const root = $('#pinStrip'); root.innerHTML = ''; const pins = state.results.filter(r => r.pinned); root.classList.toggle('hidden', !pins.length); pins.slice(0, 12).forEach(r => { const img = new Image(); img.src = r.url; img.title = r.prompt; img.addEventListener('click', () => selectResult(r.id)); root.append(img); }); }
function renderHistory() { refs.history.innerHTML = ''; if (!state.results.length) return refs.history.innerHTML = '<div class="history-empty">생성한 이미지가 여기에 표시됩니다.</div>'; state.results.slice(0, 100).forEach(r => { const el = document.createElement('div'); el.className = `history-thumb${r.pinned ? ' pinned' : ''}`; el.innerHTML = `<img src="${r.url}" title="${escapeAttr(r.prompt)}">`; el.addEventListener('click', () => { switchTab('prompt'); selectResult(r.id); }); refs.history.append(el); }); }
function clearHistory() { state.results.forEach(r => URL.revokeObjectURL(r.url)); state.results = []; state.selectedResult = null; refs.results.innerHTML = ''; refs.empty.classList.remove('hidden'); refs.viewer.classList.add('empty'); renderHistory(); renderPins(); }
function downloadResult(r) { const a = document.createElement('a'); a.href = r.url; a.download = r.filename || 'novelai.png'; a.click(); }

async function extractImages(response, prefix) {
  const blob = await response.blob(), type = response.headers.get('content-type') || blob.type || '', bytes = new Uint8Array(await blob.arrayBuffer()), isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (isZip && window.JSZip) {
    const zip = await window.JSZip.loadAsync(bytes), out = []; let index = 0;
    for (const entry of Object.values(zip.files)) { if (entry.dir) continue; const fileBlob = await entry.async('blob'), mimeBlob = fileBlob.type ? fileBlob : new Blob([fileBlob], { type: 'image/png' }); out.push({ blob: mimeBlob, url: URL.createObjectURL(mimeBlob), filename: `${prefix}_${index++}.png` }); }
    return out;
  }
  if (type.includes('image') || bytes.length > 8) { const imageBlob = new Blob([bytes], { type: type.includes('image') ? type : 'image/png' }); return [{ blob: imageBlob, url: URL.createObjectURL(imageBlob), filename: `${prefix}.png` }]; }
  return [];
}

async function api(path, body = {}, binary = false, method = 'POST') {
  if (!state.token && !path.startsWith('/api/auth/')) throw new Error('NovelAI에 로그인되어 있지 않습니다.');
  const init = { method, headers: {} }; if (state.token) init.headers['X-NAI-Token'] = state.token;
  if (method !== 'GET') { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  const response = await fetch(path, init);
  if (!response.ok) { let message = `${response.status} ${response.statusText}`; try { const data = await response.json(); message = data.error || data.message || message; } catch {} if (response.status === 401 || response.status === 403) message += ' — 토큰/구독 상태를 확인하세요.'; throw new Error(message); }
  return binary ? response : response.json();
}

async function refreshSubscription(silent = false) { if (!state.token) return; try { const data = await api('/api/nai/subscription'); state.subscription = data.subscription; updateAuthUi(); if (!silent) toast('Anlas 잔량을 갱신했습니다.', 'ok'); } catch (e) { if (!silent) toast(cleanError(e), 'error'); } }
function updateAuthUi() { $('#authButton').textContent = state.token ? '연결 해제' : '로그인'; if (state.subscription) { $('#anlasValue').textContent = Number(state.subscription.anlas).toLocaleString(); $('#tierValue').textContent = state.subscription.tierName; } else { $('#anlasValue').textContent = state.token ? '…' : '—'; $('#tierValue').textContent = state.token ? '확인 중' : '로그인 필요'; } }
function showAuth() { $('#authModal').classList.remove('hidden'); $('#authError').classList.add('hidden'); }
function hideAuth() { $('#authModal').classList.add('hidden'); }
function switchAuth(tab) { $$('[data-auth-tab]').forEach(b => b.classList.toggle('active', b.dataset.authTab === tab)); $('#tokenForm').classList.toggle('hidden', tab !== 'token'); $('#passwordForm').classList.toggle('hidden', tab !== 'password'); }
async function connectToken(e) { e.preventDefault(); const token = $('#tokenInput').value.trim(); if (!token) return authError('토큰을 입력하세요.'); try { setAuthBusy(true); state.token = token; const data = await api('/api/auth/token'); state.subscription = data.subscription; storeToken(token, $('#rememberToken').checked); updateAuthUi(); hideAuth(); toast('NovelAI 연결 완료', 'ok'); } catch (err) { state.token = ''; authError(cleanError(err)); } finally { setAuthBusy(false); } }
async function connectPassword(e) { e.preventDefault(); const email = $('#emailInput').value.trim(), password = $('#passwordInput').value; if (!email || !password) return authError('ID/이메일과 비밀번호를 입력하세요.'); try { setAuthBusy(true); const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }), data = await response.json(); if (!response.ok) throw new Error(data.error || '로그인에 실패했습니다.'); state.token = data.accessToken; state.subscription = data.subscription; storeToken(state.token, false); $('#passwordInput').value = ''; updateAuthUi(); hideAuth(); toast('NovelAI 로그인 완료', 'ok'); } catch (err) { authError(cleanError(err)); } finally { setAuthBusy(false); $('#passwordInput').value = ''; } }
function storeToken(token, remember) { sessionStorage.setItem('naiToken', token); if (remember) localStorage.setItem('naiToken', token); else localStorage.removeItem('naiToken'); }
function disconnect() { state.token = ''; state.subscription = null; sessionStorage.removeItem('naiToken'); localStorage.removeItem('naiToken'); updateAuthUi(); toast('연결을 해제했습니다.'); }
function authError(message) { $('#authError').textContent = message; $('#authError').classList.remove('hidden'); }
function setAuthBusy(busy) { $$('.auth-form button[type=submit]').forEach(b => b.disabled = busy); }

let suggestTimer;
function onPromptInput() { $('#promptLength').textContent = composePositivePrompt().length; clearTimeout(suggestTimer); if (!state.activePromptField) state.activePromptField = refs.promptMain; suggestTimer = setTimeout(() => suggestTags(false), 200); }
function getLastQuery(text) { return String(text || '').split(',').pop().trim(); }
function localPromptMatches(query) {
  const q = query.trim().toLowerCase(); if (!q) return [];
  return PROMPT_LIBRARY.filter(item => [item.tag, item.ko, ...(item.aliases || [])].join(' ').toLowerCase().includes(q)).slice(0, 12).map(item => ({ tag: item.tag, label: item.ko, source: '목록', score: 0 }));
}
async function officialPromptMatches(query) {
  const params = new URLSearchParams({ model: modelId(), prompt: query, lang: 'en' });
  const response = await fetch(`/api/nai/tags?${params}`, { headers: { 'X-NAI-Token': state.token } }); if (!response.ok) return [];
  const data = await response.json();
  return (data.tags || []).slice(0, 12).map(item => { const tag = typeof item === 'string' ? item : (item.tag || item.value || item.name || ''), count = typeof item === 'object' ? (item.count ?? item.confidence ?? '') : '', local = PROMPT_LIBRARY.find(x => x.tag === tag); return { tag, label: local?.ko || tag, source: '공식', score: count }; }).filter(x => x.tag);
}
async function suggestTags(force) {
  if (!state.token || !canAutocomplete()) return hideSuggestions();
  const field = state.activePromptField || refs.promptMain, q = getLastQuery(field.value); if (!force && q.length < 1) return hideSuggestions();
  try {
    const [local, official] = await Promise.all([Promise.resolve(localPromptMatches(q)), q.length >= 2 ? officialPromptMatches(q) : Promise.resolve([])]), merged = [], seen = new Set();
    [...official, ...local].forEach(item => { if (!item?.tag) return; const key = item.tag.toLowerCase(); if (seen.has(key)) return; seen.add(key); merged.push(item); });
    renderSuggestions(merged, field);
  } catch { hideSuggestions(); }
}
function renderSuggestions(items, field) {
  const root = $('#tagSuggestions'); root.innerHTML = ''; if (!items.length) return hideSuggestions();
  items.slice(0, 16).forEach(item => {
    const b = document.createElement('button');
    b.innerHTML = `<div><strong>${escapeHtml(item.label || item.tag)}</strong><small>${escapeHtml(item.tag)}</small></div><span class="suggest-meta">${escapeHtml(String(item.source || ''))}${item.score !== '' ? ` · ${escapeHtml(String(item.score))}` : ''}</span>`;
    b.addEventListener('mousedown', e => { e.preventDefault(); const target = field || refs.promptMain, parts = String(target.value || '').split(','); parts[parts.length - 1] = ` ${item.tag}`; target.value = parts.join(',').replace(/^\s+/, '') + ', '; target.focus(); state.activePromptField = target; hideSuggestions(); onPromptInput(); });
    root.append(b);
  });
  root.classList.remove('hidden');
}
function hideSuggestions() { $('#tagSuggestions').classList.add('hidden'); }

function setBusy(busy, label = '생성') { state.busy = busy; refs.generate.disabled = busy; refs.generate.querySelector('span:nth-child(2)').textContent = busy ? label : '생성'; }
function setZoom(value) { state.zoom = Math.max(.4, Math.min(2, value)); refs.results.style.transform = `scale(${state.zoom})`; $('#zoomValue').textContent = `${Math.round(state.zoom * 100)}%`; }
function toast(message, type = '', duration = 3600) { const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = message; $('#toastLayer').append(el); setTimeout(() => el.remove(), duration); }
function cleanError(e) { const m = e?.message || String(e); try { const parsed = JSON.parse(m); return parsed.message || parsed.error || m; } catch { return m; } }
function escapeHtml(s = '') { return String(s).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function escapeAttr(s = '') { return escapeHtml(s).replace(/`/g, '&#96;'); }
function arrayBufferToBase64(buffer) { const bytes = new Uint8Array(buffer); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); }
async function readImageFile(file) { if (!file) return null; return readBlobAsImage(file, file.name); }
async function readBlobAsImage(blob, name = 'image.png') { const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob); }), img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = dataUrl; }); return { name, dataUrl, base64: dataUrl.split(',')[1], width: img.naturalWidth, height: img.naturalHeight, blob }; }
function renderSource(selector, image) { const root = $(selector); root.innerHTML = image ? `<img src="${image.dataUrl}" alt="source"><div class="setting-label">${image.width} × ${image.height}</div>` : ''; }

init();

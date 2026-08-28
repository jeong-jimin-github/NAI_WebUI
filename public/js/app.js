import {
  DEFAULT_MODEL,
  EMOTIONS,
  MODELS,
  RESOLUTIONS,
  SAMPLERS,
  SCHEDULES,
  UC_PRESETS,
  estimateAnlas,
  modelById,
} from './config.js';
import { NaiClient } from './api.js';
import { blobToImage, escapeHtml, fileToImage, saveBlob, toast, unpackImages } from './media.js';
import { buildGenerateRequest, currentPositive } from './payload.js';
import { forgetResults, loadPresets, persistToken, savePresets, selectedResult, session } from './state.js';
import { hideSuggestions, onSuggestKeys, prefetchCommunity, scheduleSuggest } from './tags.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const client = new NaiClient();

function fields() {
  return {
    model: $('#modelSelect').value,
    dataset: $('#datasetSelect').value,
    prefix: $('#promptPrefix').value,
    main: $('#promptMain').value,
    suffix: $('#promptSuffix').value,
    negative: $('#promptNegative').value,
    quality: $('#qualityToggle').checked,
    alpha: $('#alphaToggle').checked,
    uc: $('#ucSelect').value,
    width: $('#widthInput').value,
    height: $('#heightInput').value,
    steps: $('#stepsInput').value,
    scale: $('#scaleInput').value,
    sampler: $('#samplerSelect').value,
    seed: Number($('#seedInput').value),
    schedule: $('#scheduleSelect').value,
    cfgRescale: $('#cfgRescale').value,
    samples: $('#samplesInput').value,
    variety: $('#varietyToggle').checked,
    strength: $('#strengthInput').value,
    noise: $('#noiseInput').value,
  };
}

function fillSelect(node, pairs, asObjects = false) {
  node.innerHTML = '';
  for (const item of pairs) {
    const option = document.createElement('option');
    if (asObjects) {
      option.value = item.id;
      option.textContent = item.label;
    } else {
      option.value = item[0];
      option.textContent = item[1];
    }
    node.append(option);
  }
}

function syncAuth() {
  $('#authBtn').textContent = session.token ? 'Logout' : 'Login';
  if (session.subscription) {
    $('#anlasAmount').textContent = Number(session.subscription.anlas).toLocaleString();
    $('#tierLabel').textContent = `${session.subscription.tierName} Tier`;
  } else {
    $('#anlasAmount').textContent = session.token ? '…' : '—';
    $('#tierLabel').textContent = session.token ? (session.degraded ? 'Connected (limited)' : 'Connected') : 'Not signed in';
  }
  syncCost();
}

function syncCost() {
  const f = fields();
  const n = Math.max(1, Math.min(4, Number(f.samples) || 1));
  $('#generateLabel').textContent = session.busy ? $('#generateLabel').textContent : `Generate ${n} Image${n === 1 ? '' : 's'}`;
  const opus = session.subscription?.tier === 3;
  const action = session.baseImage ? (session.imageMode === 'inpaint' ? 'infill' : 'img2img') : 'generate';
  $('#generateCost').textContent = String(estimateAnlas({
    width: f.width, height: f.height, steps: f.steps, samples: n, action, opus,
  }));
}

function syncModelUi() {
  const model = modelById($('#modelSelect').value);
  $('#preciseCard').classList.toggle('is-hidden', !model.precise);
  $('#vibeCard').classList.toggle('is-hidden', !model.vibe);
  $('#refNotice').classList.toggle('is-hidden', model.precise || model.vibe);
  $('#alphaRow').classList.toggle('is-hidden', !model.alpha);
  $('#varietyRow').classList.toggle('is-hidden', model.family !== 'v45');
  if (!model.alpha) $('#alphaToggle').checked = false;
}

function setBusy(busy, label) {
  session.busy = busy;
  $('#generateBtn').disabled = busy;
  $('#generateBtn').setAttribute('aria-busy', busy ? 'true' : 'false');
  const n = Math.max(1, Number($('#samplesInput').value) || 1);
  $('#generateLabel').textContent = busy ? (label || 'Working…') : `Generate ${n} Image${n === 1 ? '' : 's'}`;
}

function showAuth() {
  $('#authDialog').classList.remove('is-hidden');
  $('#authError').classList.add('is-hidden');
}

function hideAuth() {
  $('#authDialog').classList.add('is-hidden');
}

function authFail(message) {
  $('#authError').textContent = message;
  $('#authError').classList.remove('is-hidden');
}

function bindDrop(zone, input, onFiles) {
  zone.addEventListener('dragover', event => {
    event.preventDefault();
    zone.classList.add('is-hot');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-hot'));
  zone.addEventListener('drop', event => {
    event.preventDefault();
    zone.classList.remove('is-hot');
    onFiles(event.dataTransfer.files);
  });
  input.addEventListener('change', event => onFiles(event.target.files));
}

function preview(selector, image) {
  const root = $(selector);
  root.innerHTML = image
    ? `<img src="${image.dataUrl}" alt="source"><div class="kicker">${image.width} × ${image.height}</div>`
    : '';
}

function renderCharacters() {
  const root = $('#charList');
  root.innerHTML = '';
  session.characters.forEach((item, index) => {
    const node = document.createElement('div');
    node.className = 'char';
    node.innerHTML = `
      <span class="idx">${index + 1}</span>
      <label><span>Name</span><input data-k="name" value="${escapeHtml(item.name)}"></label>
      <label><span>Prompt</span><textarea data-k="prompt">${escapeHtml(item.prompt)}</textarea></label>
      <label><span>Undesired</span><textarea data-k="uc">${escapeHtml(item.uc)}</textarea></label>
      <label><span>X (0–1)</span><input data-k="x" type="number" min="0" max="1" step="0.01" value="${item.x}"></label>
      <label><span>Y (0–1)</span><input data-k="y" type="number" min="0" max="1" step="0.01" value="${item.y}"></label>
      <button type="button" class="kill" aria-label="Remove">×</button>
    `;
    $$('[data-k]', node).forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.k;
        item[key] = key === 'x' || key === 'y'
          ? Math.max(0, Math.min(1, Number(input.value)))
          : input.value;
      });
    });
    $('.kill', node).addEventListener('click', () => {
      session.characters.splice(index, 1);
      renderCharacters();
    });
    root.append(node);
  });
  $('#charCount').textContent = String(session.characters.length);
  if (!session.characters.length) {
    root.innerHTML = '<div class="muted">Use + to add a character prompt.</div>';
  }
}

function renderRefs() {
  drawRefList('precise', session.precise, true);
  drawRefList('vibe', session.vibes, false);
  $('#refCount').textContent = String(session.precise.length + session.vibes.length);
}

function drawRefList(kind, list, precise) {
  const root = $(`#${kind}List`);
  root.innerHTML = '';
  list.forEach((item, index) => {
    const node = document.createElement('div');
    node.className = 'ref';
    const controls = precise
      ? `<label>Kind<select data-k="kind">
          <option value="character"${item.kind === 'character' ? ' selected' : ''}>Character</option>
          <option value="style"${item.kind === 'style' ? ' selected' : ''}>Style</option>
          <option value="character&style"${item.kind === 'character&style' ? ' selected' : ''}>Character + Style</option>
        </select></label>
        <label>Strength<input data-k="strength" type="number" min="0" max="1" step="0.05" value="${item.strength}"></label>
        <label>Fidelity<input data-k="fidelity" type="number" min="0" max="1" step="0.05" value="${item.fidelity}"></label>`
      : `<label>Strength<input data-k="strength" type="number" min="0" max="1" step="0.05" value="${item.strength}"></label>
         <label>Information<input data-k="information" type="number" min="0" max="1" step="0.05" value="${item.information}"></label>`;
    node.innerHTML = `<img src="${item.dataUrl}" alt=""><div class="ctrls">${controls}</div><button type="button" class="kill">×</button>`;
    $$('[data-k]', node).forEach(input => {
      input.addEventListener('change', () => {
        item[input.dataset.k] = input.type === 'number' ? Number(input.value) : input.value;
      });
    });
    $('.kill', node).addEventListener('click', () => {
      list.splice(index, 1);
      renderRefs();
    });
    root.append(node);
  });
}

function renderHistory() {
  const root = $('#historyList');
  root.innerHTML = '';
  if (!session.results.length) {
    root.innerHTML = '<div class="muted">Generated images will appear here.</div>';
    return;
  }
  session.results.slice(0, 100).forEach(item => {
    const node = document.createElement('div');
    node.className = `thumb${item.pinned ? ' is-pin' : ''}`;
    node.innerHTML = `<img src="${item.url}" alt="" title="${escapeHtml(item.prompt)}">`;
    node.addEventListener('click', () => selectShot(item.id));
    root.append(node);
  });
}

function renderPins() {
  const root = $('#pinStrip');
  const pins = session.results.filter(item => item.pinned);
  root.innerHTML = '';
  root.classList.toggle('is-hidden', !pins.length);
  pins.slice(0, 12).forEach(item => {
    const img = new Image();
    img.src = item.url;
    img.alt = '';
    img.addEventListener('click', () => selectShot(item.id));
    root.append(img);
  });
}

function selectShot(id) {
  session.selectedId = id;
  $$('.shot').forEach(node => node.classList.toggle('is-on', node.dataset.id === id));
}

function setZoom(value) {
  session.zoom = Math.max(0.4, Math.min(2, value));
  $('#resultList').style.transform = `scale(${session.zoom})`;
  $('#zoomValue').textContent = `${Math.round(session.zoom * 100)}%`;
}

function ingest(images, meta) {
  $('#emptyState').classList.add('is-hidden');
  $('#canvas').classList.remove('is-empty');
  const group = document.createElement('div');
  group.className = 'group';
  images.forEach(image => {
    const item = {
      ...image,
      ...meta,
      id: crypto.randomUUID(),
      pinned: false,
      createdAt: Date.now(),
    };
    session.results.unshift(item);
    session.selectedId = item.id;
    const card = document.createElement('div');
    card.className = 'shot is-on';
    card.dataset.id = item.id;
    card.innerHTML = `<img src="${item.url}" alt="Generated image">
      <div class="acts">
        <button type="button" data-a="pin" title="Pin">Pin</button>
        <button type="button" data-a="tool" title="Send to tools">Tool</button>
        <button type="button" data-a="save" title="Download">Save</button>
      </div>`;
    $('img', card).addEventListener('click', () => selectShot(item.id));
    $('[data-a=pin]', card).addEventListener('click', event => {
      event.stopPropagation();
      item.pinned = !item.pinned;
      renderPins();
      renderHistory();
    });
    $('[data-a=tool]', card).addEventListener('click', async event => {
      event.stopPropagation();
      selectShot(item.id);
      await useSelected();
    });
    $('[data-a=save]', card).addEventListener('click', event => {
      event.stopPropagation();
      saveBlob(item);
    });
    $$('.shot').forEach(node => node.classList.remove('is-on'));
    group.append(card);
  });
  $('#resultList').prepend(group);
  renderHistory();
  setZoom(session.zoom);
  toast(`${images.length}장 생성 완료`, 'ok');
}

async function refreshSubscription(silent = false) {
  if (!session.token) return;
  try {
    const data = await client.subscription();
    session.subscription = data.subscription;
    session.degraded = Boolean(data.degraded);
    syncAuth();
    if (data.warning && !silent) toast(data.warning, 'err');
    else if (!silent) toast('Anlas 잔량을 갱신했습니다.', 'ok');
  } catch (error) {
    if (!silent) toast(error.message || String(error), 'err');
  }
}

async function generate() {
  hideSuggestions();
  if (session.busy) return;
  if (!session.token) return showAuth();
  if (!currentPositive(fields()).trim() && !session.baseImage) {
    return toast('프롬프트를 입력하세요.', 'err');
  }
  try {
    setBusy(true, 'Preparing…');
    const payload = await buildGenerateRequest(fields(), client, label => setBusy(true, label));
    setBusy(true, 'Generating…');
    const response = await client.generate(payload);
    const images = await unpackImages(response, `NAI_${Date.now()}`);
    if (!images.length) throw new Error('API 응답에서 이미지를 찾지 못했습니다.');
    ingest(images, {
      model: payload.model,
      prompt: payload.input,
      action: payload.action,
      seed: payload.parameters.seed,
    });
    $('#seedInput').value = '-1';
    await refreshSubscription(true);
  } catch (error) {
    toast(error.message || String(error), 'err', 6000);
  } finally {
    setBusy(false);
  }
}

async function runTool(tool) {
  if (session.busy) return;
  if (!session.token) return showAuth();
  if (!session.toolImage) return toast('Director Tool 원본 이미지를 선택하세요.', 'err');
  try {
    setBusy(true, `${tool}…`);
    const src = session.toolImage;
    let response;
    if (tool.startsWith('upscale')) {
      response = await client.upscale({
        image: src.base64,
        width: src.width,
        height: src.height,
        scale: tool === 'upscale4' ? 4 : 2,
      });
    } else {
      const body = { req_type: tool, width: src.width, height: src.height, image: src.base64 };
      if (tool === 'colorize') {
        body.prompt = $('#toolPrompt').value;
        body.defry = Number($('#toolDefry').value || 0);
      }
      if (tool === 'emotion') {
        body.prompt = `${$('#emotionSelect').value};;${$('#toolPrompt').value}`;
        body.defry = Number($('#toolDefry').value || 0);
      }
      response = await client.augment(body);
    }
    const images = await unpackImages(response, `NAI_${tool}_${Date.now()}`);
    ingest(images, { model: 'Director Tool', prompt: tool, action: tool, seed: null });
    await refreshSubscription(true);
  } catch (error) {
    toast(error.message || String(error), 'err', 6000);
  } finally {
    setBusy(false);
  }
}

async function useSelected() {
  const item = selectedResult();
  if (!item) return toast('먼저 생성 결과 하나를 클릭해 선택하세요.', 'err');
  session.toolImage = await blobToImage(item.blob, item.filename);
  preview('#toolPreview', session.toolImage);
  toast('선택한 결과를 Tool Source로 지정했습니다.', 'ok');
}

function refreshPresets(selectedId = '') {
  const select = $('#presetSelect');
  const presets = loadPresets().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  select.innerHTML = '<option value="">Prompt presets</option>';
  for (const item of presets) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    select.append(option);
  }
  if (selectedId && presets.some(item => item.id === selectedId)) select.value = selectedId;
}

function applyPreset(item) {
  $('#promptPrefix').value = item.prefix || '';
  $('#promptMain').value = item.main || '';
  $('#promptSuffix').value = item.suffix || '';
  $('#promptNegative').value = item.negative || '';
  onPrompt();
}

function capturePreset(name, id = crypto.randomUUID()) {
  return {
    id,
    name,
    prefix: $('#promptPrefix').value,
    main: $('#promptMain').value,
    suffix: $('#promptSuffix').value,
    negative: $('#promptNegative').value,
    updatedAt: Date.now(),
  };
}

function onPrompt() {
  $('#promptLen').textContent = String(currentPositive(fields()).length);
  const field = session.activeField || $('#promptMain');
  scheduleSuggest(field, {
    token: session.token,
    client,
    modelId: $('#modelSelect').value,
  });
}

function resetSettings() {
  $('#widthInput').value = 832;
  $('#heightInput').value = 1216;
  $('#stepsInput').value = 28;
  $('#scaleInput').value = 6;
  $('#samplerSelect').value = 'k_euler_ancestral';
  $('#scheduleSelect').value = 'karras';
  $('#qualityToggle').checked = true;
  $('#alphaToggle').checked = false;
  $('#varietyToggle').checked = true;
  $('#cfgRescale').value = 0;
  $('#samplesInput').value = 1;
  $('#seedInput').value = -1;
  $('#ucSelect').value = '0';
  $('#promptPrefix').value = '';
  $('#promptMain').value = '';
  $('#promptSuffix').value = '';
  $('#promptNegative').value = '';
  markResolution();
  syncModelUi();
  onPrompt();
  syncCost();
  toast('설정을 초기화했습니다.');
}

function markResolution() {
  const w = Number($('#widthInput').value);
  const h = Number($('#heightInput').value);
  $$('#resolutionGrid button').forEach(button => {
    button.classList.toggle('is-on', Number(button.dataset.w) === w && Number(button.dataset.h) === h);
  });
}

function wire() {
  $$('[data-prompt-pane]').forEach(button => {
    button.addEventListener('click', () => {
      const pos = button.dataset.promptPane === 'pos';
      $$('[data-prompt-pane]').forEach(node => node.classList.toggle('is-on', node === button));
      $('#posPane').classList.toggle('is-hidden', !pos);
      $('#negPane').classList.toggle('is-hidden', pos);
    });
  });
  $('#advancedToggle').addEventListener('click', () => {
    const hide = !$('#prefixWrap').classList.contains('is-hidden');
    $('#prefixWrap').classList.toggle('is-hidden', hide);
    $('#suffixWrap').classList.toggle('is-hidden', hide);
    $('#advancedToggle').textContent = hide ? 'Show prefix / suffix' : 'Hide prefix / suffix';
  });
  $('#modelSelect').addEventListener('change', () => { syncModelUi(); syncCost(); });
  ['stepsInput', 'scaleInput', 'samplesInput', 'widthInput', 'heightInput'].forEach(id => {
    $(`#${id}`).addEventListener('input', syncCost);
  });
  $('#strengthInput').addEventListener('input', () => {
    $('#strengthOut').value = Number($('#strengthInput').value).toFixed(2);
  });
  $('#noiseInput').addEventListener('input', () => {
    $('#noiseOut').value = Number($('#noiseInput').value).toFixed(2);
  });
  $('#randomSeed').addEventListener('click', () => {
    $('#seedInput').value = String(Math.floor(Math.random() * 4294967288));
  });
  $('#swapSize').addEventListener('click', () => {
    const w = $('#widthInput').value;
    $('#widthInput').value = $('#heightInput').value;
    $('#heightInput').value = w;
    markResolution();
    syncCost();
  });
  $('#resetBtn').addEventListener('click', resetSettings);
  $('#addCharBtn').addEventListener('click', () => {
    const cap = modelById($('#modelSelect').value).maxCharacters;
    if (session.characters.length >= cap) {
      return toast(`현재 모델은 캐릭터 프롬프트를 최대 ${cap}개까지 지원합니다.`, 'err');
    }
    session.characters.push({
      name: `Character ${session.characters.length + 1}`,
      prompt: '',
      uc: '',
      x: 0.5,
      y: 0.5,
    });
    renderCharacters();
  });
  $('#coordAi').addEventListener('click', () => {
    session.useCoords = false;
    $('#coordAi').classList.add('is-on');
    $('#coordCustom').classList.remove('is-on');
  });
  $('#coordCustom').addEventListener('click', () => {
    session.useCoords = true;
    $('#coordCustom').classList.add('is-on');
    $('#coordAi').classList.remove('is-on');
  });
  bindDrop($('#preciseDrop'), $('#preciseFile'), async files => {
    const model = modelById($('#modelSelect').value);
    if (!model.precise) return toast('Precise Reference는 현재 모델에서 지원되지 않습니다.', 'err');
    for (const file of [...files].slice(0, 8)) {
      const image = await fileToImage(file);
      if (image) session.precise.push({ ...image, kind: 'character', strength: 1, fidelity: 1 });
    }
    renderRefs();
  });
  bindDrop($('#vibeDrop'), $('#vibeFile'), async files => {
    const model = modelById($('#modelSelect').value);
    if (!model.vibe) return toast('Vibe Transfer는 현재 모델에서 지원되지 않습니다.', 'err');
    for (const file of [...files].slice(0, 8)) {
      const image = await fileToImage(file);
      if (image) session.vibes.push({ ...image, strength: 0.6, information: 1 });
    }
    renderRefs();
  });
  bindDrop($('#baseDrop'), $('#baseFile'), async files => {
    session.baseImage = await fileToImage(files[0]);
    preview('#basePreview', session.baseImage);
    syncCost();
  });
  bindDrop($('#maskDrop'), $('#maskFile'), async files => {
    session.maskImage = await fileToImage(files[0]);
    preview('#maskPreview', session.maskImage);
  });
  bindDrop($('#toolDrop'), $('#toolFile'), async files => {
    session.toolImage = await fileToImage(files[0]);
    preview('#toolPreview', session.toolImage);
  });
  $$('[data-image-mode]').forEach(button => {
    button.addEventListener('click', () => {
      session.imageMode = button.dataset.imageMode;
      $$('[data-image-mode]').forEach(node => node.classList.toggle('is-on', node === button));
      $('#maskWrap').classList.toggle('is-hidden', session.imageMode !== 'inpaint');
      syncCost();
    });
  });
  $$('[data-tool]').forEach(button => {
    button.addEventListener('click', () => runTool(button.dataset.tool));
  });
  $('#useSelectedBtn').addEventListener('click', useSelected);
  $('#generateBtn').addEventListener('click', generate);
  ['promptPrefix', 'promptMain', 'promptSuffix', 'promptNegative'].forEach(id => {
    const input = $(`#${id}`);
    input.addEventListener('input', onPrompt);
    input.addEventListener('focus', () => {
      session.activeField = input;
      scheduleSuggest(input, { token: session.token, client, modelId: $('#modelSelect').value });
    });
    input.addEventListener('keydown', event => onSuggestKeys(event, input));
  });
  $('#authBtn').addEventListener('click', () => {
    if (session.token) {
      persistToken('', false);
      client.setToken('');
      session.subscription = null;
      session.degraded = false;
      syncAuth();
      toast('연결을 해제했습니다.');
    } else showAuth();
  });
  $('#anlasChip').addEventListener('click', () => (session.token ? refreshSubscription() : showAuth()));
  $('#authClose').addEventListener('click', hideAuth);
  $('#authDialog').addEventListener('click', event => {
    if (event.target.id === 'authDialog') hideAuth();
  });
  $$('[data-auth-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.authTab;
      $$('[data-auth-tab]').forEach(node => node.classList.toggle('is-on', node === button));
      $('#tokenForm').classList.toggle('is-hidden', tab !== 'token');
      $('#passwordForm').classList.toggle('is-hidden', tab !== 'password');
    });
  });
  $('#tokenForm').addEventListener('submit', async event => {
    event.preventDefault();
    const token = $('#tokenInput').value.trim();
    if (!token) return authFail('토큰을 입력하세요.');
    try {
      $$('#tokenForm button[type=submit], #passwordForm button[type=submit]').forEach(b => { b.disabled = true; });
      client.setToken(token);
      session.token = token;
      const data = await client.subscription();
      session.subscription = data.subscription;
      session.degraded = Boolean(data.degraded);
      persistToken(token, $('#rememberToken').checked);
      syncAuth();
      hideAuth();
      toast(data.warning || 'NovelAI 연결 완료', data.warning ? 'err' : 'ok');
    } catch (error) {
      persistToken('', false);
      client.setToken('');
      session.token = '';
      authFail(error.message || String(error));
    } finally {
      $$('#tokenForm button[type=submit], #passwordForm button[type=submit]').forEach(b => { b.disabled = false; });
    }
  });
  $('#passwordForm').addEventListener('submit', async event => {
    event.preventDefault();
    const email = $('#emailInput').value.trim();
    const password = $('#passwordInput').value;
    if (!email || !password) return authFail('이메일과 비밀번호를 입력하세요.');
    try {
      $$('#tokenForm button[type=submit], #passwordForm button[type=submit]').forEach(b => { b.disabled = true; });
      const data = await client.login(email, password);
      session.token = data.accessToken;
      session.subscription = data.subscription;
      session.degraded = false;
      persistToken(session.token, false);
      $('#passwordInput').value = '';
      syncAuth();
      hideAuth();
      toast('NovelAI 로그인 완료', 'ok');
    } catch (error) {
      authFail(error.message || String(error));
    } finally {
      $$('#tokenForm button[type=submit], #passwordForm button[type=submit]').forEach(b => { b.disabled = false; });
      $('#passwordInput').value = '';
    }
  });
  $('#collapseHistory').addEventListener('click', () => {
    document.body.classList.toggle('ledger-off');
    $('#collapseHistory').textContent = document.body.classList.contains('ledger-off') ? '‹' : '›';
  });
  $('#clearHistory').addEventListener('click', () => {
    forgetResults();
    $('#resultList').innerHTML = '';
    $('#emptyState').classList.remove('is-hidden');
    $('#canvas').classList.add('is-empty');
    renderHistory();
    renderPins();
  });
  $('#deselectBtn').addEventListener('click', () => {
    session.selectedId = null;
    $$('.shot').forEach(node => node.classList.remove('is-on'));
  });
  $('#zoomIn').addEventListener('click', () => setZoom(session.zoom + 0.1));
  $('#zoomOut').addEventListener('click', () => setZoom(session.zoom - 0.1));
  $('#fitView').addEventListener('click', () => setZoom(1));
  window.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') generate();
    if (event.key === 'Escape') { hideAuth(); hideSuggestions(); }
  });
  document.addEventListener('click', event => {
    if (!$('#suggestBox').contains(event.target) && !event.target.closest('.field')) hideSuggestions();
  });
  $('#railScroll').addEventListener('scroll', () => hideSuggestions(), { passive: true });
  $('#presetLoad').addEventListener('click', () => {
    const item = loadPresets().find(row => row.id === $('#presetSelect').value);
    if (!item) return toast('불러올 프롬프트 프리셋을 선택하세요.', 'err');
    applyPreset(item);
    toast(`프리셋 “${item.name}”을 불러왔습니다.`);
  });
  $('#presetSelect').addEventListener('dblclick', () => $('#presetLoad').click());
  $('#presetSave').addEventListener('click', () => {
    const current = loadPresets();
    const selected = current.find(row => row.id === $('#presetSelect').value);
    const raw = window.prompt('저장할 프롬프트 프리셋 이름을 입력하세요.', selected?.name || '');
    if (raw === null) return;
    const name = raw.trim();
    if (!name) return toast('프리셋 이름을 입력하세요.', 'err');
    const same = current.find(row => row.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    try {
      if (same) {
        if (!window.confirm(`“${same.name}” 프리셋을 현재 프롬프트로 덮어쓸까요?`)) return;
        savePresets(current.map(row => (row.id === same.id ? capturePreset(name, same.id) : row)));
        refreshPresets(same.id);
        toast(`프리셋 “${name}”을 덮어썼습니다.`);
        return;
      }
      const item = capturePreset(name);
      savePresets([...current, item]);
      refreshPresets(item.id);
      toast(`프리셋 “${name}”을 저장했습니다.`);
    } catch (error) {
      toast(`프리셋 저장 실패: ${error.message || error}`, 'err');
    }
  });
  $('#presetDelete').addEventListener('click', () => {
    const current = loadPresets();
    const item = current.find(row => row.id === $('#presetSelect').value);
    if (!item) return toast('삭제할 프롬프트 프리셋을 선택하세요.', 'err');
    if (!window.confirm(`“${item.name}” 프리셋을 삭제할까요?`)) return;
    savePresets(current.filter(row => row.id !== item.id));
    refreshPresets();
    toast(`프리셋 “${item.name}”을 삭제했습니다.`);
  });
}

function boot() {
  fillSelect($('#modelSelect'), MODELS, true);
  fillSelect($('#samplerSelect'), SAMPLERS);
  fillSelect($('#scheduleSelect'), SCHEDULES);
  fillSelect($('#ucSelect'), UC_PRESETS.map(item => [String(item.id), item.label]));
  fillSelect($('#emotionSelect'), EMOTIONS.map(name => [name, name]));
  $('#modelSelect').value = DEFAULT_MODEL;
  RESOLUTIONS.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.name;
    button.dataset.w = String(item.width);
    button.dataset.h = String(item.height);
    button.title = `${item.width} × ${item.height}`;
    if (item.width === 832 && item.height === 1216) button.classList.add('is-on');
    button.addEventListener('click', () => {
      $('#widthInput').value = item.width;
      $('#heightInput').value = item.height;
      markResolution();
      syncCost();
    });
    $('#resolutionGrid').append(button);
  });
  client.setToken(session.token);
  wire();
  prefetchCommunity();
  refreshPresets();
  syncModelUi();
  syncAuth();
  renderCharacters();
  renderRefs();
  onPrompt();
  if (session.token) refreshSubscription(true);
}

boot();

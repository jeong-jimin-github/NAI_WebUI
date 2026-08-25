(() => {
  'use strict';

  const API_HOST = 'https://api.novelai.net';
  const IMAGE_HOST = 'https://image.novelai.net';
  const nativeFetch = window.fetch.bind(window);

  const jsonResponse = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  function getHeader(headers, name) {
    if (!headers) return '';
    if (headers instanceof Headers) return headers.get(name) || '';
    const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : '';
  }

  function cleanHeaders(headers, token, json = false) {
    const out = new Headers(headers || {});
    out.delete('X-NAI-Token');
    if (token) out.set('Authorization', `Bearer ${token}`);
    out.set('Accept', '*/*');
    if (json) out.set('Content-Type', 'application/json');
    return out;
  }

  async function errorText(response) {
    try {
      const type = response.headers.get('content-type') || '';
      if (type.includes('json')) {
        const data = await response.clone().json();
        return data?.message || data?.error || JSON.stringify(data);
      }
      return (await response.clone().text()).slice(0, 2000);
    } catch {
      return `${response.status} ${response.statusText}`;
    }
  }

  function summarizeSubscription(data) {
    const fixed = Number(data?.trainingStepsLeft?.fixedTrainingStepsLeft || 0);
    const purchased = Number(data?.trainingStepsLeft?.purchasedTrainingSteps || 0);
    const tier = Number(data?.tier ?? 0);
    return {
      tier,
      tierName: ['Paper', 'Tablet', 'Scroll', 'Opus'][tier] || `Tier ${tier}`,
      anlas: fixed + purchased,
      fixedAnlas: fixed,
      purchasedAnlas: purchased,
      expiresAt: data?.expiresAt ?? null,
      active: Boolean(data?.active ?? tier > 0),
      perks: data?.perks ?? {},
    };
  }

  async function subscription(token) {
    const response = await nativeFetch(`${API_HOST}/user/subscription`, {
      method: 'GET',
      headers: cleanHeaders({}, token, false),
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) return { response, error: await errorText(response) };
    return { response, data: summarizeSubscription(await response.json()) };
  }

  function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  async function deriveAccessKey(email, password) {
    const { argon2id, blake2b } =
      await import('https://cdn.jsdelivr.net/npm/hash-wasm@4.12.0/dist/index.esm.js');
    const preSalt = `${password.slice(0, 6)}${email}novelai_data_access_key`;
    const saltHex = await blake2b(preSalt, 128);
    const salt = Uint8Array.from(saltHex.match(/.{2}/g), byte => parseInt(byte, 16));
    const key = await argon2id({
      password,
      salt,
      parallelism: 1,
      iterations: 2,
      memorySize: 1953,
      hashLength: 64,
      outputType: 'binary',
    });
    return bytesToBase64(key)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')
      .slice(0, 64);
  }

  function localPath(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return null;
      const url = new URL(raw, location.href);
      if (url.origin !== location.origin) return null;
      return `${url.pathname}${url.search}`;
    } catch {
      return null;
    }
  }

  async function directProxy(target, init, token, forceMethod) {
    const next = { ...init };
    next.method = forceMethod || next.method || 'GET';
    next.headers = cleanHeaders(next.headers, token, Boolean(next.body));
    next.mode = 'cors';
    next.credentials = 'omit';
    next.cache = 'no-store';
    try {
      return await nativeFetch(target, next);
    } catch (error) {
      return jsonResponse({
        error: `NovelAI API 직접 연결 실패: ${error?.message || error}. 브라우저/CORS 또는 네트워크 상태를 확인하세요.`,
      }, 502);
    }
  }

  window.fetch = async function staticNovelAIFetch(input, init = {}) {
    const path = localPath(input);
    if (!path || !path.startsWith('/api/')) return nativeFetch(input, init);

    const token = String(getHeader(init.headers, 'X-NAI-Token') || '').trim();

    if (path === '/api/auth/token') {
      if (!token) return jsonResponse({ error: 'NovelAI access token is required.' }, 401);
      const result = await subscription(token);
      if (result.error) return jsonResponse({ error: result.error }, result.response.status);
      return jsonResponse({ ok: true, subscription: result.data });
    }

    if (path === '/api/nai/subscription') {
      if (!token) return jsonResponse({ error: 'NovelAI access token is required.' }, 401);
      const result = await subscription(token);
      if (result.error) return jsonResponse({ error: result.error }, result.response.status);
      return jsonResponse({ subscription: result.data });
    }

    if (path === '/api/auth/login') {
      try {
        const body = JSON.parse(init.body || '{}');
        const email = String(body.email || '').trim();
        const password = String(body.password || '');
        if (!email || !password) return jsonResponse({ error: 'Email and password are required.' }, 400);

        const key = await deriveAccessKey(email, password);
        const loginResponse = await nativeFetch(`${API_HOST}/user/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ key }),
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
        });
        if (!loginResponse.ok) {
          return jsonResponse({ error: await errorText(loginResponse) }, loginResponse.status);
        }
        const login = await loginResponse.json();
        if (!login?.accessToken) return jsonResponse({ error: 'NovelAI did not return an access token.' }, 502);

        const result = await subscription(login.accessToken);
        if (result.error) return jsonResponse({ error: result.error }, result.response.status);
        return jsonResponse({ accessToken: login.accessToken, subscription: result.data });
      } catch (error) {
        return jsonResponse({ error: error?.message || String(error) }, 500);
      }
    }

    if (path.startsWith('/api/nai/tags')) {
      const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
      return directProxy(`${IMAGE_HOST}/ai/generate-image/suggest-tags${query}`, init, token, 'GET');
    }

    const routes = {
      '/api/nai/generate': `${IMAGE_HOST}/ai/generate-image`,
      '/api/nai/augment': `${IMAGE_HOST}/ai/augment-image`,
      '/api/nai/upscale': `${API_HOST}/ai/upscale`,
      '/api/nai/encode-vibe': `${IMAGE_HOST}/ai/encode-vibe`,
    };

    if (routes[path]) {
      if (!token) return jsonResponse({ error: 'NovelAI access token is required.' }, 401);
      return directProxy(routes[path], init, token, 'POST');
    }

    return jsonResponse({ error: `Unknown static API route: ${path}` }, 404);
  };

  window.__NAI_STATIC_MODE__ = true;
  console.info('[NAI WebUI] Static mode active: NovelAI API requests are sent directly from this browser.');
})();

(() => {
  'use strict';

  const STORAGE_KEY = 'naiWebUI.promptPresets.v1';
  const FIELD_IDS = ['promptPrefixInput', 'promptInput', 'promptSuffixInput', 'negativeInput'];

  function notify(message, type = 'ok') {
    const layer = document.getElementById('toastLayer');
    if (!layer) return;
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = message;
    layer.append(node);
    setTimeout(() => node.remove(), 2600);
  }

  function readPresets() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.filter(x => x && typeof x === 'object' && x.id && x.name) : [];
    } catch {
      return [];
    }
  }

  function writePresets(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function capturePrompt(name, id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`) {
    return {
      id,
      name,
      prefix: document.getElementById('promptPrefixInput')?.value || '',
      main: document.getElementById('promptInput')?.value || '',
      suffix: document.getElementById('promptSuffixInput')?.value || '',
      negative: document.getElementById('negativeInput')?.value || '',
      updatedAt: Date.now(),
    };
  }

  function applyPreset(preset) {
    const values = {
      promptPrefixInput: preset.prefix || '',
      promptInput: preset.main || '',
      promptSuffixInput: preset.suffix || '',
      negativeInput: preset.negative || '',
    };
    for (const id of FIELD_IDS) {
      const field = document.getElementById(id);
      if (!field) continue;
      field.value = values[id];
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .prompt-preset-bar{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:5px;padding:8px 10px;border-bottom:1px solid #292b42;background:#17192b}
      .prompt-preset-bar select{min-width:0;height:32px;padding:0 8px;border:1px solid #393c55;background:#10111c;border-radius:6px;color:#e8e8f0;font-size:11px}
      .prompt-preset-bar button{height:32px;padding:0 9px;border:1px solid #393c55;background:#20233a;border-radius:6px;color:#c8cad8;font-size:10px;white-space:nowrap}
      .prompt-preset-bar button:hover{background:#2a2d48;border-color:#5c607e}
      .prompt-preset-bar .preset-save{background:#ded69a;border-color:#ded69a;color:#191a1f;font-weight:700}
      .prompt-preset-bar .preset-delete{color:#e5a1ad}
      @media(max-width:480px){.prompt-preset-bar{grid-template-columns:1fr 1fr 1fr}.prompt-preset-bar select{grid-column:1/4}.prompt-preset-bar button{width:100%}}
    `;
    document.head.append(style);
  }

  function initPromptPresets() {
    const promptPanel = document.querySelector('.prompt-panel');
    const promptTabs = promptPanel?.querySelector('.prompt-tabs');
    if (!promptPanel || !promptTabs || document.getElementById('promptPresetBar')) return;

    addStyles();

    const bar = document.createElement('div');
    bar.id = 'promptPresetBar';
    bar.className = 'prompt-preset-bar';
    bar.innerHTML = `
      <select id="promptPresetSelect" aria-label="프롬프트 프리셋">
        <option value="">프롬프트 프리셋 선택</option>
      </select>
      <button id="promptPresetLoad" type="button">불러오기</button>
      <button id="promptPresetSave" class="preset-save" type="button">저장</button>
      <button id="promptPresetDelete" class="preset-delete" type="button">삭제</button>
    `;
    promptTabs.insertAdjacentElement('afterend', bar);

    const select = document.getElementById('promptPresetSelect');

    function refresh(selectedId = '') {
      const presets = readPresets().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      select.innerHTML = '<option value="">프롬프트 프리셋 선택</option>';
      for (const preset of presets) {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        select.append(option);
      }
      if (selectedId && presets.some(x => x.id === selectedId)) select.value = selectedId;
    }

    document.getElementById('promptPresetLoad').addEventListener('click', () => {
      const preset = readPresets().find(x => x.id === select.value);
      if (!preset) return notify('불러올 프롬프트 프리셋을 선택하세요.', 'error');
      applyPreset(preset);
      notify(`프리셋 “${preset.name}”을 불러왔습니다.`);
    });

    document.getElementById('promptPresetSave').addEventListener('click', () => {
      const current = readPresets();
      const selected = current.find(x => x.id === select.value);
      const suggested = selected?.name || '';
      const rawName = window.prompt('저장할 프롬프트 프리셋 이름을 입력하세요.', suggested);
      if (rawName === null) return;
      const name = rawName.trim();
      if (!name) return notify('프리셋 이름을 입력하세요.', 'error');

      const sameName = current.find(x => x.name.toLocaleLowerCase() === name.toLocaleLowerCase());
      if (sameName) {
        if (!window.confirm(`“${sameName.name}” 프리셋을 현재 프롬프트로 덮어쓸까요?`)) return;
        const next = capturePrompt(name, sameName.id);
        const items = current.map(x => x.id === sameName.id ? next : x);
        try {
          writePresets(items);
          refresh(sameName.id);
          notify(`프리셋 “${name}”을 덮어썼습니다.`);
        } catch (error) {
          notify(`프리셋 저장 실패: ${error?.message || error}`, 'error');
        }
        return;
      }

      const preset = capturePrompt(name);
      try {
        writePresets([...current, preset]);
        refresh(preset.id);
        notify(`프리셋 “${name}”을 저장했습니다.`);
      } catch (error) {
        notify(`프리셋 저장 실패: ${error?.message || error}`, 'error');
      }
    });

    document.getElementById('promptPresetDelete').addEventListener('click', () => {
      const current = readPresets();
      const preset = current.find(x => x.id === select.value);
      if (!preset) return notify('삭제할 프롬프트 프리셋을 선택하세요.', 'error');
      if (!window.confirm(`“${preset.name}” 프리셋을 삭제할까요?`)) return;
      try {
        writePresets(current.filter(x => x.id !== preset.id));
        refresh();
        notify(`프리셋 “${preset.name}”을 삭제했습니다.`);
      } catch (error) {
        notify(`프리셋 삭제 실패: ${error?.message || error}`, 'error');
      }
    });

    select.addEventListener('dblclick', () => document.getElementById('promptPresetLoad').click());
    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromptPresets, { once: true });
  } else {
    initPromptPresets();
  }
})();

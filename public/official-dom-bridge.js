(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const QUALITY = {
    'nai-diffusion-5-curated': 'masterpiece, very aesthetic, no text, rating:general',
    'nai-diffusion-5-full': 'masterpiece, very aesthetic, no text',
    'nai-diffusion-4-5-curated': 'location, masterpiece, no text, rating:general',
    'nai-diffusion-4-5-full': 'very aesthetic, masterpiece, no text',
  };
  const UC = 'lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, negative space, blank page';
  const MODELS = [
    ['nai-diffusion-5-curated', 'V5 Curated'],
    ['nai-diffusion-5-full', 'V5 Full'],
    ['nai-diffusion-4-5-curated', 'V4.5 Curated'],
    ['nai-diffusion-4-5-full', 'V4.5 Full'],
  ];
  const SAMPLERS = [
    ['k_euler_ancestral', 'Euler Ancestral'], ['k_euler', 'Euler'], ['k_dpmpp_2m', 'DPM++ 2M'],
    ['k_dpmpp_sde', 'DPM++ SDE'], ['k_dpmpp_2m_sde', 'DPM++ 2M SDE'], ['k_dpmpp_2s_ancestral', 'DPM++ 2S Ancestral'], ['ddim_v3', 'DDIM'],
  ];
  const state = {
    token: sessionStorage.getItem('naiToken') || localStorage.getItem('naiToken') || '',
    model: 'nai-diffusion-5-curated', sampler: 'k_euler_ancestral', mode: 'anime', samples: 1,
    alpha: false, baseImage: null, busy: false, subscription: null,
  };

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  function text(el) { return (el?.innerText || el?.textContent || '').replace(/\u00a0/g, ' ').trim(); }
  function toast(message, type = '') {
    let layer = $('.nai-toast-layer');
    if (!layer) { layer = document.createElement('div'); layer.className = 'nai-toast-layer'; document.body.appendChild(layer); }
    const n = document.createElement('div'); n.className = `nai-toast ${type}`; n.textContent = message; layer.appendChild(n); setTimeout(() => n.remove(), 4200);
  }
  function cleanError(e) { return e?.message || String(e || 'Unknown error'); }
  function setSingleValue(input, label) {
    const root = input?.closest('.select');
    const value = root?.querySelector('div[class*="singleValue"]');
    if (value) value.textContent = label;
  }
  function overlaySelect(input, options, value, onChange) {
    if (!input) return null;
    const root = input.closest('.select') || input.parentElement;
    if (!root) return null;
    root.style.position = 'relative';
    const select = document.createElement('select');
    select.className = 'nai-native-select';
    for (const [v, label] of options) { const o = document.createElement('option'); o.value = v; o.textContent = label; select.appendChild(o); }
    select.value = value;
    select.addEventListener('change', () => { const label = options.find(x => x[0] === select.value)?.[1] || select.value; setSingleValue(input, label); onChange(select.value, label); });
    root.appendChild(select);
    return select;
  }
  function editor(which) {
    const selector = which === 'negative' ? '.image-gen-panel-sidebar .prompt-input-box-undesired-content .ProseMirror' : '.image-gen-panel-sidebar .prompt-input-box-prompt .ProseMirror';
    return $(selector) || $(`.prompt-input-box-${which === 'negative' ? 'undesired-content' : 'prompt'} .ProseMirror`);
  }
  function numberInput(label, fallbackIndex) {
    return $(`input[aria-label="${label}"]`) || $$('input[type="number"]')[fallbackIndex] || null;
  }
  function qualityEnabled() { return true; }
  function modelIsV5() { return state.model.startsWith('nai-diffusion-5'); }
  function appendTags(base, extra) { return [base, extra].map(x => String(x || '').trim()).filter(Boolean).join(', '); }
  function randomSeed() { return Math.floor(Math.random() * 4294967288); }
  function snap64(v) { return Math.max(64, Math.min(4096, Math.round(Number(v || 64) / 64) * 64)); }

  async function readImage(file) {
    if (!file) return null;
    const dataUrl = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = dataUrl; });
    return { base64: String(dataUrl).split(',')[1], dataUrl, width: img.naturalWidth, height: img.naturalHeight, name: file.name };
  }

  async function api(path, body = null, binary = false, token = state.token) {
    const init = { method: body === null ? 'GET' : 'POST', headers: {} };
    if (token) init.headers['X-NAI-Token'] = token;
    if (body !== null) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    const res = await fetch(path, init);
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { const d = await res.json(); msg = d.error || d.message || msg; } catch {}
      throw new Error(msg);
    }
    return binary ? res : res.json();
  }

  async function refreshSubscription(silent = false) {
    if (!state.token) { updateAccountUi(); return; }
    try {
      const data = await api('/api/nai/subscription');
      state.subscription = data.subscription;
      updateAccountUi();
      if (!silent) toast('Anlas balance refreshed.');
    } catch (e) { if (!silent) toast(cleanError(e), 'error'); }
  }
  function updateAccountUi() {
    const value = state.subscription ? Number(state.subscription.anlas).toLocaleString() : (state.token ? '…' : '—');
    $$('.sc-f0ebfba1-37 > span:first-child').forEach(el => { el.textContent = value; });
    $$('.sc-fd643ad8-14').forEach(el => { el.textContent = state.subscription ? `${state.subscription.tierName} Tier` : (state.token ? 'Connected' : 'Not Connected'); });
  }

  function showAuth() {
    let modal = $('.nai-auth-backdrop');
    if (!modal) {
      modal = document.createElement('div'); modal.className = 'nai-auth-backdrop';
      modal.innerHTML = `<div class="nai-auth-card"><h2>Connect NovelAI</h2><p>Use a Persistent API / Access Token, or sign in with email and password. Credentials stay in this browser.</p><div class="nai-auth-tabs"><button class="active" data-auth="token">API Token</button><button data-auth="password">Email / Password</button></div><form data-form="token"><input name="token" autocomplete="off" placeholder="Persistent API / Access Token"><label style="display:flex;gap:7px;align-items:center;font-size:12px;color:#b7b7b7"><input name="remember" type="checkbox" style="width:auto;margin:0">Remember token in this browser</label><div class="row"><button type="button" class="nai-auth-secondary" data-close>Cancel</button><button class="nai-auth-primary" type="submit">Connect</button></div></form><form data-form="password" style="display:none"><input name="email" type="email" autocomplete="username" placeholder="Email"><input name="password" type="password" autocomplete="current-password" placeholder="Password"><div class="row"><button type="button" class="nai-auth-secondary" data-close>Cancel</button><button class="nai-auth-primary" type="submit">Sign In</button></div></form></div>`;
      document.body.appendChild(modal);
      const setTab = name => {
        $$('[data-auth]', modal).forEach(b => b.classList.toggle('active', b.dataset.auth === name));
        $$('[data-form]', modal).forEach(f => { f.style.display = f.dataset.form === name ? '' : 'none'; });
      };
      $$('[data-auth]', modal).forEach(b => b.addEventListener('click', () => setTab(b.dataset.auth)));
      $$('[data-close]', modal).forEach(b => b.addEventListener('click', () => modal.remove()));
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
      $('[data-form="token"]', modal).addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget; const token = form.token.value.trim(); if (!token) return;
        try {
          const data = await api('/api/auth/token', {}, false, token);
          state.token = token; state.subscription = data.subscription; sessionStorage.setItem('naiToken', token);
          if (form.remember.checked) localStorage.setItem('naiToken', token); else localStorage.removeItem('naiToken');
          updateAccountUi(); modal.remove(); toast('NovelAI connected.');
        } catch (err) { toast(cleanError(err), 'error'); }
      });
      $('[data-form="password"]', modal).addEventListener('submit', async e => {
        e.preventDefault(); const form = e.currentTarget;
        try {
          const data = await api('/api/auth/login', { email: form.email.value.trim(), password: form.password.value }, false, '');
          state.token = data.accessToken; state.subscription = data.subscription; sessionStorage.setItem('naiToken', state.token); localStorage.removeItem('naiToken');
          form.password.value = ''; updateAccountUi(); modal.remove(); toast('NovelAI connected.');
        } catch (err) { form.password.value = ''; toast(cleanError(err), 'error'); }
      });
    }
  }
  function disconnect() { state.token = ''; state.subscription = null; sessionStorage.removeItem('naiToken'); localStorage.removeItem('naiToken'); updateAccountUi(); toast('NovelAI disconnected.'); }

  function buildPayload() {
    let prompt = text(editor('prompt'));
    let negative = text(editor('negative'));
    if (state.mode === 'fur' && !prompt.toLowerCase().includes('fur dataset')) prompt = appendTags('fur dataset', prompt);
    if (state.mode === 'background' && !prompt.toLowerCase().includes('background dataset')) prompt = appendTags('background dataset', prompt);
    if (qualityEnabled()) prompt = appendTags(prompt, QUALITY[state.model]);
    if (state.alpha && modelIsV5()) prompt = appendTags(prompt, 'transparent background, has alpha, alpha transparency');
    negative = appendTags(UC, negative);
    const width = snap64(numberInput('W', 0)?.value || 832);
    const height = snap64(numberInput('H', 1)?.value || 1216);
    const nums = $$('input[type="number"]');
    const steps = Math.max(1, Math.min(50, Number(nums.find(x => x.value === '23')?.value || 23)));
    const scale = Math.max(0, Math.min(20, Number(nums.find(x => x.value === '7')?.value || 7)));
    const seed = randomSeed();
    const parameters = {
      width, height, n_samples: state.samples, seed, extra_noise_seed: seed, sampler: state.sampler,
      steps, scale, cfg_rescale: 0, noise_schedule: 'karras', legacy: false, legacy_v3_extend: false,
      params_version: modelIsV5() ? 4 : 3, add_original_image: true, legacy_uc: false,
      v4_prompt: { caption: { base_caption: prompt, char_captions: [] }, use_coords: false, use_order: true, legacy_uc: false },
      v4_negative_prompt: { caption: { base_caption: negative, char_captions: [] }, use_coords: false, use_order: false, legacy_uc: false },
    };
    if (state.sampler === 'k_euler_ancestral') { parameters.deliberate_euler_ancestral_bug = false; parameters.prefer_brownian = true; }
    if (!modelIsV5()) parameters.skip_cfg_above_sigma = 58;
    let action = 'generate';
    if (state.baseImage) { action = 'img2img'; parameters.image = state.baseImage.base64; parameters.strength = .5; parameters.noise = 0; }
    return { input: prompt, model: state.model, action, parameters };
  }

  async function extractImages(res) {
    const blob = await res.blob(); const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && window.JSZip) {
      const zip = await window.JSZip.loadAsync(bytes), out = [];
      for (const entry of Object.values(zip.files)) if (!entry.dir) { const b = await entry.async('blob'); out.push(new Blob([b], { type: b.type || 'image/png' })); }
      return out;
    }
    return [new Blob([bytes], { type: blob.type || 'image/png' })];
  }
  function showImages(blobs) {
    const region = $('.image-gen-output-region'); if (!region) return;
    $('.nai-bridge-result', region)?.remove();
    const wrap = document.createElement('div'); wrap.className = 'nai-bridge-result';
    const urls = blobs.map(b => URL.createObjectURL(b)); const img = document.createElement('img'); img.src = urls[0]; wrap.appendChild(img);
    const actions = document.createElement('div'); actions.className = 'nai-bridge-result-actions';
    const dl = document.createElement('button'); dl.textContent = 'Download'; dl.addEventListener('click', () => { const a = document.createElement('a'); a.href = img.src; a.download = `NAI_${Date.now()}.png`; a.click(); });
    actions.appendChild(dl);
    if (urls.length > 1) { urls.forEach((url, i) => { const b = document.createElement('button'); b.textContent = String(i + 1); b.addEventListener('click', () => { img.src = url; }); actions.appendChild(b); }); }
    wrap.appendChild(actions); region.appendChild(wrap);
  }
  async function generate(e) {
    e?.preventDefault(); e?.stopImmediatePropagation();
    if (state.busy) return; if (!state.token) return showAuth();
    const prompt = text(editor('prompt')); if (!prompt && !state.baseImage) return toast('Enter a prompt first.', 'error');
    const buttons = $$('.image-gen-generate-button'); state.busy = true; buttons.forEach(b => { b.disabled = true; b.querySelector('span') && (b.querySelector('span').textContent = 'Generating…'); });
    try {
      const payload = buildPayload(); const res = await api('/api/nai/generate', payload, true); const images = await extractImages(res); showImages(images); toast(`${images.length} image${images.length > 1 ? 's' : ''} generated.`); refreshSubscription(true);
    } catch (err) { toast(cleanError(err), 'error'); }
    finally { state.busy = false; buttons.forEach(b => { b.disabled = false; const span = b.querySelector('span'); if (span) span.textContent = `Generate ${state.samples} Image${state.samples > 1 ? 's' : ''}`; }); }
  }

  function setupPromptTabs() {
    $$('.image-gen-prompt-main').forEach(box => {
      const tabs = $$('button', box).filter(b => ['Prompt', 'Undesired Content'].includes(text(b))).slice(0, 2);
      const pos = $('.prompt-input-box-prompt', box)?.closest('.sc-d49d2b2d-3');
      const neg = $('.prompt-input-box-undesired-content', box)?.closest('.sc-d49d2b2d-3');
      if (!pos || !neg || tabs.length < 2) return;
      const set = negative => { pos.style.display = negative ? 'none' : 'flex'; neg.style.display = negative ? 'flex' : 'none'; tabs[0].parentElement.style.opacity = negative ? '.55' : '1'; tabs[1].parentElement.style.opacity = negative ? '1' : '.55'; };
      tabs[0].addEventListener('click', e => { e.preventDefault(); set(false); }); tabs[1].addEventListener('click', e => { e.preventDefault(); set(true); }); set(false);
    });
  }
  function setupControls() {
    overlaySelect($('input[aria-label="Select the Model"]'), MODELS, state.model, value => { state.model = value; });
    overlaySelect($('input[aria-label="Select a sampler"]'), SAMPLERS, state.sampler, value => { state.sampler = value; });
    const modeButtons = $$('button').filter(b => ['Anime', 'Furry', 'Background'].includes(text(b)));
    modeButtons.forEach(b => b.addEventListener('click', e => { e.preventDefault(); const order = [['anime','Anime'],['fur','Furry'],['background','Background']]; const i = order.findIndex(x => x[0] === state.mode); const next = order[(i + 1) % order.length];
      state.mode = next[0];
      const span = b.querySelector('span');
      if (span) span.textContent = next[1]; }));
    const countButtons = $$('.sc-230a10c1-1').filter(b => /^[1-4]$/.test(text(b)));
    countButtons.forEach(b => b.addEventListener('click', e => { e.preventDefault(); state.samples = Number(text(b)); countButtons.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); $$('.image-gen-generate-button').forEach(g => { const s = g.querySelector('span'); if (s && !state.busy) s.textContent = `Generate ${state.samples} Image${state.samples > 1 ? 's' : ''}`; }); }));
    $$('button').filter(b => text(b) === 'Transparent BG').forEach(b => b.addEventListener('click', e => { e.preventDefault(); state.alpha = !state.alpha; $$('button').filter(x => text(x) === 'Transparent BG').forEach(x => x.setAttribute('aria-pressed', state.alpha ? 'true' : 'false')); }));
    $$('input[type="file"]').forEach(input => input.addEventListener('change', async () => { if (input.files?.[0]) { try { state.baseImage = await readImage(input.files[0]); toast(`Image2Image source: ${state.baseImage.name}`); } catch (e) { toast(cleanError(e), 'error'); } } }));
    $$('.image-gen-generate-button').forEach(b => b.addEventListener('click', generate, true));
    $$('button').filter(b => text(b) === 'Account Settings').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); showAuth(); }, true));
    $$('button').filter(b => text(b) === 'Logout').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); disconnect(); }, true));
    $$('.sc-f0ebfba1-38').forEach(b => b.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); state.token ? refreshSubscription() : showAuth(); }, true));
    setupPromptTabs();
  }

  ready(() => {
    document.documentElement.dataset.naiBridgeReady = 'true';
    setupControls(); updateAccountUi(); if (state.token) refreshSubscription(true);
    console.info('[NAI WebUI] exact saved NovelAI HTML bridge ready');
  });
})();

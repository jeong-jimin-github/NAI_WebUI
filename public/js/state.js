import { STORAGE } from './config.js';

export const session = {
  token: sessionStorage.getItem(STORAGE.token) || localStorage.getItem(STORAGE.token) || '',
  subscription: null,
  degraded: false,
  characters: [],
  useCoords: false,
  precise: [],
  vibes: [],
  baseImage: null,
  maskImage: null,
  imageMode: 'img2img',
  toolImage: null,
  results: [],
  selectedId: null,
  zoom: 1,
  busy: false,
  activeField: null,
};

export function persistToken(token, remember) {
  session.token = token;
  if (!token) {
    sessionStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.token);
    return;
  }
  sessionStorage.setItem(STORAGE.token, token);
  if (remember) localStorage.setItem(STORAGE.token, token);
  else localStorage.removeItem(STORAGE.token);
}

export function loadPresets() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE.presets) || '[]');
    return Array.isArray(data)
      ? data.filter(item => item && item.id && item.name)
      : [];
  } catch {
    return [];
  }
}

export function savePresets(items) {
  localStorage.setItem(STORAGE.presets, JSON.stringify(items));
}

export function selectedResult() {
  return session.results.find(item => item.id === session.selectedId) || null;
}

export function forgetResults() {
  for (const item of session.results) URL.revokeObjectURL(item.url);
  session.results = [];
  session.selectedId = null;
}

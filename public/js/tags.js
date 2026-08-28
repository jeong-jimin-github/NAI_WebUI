import { COMMUNITY_TAGS_URL, TAG_LEXICON } from './config.js';
import { escapeHtml } from './media.js';

let community = null;
let communityLoad = null;
let debounce = 0;
let seq = 0;
let items = [];
let cursor = -1;

function lastToken(text) {
  return String(text || '').split(',').pop().trim();
}

function lexiconHits(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const head = [];
  const rest = [];
  for (const row of TAG_LEXICON) {
    const hay = [row.en, row.ko, ...(row.also || [])].map(value => String(value).toLowerCase());
    if (hay.some(value => value.startsWith(q))) head.push(row);
    else if (hay.some(value => value.includes(q))) rest.push(row);
  }
  return [...head, ...rest].slice(0, 16).map(row => ({
    tag: row.en,
    label: row.ko,
    source: 'KO',
    score: '',
  }));
}

async function loadCommunity() {
  if (community) return community;
  if (communityLoad) return communityLoad;
  communityLoad = fetch(COMMUNITY_TAGS_URL, { cache: 'force-cache' })
    .then(response => (response.ok ? response.text() : ''))
    .then(text => {
      community = text.split(/\r?\n/).map(line => {
        const match = line.match(/^(.+?)\[(\d+)\]$/);
        return match ? { tag: match[1].replaceAll('_', ' '), score: Number(match[2]) } : null;
      }).filter(Boolean);
      return community;
    })
    .catch(() => {
      community = [];
      return community;
    });
  return communityLoad;
}

function communityHits(query, list) {
  const q = query.toLowerCase().replaceAll('_', ' ');
  if (!q || !Array.isArray(list)) return [];
  const head = [];
  const rest = [];
  for (const row of list) {
    const tag = row.tag.toLowerCase();
    if (tag.startsWith(q)) head.push(row);
    else if (q.length >= 2 && tag.includes(q)) rest.push(row);
    if (head.length >= 18 && rest.length >= 8) break;
  }
  return [...head, ...rest].slice(0, 18).map(row => ({
    tag: row.tag,
    label: row.tag,
    source: 'Danbooru',
    score: row.score,
  }));
}

function merge(...groups) {
  const out = [];
  const seen = new Set();
  for (const group of groups) {
    for (const row of group || []) {
      const key = String(row.tag || '').toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(row);
      }
    }
  }
  return out.slice(0, 20);
}

function box() {
  return document.getElementById('suggestBox');
}

export function hideSuggestions() {
  const root = box();
  if (root) {
    root.classList.add('is-hidden');
    root.innerHTML = '';
  }
  items = [];
  cursor = -1;
}

function paint(list, field) {
  const root = box();
  if (!root || !field) return hideSuggestions();
  if (root.parentElement !== document.body) document.body.append(root);
  const rect = field.getBoundingClientRect();
  root.style.left = `${Math.max(8, rect.left)}px`;
  root.style.width = `${Math.max(220, rect.width)}px`;
  root.style.top = `${rect.bottom + 4}px`;
  root.innerHTML = '';
  items = list.slice(0, 18);
  cursor = -1;
  if (!items.length) return hideSuggestions();
  items.forEach((row, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    const score = row.score === '' || row.score == null ? '' : ` · ${Number(row.score).toLocaleString()}`;
    button.innerHTML = `<span><strong>${escapeHtml(row.label || row.tag)}</strong><small>${escapeHtml(row.tag)}</small></span><em>${escapeHtml(String(row.source || ''))}${score}</em>`;
    button.addEventListener('mousedown', event => {
      event.preventDefault();
      applySuggestion(index, field);
    });
    root.append(button);
  });
  root.classList.remove('is-hidden');
}

export function applySuggestion(index, field) {
  const row = items[index];
  if (!row || !field) return;
  const parts = String(field.value || '').split(',');
  parts[parts.length - 1] = `${parts.length > 1 ? ' ' : ''}${row.tag}`;
  field.value = `${parts.join(',')}, `;
  field.focus();
  hideSuggestions();
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

export function onSuggestKeys(event, field) {
  const root = box();
  if (!root || root.classList.contains('is-hidden') || !items.length) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    cursor = (cursor + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    [...root.querySelectorAll('button')].forEach((button, index) => {
      button.classList.toggle('is-on', index === cursor);
    });
    root.querySelectorAll('button')[cursor]?.scrollIntoView({ block: 'nearest' });
  } else if ((event.key === 'Enter' || event.key === 'Tab') && cursor >= 0) {
    event.preventDefault();
    applySuggestion(cursor, field);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    hideSuggestions();
  }
}

export function scheduleSuggest(field, { token, client, modelId }) {
  clearTimeout(debounce);
  debounce = setTimeout(() => suggest(field, { token, client, modelId }), 80);
}

async function suggest(field, { token, client, modelId }) {
  if (!field) return hideSuggestions();
  const query = lastToken(field.value);
  if (!query) return hideSuggestions();
  const n = ++seq;
  const local = lexiconHits(query);
  paint(local, field);
  const extra = communityHits(query, await loadCommunity());
  if (n !== seq) return;
  paint(merge(local, extra), field);
  if (token && client) {
    const remote = await client.suggestTags({ model: modelId, prompt: query, lang: 'en' });
    if (n !== seq) return;
    const official = remote.slice(0, 16).map(item => {
      const tag = typeof item === 'string' ? item : (item.tag || item.value || item.name || '');
      const count = typeof item === 'object' ? (item.count ?? item.confidence ?? item.post_count ?? '') : '';
      const localHit = TAG_LEXICON.find(row => row.en.toLowerCase() === String(tag).toLowerCase());
      return { tag, label: localHit?.ko || tag, source: 'NovelAI', score: count };
    }).filter(row => row.tag);
    paint(merge(official, local, extra), field);
  }
}

export function prefetchCommunity() {
  loadCommunity();
}

(() => {
  'use strict';

  const previousFetch = window.fetch.bind(window);
  const TEXT_HOST = 'https://text.novelai.net';

  const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

  function getHeader(headers, name) {
    if (!headers) return '';
    if (headers instanceof Headers) return headers.get(name) || '';
    const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : '';
  }

  function localApiPath(input) {
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (!raw) return '';
      const url = new URL(raw, location.href);
      if (url.origin !== location.origin) return '';
      return `${url.pathname}${url.search}`;
    } catch {
      return '';
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

  async function responseError(response) {
    try {
      const data = await response.clone().json();
      return data?.message || data?.error || `${response.status} ${response.statusText}`;
    } catch {
      try { return (await response.clone().text()).slice(0, 1000); }
      catch { return `${response.status} ${response.statusText}`; }
    }
  }

  async function textHostSubscription(token) {
    return previousFetch(`${TEXT_HOST}/user/subscription`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
  }

  window.fetch = async function resilientNovelAIFetch(input, init = {}) {
    const path = localApiPath(input);
    const authTokenRoute = path === '/api/auth/token';
    const subscriptionRoute = path === '/api/nai/subscription';

    if (!authTokenRoute && !subscriptionRoute) return previousFetch(input, init);

    const token = String(getHeader(init.headers, 'X-NAI-Token') || '').trim();
    if (!token) return previousFetch(input, init);

    let primaryResponse = null;
    let primaryError = null;

    try {
      primaryResponse = await previousFetch(input, init);
      if (primaryResponse.ok || primaryResponse.status === 401 || primaryResponse.status === 403) {
        return primaryResponse;
      }
    } catch (error) {
      primaryError = error;
    }

    try {
      const fallback = await textHostSubscription(token);
      if (fallback.ok) {
        const raw = await fallback.json();
        const subscription = summarizeSubscription(raw);
        return authTokenRoute
          ? jsonResponse({ ok: true, subscription, fallbackHost: 'text.novelai.net' })
          : jsonResponse({ subscription, fallbackHost: 'text.novelai.net' });
      }

      if (fallback.status === 401 || fallback.status === 403) {
        return jsonResponse({ error: await responseError(fallback) || 'NovelAI 토큰이 올바르지 않습니다.' }, fallback.status);
      }
    } catch (fallbackError) {
      if (authTokenRoute) {
        return jsonResponse({
          ok: true,
          subscription: null,
          degraded: true,
          warning: '구독 정보 서버에 연결하지 못해 토큰 검증을 보류했습니다. 이미지 생성 요청에서 토큰을 다시 검증합니다.',
          networkError: String(fallbackError?.message || primaryError?.message || 'Load failed'),
        });
      }
    }

    if (authTokenRoute && primaryResponse && ![401, 403].includes(primaryResponse.status)) {
      return jsonResponse({
        ok: true,
        subscription: null,
        degraded: true,
        warning: '구독 정보 조회가 실패해 토큰 검증을 보류했습니다. 이미지 생성 요청에서 토큰을 다시 검증합니다.',
      });
    }

    if (primaryResponse) return primaryResponse;
    return jsonResponse({
      error: `NovelAI 구독 정보 연결 실패: ${primaryError?.message || 'Load failed'}`,
    }, 502);
  };

  console.info('[NAI WebUI] Token validation resilience enabled.');
})();

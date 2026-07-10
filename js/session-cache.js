(function () {
  function cacheKey(url) {
    return `fetch-cache:${url}`;
  }

  function readCache(url) {
    try {
      const raw = sessionStorage.getItem(cacheKey(url));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeCache(url, data) {
    try {
      sessionStorage.setItem(cacheKey(url), JSON.stringify({ data, cachedAt: Date.now() }));
    } catch {
      // sessionStorage를 쓸 수 없는 환경(프라이빗 모드 등)에서는 캐시 없이 동작
    }
  }

  // 인증 확인(getUser)이 필요한 GET 엔드포인트가 여러 화면에서 반복 호출되는 것을
  // 줄이기 위한 sessionStorage 기반 캐시. 실제 인증 검증은 각 API 라우트가 그대로 수행하고,
  // 여기서는 화면 표시용으로 짧은 시간 안에 반복되는 네트워크 왕복만 생략한다.
  async function cachedGet(url, { ttlMs = 20000 } = {}) {
    const cached = readCache(url);
    if (cached && Date.now() - cached.cachedAt < ttlMs) {
      return { ok: true, status: 200, json: async () => cached.data };
    }

    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });

    if (response.ok) {
      const data = await response.clone().json();
      writeCache(url, data);
    }

    return response;
  }

  function invalidate(url) {
    try {
      sessionStorage.removeItem(cacheKey(url));
    } catch {
      // 무시
    }
  }

  window.MyfitfolioCache = { cachedGet, invalidate };
}());

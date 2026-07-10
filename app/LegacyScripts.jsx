'use client';

import { useEffect } from 'react';

function wrapInlineScript(content) {
  return `(() => {\n${content}\n})();`;
}

// 레거시 스크립트 다수가 document/window에 등록한 리스너를 한 번도 해제하지 않는다.
// 소프트 네비게이션에서는 풀 리로드처럼 문서가 통째로 버려지지 않으므로, 이 함수로
// document.addEventListener/window.addEventListener를 이번 페이지 스크립트가 실행되는
// 동안만 감싸서 등록되는 리스너를 기록해두고, 페이지를 떠날 때 한꺼번에 해제한다.
function trackGlobalListeners() {
  const targets = [document, window];
  const registered = [];

  const patches = targets.map((target) => {
    const originalAddEventListener = target.addEventListener;
    target.addEventListener = function patchedAddEventListener(type, listener, options) {
      registered.push({ target, type, listener, options });
      return originalAddEventListener.call(target, type, listener, options);
    };
    return { target, originalAddEventListener };
  });

  return function restore() {
    patches.forEach(({ target, originalAddEventListener }) => {
      target.addEventListener = originalAddEventListener;
    });
    registered.forEach(({ target, type, listener, options }) => {
      target.removeEventListener(type, listener, options);
    });
  };
}

export default function LegacyScripts({ pageKey, scripts }) {
  useEffect(() => {
    const restoreGlobalListeners = trackGlobalListeners();
    const mountedScripts = [];
    const abortController = new AbortController();
    let isMounted = true;

    // 네트워크 요청은 모두 즉시 시작하되, 실패도 값으로 바꿔 나중 요청의 조기 실패가
    // 처리되지 않은 Promise 오류가 되지 않도록 한다.
    const preparedScripts = scripts.map(async (script) => {
      if (!script.src) {
        return { ok: true, content: script.content || '' };
      }

      try {
        const response = await fetch(script.src, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`Failed to load legacy script: ${script.src}`);
        }

        return { ok: true, content: await response.text() };
      } catch (error) {
        return { ok: false, error };
      }
    });

    // 외부 스크립트도 IIFE로 감싸 실행해야 재마운트 때 전역 const/let 재선언 오류가 나지 않는다.
    async function mountScriptsInOrder() {
      for (let index = 0; index < scripts.length; index += 1) {
        const script = scripts[index];
        const prepared = await preparedScripts[index];
        if (!isMounted) return;
        if (!prepared.ok) throw prepared.error;

        const element = document.createElement('script');
        element.dataset.legacyPage = pageKey;

        if (script.src) {
          element.text = wrapInlineScript(`${prepared.content}\n//# sourceURL=${script.src}`);
        } else {
          element.text = wrapInlineScript(prepared.content);
        }

        document.body.appendChild(element);
        mountedScripts.push(element);
      }
    }

    mountScriptsInOrder().catch((error) => {
      console.error(error);
    });

    return () => {
      isMounted = false;
      abortController.abort();
      restoreGlobalListeners();
      mountedScripts.forEach((script) => script.remove());
    };
  }, [pageKey, scripts]);

  return null;
}

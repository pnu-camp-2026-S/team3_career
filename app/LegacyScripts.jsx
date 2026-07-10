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
    let isMounted = true;

    // 외부 스크립트도 IIFE로 감싸 실행해야 재마운트 때 전역 const/let 재선언 오류가 나지 않는다.
    async function mountScriptsInOrder() {
      for (const script of scripts) {
        if (!isMounted) return;

        const element = document.createElement('script');
        element.dataset.legacyPage = pageKey;

        if (script.src) {
          const response = await fetch(script.src, { cache: 'no-store' });
          if (!response.ok) {
            throw new Error(`Failed to load legacy script: ${script.src}`);
          }

          const content = await response.text();
          if (!isMounted) return;
          element.text = wrapInlineScript(`${content}\n//# sourceURL=${script.src}`);
        } else {
          element.text = wrapInlineScript(script.content || '');
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
      restoreGlobalListeners();
      mountedScripts.forEach((script) => script.remove());
    };
  }, [pageKey, scripts]);

  return null;
}

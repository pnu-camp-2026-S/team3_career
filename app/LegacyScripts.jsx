'use client';

import { useEffect } from 'react';

function wrapInlineScript(content) {
  return `(() => {\n${content}\n})();`;
}

export default function LegacyScripts({ pageKey, scripts }) {
  useEffect(() => {
    const mountedScripts = scripts.map((script) => {
      const element = document.createElement('script');
      element.dataset.legacyPage = pageKey;

      if (script.src) {
        element.src = script.src;
        // 다운로드는 병렬로 진행하되 실행 순서는 추가된 순서(DOM 순서)대로 보장한다.
        element.async = false;
      } else {
        element.text = wrapInlineScript(script.content || '');
      }

      document.body.appendChild(element);
      return element;
    });

    return () => {
      mountedScripts.forEach((script) => script.remove());
    };
  }, [pageKey, scripts]);

  return null;
}

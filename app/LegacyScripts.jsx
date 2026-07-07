'use client';

import { useEffect } from 'react';

export default function LegacyScripts({ pageKey, scripts }) {
  useEffect(() => {
    let cancelled = false;
    const mountedScripts = [];

    async function mountScriptsInOrder() {
      for (const script of scripts) {
        if (cancelled) return;

        await new Promise((resolve) => {
          const element = document.createElement('script');
          element.dataset.legacyPage = pageKey;

          if (script.src) {
            element.src = script.src;
            element.onload = resolve;
            element.onerror = resolve;
          } else {
            element.text = script.content || '';
          }

          document.body.appendChild(element);
          mountedScripts.push(element);

          if (!script.src) resolve();
        });
      }
    }

    mountScriptsInOrder();

    return () => {
      cancelled = true;
      mountedScripts.forEach((script) => script.remove());
    };
  }, [pageKey, scripts]);

  return null;
}

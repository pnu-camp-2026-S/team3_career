'use client';

import { useLayoutEffect, useState } from 'react';

const STYLE_READY_TIMEOUT_MS = 3000;

function getPageStyleLinks(pageKey) {
  return Array.from(document.querySelectorAll('link[data-legacy-style-page]'))
    .filter((link) => link.dataset.legacyStylePage === pageKey);
}

export default function LegacyStyleGate({ pageKey, styleCount, children }) {
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    let isActive = true;
    let observer = null;
    let removeLinkListeners = () => {};
    let timeoutId;

    function revealPage() {
      if (!isActive) return;
      if (timeoutId) window.clearTimeout(timeoutId);
      setIsReady(true);
    }

    function watchCurrentLinks() {
      removeLinkListeners();
      removeLinkListeners = () => {};

      if (styleCount === 0) {
        revealPage();
        return true;
      }

      const links = getPageStyleLinks(pageKey);
      if (links.length < styleCount) return false;

      const pendingLinks = links.filter((link) => !link.sheet);
      if (pendingLinks.length === 0) {
        revealPage();
        return true;
      }

      let remainingCount = pendingLinks.length;
      const cleanups = pendingLinks.map((link) => {
        let isSettled = false;

        function settleLink() {
          if (isSettled || !isActive) return;
          isSettled = true;
          remainingCount -= 1;
          if (remainingCount === 0) revealPage();
        }

        link.addEventListener('load', settleLink, { once: true });
        link.addEventListener('error', settleLink, { once: true });

        // 상태 확인과 이벤트 등록 사이에 로딩이 끝난 경우를 놓치지 않는다.
        if (link.sheet) settleLink();

        return () => {
          link.removeEventListener('load', settleLink);
          link.removeEventListener('error', settleLink);
        };
      });

      removeLinkListeners = () => cleanups.forEach((cleanup) => cleanup());
      return true;
    }

    timeoutId = window.setTimeout(revealPage, STYLE_READY_TIMEOUT_MS);

    if (!watchCurrentLinks()) {
      observer = new MutationObserver(() => {
        if (!watchCurrentLinks()) return;
        observer?.disconnect();
        observer = null;
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    return () => {
      isActive = false;
      if (timeoutId) window.clearTimeout(timeoutId);
      observer?.disconnect();
      removeLinkListeners();
    };
  }, [pageKey, styleCount]);

  return (
    <div
      data-legacy-style-gate={pageKey}
      data-style-ready={isReady ? 'true' : 'false'}
      aria-hidden={isReady ? undefined : true}
      style={{ visibility: isReady ? 'visible' : 'hidden' }}
    >
      {children}
    </div>
  );
}

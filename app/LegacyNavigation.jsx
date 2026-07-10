'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// LegacyScripts는 페이지 스크립트가 실행되는 동안 document/window의 addEventListener를
// 감싸서 리스너를 추적했다가 페이지를 떠날 때 전부 제거한다. 이 클릭 리스너는 그 감쌈이
// 걸리기 전(모듈 평가 시점)에 원본 참조를 미리 떼어놓고 그 원본으로만 등록/해제해서,
// 어느 레거시 페이지가 마운트돼 있든 절대 그 정리 대상에 함께 휩쓸리지 않게 한다.
const nativeAddEventListener =
  typeof document !== 'undefined' ? document.addEventListener.bind(document) : null;
const nativeRemoveEventListener =
  typeof document !== 'undefined' ? document.removeEventListener.bind(document) : null;

function isSoftNavigableAnchor(anchor) {
  if (!anchor) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;

  const href = anchor.getAttribute('href');
  if (!href) return false;
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;

  return true;
}

function getInternalNavigationUrl(anchor) {
  if (!isSoftNavigableAnchor(anchor)) return null;

  try {
    const url = new URL(anchor.getAttribute('href'), window.location.href);
    if (url.origin !== window.location.origin || url.pathname.startsWith('/api/')) return null;
    return url;
  } catch {
    return null;
  }
}

export default function LegacyNavigation() {
  const router = useRouter();
  const routerRef = useRef(router);
  const prefetchedPathsRef = useRef(new Set());
  routerRef.current = router;

  useEffect(() => {
    if (!nativeAddEventListener) return undefined;

    function handleNavigationIntent(event) {
      const anchor = event.target.closest?.('a[href]');
      const url = getInternalNavigationUrl(anchor);
      if (!url) return;

      const href = `${url.pathname}${url.search}`;
      const currentHref = `${window.location.pathname}${window.location.search}`;
      if (href === currentHref || prefetchedPathsRef.current.has(href)) return;

      prefetchedPathsRef.current.add(href);

      try {
        routerRef.current.prefetch(href);
      } catch {
        // 사전 로딩 실패는 실제 클릭 이동을 막지 않으며, 다음 사용자 의도에서 다시 시도한다.
        prefetchedPathsRef.current.delete(href);
      }
    }

    function handleClick(event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target.closest?.('a[href]');
      const url = getInternalNavigationUrl(anchor);
      if (!url) return;

      event.preventDefault();
      routerRef.current.push(`${url.pathname}${url.search}${url.hash}`);
    }

    nativeAddEventListener('pointerover', handleNavigationIntent, true);
    nativeAddEventListener('focusin', handleNavigationIntent, true);
    nativeAddEventListener('click', handleClick, true);
    return () => {
      nativeRemoveEventListener('pointerover', handleNavigationIntent, true);
      nativeRemoveEventListener('focusin', handleNavigationIntent, true);
      nativeRemoveEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}

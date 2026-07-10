'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// app/[[...slug]]/page.js의 generateStaticParams와 동일한 레거시 화면 목록.
// 새 화면을 추가하면 이 목록도 함께 갱신해야 마운트 시점에 미리 프리페치된다.
const LEGACY_PATHS_TO_PREFETCH = [
  '/',
  '/index.html',
  '/login.html',
  '/main.html',
  '/create.html',
  '/portfolio_create.html',
  '/portfolio_manage.html',
  '/portfolio_viewer.html',
  '/contest.html',
  '/mypage.html',
  '/withdraw.html',
];

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
  if (/^https?:\/\//i.test(href) || href.startsWith('//')) return false;
  if (href.startsWith('/api/')) return false;

  return true;
}

export default function LegacyNavigation() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!nativeAddEventListener) return undefined;

    LEGACY_PATHS_TO_PREFETCH.forEach((path) => {
      routerRef.current.prefetch(path);
    });

    function handleClick(event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target.closest?.('a[href]');
      if (!isSoftNavigableAnchor(anchor)) return;

      const href = anchor.getAttribute('href');
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      routerRef.current.push(`${url.pathname}${url.search}${url.hash}`);
    }

    nativeAddEventListener('click', handleClick, true);
    return () => nativeRemoveEventListener('click', handleClick, true);
  }, []);

  return null;
}

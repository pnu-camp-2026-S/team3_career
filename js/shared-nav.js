(function () {
  const navItems = [
    { key: 'main', href: 'main.html', label: '메인' },
    { key: 'create', href: 'create.html', label: '파일 관리' },
    { key: 'portfolio_create', href: 'portfolio_create.html', label: '포트폴리오 생성' },
    { key: 'portfolio_manage', href: 'portfolio_manage.html', label: '포트폴리오 관리' },
    { key: 'contest', href: 'contest.html', label: '활동 추천' },
    { key: 'mypage', href: 'mypage.html', label: '마이페이지' },
  ];

  function getActiveKey(mount) {
    if (mount.dataset.active) return mount.dataset.active;
    const fileName = window.location.pathname.split('/').pop() || 'main.html';
    return navItems.find((item) => item.href === fileName)?.key || 'main';
  }

  function renderSharedNav(mount) {
    const activeKey = getActiveKey(mount);
    const navLinks = navItems.map((item) => (
      `<a class="nav-tab ${item.key === activeKey ? 'active' : ''}" href="${item.href}">${item.label}</a>`
    )).join('');

    mount.outerHTML = `
      <header class="top-nav">
        <a class="brand-word" href="main.html">Myfit<span>folio</span></a>
        <nav class="nav-tabs" aria-label="주요 메뉴">
          ${navLinks}
        </nav>
        <div class="nav-actions">
          <div class="profile-menu">
            <span class="profile-name-card" data-profile-name-card hidden></span>
            <button class="user-chip" type="button" data-profile-toggle aria-label="프로필 메뉴 열기" aria-haspopup="menu" aria-expanded="false">
              <span class="avatar"></span>
            </button>
            <div class="profile-dropdown" data-profile-menu role="menu">
              <a href="mypage.html" role="menuitem">마이페이지</a>
              <button type="button" data-logout role="menuitem">로그아웃</button>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  document.querySelectorAll('[data-shared-nav]').forEach(renderSharedNav);
}());

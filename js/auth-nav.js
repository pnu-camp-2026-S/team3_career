(function () {
  const AUTH_ME_ENDPOINT = '/api/auth/me';
  const AUTH_LOGOUT_ENDPOINT = '/api/auth/logout';

  async function getCurrentAccount() {
    try {
      const response = await fetch(AUTH_ME_ENDPOINT, {
        credentials: 'same-origin',
        cache: 'no-store',
      });

      if (!response.ok) return null;

      const payload = await response.json();
      return payload.authenticated ? payload.user : null;
    } catch {
      return null;
    }
  }

  function clearLocalAccountState() {
    localStorage.clear();
    sessionStorage.clear();
  }

  function getAccountDisplayName(account) {
    const rawName = account?.name || account?.email || '';
    const name = String(rawName).trim();
    if (!name) return '사용자';
    return name.includes('@') ? name.split('@')[0] : name;
  }

  function renderProfileNameCards(account) {
    document.querySelectorAll('[data-profile-name-card]').forEach((card) => {
      if (!account) {
        card.hidden = true;
        card.textContent = '';
        return;
      }

      card.textContent = `${getAccountDisplayName(account)} 님`;
      card.hidden = false;
    });
  }

  function closeAllMenus(exceptMenu) {
    document.querySelectorAll('[data-profile-menu]').forEach((menu) => {
      if (menu !== exceptMenu) menu.classList.remove('open');
    });
  }

  function wireProfileMenus() {
    document.querySelectorAll('[data-profile-toggle]').forEach((button) => {
      const menu = button.closest('.profile-menu');
      const menuPanel = menu?.querySelector('[data-profile-menu]');
      if (!menu || !menuPanel) return;

      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = !menuPanel.classList.contains('open');
        closeAllMenus(menuPanel);
        menuPanel.classList.toggle('open', willOpen);
        button.setAttribute('aria-expanded', String(willOpen));
      });
    });

    document.querySelectorAll('[data-logout]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await fetch(AUTH_LOGOUT_ENDPOINT, { method: 'POST' });
        } finally {
          clearLocalAccountState();
          window.location.href = 'login.html';
        }
      });
    });

    document.addEventListener('click', () => closeAllMenus());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAllMenus();
    });
  }

  function wireAuthLoginButtons() {
    document.querySelectorAll('[data-login]').forEach((button) => {
      button.addEventListener('click', () => {
        const provider = button.dataset.provider || 'google';
        window.location.href = `/api/auth/social?provider=${provider}`;
      });
    });
  }

  function renderLoggedOutMain() {
    if (!document.body.dataset.page || document.body.dataset.page !== 'main') return;

    const dashboard = document.querySelector('#mainLayout .dashboard');
    if (!dashboard) return;

    dashboard.classList.add('dashboard-logged-out');
    dashboard.innerHTML = `
      <section class="login-required-page" aria-label="로그인 필요">
        <section class="login-required-card">
          <div class="profile-needed-icon" aria-hidden="true"></div>
          <div>
            <h1>로그인이 필요해요</h1>
            <p>로그인하면 저장한 프로필과 활동 정보를 다시 불러올 수 있어요.</p>
            <a class="primary-button" href="login.html">로그인하러 가기</a>
          </div>
        </section>
      </section>
    `;
  }

  function renderAuthGuard(account) {
    if (!document.body.dataset.page || document.body.dataset.page !== 'main') return;

    if (!account) renderLoggedOutMain();
  }

  async function initAuthNav() {
    wireAuthLoginButtons();
    wireProfileMenus();
    const account = await getCurrentAccount();
    renderProfileNameCards(account);
    renderAuthGuard(account);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthNav);
  } else {
    initAuthNav();
  }
}());

(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    const WITHDRAW_ENDPOINT = '/api/auth/withdraw';
    const confirmInput = document.getElementById('withdrawConfirm');
    const withdrawButton = document.getElementById('withdrawButton');
    const withdrawMessage = document.getElementById('withdrawMessage');
    const defaultButtonText = withdrawButton.textContent;
    let isSubmitting = false;

    function clearClientStateAndRedirect() {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'login.html';
    }

    function setMessage(message, isError) {
      withdrawMessage.textContent = message;
      withdrawMessage.classList.toggle('error', Boolean(isError));
    }

    function syncButtonState() {
      withdrawButton.disabled = isSubmitting || !confirmInput.checked;
    }

    confirmInput.addEventListener('change', () => {
      syncButtonState();
      if (!confirmInput.checked) setMessage('', false);
    });

    withdrawButton.addEventListener('click', async () => {
      if (!confirmInput.checked || isSubmitting) return;

      isSubmitting = true;
      withdrawButton.textContent = '탈퇴 처리 중';
      setMessage('계정과 저장된 정보를 삭제하고 있습니다.', false);
      syncButtonState();

      try {
        const response = await fetch(WITHDRAW_ENDPOINT, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
          },
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message || '회원 탈퇴를 완료하지 못했습니다.');
        }

        clearClientStateAndRedirect();
      } catch (error) {
        isSubmitting = false;
        withdrawButton.textContent = defaultButtonText;
        setMessage(`${error.message || '회원 탈퇴를 완료하지 못했습니다.'} 잠시 후 다시 시도해 주세요.`, true);
        syncButtonState();
      }
    });
  }

  // 4. 이벤트 리스너 등록 (Event Listeners)
  function initializePageScript() {
    if (pageScriptInitialized) return;
    pageScriptInitialized = true;
    runPageScript();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePageScript, { once: true });
  }

  // 5. 초기화 실행 (Initialization)
  if (document.readyState !== 'loading') {
    initializePageScript();
  }
}());

(function () {
  // 1. 전역 상수 및 상태 변수 선언 (Constants & State)
  // 기존 인라인 스크립트의 상태는 runPageScript 실행 범위 안에서 보존합니다.
  let pageScriptInitialized = false;

  // 2. DOM 요소 선택 (DOM Elements)
  // DOM 조회는 defer 로딩 이후 기존 코드 흐름에서 안전하게 수행합니다.

  // 3. 유틸리티 및 일반 함수 정의 (Functions)
  function runPageScript() {
    const PROFILE_ENDPOINT = "/api/profile";

    const jobs = [
      "기획/전략", "UI/UX", "개발", "IT/개발", "데이터", "AI/머신러닝",
      "보안", "네트워크/인프라", "연구개발", "전기/전자", "화학/바이오",
      "생산/품질", "구매/자재", "물류/유통"
    ];
    const detailJobs = {
      "기획/전략": ["서비스 기획", "사업 기획", "PM", "PO", "전략기획", "데이터 기획", "신사업 기획"],
      "경영지원": ["경영관리", "사업관리", "운영관리", "성과관리"],
      "마케팅/홍보": ["콘텐츠 마케팅", "브랜드 마케팅", "퍼포먼스 마케팅", "CRM 마케팅", "PR"],
      "광고/브랜드": ["광고기획", "브랜드 매니저", "카피라이터", "미디어 플래너"],
      "회계/세무": ["회계", "세무", "재무", "IR"],
      "재무/IR": ["재무기획", "자금관리", "투자심사", "IR"],
      "인사/노무": ["HRM", "HRD", "채용", "조직문화", "노무"],
      "총무/법무": ["총무", "법무", "컴플라이언스", "계약관리"],
      "영업": ["B2B 영업", "B2C 영업", "기술영업", "솔루션 영업", "영업관리"],
      "해외영업": ["해외영업", "무역사무", "수출입관리", "글로벌 세일즈"],
      "고객상담": ["CS 매니저", "고객상담", "VOC 분석", "고객성공"],
      "상품기획/MD": ["상품기획", "온라인 MD", "리테일 MD", "브랜드 MD"],
      "디자인": ["그래픽 디자인", "브랜드 디자인", "편집 디자인", "제품 디자인"],
      "UI/UX": ["UX 리서치", "UX 기획", "UI 디자인", "프로덕트 디자인"],
      "개발": ["프론트엔드", "백엔드", "풀스택", "앱 개발", "QA 엔지니어", "DevOps"],
      "IT/개발": ["프론트엔드", "백엔드", "풀스택", "앱 개발", "QA 엔지니어", "DevOps"],
      "데이터": ["데이터 분석가", "데이터 엔지니어", "BI 개발자", "데이터 사이언티스트"],
      "AI/머신러닝": ["AI 엔지니어", "머신러닝 엔지니어", "MLOps", "컴퓨터비전 엔지니어"],
      "보안": ["정보보안", "보안관제", "모의해킹", "개인정보보호"],
      "네트워크/인프라": ["클라우드 엔지니어", "시스템 엔지니어", "네트워크 엔지니어", "SRE"],
      "연구개발": ["R&D 기획", "소재 연구", "공정 연구", "제품 개발"],
      "전기/전자": ["전기설계", "회로설계", "전력시스템", "반도체 공정"],
      "기계/설비": ["기계설계", "설비기술", "자동화", "플랜트"],
      "화학/바이오": ["화학공정", "품질분석", "바이오 연구", "환경안전"],
      "생산/품질": ["생산관리", "품질관리", "품질보증", "공정관리"],
      "구매/자재": ["구매관리", "자재관리", "SCM", "협력사 관리"],
      "물류/유통": ["물류관리", "유통관리", "물류기획", "배송운영"],
      "교육": ["교육기획", "교육운영", "콘텐츠 개발", "강사"],
      "공공/행정": ["행정", "정책기획", "공공사업관리", "민원서비스"],
      "금융/보험": ["은행원", "보험심사", "투자운용", "리스크관리"],
      "미디어/콘텐츠": ["콘텐츠 기획", "영상 제작", "PD", "에디터"],
      "서비스": ["서비스 운영", "매장관리", "호텔서비스", "항공서비스"]
    };
    const companies = ["삼성전자", "SK하이닉스", "네이버", "카카오", "LG CNS", "현대자동차", "롯데", "CJ", "토스", "당근"];
    const ALL_OPTION = "전체";
    const NO_MINOR_OPTION = "해당 없음";
    const industries = [ALL_OPTION, "반도체", "IT/SW", "금융", "교육", "콘텐츠", "제조", "바이오", "유통", "공공", "게임"];
    const regions = [ALL_OPTION, "서울", "부산", "대구", "인천", "광주", "대전", "울산", "경기", "세종", "제주", "원격근무"];
    const schoolTypes = ["대학교 2,3년", "대학교 4년", "대학원 석사", "대학원 박사"];
    const majors = ["전기공학과", "정보컴퓨터공학과", "화공생명공학과", "산업공학과"];
    const salaryRanges = ["회사 내규에 따름", "2,800만원 이상", "3,000만원 이상", "3,500만원 이상", "4,000만원 이상", "5,000만원 이상"];
    const interestFields = ["채용", "대외활동", "공모전", "교육"];

    const profileState = {
      editing: false,
      saving: false,
      saveError: "",
      birthDate: "",
      datePickerOpen: false,
      periodPicker: null,
      photo: localStorage.getItem("myfitfolioPhoto") || "",
      educations: [
        {
          schoolType: "",
          school: "",
          periodStart: "",
          periodEnd: "",
          major: "",
          minor: ""
        }
      ],
      chips: {
        jobs: new Set(),
        interestFields: new Set(),
        companies: new Set(),
        industries: new Set()
      },
      preferences: {
        detailJob: "",
        workIndustry: "",
        workRegion: "",
        salary: "회사 내규에 따름"
      }
    };

    const searchConfigs = {
      detailJob: {
        label: "세부직무",
        placeholder: "직무명을 검색하세요",
        options: () => getDetailJobOptions()
      },
      workIndustry: {
        label: "희망 업종",
        placeholder: "업종명을 검색하세요",
        options: () => industries
      },
      workRegion: {
        label: "희망근무지역",
        placeholder: "지역명을 검색하세요",
        options: () => regions
      }
    };

    function getDetailJobOptions() {
      const selectedJobs = [...profileState.chips.jobs];
      const options = selectedJobs.flatMap((job) => detailJobs[job] || []);
      return [ALL_OPTION, ...new Set(options.length ? options : Object.values(detailJobs).flat())];
    }

    function applyProfilePayload(profile) {
      if (!profile) return;

      if (Object.hasOwn(profile, "name")) document.querySelector("#profileName").value = profile.name || "";
      if (Object.hasOwn(profile, "gender")) document.querySelector("#profileGender").value = profile.gender || "";
      if (Object.hasOwn(profile, "birthDate")) profileState.birthDate = profile.birthDate || "";
      if (Object.hasOwn(profile, "email")) document.querySelector("#profileEmail").value = profile.email || "";
      if (Object.hasOwn(profile, "phone")) document.querySelector("#profilePhone").value = profile.phone || "";
      if (Object.hasOwn(profile, "address")) document.querySelector("#profileAddress").value = profile.address || "";
      if (Object.hasOwn(profile, "photo")) {
        profileState.photo = profile.photo || "";
        if (profileState.photo) localStorage.setItem("myfitfolioPhoto", profileState.photo);
        else localStorage.removeItem("myfitfolioPhoto");
      }
      if (Array.isArray(profile.educations) && profile.educations.length) {
        profileState.educations = profile.educations.map(({ gpa, ...education }) => education);
      }
      if (profile.preferences) profileState.preferences = { ...profileState.preferences, ...profile.preferences };
      if (profile.chips) {
        Object.entries(profile.chips).forEach(([key, values]) => {
          if (profileState.chips[key] && Array.isArray(values)) profileState.chips[key] = new Set(values);
        });
      }
    }

    function loadLocalProfileCache() {
      const savedProfile = localStorage.getItem("myfitfolioProfile");
      if (!savedProfile) return null;

      try {
        return JSON.parse(savedProfile);
      } catch (error) {
        console.warn("Saved profile cache could not be loaded.", error);
        return null;
      }
    }

    async function loadSavedProfile() {
      try {
        const response = await fetch(PROFILE_ENDPOINT, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store"
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload.profile) {
            localStorage.setItem("myfitfolioProfile", JSON.stringify(payload.profile));
            applyProfilePayload(payload.profile);
            return;
          }
        }
      } catch (error) {
        console.warn("Profile API could not be loaded.", error);
      }

      applyProfilePayload(loadLocalProfileCache());
    }

    function getDaysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    }

    function getDateParts(value) {
      const [year, month, day] = (value || "2001-01-01").split("-").map(Number);
      return { year: year || 2001, month: month || 1, day: day || 1 };
    }

    function formatDateDisplay(value) {
      if (!value) return "";
      const { year, month, day } = getDateParts(value);
      return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
    }

    function getMonthParts(value) {
      const [year, month] = (value || "2026-01").split("-").map(Number);
      return { year: year || 2026, month: month || 1 };
    }

    function formatMonthDisplay(value) {
      if (!value) return "선택";
      const { year, month } = getMonthParts(value);
      return `${year}.${String(month).padStart(2, "0")}`;
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);
    }

    function renderDatePicker() {
      const picker = document.querySelector("[data-date-picker]");
      const display = document.querySelector("[data-birth-display]");
      if (display) display.textContent = formatDateDisplay(profileState.birthDate);
      if (!picker) return;

      if (!profileState.datePickerOpen) {
        picker.innerHTML = "";
        return;
      }

      const { year, month, day } = getDateParts(profileState.birthDate);
      const years = Array.from({ length: 41 }, (_, index) => 1970 + index);
      const months = Array.from({ length: 12 }, (_, index) => index + 1);
      const days = Array.from({ length: getDaysInMonth(year, month) }, (_, index) => index + 1);

      picker.innerHTML = `
        <div class="date-picker-panel">
          <div class="date-picker-selects">
            <label><span>년도</span><select data-date-part="year">
              ${years.map((item) => `<option value="${item}" ${item === year ? "selected" : ""}>${item}년</option>`).join("")}
            </select></label>
            <label><span>월</span><select data-date-part="month">
              ${months.map((item) => `<option value="${item}" ${item === month ? "selected" : ""}>${item}월</option>`).join("")}
            </select></label>
          </div>
          <div class="date-days">
            ${days.map((item) => `<button class="${item === day ? "selected" : ""}" type="button" data-date-day="${item}">${item}</button>`).join("")}
          </div>
        </div>
      `;
    }

    function renderEducationList() {
      const list = document.querySelector("[data-education-list]");
      if (!list) return;

      list.innerHTML = profileState.educations.map((education, index) => `
        <div class="education-item ${index > 0 ? "has-delete" : ""}" data-education-index="${index}">
          ${index > 0 ? `<button class="delete-education" type="button" data-delete-education="${index}" aria-label="학력 항목 삭제">×</button>` : ""}
          <div class="education-grid">
            <div class="form-field">
              <label>학교 구분</label>
              <select data-edu-field="schoolType" data-edu-index="${index}">
                <option value="" ${!education.schoolType ? "selected" : ""}></option>
                ${schoolTypes.map((type) => `<option ${type === education.schoolType ? "selected" : ""}>${type}</option>`).join("")}
              </select>
            </div>
            <div class="form-field">
              <label>학교명</label>
              <input data-edu-field="school" data-edu-index="${index}" type="text" value="${escapeHtml(education.school)}" />
            </div>
            <div class="form-field">
              <label>재학기간</label>
              <div class="period-range">
                ${renderPeriodPicker(index, "periodStart", "재학 시작", education.periodStart)}
                <span class="period-separator" aria-hidden="true">~</span>
                ${renderPeriodPicker(index, "periodEnd", "재학 종료", education.periodEnd)}
              </div>
            </div>
            ${renderMajorPicker(index, "major", "전공", education.major)}
            ${renderMajorPicker(index, "minor", "부전공/연계전공", education.minor)}
          </div>
        </div>
      `).join("");
    }

    function renderPeriodPicker(index, fieldName, label, value) {
      const isOpen = profileState.periodPicker?.index === index && profileState.periodPicker?.fieldName === fieldName;
      const { year, month } = getMonthParts(value);
      const years = Array.from({ length: 31 }, (_, yearIndex) => 2000 + yearIndex);
      const months = Array.from({ length: 12 }, (_, monthIndex) => monthIndex + 1);

      return `
        <div class="date-control period-date-control">
          <button class="date-trigger" type="button" data-toggle-period-picker data-period-index="${index}" data-period-field="${fieldName}" aria-label="${label}">
            <span>${formatMonthDisplay(value)}</span>
            <span class="calendar-icon" aria-hidden="true"></span>
          </button>
          ${
            isOpen
              ? `<div class="date-picker-panel period-picker-panel">
                  <div class="date-picker-selects">
                    <label><span>년도</span><select data-period-part="year" data-period-index="${index}" data-period-field="${fieldName}">
                      ${years.map((item) => `<option value="${item}" ${item === year ? "selected" : ""}>${item}년</option>`).join("")}
                    </select></label>
                    <label><span>월</span><select data-period-part="month" data-period-index="${index}" data-period-field="${fieldName}">
                      ${months.map((item) => `<option value="${item}" ${item === month ? "selected" : ""}>${item}월</option>`).join("")}
                    </select></label>
                  </div>
                  <div class="period-month-grid">
                    ${months.map((item) => `<button class="${item === month ? "selected" : ""}" type="button" data-period-month="${item}" data-period-index="${index}" data-period-field="${fieldName}">${item}월</button>`).join("")}
                  </div>
                </div>`
              : ""
          }
        </div>
      `;
    }

    function renderMajorPicker(index, fieldName, label, value) {
      const options = fieldName === "minor" ? [NO_MINOR_OPTION, ...majors] : majors;

      return `
        <div class="form-field major-field">
          <label>${label}</label>
          <button class="major-trigger" type="button" data-major-trigger="${index}-${fieldName}">
            <span>${escapeHtml(value || `${label}을 선택하세요`)}</span>
            <span class="select-chevron" aria-hidden="true"></span>
          </button>
          <div class="major-menu" data-major-menu="${index}-${fieldName}">
            ${options.map((major) => `<button type="button" data-major-option="${index}" data-major-field="${fieldName}" data-major-value="${major}">${major}</button>`).join("")}
          </div>
        </div>
      `;
    }

    function renderChipRows() {
      renderChipRow("jobs", jobs);
      renderChipRow("interestFields", interestFields);
      renderChipRow("companies", companies);
      renderChipRow("industries", industries);
    }

    function renderChipRow(group, values) {
      const row = document.querySelector(`[data-chip-row="${group}"]`);
      if (!row) return;
      row.innerHTML = values.map((value) => `
        <button class="chip ${profileState.chips[group].has(value) ? "selected" : ""}" type="button" data-chip-group="${group}" data-chip-value="${value}">
          ${value}
        </button>
      `).join("");
    }

    function renderSalarySelect() {
      const select = document.querySelector("[data-salary-select]");
      if (!select) return;
      select.innerHTML = salaryRanges.map((range) => `<option ${range === profileState.preferences.salary ? "selected" : ""}>${range}</option>`).join("");
    }

    function renderPickedValues() {
      document.querySelectorAll("[data-picked-value]").forEach((target) => {
        const key = target.dataset.pickedValue;
        const value = profileState.preferences[key] || "";
        target.textContent = value || "검색하여 선택";
        target.classList.toggle("placeholder", !value);
      });
    }

    function renderPhoto() {
      const preview = document.querySelector("[data-photo-preview]");
      if (!preview) return;
      preview.innerHTML = profileState.photo ? `<img src="${escapeHtml(profileState.photo)}" alt="프로필 사진" />` : "";
      preview.classList.toggle("has-photo", Boolean(profileState.photo));
    }

    function collectEducationValues() {
      document.querySelectorAll("[data-edu-field]").forEach((input) => {
        const index = Number(input.dataset.eduIndex);
        const fieldName = input.dataset.eduField;
        if (profileState.educations[index]) profileState.educations[index][fieldName] = input.value;
      });
    }

    function renderSearchOptions(type, query = "") {
      const config = searchConfigs[type];
      const normalizedQuery = query.trim().toLowerCase();
      const options = config.options().filter((option) => option.toLowerCase().includes(normalizedQuery));

      if (!options.length) return `<div class="empty-options">검색 결과가 없어요.</div>`;

      return options.map((option) => `
        <button class="search-option ${profileState.preferences[type] === option ? "selected" : ""}" type="button" data-select-search="${type}" data-search-value="${option}">
          ${option}
        </button>
      `).join("");
    }

    function renderSearchModal(type) {
      const config = searchConfigs[type];
      const modalRoot = document.querySelector("#modalRoot");
      if (!config || !modalRoot) return;

      const helperText = type === "detailJob" && profileState.chips.jobs.size
        ? `선택한 희망 직무: ${[...profileState.chips.jobs].join(", ")}`
        : "검색하거나 아래 목록에서 선택하세요.";

      modalRoot.innerHTML = `
        <div class="modal-backdrop" data-modal-backdrop></div>
        <section class="search-modal" role="dialog" aria-modal="true" aria-label="${config.label} 선택">
          <div class="search-modal-head">
            <div>
              <h3>${config.label} 선택</h3>
              <p>${helperText}</p>
            </div>
            <button class="icon-button modal-close" type="button" data-close-modal aria-label="닫기">×</button>
          </div>
          <div class="modal-search-box">
            <svg class="svg-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="5.9"></circle>
              <path d="m15.4 15.4 3.8 3.8"></path>
            </svg>
            <input data-search-input type="search" placeholder="${config.placeholder}" autofocus />
          </div>
          <div class="search-options" data-search-options>${renderSearchOptions(type)}</div>
        </section>
      `;
    }

    function closeSearchModal() {
      const modalRoot = document.querySelector("#modalRoot");
      if (modalRoot) modalRoot.innerHTML = "";
    }

    async function saveProfile() {
      collectEducationValues();
      const payload = {
        name: document.querySelector("#profileName")?.value || "",
        gender: document.querySelector("#profileGender")?.value || "",
        birthDate: profileState.birthDate,
        email: document.querySelector("#profileEmail")?.value || "",
        phone: document.querySelector("#profilePhone")?.value || "",
        address: document.querySelector("#profileAddress")?.value || "",
        photo: profileState.photo,
        educations: profileState.educations.map(({ gpa, ...education }) => education),
        preferences: profileState.preferences,
        chips: Object.fromEntries(Object.entries(profileState.chips).map(([key, value]) => [key, [...value]]))
      };

      try {
        const response = await fetch(PROFILE_ENDPOINT, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.message || "Profile save failed.");
        }

        const result = await response.json();
        const savedProfile = result.profile || payload;
        if (Object.hasOwn(savedProfile, "photo")) profileState.photo = savedProfile.photo || "";
        if (profileState.photo) localStorage.setItem("myfitfolioPhoto", profileState.photo);
        else localStorage.removeItem("myfitfolioPhoto");
        localStorage.setItem("myfitfolioProfile", JSON.stringify(savedProfile));
        sessionStorage.setItem("myfitfolioProfileSaved", "true");
        return true;
      } catch (error) {
        console.warn("Profile API save failed.", error);
        sessionStorage.removeItem("myfitfolioProfileSaved");
        return false;
      }
    }

    function renderAllDynamicParts() {
      renderPhoto();
      renderDatePicker();
      renderEducationList();
      renderChipRows();
      renderSalarySelect();
      renderPickedValues();
      renderFormActions();
      renderEditState();
    }

    function revealProfilePage() {
      document.body.classList.remove("profile-loading");
      document.querySelector(".mypage")?.removeAttribute("aria-busy");
    }

    function renderFormActions() {
      const actions = document.querySelector("[data-form-actions]");
      if (!actions) return;

      const status = profileState.saveError
        ? `<span class="save-status error" role="alert">${escapeHtml(profileState.saveError)}</span>`
        : "";
      const saveLabel = profileState.saving ? "저장 중" : "저장";
      const saveDisabled = profileState.saving ? "disabled" : "";

      actions.innerHTML = profileState.editing
        ? `${status}<button class="primary-button" type="button" data-save-profile ${saveDisabled}>${saveLabel}</button>`
        : '<button class="primary-button" type="button" data-edit-profile>수정하기</button>';
    }

    function renderEditState() {
      document.body.classList.toggle("profile-editing", profileState.editing);
      document.body.classList.toggle("profile-readonly", !profileState.editing);

      const selectors = [
        "#profileName",
        "#profileGender",
        "#profileEmail",
        "#profilePhone",
        "#profileAddress",
        "[data-salary-select]",
        "[data-edu-field]",
        "[data-photo-button]",
        "[data-toggle-date-picker]",
        "[data-add-education]",
        "[data-delete-education]",
        "[data-major-trigger]",
        "[data-toggle-period-picker]",
        "[data-chip-group]",
        "[data-open-search]"
      ];

      document.querySelectorAll(selectors.join(",")).forEach((control) => {
        control.disabled = !profileState.editing;
      });

      if (!profileState.editing) {
        closeSearchModal();
      }
    }

    document.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-edit-profile]");
      if (editButton) {
        profileState.editing = true;
        renderAllDynamicParts();
        return;
      }

      const photoButton = event.target.closest("[data-photo-button]");
      if (photoButton && !profileState.editing) return;
      if (photoButton) document.querySelector("#photoInput")?.click();

      const dateToggle = event.target.closest("[data-toggle-date-picker]");
      if (dateToggle && !profileState.editing) return;
      if (dateToggle) {
        profileState.datePickerOpen = !profileState.datePickerOpen;
        renderDatePicker();
      }

      const dateDay = event.target.closest("[data-date-day]");
      if (dateDay && !profileState.editing) return;
      if (dateDay) {
        const { year, month } = getDateParts(profileState.birthDate);
        const nextDay = Number(dateDay.dataset.dateDay);
        profileState.birthDate = `${year}-${String(month).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
        profileState.datePickerOpen = false;
        renderDatePicker();
      }

      const addEducation = event.target.closest("[data-add-education]");
      if (addEducation && !profileState.editing) return;
      if (addEducation) {
        collectEducationValues();
        profileState.periodPicker = null;
        profileState.educations.push({ schoolType: "대학교 4년", school: "", periodStart: "", periodEnd: "", major: "", minor: "" });
        renderEducationList();
        renderEditState();
      }

      const deleteEducation = event.target.closest("[data-delete-education]");
      if (deleteEducation && !profileState.editing) return;
      if (deleteEducation && profileState.educations.length > 1) {
        collectEducationValues();
        profileState.educations.splice(Number(deleteEducation.dataset.deleteEducation), 1);
        renderEducationList();
        renderEditState();
      }

      const majorTrigger = event.target.closest("[data-major-trigger]");
      if (majorTrigger && !profileState.editing) return;
      if (majorTrigger) {
        profileState.periodPicker = null;
        const menu = document.querySelector(`[data-major-menu="${majorTrigger.dataset.majorTrigger}"]`);
        document.querySelectorAll(".major-menu.open").forEach((openMenu) => {
          if (openMenu !== menu) openMenu.classList.remove("open");
        });
        menu?.classList.toggle("open");
      }

      const majorOption = event.target.closest("[data-major-option]");
      if (majorOption && !profileState.editing) return;
      if (majorOption) {
        const index = Number(majorOption.dataset.majorOption);
        const fieldName = majorOption.dataset.majorField || "major";
        const value = majorOption.dataset.majorValue || "";
        profileState.educations[index][fieldName] = value;
        renderEducationList();
        renderEditState();
      }

      const periodTrigger = event.target.closest("[data-toggle-period-picker]");
      if (periodTrigger && !profileState.editing) return;
      if (periodTrigger) {
        collectEducationValues();
        const index = Number(periodTrigger.dataset.periodIndex);
        const fieldName = periodTrigger.dataset.periodField;
        const current = profileState.periodPicker;
        profileState.periodPicker = current?.index === index && current?.fieldName === fieldName ? null : { index, fieldName };
        renderEducationList();
        renderEditState();
      }

      const periodMonth = event.target.closest("[data-period-month]");
      if (periodMonth && !profileState.editing) return;
      if (periodMonth) {
        const index = Number(periodMonth.dataset.periodIndex);
        const fieldName = periodMonth.dataset.periodField;
        const { year } = getMonthParts(profileState.educations[index][fieldName]);
        const month = Number(periodMonth.dataset.periodMonth);
        profileState.educations[index][fieldName] = `${year}-${String(month).padStart(2, "0")}`;
        profileState.periodPicker = null;
        renderEducationList();
        renderEditState();
      }

      const chip = event.target.closest("[data-chip-group]");
      if (chip && !profileState.editing) return;
      if (chip) {
        const group = chip.dataset.chipGroup;
        const value = chip.dataset.chipValue;
        const selectedSet = profileState.chips[group];
        if (selectedSet.has(value)) selectedSet.delete(value);
        else selectedSet.add(value);

        if (group === "jobs" && profileState.preferences.detailJob && !getDetailJobOptions().includes(profileState.preferences.detailJob)) {
          profileState.preferences.detailJob = "";
        }
        renderChipRows();
        renderPickedValues();
      }

      const searchButton = event.target.closest("[data-open-search]");
      if (searchButton && !profileState.editing) return;
      if (searchButton) renderSearchModal(searchButton.dataset.openSearch);

      const searchOption = event.target.closest("[data-select-search]");
      if (searchOption && !profileState.editing) return;
      if (searchOption) {
        profileState.preferences[searchOption.dataset.selectSearch] = searchOption.dataset.searchValue || "";
        closeSearchModal();
        renderPickedValues();
      }

      if (event.target.closest("[data-close-modal]") || event.target.closest("[data-modal-backdrop]")) {
        closeSearchModal();
      }

      const anchor = event.target.closest("[data-anchor-target]");
      if (anchor) {
        const target = document.querySelector(`#${anchor.dataset.anchorTarget}`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.querySelectorAll("[data-anchor-target]").forEach((item) => item.classList.remove("active"));
        anchor.classList.add("active");
      }

      if (event.target.closest("[data-save-profile]")) {
        if (profileState.saving) return;

        profileState.saving = true;
        profileState.saveError = "";
        renderFormActions();

        const saved = await saveProfile();
        profileState.saving = false;

        if (saved) {
          profileState.editing = false;
          profileState.datePickerOpen = false;
          profileState.periodPicker = null;
        } else {
          profileState.saveError = "DB 저장에 실패했습니다. 다시 저장해주세요.";
        }

        renderAllDynamicParts();
      }
    });

    document.addEventListener("change", (event) => {
      if (!profileState.editing) return;

      const photoInput = event.target.closest("#photoInput");
      if (photoInput) {
        const file = photoInput.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener("load", () => {
          profileState.photo = String(reader.result || "");
          renderPhoto();
        });
        reader.readAsDataURL(file);
      }

      const datePart = event.target.closest("[data-date-part]");
      if (datePart) {
        const { year, month, day } = getDateParts(profileState.birthDate);
        const nextYear = datePart.dataset.datePart === "year" ? Number(datePart.value) : year;
        const nextMonth = datePart.dataset.datePart === "month" ? Number(datePart.value) : month;
        const nextDay = Math.min(day, getDaysInMonth(nextYear, nextMonth));
        profileState.birthDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
        profileState.datePickerOpen = true;
        renderDatePicker();
      }

      const periodPart = event.target.closest("[data-period-part]");
      if (periodPart) {
        const index = Number(periodPart.dataset.periodIndex);
        const fieldName = periodPart.dataset.periodField;
        const { year, month } = getMonthParts(profileState.educations[index][fieldName]);
        const nextYear = periodPart.dataset.periodPart === "year" ? Number(periodPart.value) : year;
        const nextMonth = periodPart.dataset.periodPart === "month" ? Number(periodPart.value) : month;
        profileState.educations[index][fieldName] = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
        profileState.periodPicker = { index, fieldName };
        renderEducationList();
      }

      const eduInput = event.target.closest("[data-edu-field]");
      if (eduInput) {
        const index = Number(eduInput.dataset.eduIndex);
        const fieldName = eduInput.dataset.eduField;
        if (profileState.educations[index]) profileState.educations[index][fieldName] = eduInput.value;
      }

      const salarySelect = event.target.closest("[data-salary-select]");
      if (salarySelect) profileState.preferences.salary = salarySelect.value;
    });

    document.addEventListener("input", (event) => {
      if (!profileState.editing) return;

      const searchInput = event.target.closest("[data-search-input]");
      if (searchInput) {
        const modal = document.querySelector("[data-search-options]");
        const dialog = searchInput.closest(".search-modal");
        const type = dialog?.getAttribute("aria-label")?.replace(" 선택", "");
        const key = Object.entries(searchConfigs).find(([, config]) => config.label === type)?.[0];
        if (modal && key) modal.innerHTML = renderSearchOptions(key, searchInput.value);
      }

      const eduInput = event.target.closest("[data-edu-field]");
      if (eduInput) {
        const index = Number(eduInput.dataset.eduIndex);
        const fieldName = eduInput.dataset.eduField;
        if (profileState.educations[index]) profileState.educations[index][fieldName] = eduInput.value;
      }
    });

    async function initProfilePage() {
      try {
        await loadSavedProfile();
      } finally {
        renderAllDynamicParts();
        revealProfilePage();
      }
    }

    initProfilePage();
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

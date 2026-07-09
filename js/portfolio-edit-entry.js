(function () {
  if (new URLSearchParams(window.location.search).has('edit')) {
    document.documentElement.classList.add('portfolio-edit-entry');
  }
}());

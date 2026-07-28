(function () {
  'use strict';

  function configureMathFields() {
    var fields = document.querySelectorAll('math-field[data-latex]');
    fields.forEach(function (field) {
      field.value = field.getAttribute('data-latex') || '';
      field.readOnly = true;
      field.virtualKeyboardMode = 'manual';
    });
  }

  function showUnavailableState() {
    var status = document.querySelector('[data-mathlive-status]');
    if (status) status.hidden = false;
  }

  document.addEventListener('dl:mathlive-ready', configureMathFields);
  document.addEventListener('dl:mathlive-unavailable', showUnavailableState);

  if (document.documentElement.classList.contains('dl-mathlive-ready')) configureMathFields();
  if (document.documentElement.classList.contains('dl-mathlive-unavailable')) showUnavailableState();
})();

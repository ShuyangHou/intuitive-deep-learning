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

  function bindFormulaTerms() {
    var terms = document.querySelectorAll('.ftl-term[data-dl-explain]');

    function closeAll(except) {
      terms.forEach(function (term) {
        if (term !== except) term.classList.remove('is-explaining');
      });
    }

    terms.forEach(function (term) {
      term.addEventListener('click', function (event) {
        event.stopPropagation();
        var open = !term.classList.contains('is-explaining');
        closeAll(term);
        term.classList.toggle('is-explaining', open);
      });
    });

    document.addEventListener('click', function () {
      closeAll(null);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll(null);
    });
  }

  document.addEventListener('dl:mathlive-ready', configureMathFields);
  document.addEventListener('dl:mathlive-unavailable', showUnavailableState);

  if (document.documentElement.classList.contains('dl-mathlive-ready')) configureMathFields();
  if (document.documentElement.classList.contains('dl-mathlive-unavailable')) showUnavailableState();
  bindFormulaTerms();
})();

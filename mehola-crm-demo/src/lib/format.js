/* Formatting helpers (he-IL). */
(function (M) {
  'use strict';

  var HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי',
                    'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  function nf(n, dec) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toLocaleString('he-IL', { minimumFractionDigits: dec || 0,
                                       maximumFractionDigits: dec === undefined ? 0 : dec });
  }

  /* Numbers are LTR runs inside RTL text. Without an isolate the browser
     moves a leading "-" or "₪" to the wrong end of the number. */
  var LRI = '⁦', PDI = '⁩';
  function ltr(s) { return LRI + s + PDI; }

  M.fmt = {
    /** 1234.5 -> "₪1,235" */
    money: function (n, dec) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      return ltr('₪' + nf(n, dec === undefined ? 0 : dec));
    },
    /** signed money, for profit columns */
    moneySigned: function (n, dec) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      return ltr((n < 0 ? '-' : '') + '₪' + nf(Math.abs(n), dec === undefined ? 0 : dec));
    },
    num: function (n, dec) { return n === null || n === undefined || isNaN(n) ? '—' : ltr(nf(n, dec)); },
    /** 8.5 -> "8.5" ; 8 -> "8" */
    hours: function (h) {
      if (h === null || h === undefined || isNaN(h)) return '—';
      return ltr((Math.round(h * 100) / 100).toLocaleString('he-IL'));
    },
    pct: function (n, dec) {
      if (n === null || n === undefined || !isFinite(n)) return '—';
      return ltr(nf(n * 100, dec === undefined ? 1 : dec) + '%');
    },
    /** "2026-08-05" -> "05/08/26" */
    date: function (iso) {
      if (!iso) return '—';
      var p = iso.split('-');
      return ltr(p[2] + '/' + p[1] + '/' + p[0].slice(2));
    },
    /** "2026-08-05" -> "5 באוגוסט 2026" */
    dateLong: function (iso) {
      if (!iso) return '—';
      var d = new Date(iso + 'T00:00:00');
      return d.getDate() + ' ב' + HEB_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    },
    /** "2026-08-05" -> "05/08" — plain, for chart axes */
    dayMonth: function (iso) {
      var p = iso.split('-');
      return p[2] + '/' + p[1];
    },
    /** "2026-08" -> "אוגוסט 2026" */
    month: function (ym) {
      var p = ym.split('-');
      return HEB_MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0];
    },
    dayName: function (iso) { return HEB_DAYS[new Date(iso + 'T00:00:00').getDay()]; },
    /** "07:00" -> 7.0  (decimal hours) */
    toHours: function (hhmm) {
      var p = String(hhmm).split(':');
      return parseInt(p[0], 10) + parseInt(p[1] || 0, 10) / 60;
    },
    monthOf: function (iso) { return iso.slice(0, 7); }
  };
})(window.M = window.M || {});

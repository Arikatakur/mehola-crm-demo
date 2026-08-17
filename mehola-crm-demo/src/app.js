/* App shell: hash router, nav, scenario switch, re-render on config change. */
(function (M) {
  'use strict';

  var ROUTES = [
    { path: '', view: 'dashboard', nav: 'סקירת אתר', icon: '◫' },
    { path: 'pnl', view: 'pnl', nav: 'רווח והפסד יומי', icon: '₪' },
    { path: 'day', view: 'day' },
    { path: 'workers', view: 'workers', nav: 'עובדים', icon: '☰' },
    { path: 'worker', view: 'worker' },
    { path: 'rates', view: 'rates', nav: 'תעריפים והגדרות', icon: '⚙', group: 'ניהול' },
    { path: 'quality', view: 'quality', nav: 'איכות נתונים', icon: '⚑', group: 'ניהול' }
  ];

  var data = M.DATA;
  var cfg = M.config.load(data);

  function parseHash() {
    var raw = (location.hash || '#/').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(function (p) { return p !== ''; });
    var path = parts[0] || '';
    var route = null;
    ROUTES.forEach(function (r) { if (r.path === path) route = r; });
    return { route: route || ROUTES[0], params: parts.slice(1) };
  }

  function buildNav(activePath) {
    var nav = document.getElementById('nav');
    var html = '';
    var lastGroup = null;
    ROUTES.filter(function (r) { return r.nav; }).forEach(function (r) {
      if (r.group && r.group !== lastGroup) {
        html += '<div class="nav-sep">' + r.group + '</div>';
        lastGroup = r.group;
      }
      var on = r.path === activePath ? ' on' : '';
      html += '<a class="' + on.trim() + '" href="#/' + r.path + '">' +
        '<span class="ic">' + r.icon + '</span>' + r.nav +
        (r.path === 'quality' ? '<span class="badge warn">' +
          data.issues.filter(function (i) { return i.severity !== 'fixed'; }).length + '</span>' : '') +
        '</a>';
    });
    nav.innerHTML = html;
  }

  function buildScenario() {
    var host = document.getElementById('scenario');
    host.innerHTML =
      '<button data-mode="required" class="' + (cfg.scheduleMode === 'required' ? 'on' : '') + '">' +
        'יום ' + cfg.requiredIn + '–' + cfg.requiredOut + '</button>' +
      '<button data-mode="actual" class="' + (cfg.scheduleMode === 'actual' ? 'on' : '') + '">' +
        'שעות בפועל</button>';
    Array.prototype.forEach.call(host.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        M.config.set({ scheduleMode: b.getAttribute('data-mode') });
      });
    });
  }

  /** Remember focus + caret so live-editing inputs survives a re-render. */
  function captureFocus() {
    var a = document.activeElement;
    if (!a || !a.matches || !a.matches('input,select,textarea')) return null;
    var key = a.getAttribute('data-cfg') || a.id;
    if (!key) return null;
    return { key: key, start: a.selectionStart, end: a.selectionEnd, scroll: window.scrollY };
  }

  function restoreFocus(f) {
    if (!f) return;
    var el = document.querySelector('[data-cfg="' + f.key + '"]') || document.getElementById(f.key);
    if (!el) return;
    el.focus();
    try { if (f.start !== null && el.setSelectionRange) el.setSelectionRange(f.start, f.end); } catch (e) {}
  }

  var currentRoute = null;

  function render() {
    var r = parseHash();
    currentRoute = r;
    var view = M.views[r.route.view];
    var mount = document.getElementById('view');
    var focus = captureFocus();

    var days = M.calc.run(data, cfg);
    var ctx = {
      data: data, cfg: cfg, days: days, totals: M.calc.totals(days), params: r.params
    };

    document.getElementById('viewTitle').textContent =
      typeof view.title === 'function' ? view.title(ctx) : view.title;
    var sub = typeof view.sub === 'function' ? view.sub(ctx) : (view.sub || '');
    document.getElementById('viewSub').innerHTML = sub;

    buildNav(r.route.path);
    buildScenario();
    mount.innerHTML = '';
    view.render(ctx, mount);
    restoreFocus(focus);
  }

  M.app = {
    rerender: render,
    ctx: function () { return currentRoute; }
  };

  window.addEventListener('hashchange', function () {
    render();
    window.scrollTo(0, 0);
  });

  M.config.onChange(function (next) { cfg = next; render(); });

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('siteName').textContent = data.site.name;
    document.getElementById('siteRange').textContent =
      M.fmt.date(data.source.from) + ' – ' + M.fmt.date(data.source.to);
    document.getElementById('btnPrint').addEventListener('click', function () { window.print(); });
    render();
  });
})(window.M = window.M || {});

/* App shell: hash router, nav, scenario switch, re-render on config change. */
(function (M) {
  'use strict';

  var ROUTES = [
    { path: '', view: 'dashboard', nav: 'סקירת אתר', icon: '◫' },
    { path: 'pnl', view: 'pnl', nav: 'רווח והפסד יומי', icon: '₪' },
    { path: 'day', view: 'day' },
    { path: 'workers', view: 'workers', nav: 'עובדים', icon: '☰' },
    { path: 'worker', view: 'worker' },
    { path: 'worker-new', view: 'workerform' },
    { path: 'worker-edit', view: 'workerform' },
    { path: 'rates', view: 'rates', nav: 'תעריפים והגדרות', icon: '⚙', group: 'ניהול' },
    { path: 'quality', view: 'quality', nav: 'איכות נתונים', icon: '⚑', group: 'ניהול' }
  ];

  /* imported sheet + everything created in the app, layered */
  var data = M.store.apply(M.DATA);
  var cfg = M.config.load(data);
  M.config.ensureCarriers(data);

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
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      a.addEventListener('click', closeMobileNav);
    });
  }

  function closeMobileNav() {
    document.body.classList.remove('nav-open');
    var trigger = document.getElementById('mobileMenu');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  var THEMES = {
    blue: 'כחול מודרני', emerald: 'ירוק טבעי', violet: 'סגול יצירתי',
    sunset: 'כתום חם', graphite: 'אפור אלגנטי'
  };

  var SCREEN_HELP = {
    '': ['סקירת האתר', 'מסך מנהלים המסכם הכנסות, עלויות, רווחיות ומגמות לאורך זמן.', ['עברו עם העכבר על הגרפים לקבלת ערך יומי', 'לחצו על עובד, מסיע או יום לקבלת פירוט', 'החליפו בין יום נדרש לשעות בפועל', 'הדפיסו סיכום לישיבה']],
    pnl: ['רווח והפסד יומי', 'גיליון יומי המחבר תפוקה, הכנסה, שכר והסעות לשורת רווח אחת.', ['לחצו על יום לפתיחת מרכיבי העלות', 'סקרו ימים חריגים', 'הוסיפו יום עבודה', 'ייצאו CSV ל-Excel']],
    day: ['פרטי יום עבודה', 'פירוט העובדים, השעות, ההסעות, התפוקה והרווח ביום שנבחר.', ['הוסיפו או הסירו משמרת', 'עדכנו תפוקה', 'בדקו שעות נוספות', 'חזרו לגיליון היומי להשוואה']],
    workers: ['מאגר העובדים', 'טבלת עובדים מאוחדת עם עלויות, נוכחות, צוות ומסיע.', ['סננו מכל עמודה כמו ב-Excel', 'לחצו על כותרת למיון', 'פתחו עובד בלחיצה על השורה', 'ייצאו את התוצאות המסוננות', 'הוסיפו עובד או השלימו פרטים']],
    worker: ['תיק עובד', 'תמונה מרוכזת של פרטי העובד, התעריף, העלות ויומן הנוכחות.', ['ערכו פרטים ותעריף', 'פתחו יום מיומן הנוכחות', 'בדקו שעות נוספות ועלות חודשית']],
    'worker-new': ['הוספת עובד', 'יצירת עובד חדש והכנתו לשיבוץ.', ['הזינו שם וזיהוי', 'בחרו צוות ומסיע', 'קבעו תעריף', 'שמרו ושייכו ליום עבודה']],
    'worker-edit': ['עריכת עובד', 'תיקון פרטים בלי למחוק את נתוני המקור.', ['השלימו פרטים', 'שנו סטטוס או שיוך', 'עדכנו תעריף', 'שמרו את התיקון']],
    rates: ['תעריפים והגדרות', 'מרכז ההנחות העסקיות המשפיעות על חישובי הרווח וההפסד.', ['עדכנו שעות ומדרגות נוספות', 'שנו מחיר ליחידת תפוקה', 'נהלו שכר והסעות', 'בדקו מיד את ההשפעה על הרווח']],
    quality: ['איכות נתונים', 'מרכז בקרה לנתונים חסרים, הנחות, כפילויות וחריגות.', ['עברו על ממצאים לפי חומרה', 'תקנו פרטים חסרים', 'בדקו הנחות תעריף', 'טפלו בממצאים לפני דוח סופי']]
  };

  var CARD_HELP = {
    'רווח והפסד לפי יום': 'כל עמודה היא יום. מעל האפס הוא רווח ומתחת לאפס הוא הפסד. יום ללא תפוקה מוצג בנפרד.',
    'הכנסה מול עלות': 'השוואה בין ההכנסה מתפוקה לעלות העובדים וההסעות. פער קבוע עשוי להצביע על בעיית תמחור.',
    'מבנה העלות': 'פירוק העלות לשעות רגילות, שעות נוספות והסעות כדי לזהות את מקור העלות.',
    'עלות הסעות לפי מסיע': 'סיכום התשלום לכל מסיע לפי שיטת החיוב שהוגדרה.',
    'עלות לפי עובד': 'דירוג עובדים לפי עלות. יש להשוות גם לימי העבודה ולמספר השעות.',
    'סיכום חודשי': 'ריכוז נתונים לפי חודש להשוואת תפוקה, עלות ורווחיות.',
    'נתוני מקור': 'מידע על קובץ המקור והנתונים שעליהם מבוססים החישובים.',
    'מאגר עובדים': 'הטבלה המרכזית. ניתן למיין, לסנן מכל עמודה, לפתוח עובד ולייצא את התוצאה.',
    'פרטי עובד': 'פרטי זיהוי ושיוך. תעודת זהות מאפשרת לאחד את אותו עובד בין אתרים.',
    'שכר': 'התעריף השעתי והעלות המשוערת ליום מלא לפי מדרגות השעות הנוספות.',
    'פירוט עלות': 'פירוק עלות העובד לשעות רגילות, 125% ו-150%.',
    'יומן נוכחות': 'כל ימי העבודה של העובד. לחיצה על שורה פותחת את היום המלא.',
    'עלות עובדים מפורטת': 'עובדי היום עם שעות, מדרגות שכר ועלות מחושבת.',
    'עלות הסעות — פירוט': 'מי נסע עם איזה מסיע וכיצד חושבה העלות.',
    'רווח והפסד ליום': 'הכנסה פחות שכר והסעות. ללא תפוקה אי אפשר לפרש רווחיות מלאה.',
    'יום עבודה ומדרג שעות נוספות': 'מגדיר את יום העבודה ואת נקודות המעבר ל-125% ול-150%.',
    'הכנסה': 'מחיר ליחידת תפוקה כפול מספר היחידות שנרשמו.',
    'תעריפי שכר': 'תעריף ברירת מחדל וחריגים לעובדים מסוימים.',
    'הסעות': 'כללי החיוב למסיעים—סכום ליום או סכום לעובד.',
    'רשומות שנוספו במערכת': 'מידע שנוצר באפליקציה ולא הגיע מקובץ המקור.',
    'מה זה אומר בפועל': 'תרגום ממצאי איכות הנתונים להשפעה עסקית ולפעולה מומלצת.'
  };

  function helpHtml(summary, actions) {
    return '<p class="help-summary">' + summary + '</p><h3>מה אפשר לעשות כאן?</h3><ul>' +
      actions.map(function (a) { return '<li><span>✓</span>' + a + '</li>'; }).join('') + '</ul>' +
      '<div class="help-tip"><strong>טיפ:</strong> לחצו על שורות וקישורים כחולים לקבלת פירוט נוסף.</div>';
  }

  function openHelp(title, html) {
    document.getElementById('helpTitle').textContent = title;
    document.getElementById('helpContent').innerHTML = html;
    document.getElementById('helpOverlay').removeAttribute('hidden');
    document.body.classList.add('help-open');
    document.getElementById('helpClose').focus();
  }

  function closeHelp() {
    document.getElementById('helpOverlay').setAttribute('hidden', '');
    document.body.classList.remove('help-open');
  }

  function applyTheme(name) {
    if (!THEMES[name]) name = 'blue';
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('mehola-theme', name);
    var label = document.getElementById('themeName');
    if (label) label.textContent = THEMES[name];
    Array.prototype.forEach.call(document.querySelectorAll('.theme-option'), function (b) {
      var selected = b.getAttribute('data-theme') === name;
      b.classList.toggle('on', selected);
      b.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
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
      data: data, cfg: cfg, days: days, totals: M.calc.totals(days),
      params: r.params, path: r.route.path
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

  M.store.onChange(function () {
    data = M.store.apply(M.DATA);
    M.config.ensureCarriers(data);
    render();
  });

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(localStorage.getItem('mehola-theme') || 'blue');
    document.getElementById('siteName').textContent = data.site.name;
    document.getElementById('siteRange').textContent =
      M.fmt.date(data.source.from) + ' – ' + M.fmt.date(data.source.to);
    document.getElementById('btnPrint').addEventListener('click', function () { window.print(); });
    document.getElementById('mobileMenu').addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.getElementById('navBackdrop').addEventListener('click', closeMobileNav);
    document.getElementById('screenHelp').addEventListener('click', function () {
      var current = parseHash(), item = SCREEN_HELP[current.route.path] || SCREEN_HELP[''];
      openHelp(item[0], helpHtml(item[1], item[2]));
    });
    document.getElementById('helpClose').addEventListener('click', closeHelp);
    document.getElementById('helpOverlay').addEventListener('click', function (e) { if (e.target === this) closeHelp(); });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-help-card]');
      if (!b) return;
      var title = b.getAttribute('data-help-card'), text = CARD_HELP[title];
      if (!text) Object.keys(CARD_HELP).some(function (key) {
        if (title.indexOf(key) === 0) { text = CARD_HELP[key]; return true; } return false;
      });
      openHelp(title, '<p class="help-summary">' + (text || 'כרטיס זה מרכז נתונים בנושא ומאפשר להבין את התמונה לפני מעבר לפירוט.') + '</p>');
    });
    document.getElementById('themeToggle').addEventListener('click', function () {
      var panel = document.getElementById('themePanel');
      var open = panel.hasAttribute('hidden');
      if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.theme-option'), function (b) {
      b.addEventListener('click', function () { applyTheme(this.getAttribute('data-theme')); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMobileNav(); closeHelp(); } });
    render();
  });
})(window.M = window.M || {});

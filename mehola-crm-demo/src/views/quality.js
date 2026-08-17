/* View: data-quality report from the Excel migration.
   Section 3 of the feature report: staging, de-duplication, audit trail. */
(function (M) {
  'use strict';

  M.views = M.views || {};

  var KINDS = {
    'name-merge':    { title: 'איחוד כתיבים של שמות', icon: '⧉',
                       what: 'אותו עובד נרשם בכמה כתיבים שונים בגיליון. הרשומות אוחדו לעובד אחד.' },
    'date-typo':     { title: 'תאריכים שתוקנו', icon: '⏱',
                       what: 'תאריך שנרשם מחוץ לרצף הכרונולוגי — שוחזר לפי שם היום בגיליון.' },
    'id-missing':    { title: 'עובדים ללא ת.ז', icon: '⚑',
                       what: 'ת.ז הוא המפתח לאיחוד עובד בין אתרים. בלעדיו לא ניתן להרכיב תיק עובד חוצה-אתרים.' },
    'id-invalid':    { title: 'ת.ז לא תקינה', icon: '⚑',
                       what: 'המספר אינו עומד בבדיקת ספרת הביקורת של תעודת זהות.' },
    'id-multi':      { title: 'כמה מספרי ת.ז לאותו עובד', icon: '⚑',
                       what: 'לאותה רשומת עובד נרשמו מספרי זהות שונים בימים שונים.' },
    'id-conflict':   { title: 'אותה ת.ז לשני עובדים', icon: '✖',
                       what: 'מספר זהות אחד משויך לשני אנשים שונים — חייב בירור לפני העלייה לייצור.' },
    'units-missing': { title: 'ימים ללא נתוני ייצור', icon: '✖',
                       what: 'ללא סה״כ ייצור יומי לא ניתן לחשב הכנסה, ולכן היום אינו נכלל בחישוב הרווח.' },
    'empty-day':     { title: 'ימים ללא רישומי נוכחות', icon: '⚑', what: '' },
    'orphan-row':    { title: 'שורות ללא שיוך ליום', icon: '⚑', what: '' }
  };

  M.views.quality = {
    title: 'איכות נתונים',
    sub: function (ctx) {
      return 'ממצאי המרת הגיליון ' + ctx.data.source.file + ' — ' + ctx.data.issues.length + ' ממצאים';
    },

    render: function (ctx, mount) {
      var ui = M.ui, f = M.fmt;
      var issues = ctx.data.issues;

      var fixed = issues.filter(function (i) { return i.severity === 'fixed'; });
      var warn = issues.filter(function (i) { return i.severity === 'warn'; });
      var errors = issues.filter(function (i) { return i.severity === 'error'; });

      var kpis = '<div class="grid g-4">' +
        ui.kpi('רישומי נוכחות שנקראו', f.num(ctx.data.source.shifts),
               ctx.data.source.days + ' ימי עבודה בגיליון') +
        ui.kpi('עובדים לאחר איחוד', f.num(ctx.data.workers.length),
               fixed.filter(function (i) { return i.kind === 'name-merge'; }).length + ' רשומות אוחדו') +
        ui.kpi('תוקן אוטומטית', f.num(fixed.length), 'עם תיעוד מלא של השינוי') +
        ui.kpi('דורש בירור', f.num(warn.length + errors.length),
               errors.length + ' חוסמים · ' + warn.length + ' לטיפול',
               { accent: true, tone: errors.length ? 'neg' : '' }) +
        '</div>';

      var intro = ui.notice('הגיליון הומר במעבר אוטומטי אחד: קריאה → ניקוי → איחוד כפילויות → ביקורת. ' +
        'שום שורה לא נמחקה — כל מה שלא ניתן היה לפתור בוודאות מדווח כאן במקום להיות מנוחש. ' +
        'הרצה חוזרת: <code>python tools/migrate_excel.py</code>.', '', 'ℹ');

      var order = ['id-conflict', 'units-missing', 'id-multi', 'id-invalid', 'id-missing',
                   'empty-day', 'orphan-row', 'name-merge', 'date-typo'];
      var groups = order.filter(function (k) {
        return issues.some(function (i) { return i.kind === k; });
      }).map(function (kind) {
        var list = issues.filter(function (i) { return i.kind === kind; });
        var meta = KINDS[kind] || { title: kind, icon: '•', what: '' };
        var sev = list[0].severity;
        var badge = sev === 'fixed' ? ui.badge('תוקן אוטומטית', 'pos')
                  : sev === 'error' ? ui.badge('חוסם', 'neg')
                                    : ui.badge('לטיפול המשרד', 'warn');

        var rows = list.map(function (i) {
          return {
            ref: '<span class="strong nowrap">' + ui.esc(i.ref || '—') + '</span>',
            detail: '<span style="white-space:normal">' + ui.esc(i.detail) + '</span>'
          };
        });

        return ui.card(meta.icon + '  ' + meta.title, meta.what,
          ui.table([{ t: 'רשומה', k: 'ref' }, { t: 'פירוט', k: 'detail' }], rows),
          { flush: true, actions: badge + ' <span class="badge">' + list.length + '</span>' });
      }).join('<div style="height:16px"></div>');

      var impact = ui.card('מה זה אומר בפועל', null,
        '<div class="stat-line"><span class="k">עובדים שאי אפשר לאחד בין אתרים (ללא ת.ז)</span>' +
          '<span class="v">' + issues.filter(function (i) { return i.kind === 'id-missing'; }).length +
          ' מתוך ' + ctx.data.workers.length + '</span></div>' +
        '<div class="stat-line"><span class="k">ימים שאינם נספרים ברווח (ללא ייצור)</span><span class="v">' +
          ctx.totals.daysMissingUnits + '</span></div>' +
        '<div class="stat-line"><span class="k">עלות הימים הללו, שכן נכללת בעלויות</span><span class="v">' +
          f.money(ctx.days.filter(function (d) { return !d.hasUnits; })
            .reduce(function (a, d) { return a + d.totalCost; }, 0)) + '</span></div>' +
        '<div class="stat-line total"><span class="k">חסמים לפני עלייה לייצור</span><span class="v ' +
          (errors.length ? 'neg' : 'pos') + '">' + errors.length + '</span></div>' +
        '<div style="height:14px"></div>' +
        ui.notice('במערכת הייעודית הבעיות האלה נמנעות במקור: ת.ז הוא מפתח חובה, שם עובד נבחר מרשימה ' +
          'ולא מוקלד, תאריך היום נקבע על ידי המערכת, וסה״כ הייצור היומי נדרש לפני סגירת יום.', '', '✔'));

      mount.innerHTML = kpis + '<div style="height:18px"></div>' + intro +
        '<div style="height:18px"></div>' + impact +
        '<div style="height:18px"></div>' + groups;
    }
  };
})(window.M = window.M || {});

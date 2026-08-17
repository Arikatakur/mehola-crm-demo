/* View: single worker file ("ברוט") — every shift the person worked,
   aggregated from rows that were scattered across the sheet. */
(function (M) {
  'use strict';

  M.views = M.views || {};

  M.views.worker = {
    title: 'תיק עובד',
    sub: function (ctx) {
      var w = find(ctx);
      return w ? w.name + (w.tz ? ' · ת.ז ' + w.tz : ' · ללא ת.ז') : '';
    },

    render: function (ctx, mount) {
      var f = M.fmt, ui = M.ui, cfg = ctx.cfg;
      var w = find(ctx);
      if (!w) {
        mount.innerHTML = '<div class="card"><div class="empty">העובד לא נמצא. ' +
          '<a href="#/workers">חזרה למאגר העובדים</a></div></div>';
        return;
      }

      var months = {};
      w.entries.forEach(function (e) {
        var m = e.date.slice(0, 7);
        var a = months[m] || (months[m] = { month: m, days: 0, hours: 0, ot: 0, cost: 0, transport: 0 });
        a.days++;
        a.hours += e.line.hours;
        a.ot += e.line.h125 + e.line.h150;
        a.cost += e.line.cost;
        a.transport += e.transport;
      });
      var monthList = Object.keys(months).sort().map(function (k) { return months[k]; });

      var isOverride = cfg.workerRates[w.id] !== undefined;

      var kpis = '<div class="grid g-4">' +
        ui.kpi('ימי עבודה', f.num(w.days), 'מתוך ' + ctx.days.length + ' ימי פעילות באתר') +
        ui.kpi('שעות', f.hours(w.hours),
               w.h125 + w.h150 ? f.hours(w.h125 + w.h150) + ' שעות נוספות' : 'ללא שעות נוספות') +
        ui.kpi('תעריף שעה', f.money(w.rate),
               isOverride ? 'תעריף חריג שנקבע לעובד/ת' : 'תעריף בסיס של האתר',
               { badge: isOverride ? 'חריג' : null, badgeKind: 'info' }) +
        ui.kpi('עלות כוללת', f.money(w.cost + w.transport),
               'שכר ' + f.money(w.cost) + ' · הסעות ' + f.money(w.transport), { accent: true }) +
        '</div>';

      if (!w.days) {
        mount.innerHTML =
          '<div class="crumb"><a href="#/workers">עובדים</a> ← ' + ui.esc(w.name) + '</div>' +
          kpis + '<div style="height:18px"></div>' +
          ui.card('פרטי עובד', null, identityHtml(w, ctx, ui) +
            '<div style="height:14px"></div>' +
            ui.notice('העובד/ת נוסף/ה למאגר אך טרם שובץ/ה ליום עבודה, ולכן אינו/ה משפיע/ה על ' +
              'הרווח וההפסד. לשיבוץ: פתחו יום ב<a href="#/pnl">רווח והפסד יומי</a> ולחצו ' +
              '"הוספת עובד ליום".', '', 'ℹ'),
            { actions: '<a class="btn sm" href="#/worker-edit/' + w.id + '">עריכה</a>' });
        return;
      }

      /* identity card */
      var idCard = ui.card('פרטי עובד', null, identityHtml(w, ctx, ui),
        { actions: '<a class="btn sm" href="#/worker-edit/' + w.id + '">עריכה</a>' });

      /* cost split */
      var costCard = ui.card('פירוט עלות', 'לפי מדרג השעות הנוספות של האתר',
        '<div class="stat-line"><span class="k">שעות 100%</span><span class="v">' +
          f.hours(w.h100) + ' ש׳ × ' + f.money(w.rate) + ' = ' + f.money(w.h100 * w.rate) + '</span></div>' +
        '<div class="stat-line"><span class="k">שעות 125%</span><span class="v">' +
          f.hours(w.h125) + ' ש׳ × ' + f.money(w.rate * cfg.ot.mult125, 2) + ' = ' +
          f.money(w.h125 * w.rate * cfg.ot.mult125) + '</span></div>' +
        '<div class="stat-line"><span class="k">שעות 150%</span><span class="v">' +
          f.hours(w.h150) + ' ש׳ × ' + f.money(w.rate * cfg.ot.mult150, 2) + ' = ' +
          f.money(w.h150 * w.rate * cfg.ot.mult150) + '</span></div>' +
        '<div class="stat-line"><span class="k">סה״כ שכר</span><span class="v">' + f.money(w.cost) + '</span></div>' +
        '<div class="stat-line"><span class="k">הסעות (חלק יחסי)</span><span class="v">' +
          f.money(w.transport) + '</span></div>' +
        '<div class="stat-line total"><span class="k">עלות כוללת לחברה</span><span class="v">' +
          f.money(w.cost + w.transport) + '</span></div>' +
        '<div class="stat-line"><span class="k">עלות ממוצעת ליום</span><span class="v">' +
          f.money((w.cost + w.transport) / w.days) + '</span></div>');

      /* monthly */
      var monthCard = ui.card('סיכום חודשי', null, ui.table([
        { t: 'חודש', k: 'month' }, { t: 'ימים', k: 'days', n: true },
        { t: 'שעות', k: 'hours', n: true }, { t: 'ש. נוספות', k: 'ot', n: true },
        { t: 'שכר', k: 'cost', n: true }, { t: 'הסעות', k: 'transport', n: true },
        { t: 'עלות כוללת', k: 'total', n: true }
      ], monthList.map(function (m) {
        return {
          month: '<span class="strong">' + f.month(m.month) + '</span>',
          days: m.days, hours: f.hours(m.hours),
          ot: m.ot ? f.hours(m.ot) : '<span class="muted">—</span>',
          cost: f.money(m.cost), transport: f.money(m.transport),
          total: '<span class="strong">' + f.money(m.cost + m.transport) + '</span>'
        };
      }), {
        foot: {
          month: 'סה״כ', days: w.days, hours: f.hours(w.hours), ot: f.hours(w.h125 + w.h150),
          cost: f.money(w.cost), transport: f.money(w.transport), total: f.money(w.cost + w.transport)
        }
      }), { flush: true });

      /* attendance log */
      var logRows = w.entries.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })
        .map(function (e) {
          return {
            __cls: 'clickable',
            __attrs: 'onclick="location.hash=\'#/day/' + e.date + '\'"',
            date: f.date(e.date),
            day: '<span class="muted">' + ui.esc(e.dayName) + '</span>',
            team: '<span class="muted">' + ui.esc(e.line.team) + '</span>',
            carrier: ui.esc(e.line.carrier),
            'in': e.line['in'], out: e.line.out,
            hours: f.hours(e.line.hours),
            ot: e.line.h125 + e.line.h150 ? f.hours(e.line.h125 + e.line.h150) : '<span class="muted">—</span>',
            cost: f.money(e.line.cost),
            transport: e.transport ? f.money(e.transport) : '<span class="muted">—</span>',
            src: '<span class="muted">שורה ' + e.line.srcRow + '</span>'
          };
        });

      var logCard = ui.card('יומן נוכחות', w.days + ' ימים · לחיצה על שורה פותחת את היום המלא',
        ui.table([
          { t: 'תאריך', k: 'date' }, { t: 'יום', k: 'day' }, { t: 'צוות', k: 'team' },
          { t: 'מסיע', k: 'carrier' }, { t: 'כניסה', k: 'in', n: true }, { t: 'יציאה', k: 'out', n: true },
          { t: 'שעות', k: 'hours', n: true }, { t: 'ש. נוספות', k: 'ot', n: true },
          { t: 'שכר', k: 'cost', n: true }, { t: 'הסעה', k: 'transport', n: true },
          { t: 'מקור בגיליון', k: 'src' }
        ], logRows), { flush: true, actions: '<button class="btn sm" data-csv="log">ייצוא CSV</button>' });

      mount.innerHTML =
        '<div class="crumb"><a href="#/workers">עובדים</a> ← ' + ui.esc(w.name) + '</div>' +
        kpis + '<div style="height:18px"></div>' +
        '<div class="grid g-2">' + idCard + costCard + '</div>' +
        '<div style="height:18px"></div>' + monthCard +
        '<div style="height:18px"></div>' + logCard;

      ui.bindCsv(mount, {
        log: function () {
          M.ui.csv('worker-' + w.id + '.csv',
            ['תאריך', 'יום', 'צוות', 'מסיע', 'כניסה', 'יציאה', 'שעות', '100%', '125%', '150%',
             'תעריף', 'שכר', 'הסעה'],
            w.entries.map(function (e) {
              var l = e.line;
              return [e.date, e.dayName, l.team, l.carrier, l['in'], l.out, l.hours.toFixed(2),
                      l.h100.toFixed(2), l.h125.toFixed(2), l.h150.toFixed(2), l.rate,
                      Math.round(l.cost), Math.round(e.transport)];
            }));
        }
      });
    }
  };

  /** Identity block — shared by the full file and the "no shifts yet" short form. */
  function identityHtml(w, ctx, ui) {
    var aliases = (w.aliases || []);
    var src = w.worker || w;
    var line = function (k, v) {
      return '<div class="stat-line"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
    };
    return line('שם', ui.esc(w.name) +
                (w.added ? ' ' + ui.badge('נוסף במערכת', 'pos') : '') +
                (w.edited ? ' ' + ui.badge('עודכן', 'info') : '')) +
      line('ת.ז', w.tz
        ? '<span class="num">' + w.tz + '</span>' +
          (M.store.validId(w.tz) ? '' : ' ' + ui.badge('ספרת ביקורת שגויה', 'warn'))
        : ui.badge('חסר בגיליון', 'warn')) +
      (src.phone ? line('טלפון', '<span class="num">' + ui.esc(src.phone) + '</span>') : '') +
      line('כתיבים שאוחדו',
        aliases.length ? ui.esc(aliases.join(' · ')) : '<span class="muted">—</span>') +
      line('צוות', Object.keys(w.teams).join(', ') || '<span class="muted">—</span>') +
      line('מסיעים', Object.keys(w.carriers).map(function (c) {
        return ui.esc(c) + (w.carriers[c] ? ' <span class="muted">(' + w.carriers[c] + ')</span>' : '');
      }).join(' · ') || '<span class="muted">—</span>') +
      line('סטטוס', w.active === false ? ui.badge('לא פעיל', 'warn') : ui.badge('פעיל', 'pos')) +
      line('אתר', ui.esc(ctx.data.site.name)) +
      (src.notes ? line('הערות', ui.esc(src.notes)) : '') +
      (src.createdAt ? line('נוסף בתאריך', M.fmt.date(src.createdAt)) : '') +
      (aliases.length
        ? '<div style="margin-top:12px">' + ui.notice('הרשומה אוחדה מכמה כתיבים של אותו שם בגיליון. ' +
            'במערכת אמיתית האיחוד נעשה לפי ת.ז ונשמר לצמיתות.', '', 'ℹ') + '</div>'
        : '');
  }

  function find(ctx) {
    var id = ctx.params[0];
    var all = M.calc.workerTotals(ctx.days, ctx.data);
    var found = null;
    all.forEach(function (w) { if (w.id === id) found = w; });
    return found;
  }
})(window.M = window.M || {});

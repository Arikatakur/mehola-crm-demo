/* View: one work day, worker by worker — "עלות עובדים מפורטת". */
(function (M) {
  'use strict';

  M.views = M.views || {};

  M.views.day = {
    title: 'פירוט יום',
    sub: function (ctx) {
      var d = current(ctx);
      return d ? M.fmt.dateLong(d.date) + ' · יום ' + d.dayName : '';
    },

    render: function (ctx, mount) {
      var f = M.fmt, ui = M.ui, cfg = ctx.cfg;
      var d = current(ctx);
      if (!d) {
        mount.innerHTML = '<div class="card"><div class="empty">היום המבוקש לא נמצא. ' +
          '<a href="#/pnl">חזרה לגיליון הרווח וההפסד</a></div></div>';
        return;
      }

      var idx = ctx.days.indexOf(d);
      var prev = ctx.days[idx - 1], next = ctx.days[idx + 1];

      var nav = '<div class="crumb">' +
        '<a href="#/pnl">רווח והפסד יומי</a> ← ' + f.date(d.date) +
        '<span style="float:left">' +
        (prev ? '<a href="#/day/' + prev.date + '">→ ' + f.date(prev.date) + '</a>' : '') +
        (prev && next ? ' &nbsp;·&nbsp; ' : '') +
        (next ? '<a href="#/day/' + next.date + '">' + f.date(next.date) + ' ←</a>' : '') +
        '</span></div>';

      var kpis = '<div class="grid g-4">' +
        ui.kpi('עלות עובדים', f.money(d.workerCost), d.workers + ' עובדים · ' + f.hours(d.hours) + ' שעות') +
        ui.kpi('עלות הסעות', f.money(d.transportCost), d.carriers.length + ' מסיעים') +
        ui.kpi('עלות יום', f.money(d.totalCost), 'ממוצע ' + f.money(d.costPerWorker) + ' לעובד') +
        ui.kpi('רווח / הפסד', d.hasUnits
          ? '<span class="' + ui.tone(d.profit) + '">' + f.moneySigned(d.profit) + '</span>'
          : '<span class="muted">—</span>',
          d.hasUnits ? f.num(d.units) + ' יח׳ × ' + f.money(cfg.unitPrice, 2) + ' = ' + f.money(d.revenue)
                     : 'אין רישום ייצור ליום זה', { accent: true }) +
        '</div>';

      /* --- worker lines --- */
      var cols = [
        { t: 'עובד', k: 'name' },
        { t: 'ת.ז', k: 'tz' },
        { t: 'צוות', k: 'team' },
        { t: 'מסיע', k: 'carrier' },
        { t: 'כניסה', k: 'in', n: true },
        { t: 'יציאה', k: 'out', n: true },
        { t: 'סה״כ ש׳', k: 'hours', n: true },
        { t: '100%', k: 'h100', n: true },
        { t: '125%', k: 'h125', n: true },
        { t: '150%', k: 'h150', n: true },
        { t: 'תעריף', k: 'rate', n: true },
        { t: 'עלות שכר', k: 'cost', n: true },
        { t: 'הסעה', k: 'transport', n: true },
        { t: 'עלות כוללת', k: 'total', n: true }
      ];

      var perWorkerTransport = {};
      d.carriers.forEach(function (c) { perWorkerTransport[c.carrier] = c.workers ? c.cost / c.workers : 0; });

      var rows = d.lines.map(function (l) {
        var tr = perWorkerTransport[l.carrier] || 0;
        return {
          __cls: 'clickable',
          __attrs: 'onclick="location.hash=\'#/worker/' + l.workerId + '\'"',
          name: '<span class="strong">' + ui.esc(l.name) + '</span>' +
                (l.shiftId ? ' ' + ui.badge('נוסף', 'info') +
                  ' <a href="#" class="muted rm-shift" data-shift="' + l.shiftId +
                  '" title="הסרת השיבוץ" onclick="event.stopPropagation()">✕</a>' : ''),
          tz: l.worker && l.worker.tz ? '<span class="muted num">' + l.worker.tz + '</span>'
                                      : ui.badge('חסר', 'warn'),
          team: '<span class="muted">' + ui.esc(l.team) + '</span>',
          carrier: ui.esc(l.carrier),
          'in': l['in'] + (l.adjusted ? ' <span class="badge info">מתוקנן</span>' : ''),
          out: l.out,
          hours: f.hours(l.hours),
          h100: f.hours(l.h100),
          h125: l.h125 ? f.hours(l.h125) : '<span class="muted">—</span>',
          h150: l.h150 ? f.hours(l.h150) : '<span class="muted">—</span>',
          rate: f.money(l.rate) + (l.isOverrideRate ? ' ' + ui.badge('חריג', 'info') : ''),
          cost: f.money(l.cost),
          transport: tr ? f.money(tr) : '<span class="muted">—</span>',
          total: '<span class="strong">' + f.money(l.cost + tr) + '</span>'
        };
      });

      var foot = {
        name: 'סה״כ', tz: '', team: '', carrier: '', 'in': '', out: '',
        hours: f.hours(d.hours), h100: f.hours(d.h100),
        h125: d.h125 ? f.hours(d.h125) : '—', h150: d.h150 ? f.hours(d.h150) : '—',
        rate: '', cost: f.money(d.workerCost), transport: f.money(d.transportCost),
        total: f.money(d.totalCost)
      };

      var scheduleNote = cfg.scheduleMode === 'required'
        ? ui.notice('החישוב לפי יום עבודה מלא ' + cfg.requiredIn + '–' + cfg.requiredOut +
            ' כפי שנקבע בדרישות. שעה ' + f.hours(cfg.ot.after125) + ' ומעלה מחויבת ב-125%, ומעל ' +
            f.hours(cfg.ot.after150) + ' שעות ב-150%. ' +
            'למעבר לשעות שנרשמו בפועל בגיליון — ראו המתג בראש המסך.', '', 'ℹ')
        : ui.notice('החישוב לפי השעות שנרשמו בגיליון המקור.', '', 'ℹ');

      /* --- assign a worker to this day --- */
      var assignable = ctx.data.workers.filter(function (w) {
        if (w.active === false) return false;
        return !d.lines.some(function (l) { return l.workerId === w.id; });
      });
      var addPanel =
        '<div id="addRow" class="add-panel" hidden>' +
          '<div class="grid g-4">' +
            '<div class="field"><label>עובד/ת</label><select id="aWorker">' +
              assignable.map(function (w) {
                return '<option value="' + w.id + '">' + ui.esc(w.name) +
                  (w.tz ? ' · ' + w.tz : '') + '</option>';
              }).join('') +
            '</select><span class="hint">' + assignable.length + ' עובדים זמינים לשיבוץ · ' +
              '<a href="#/worker-new">עובד חדש</a></span></div>' +
            '<div class="field"><label>כניסה</label>' +
              '<input type="text" id="aIn" value="' + (cfg.scheduleMode === 'required' ? cfg.requiredIn : '07:00') + '"></div>' +
            '<div class="field"><label>יציאה</label>' +
              '<input type="text" id="aOut" value="' + (cfg.scheduleMode === 'required' ? cfg.requiredOut : '15:30') + '"></div>' +
            '<div class="field"><label>מסיע</label>' +
              '<input type="text" id="aCarrier" list="carrierList2" placeholder="לפי ברירת המחדל של העובד/ת">' +
              '<datalist id="carrierList2">' + ctx.data.carriers.map(function (c) {
                return '<option value="' + ui.esc(c) + '">';
              }).join('') + '</datalist></div>' +
          '</div>' +
          '<div style="height:12px"></div>' +
          '<button class="btn primary" id="aSave">שיבוץ ליום זה</button> ' +
          '<button class="btn ghost" id="aCancel">ביטול</button>' +
        '</div>';

      var workersCard = ui.card('עלות עובדים מפורטת', d.workers + ' עובדים ביום זה',
        '<div style="padding:0 0 14px">' + scheduleNote + addPanel + '</div>' +
        ui.table(cols, rows, { foot: foot }),
        { actions: '<button class="btn sm primary" id="btnAdd">הוספת עובד ליום</button> ' +
                   '<button class="btn sm" data-csv="day">ייצוא CSV</button>' });

      /* --- transport --- */
      var tCols = [
        { t: 'מסיע', k: 'carrier' }, { t: 'שיטת חיוב', k: 'mode' },
        { t: 'תעריף', k: 'amount', n: true }, { t: 'עובדים', k: 'workers', n: true },
        { t: 'עלות', k: 'cost', n: true }, { t: 'עלות לעובד', k: 'per', n: true },
        { t: 'מקור התעריף', k: 'source' }
      ];
      var modeText = { perDay: 'לפי יום', perWorker: 'לפי עובד', none: 'ללא חיוב' };
      var tRows = d.carriers.map(function (c) {
        return {
          carrier: '<span class="strong">' + ui.esc(c.carrier) + '</span>',
          mode: modeText[c.mode] || c.mode,
          amount: c.mode === 'none' ? '<span class="muted">—</span>' : f.money(c.amount),
          workers: c.workers,
          cost: '<span class="strong">' + f.money(c.cost) + '</span>',
          per: c.workers ? f.money(c.cost / c.workers) : null,
          source: c.source === 'client' ? ui.badge('לפי דרישות הלקוח', 'pos')
                                        : ui.badge('הנחה — טעון אישור', 'warn')
        };
      });

      var transportCard = ui.card('עלות הסעות — פירוט', 'סה״כ ' + f.money(d.transportCost) + ' ליום',
        ui.table(tCols, tRows, {
          foot: { carrier: 'סה״כ', mode: '', amount: '', workers: d.workers,
                  cost: f.money(d.transportCost), per: f.money(d.workers ? d.transportCost / d.workers : 0), source: '' }
        }), { flush: true });

      /* --- day P&L box --- */
      var pnlCard = ui.card('רווח והפסד ליום', null,
        '<div class="stat-line"><span class="k">יחידות ייצור (מדבקות)</span><span class="v">' +
          (d.hasUnits ? f.num(d.units) : '<span class="badge warn">חסר בגיליון</span>') + '</span></div>' +
        (d.bonusUnits ? '<div class="stat-line"><span class="k">מתוכן בונוס</span><span class="v">' +
          f.num(d.bonusUnits) + '</span></div>' : '') +
        '<div class="stat-line"><span class="k">מחיר ליחידה</span><span class="v">' +
          f.money(cfg.unitPrice, 2) + '</span></div>' +
        '<div class="stat-line"><span class="k">הכנסה</span><span class="v">' +
          (d.hasUnits ? f.money(d.revenue) : '—') + '</span></div>' +
        '<div class="stat-line"><span class="k">עלות עובדים</span><span class="v neg">' +
          f.moneySigned(-d.workerCost) + '</span></div>' +
        '<div class="stat-line"><span class="k">עלות הסעות</span><span class="v neg">' +
          f.moneySigned(-d.transportCost) + '</span></div>' +
        '<div class="stat-line total"><span class="k">רווח / הפסד</span><span class="v ' +
          ui.tone(d.profit) + '">' + (d.hasUnits ? f.moneySigned(d.profit) : '—') + '</span></div>' +
        '<div class="stat-line"><span class="k">שיעור רווח</span><span class="v ' + ui.tone(d.profit) + '">' +
          (d.hasUnits ? f.pct(d.margin) : '—') + '</span></div>' +
        '<div class="stat-line"><span class="k">מחיר ליחידה לאיזון</span><span class="v">' +
          (d.breakEvenPrice ? f.money(d.breakEvenPrice, 3) : '—') + '</span></div>' +
        '<div class="stat-line"><span class="k">תפוקה לשעת עבודה</span><span class="v">' +
          (d.unitsPerWorkHour ? f.num(d.unitsPerWorkHour, 0) + ' יח׳' : '—') + '</span></div>' +
        '<div style="height:14px"></div>' +
        '<div class="field"><label>' + (d.hasUnits ? 'עדכון סה״כ ייצור ליום' : 'הזנת סה״כ ייצור ליום') + '</label>' +
        '<div style="display:flex;gap:8px">' +
          '<input type="number" id="uVal" step="1" min="0" value="' +
            (d.hasUnits ? d.units : '') + '" placeholder="כמות מדבקות">' +
          '<button class="btn primary" id="uSave">שמירה</button>' +
        '</div><span class="hint">' +
          (d.hasUnits ? 'מעדכן את ההכנסה והרווח של היום מיידית'
                      : 'ליום זה חסר סה״כ ייצור בגיליון — הזנת המספר תשלים את חישוב הרווח') +
        '</span></div>');

      mount.innerHTML = nav + kpis + '<div style="height:18px"></div>' + workersCard +
        '<div style="height:18px"></div><div class="grid g-2">' + transportCard + pnlCard + '</div>';

      /* --- wiring: assign worker, remove assignment, day production --- */
      var $ = function (id) { return mount.querySelector('#' + id); };
      var panel = $('addRow');

      $('btnAdd').addEventListener('click', function () {
        panel.hidden = !panel.hidden;
        if (!panel.hidden) $('aWorker').focus();
      });
      $('aCancel').addEventListener('click', function () { panel.hidden = true; });

      $('aSave').addEventListener('click', function () {
        var id = $('aWorker').value;
        if (!id) return;
        var w = null;
        ctx.data.workers.forEach(function (x) { if (x.id === id) w = x; });
        M.store.addShift({
          date: d.date, workerId: id,
          'in': $('aIn').value.trim() || '07:00',
          out: $('aOut').value.trim() || '15:30',
          team: w && w.team ? w.team : '',
          carrier: $('aCarrier').value.trim() || (w && w.carrier ? w.carrier : 'עצמאי'),
          dept: 'כללי'
        });
      });

      Array.prototype.forEach.call(mount.querySelectorAll('.rm-shift'), function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          M.store.removeShift(a.getAttribute('data-shift'));
        });
      });

      $('uSave').addEventListener('click', function () {
        M.store.setDayUnits(d.date, $('uVal').value === '' ? null : $('uVal').value);
      });

      ui.bindCsv(mount, {
        day: function () {
          M.ui.csv('rosman-' + d.date + '.csv',
            ['עובד', 'ת.ז', 'צוות', 'מסיע', 'כניסה', 'יציאה', 'שעות', '100%', '125%', '150%',
             'תעריף', 'עלות שכר', 'הסעה', 'עלות כוללת'],
            d.lines.map(function (l) {
              var tr = perWorkerTransport[l.carrier] || 0;
              return [l.name, l.worker ? l.worker.tz : '', l.team, l.carrier, l['in'], l.out,
                      l.hours.toFixed(2), l.h100.toFixed(2), l.h125.toFixed(2), l.h150.toFixed(2),
                      l.rate, Math.round(l.cost), Math.round(tr), Math.round(l.cost + tr)];
            }));
        }
      });
    }
  };

  function current(ctx) {
    var date = ctx.params[0];
    var found = null;
    ctx.days.forEach(function (d) { if (d.date === date) found = d; });
    return found;
  }
})(window.M = window.M || {});

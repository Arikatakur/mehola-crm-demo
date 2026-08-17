/* View: worker register — one row per person after de-duplication. */
(function (M) {
  'use strict';

  M.views = M.views || {};

  var state = { q: '', carrier: '', sort: 'cost' };

  M.views.workers = {
    title: 'עובדים',
    sub: function (ctx) {
      return 'מאגר עובדים מאוחד — ' + ctx.data.workers.length + ' עובדים מתוך ' +
        ctx.data.source.shifts + ' רישומי נוכחות בגיליון';
    },

    render: function (ctx, mount) {
      var f = M.fmt, ui = M.ui;
      var all = M.calc.workerTotals(ctx.days, ctx.data);

      var carriers = ctx.data.carriers;
      var filtered = all.filter(function (w) {
        if (state.carrier && !w.carriers[state.carrier]) return false;
        if (state.q) {
          var hay = (w.name + ' ' + (w.aliases || []).join(' ') + ' ' + (w.tz || '')).toLowerCase();
          if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
        }
        return true;
      });

      var sorters = {
        cost: function (a, b) { return b.cost - a.cost; },
        days: function (a, b) { return b.days - a.days; },
        hours: function (a, b) { return b.hours - a.hours; },
        name: function (a, b) { return a.name.localeCompare(b.name, 'he'); }
      };
      filtered = filtered.slice().sort(sorters[state.sort] || sorters.cost);

      var cols = [
        { t: 'עובד', k: 'name' },
        { t: 'ת.ז', k: 'tz' },
        { t: 'צוות', k: 'team' },
        { t: 'מסיע', k: 'carrier' },
        { t: 'ימי עבודה', k: 'days', n: true },
        { t: 'שעות', k: 'hours', n: true },
        { t: 'ש. נוספות', k: 'ot', n: true },
        { t: 'תעריף', k: 'rate', n: true },
        { t: 'עלות שכר', k: 'cost', n: true },
        { t: 'הסעות', k: 'transport', n: true },
        { t: 'עלות כוללת', k: 'total', n: true }
      ];

      var rows = filtered.map(function (w) {
        var teams = Object.keys(w.teams);
        var cs = Object.keys(w.carriers);
        return {
          __cls: 'clickable',
          __attrs: 'onclick="location.hash=\'#/worker/' + w.id + '\'"',
          name: '<span class="strong">' + ui.esc(w.name) + '</span>' +
                (w.added ? ' ' + ui.badge('נוסף במערכת', 'pos') : '') +
                (w.edited ? ' ' + ui.badge('עודכן', 'info') : '') +
                (!w.active ? ' ' + ui.badge('לא פעיל', 'warn') : '') +
                (w.aliases && w.aliases.length ? ' ' + ui.badge('אוחד ' + (w.aliases.length + 1) + ' כתיבים', 'info') : ''),
          tz: w.tz ? '<span class="num muted">' + w.tz + '</span>' : ui.badge('חסר', 'warn'),
          team: teams.length ? '<span class="muted">' + ui.esc(teams.join(', ')) + '</span>' : null,
          carrier: '<span class="muted">' + ui.esc(cs.join(', ')) + '</span>',
          days: w.days,
          hours: f.hours(w.hours),
          ot: w.h125 + w.h150 ? f.hours(w.h125 + w.h150) : '<span class="muted">—</span>',
          rate: f.money(w.rate),
          cost: f.money(w.cost),
          transport: f.money(w.transport),
          total: '<span class="strong">' + f.money(w.cost + w.transport) + '</span>'
        };
      });

      var sum = function (fn) { return filtered.reduce(function (a, w) { return a + fn(w); }, 0); };
      var foot = {
        name: 'סה״כ ' + filtered.length + ' עובדים', tz: '', team: '', carrier: '',
        days: sum(function (w) { return w.days; }),
        hours: f.hours(sum(function (w) { return w.hours; })),
        ot: f.hours(sum(function (w) { return w.h125 + w.h150; })),
        rate: '',
        cost: f.money(sum(function (w) { return w.cost; })),
        transport: f.money(sum(function (w) { return w.transport; })),
        total: f.money(sum(function (w) { return w.cost + w.transport; }))
      };

      var controls = '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">' +
        '<div class="field" style="width:220px"><label>חיפוש עובד / ת.ז</label>' +
        '<input type="text" id="wq" value="' + ui.esc(state.q) + '" placeholder="שם או מספר זהות"></div>' +
        '<div class="field" style="width:170px"><label>מסיע</label><select id="wc">' +
        '<option value="">כל המסיעים</option>' +
        carriers.map(function (c) {
          return '<option value="' + ui.esc(c) + '"' + (state.carrier === c ? ' selected' : '') + '>' +
            ui.esc(c) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field" style="width:170px"><label>מיון</label><select id="ws">' +
        [['cost', 'עלות שכר'], ['days', 'ימי עבודה'], ['hours', 'שעות'], ['name', 'שם']].map(function (o) {
          return '<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>' +
        '<button class="btn sm" data-csv="workers" style="margin-bottom:1px">ייצוא CSV</button>' +
        '<a class="btn sm primary" href="#/worker-new" style="margin-bottom:1px">+ עובד חדש</a>' +
        '</div>';

      var missingId = all.filter(function (w) { return !w.tz; }).length;
      var note = missingId
        ? ui.notice('<strong>' + missingId + ' עובדים ללא ת.ז בגיליון.</strong> ' +
            'ת.ז הוא המפתח שמאפשר לאחד עובד בין 52 האתרים — בלעדיו לא ניתן להרכיב תיק עובד חוצה-אתרים. ' +
            '<a href="#/quality">ראו איכות נתונים</a>.', 'warn', '⚠')
        : '';

      mount.innerHTML = ui.card('מאגר עובדים', this.sub(ctx),
        controls + (note ? '<div style="height:14px"></div>' + note : '') +
        '<div style="height:14px"></div>' + ui.table(cols, rows, { foot: foot }));

      var q = mount.querySelector('#wq');
      q.addEventListener('input', function () {
        state.q = q.value;
        M.app.rerender();
        var el = document.querySelector('#wq');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      });
      mount.querySelector('#wc').addEventListener('change', function () {
        state.carrier = this.value; M.app.rerender();
      });
      mount.querySelector('#ws').addEventListener('change', function () {
        state.sort = this.value; M.app.rerender();
      });

      ui.bindCsv(mount, {
        workers: function () {
          M.ui.csv('rosman-workers.csv',
            ['עובד', 'ת.ז', 'כתיבים נוספים', 'צוות', 'מסיע', 'ימי עבודה', 'שעות',
             'שעות 125%', 'שעות 150%', 'תעריף', 'עלות שכר', 'הסעות', 'עלות כוללת'],
            filtered.map(function (w) {
              return [w.name, w.tz, (w.aliases || []).join(' | '), Object.keys(w.teams).join(' | '),
                      Object.keys(w.carriers).join(' | '), w.days, w.hours.toFixed(2),
                      w.h125.toFixed(2), w.h150.toFixed(2), w.rate, Math.round(w.cost),
                      Math.round(w.transport), Math.round(w.cost + w.transport)];
            }));
        }
      });
    }
  };
})(window.M = window.M || {});

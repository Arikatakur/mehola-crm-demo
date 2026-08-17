/* View: worker register — one row per person after de-duplication. */
(function (M) {
  'use strict';

  M.views = M.views || {};

  var state = {
    q: '', carrier: '', team: '', status: '', issue: '', minDays: '', minHours: '',
    sort: 'cost', dir: 'desc', compact: false, cols: {}
  };

  function columnValue(w, key) {
    var values = {
      name: w.name, tz: w.tz || '', team: Object.keys(w.teams).join(', '),
      carrier: Object.keys(w.carriers).join(', '), days: w.days, hours: w.hours,
      ot: w.h125 + w.h150, rate: w.rate, cost: w.cost,
      transport: w.transport, total: w.cost + w.transport
    };
    return values[key];
  }

  function matchesColumn(value, query) {
    query = String(query || '').trim();
    if (query.slice(0, 2) === '::') return String(value || '') === query.slice(2);
    query = query.replace(/^≥/, '>=').replace(/^≤/, '<=');
    if (!query) return true;
    if (typeof value === 'number') {
      var m = query.match(/^(>=|<=|>|<|=)?\s*(-?[\d,.]+)$/);
      if (!m) return String(value).indexOf(query) !== -1;
      var n = Number(m[2].replace(/,/g, '')), op = m[1] || '=';
      return op === '>' ? value > n : op === '<' ? value < n :
        op === '>=' ? value >= n : op === '<=' ? value <= n : value === n;
    }
    return String(value || '').toLocaleLowerCase('he').indexOf(query.toLocaleLowerCase('he')) !== -1;
  }

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
      var teams = ctx.data.teams.slice().sort(function (a, b) { return a.localeCompare(b, 'he'); });
      var filtered = all.filter(function (w) {
        if (state.carrier && !w.carriers[state.carrier]) return false;
        if (state.team && !w.teams[state.team]) return false;
        if (state.status === 'active' && w.active === false) return false;
        if (state.status === 'inactive' && w.active !== false) return false;
        if (state.issue === 'missing-id' && w.tz) return false;
        if (state.issue === 'overtime' && !(w.h125 + w.h150)) return false;
        if (state.issue === 'edited' && !w.edited && !w.added) return false;
        if (state.minDays !== '' && w.days < Number(state.minDays)) return false;
        if (state.minHours !== '' && w.hours < Number(state.minHours)) return false;
        var colKeys = Object.keys(state.cols);
        for (var ci = 0; ci < colKeys.length; ci++) {
          if (!matchesColumn(columnValue(w, colKeys[ci]), state.cols[colKeys[ci]])) return false;
        }
        if (state.q) {
          var hay = (w.name + ' ' + (w.aliases || []).join(' ') + ' ' + (w.tz || '')).toLowerCase();
          if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
        }
        return true;
      });

      var sorters = {
        name: function (w) { return w.name; }, tz: function (w) { return w.tz || ''; },
        team: function (w) { return Object.keys(w.teams).join(','); },
        carrier: function (w) { return Object.keys(w.carriers).join(','); },
        days: function (w) { return w.days; }, hours: function (w) { return w.hours; },
        ot: function (w) { return w.h125 + w.h150; }, rate: function (w) { return w.rate; },
        cost: function (w) { return w.cost; }, transport: function (w) { return w.transport; },
        total: function (w) { return w.cost + w.transport; }
      };
      filtered = filtered.slice().sort(function (a, b) {
        var get = sorters[state.sort] || sorters.cost, av = get(a), bv = get(b), cmp;
        if (typeof av === 'string') cmp = av.localeCompare(bv, 'he', { numeric: true });
        else cmp = av - bv;
        return state.dir === 'asc' ? cmp : -cmp;
      });

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

      var hasColumnFilters = Object.keys(state.cols).some(function (k) { return state.cols[k]; });
      var hasFilters = state.q || state.carrier || state.team || state.status || state.issue ||
        state.minDays !== '' || state.minHours !== '' || hasColumnFilters;
      var controls = '<div class="grid-toolbar">' +
        '<div class="field" style="width:220px"><label>חיפוש עובד / ת.ז</label>' +
        '<input type="text" id="wq" value="' + ui.esc(state.q) + '" placeholder="שם או מספר זהות"></div>' +
        '<div class="field" style="width:150px"><label>צוות</label><select id="wt">' +
        '<option value="">כל הצוותים</option>' + teams.map(function (t) {
          return '<option value="' + ui.esc(t) + '"' + (state.team === t ? ' selected' : '') + '>' + ui.esc(t) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field" style="width:170px"><label>מסיע</label><select id="wc">' +
        '<option value="">כל המסיעים</option>' +
        carriers.map(function (c) {
          return '<option value="' + ui.esc(c) + '"' + (state.carrier === c ? ' selected' : '') + '>' +
            ui.esc(c) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field" style="width:135px"><label>סטטוס</label><select id="wstatus">' +
        '<option value="">כל הסטטוסים</option><option value="active"' + (state.status === 'active' ? ' selected' : '') + '>פעיל</option>' +
        '<option value="inactive"' + (state.status === 'inactive' ? ' selected' : '') + '>לא פעיל</option></select></div>' +
        '<div class="field" style="width:165px"><label>מסנן חכם</label><select id="wi">' +
        '<option value="">ללא</option><option value="missing-id"' + (state.issue === 'missing-id' ? ' selected' : '') + '>חסרה ת.ז</option>' +
        '<option value="overtime"' + (state.issue === 'overtime' ? ' selected' : '') + '>יש שעות נוספות</option>' +
        '<option value="edited"' + (state.issue === 'edited' ? ' selected' : '') + '>נוסף / עודכן</option></select></div>' +
        '<div class="field mini-filter"><label>מינ׳ ימים</label><input type="number" min="0" id="wmd" value="' + state.minDays + '"></div>' +
        '<div class="field mini-filter"><label>מינ׳ שעות</label><input type="number" min="0" id="wmh" value="' + state.minHours + '"></div>' +
        '<button class="btn sm" id="wcompact">' + (state.compact ? 'תצוגה מרווחת' : 'תצוגה צפופה') + '</button>' +
        '<button class="btn sm" id="wclear"' + (hasFilters ? '' : ' disabled') + '>ניקוי מסננים</button>' +
        '<button class="btn sm" data-csv="workers">ייצוא ' + filtered.length + ' שורות</button>' +
        '<a class="btn sm primary" href="#/worker-new">+ עובד חדש</a>' +
        '</div>';

      var missingId = all.filter(function (w) { return !w.tz; }).length;
      var note = missingId
        ? ui.notice('<strong>' + missingId + ' עובדים ללא ת.ז בגיליון.</strong> ' +
            'ת.ז הוא המפתח שמאפשר לאחד עובד בין 52 האתרים — בלעדיו לא ניתן להרכיב תיק עובד חוצה-אתרים. ' +
            '<a href="#/quality">ראו איכות נתונים</a>.', 'warn', '⚠')
        : '';

      var resultBar = '<div class="grid-result"><strong>' + filtered.length + '</strong> מתוך ' + all.length +
        ' עובדים' + (hasFilters ? ' · מסננים פעילים' : '') +
        '<span>לחצו על כותרת עמודה כדי למיין</span></div>';

      mount.innerHTML = ui.card('מאגר עובדים', this.sub(ctx),
        controls + (note ? '<div style="height:14px"></div>' + note : '') +
        resultBar + '<div class="worker-grid' + (state.compact ? ' compact' : '') + '">' +
        ui.table(cols, rows, { foot: foot }) + '</div>');

      Array.prototype.forEach.call(mount.querySelectorAll('thead th'), function (th, i) {
        var c = cols[i], active = state.sort === c.k;
        th.innerHTML = '<button class="sort-head' + (active ? ' on' : '') + '" data-sort="' + c.k + '">' +
          ui.esc(c.t) + '<span aria-hidden="true">' + (active ? (state.dir === 'asc' ? '↑' : '↓') : '↕') + '</span></button>';
      });
      var filterRow = document.createElement('tr');
      filterRow.className = 'column-filters';
      filterRow.innerHTML = cols.map(function (c) {
        var numeric = !!c.n;
        if (!numeric) {
          var unique = [];
          all.forEach(function (w) {
            var value = String(columnValue(w, c.k) || '').trim();
            if (value && unique.indexOf(value) === -1) unique.push(value);
          });
          unique.sort(function (a, b) { return a.localeCompare(b, 'he', { numeric: true }); });
          return '<th><select id="wcf-' + c.k + '" data-col-filter="' + c.k +
            '" aria-label="סינון לפי ' + ui.esc(c.t) + '"><option value="">הכול (' + unique.length + ')</option>' +
            unique.map(function (value) {
              return '<option value="' + ui.esc(value) + '"' +
                (state.cols[c.k] === '::' + value ? ' selected' : '') + '>' + ui.esc(value) + '</option>';
            }).join('') + '</select></th>';
        }
        return '<th><input type="text" id="wcf-' + c.k + '" data-col-filter="' + c.k + '" value="' +
          ui.esc(state.cols[c.k] || '') + '" placeholder="למשל ≥10' +
          '" aria-label="סינון לפי ' + ui.esc(c.t) + '"></th>';
      }).join('');
      mount.querySelector('thead').appendChild(filterRow);

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
      mount.querySelector('#wt').addEventListener('change', function () { state.team = this.value; M.app.rerender(); });
      mount.querySelector('#wstatus').addEventListener('change', function () { state.status = this.value; M.app.rerender(); });
      mount.querySelector('#wi').addEventListener('change', function () { state.issue = this.value; M.app.rerender(); });
      mount.querySelector('#wmd').addEventListener('change', function () { state.minDays = this.value; M.app.rerender(); });
      mount.querySelector('#wmh').addEventListener('change', function () { state.minHours = this.value; M.app.rerender(); });
      mount.querySelector('#wcompact').addEventListener('click', function () { state.compact = !state.compact; M.app.rerender(); });
      mount.querySelector('#wclear').addEventListener('click', function () {
        state.q = ''; state.carrier = ''; state.team = ''; state.status = ''; state.issue = '';
        state.minDays = ''; state.minHours = ''; state.cols = {}; M.app.rerender();
      });
      Array.prototype.forEach.call(mount.querySelectorAll('[data-col-filter]'), function (input) {
        input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', function () {
          var key = this.getAttribute('data-col-filter');
          state.cols[key] = this.tagName === 'SELECT' && this.value ? '::' + this.value : this.value;
          M.app.rerender();
        });
        input.addEventListener('click', function (e) { e.stopPropagation(); });
      });
      Array.prototype.forEach.call(mount.querySelectorAll('[data-sort]'), function (b) {
        b.addEventListener('click', function () {
          var key = this.getAttribute('data-sort');
          if (state.sort === key) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
          else { state.sort = key; state.dir = (key === 'name' || key === 'tz' || key === 'team' || key === 'carrier') ? 'asc' : 'desc'; }
          M.app.rerender();
        });
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

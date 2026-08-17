/* View: rate book. Every number the engine uses is editable here and the
   whole site recalculates immediately — this is how the client can test
   "what if the unit price were X" during the demo. */
(function (M) {
  'use strict';

  M.views = M.views || {};

  M.views.rates = {
    title: 'תעריפים והגדרות חישוב',
    sub: function () {
      return 'כל שינוי מחושב מחדש מיידית על כל התקופה. השינויים נשמרים בדפדפן בלבד.';
    },

    render: function (ctx, mount) {
      var f = M.fmt, ui = M.ui, cfg = ctx.cfg, t = ctx.totals;

      /* baseline (client brief) for comparison */
      var baseCfg = M.config.defaults(ctx.data);
      var baseTotals = M.calc.totals(M.calc.run(ctx.data, baseCfg));
      var delta = t.profit - baseTotals.profit;

      var impact = '<div class="grid g-4">' +
        ui.kpi('הכנסה', f.money(t.revenue), f.num(t.units) + ' יח׳ × ' + f.money(cfg.unitPrice, 3)) +
        ui.kpi('עלות כוללת', f.money(t.totalCost),
               'עובדים ' + f.money(t.workerCost) + ' · הסעות ' + f.money(t.transportCost)) +
        ui.kpi('רווח / הפסד', '<span class="' + ui.tone(t.profit) + '">' + f.moneySigned(t.profit) + '</span>',
               Math.abs(delta) < 1 ? 'זהה לתעריפי הדרישות'
                 : (delta > 0 ? '▲ ' : '▼ ') + f.money(Math.abs(delta)) + ' לעומת תעריפי הדרישות',
               { accent: true }) +
        ui.kpi('מחיר איזון ליחידה', f.money(t.breakEvenPrice, 3),
               'המחיר שבו הרווח בתקופה מתאפס — כפתור הקביעה בקטע "הכנסה"',
               { badge: t.breakEvenPrice > cfg.unitPrice ? 'מעל המחיר בפועל' : 'מתחת למחיר בפועל',
                 badgeKind: t.breakEvenPrice > cfg.unitPrice ? 'neg' : 'pos' }) +
        '</div>';

      /* --- work day --- */
      var dayCard = ui.card('יום עבודה ומדרג שעות נוספות',
        'לפי הדרישות: יום 07:00–18:00 כדי שיהיו שעות נוספות לחישוב. מדרג 125%/150% לפי מסמך האפיון.',
        '<div class="grid g-3">' +
          field('שעת כניסה', '<input type="text" data-cfg="requiredIn" value="' + cfg.requiredIn + '">',
                'שעת התחלה אחידה לחישוב') +
          field('שעת יציאה', '<input type="text" data-cfg="requiredOut" value="' + cfg.requiredOut + '">',
                'שעת סיום אחידה לחישוב') +
          field('מצב חישוב',
            '<select data-cfg="scheduleMode">' +
            '<option value="required"' + (cfg.scheduleMode === 'required' ? ' selected' : '') + '>יום עבודה אחיד</option>' +
            '<option value="actual"' + (cfg.scheduleMode === 'actual' ? ' selected' : '') + '>שעות בפועל מהגיליון</option>' +
            '</select>', 'בגיליון נרשמו ברוב הימים 07:00–15:30') +
        '</div><div style="height:14px"></div><div class="grid g-4">' +
          field('125% מעל (שעות)', numInput('ot.after125', cfg.ot.after125, 0.5), '') +
          field('150% מעל (שעות)', numInput('ot.after150', cfg.ot.after150, 0.5), '') +
          field('מכפיל 125%', numInput('ot.mult125', cfg.ot.mult125, 0.05), '') +
          field('מכפיל 150%', numInput('ot.mult150', cfg.ot.mult150, 0.05), '') +
        '</div>' +
        '<div style="height:14px"></div>' +
        ui.notice('ביום ' + cfg.requiredIn + '–' + cfg.requiredOut + ' לעובד בתעריף ' + f.money(cfg.baseRate) +
          ': ' + f.hours(Math.min(dayHours(cfg), cfg.ot.after125)) + ' ש׳ ב-100%, ' +
          f.hours(Math.max(0, Math.min(dayHours(cfg), cfg.ot.after150) - cfg.ot.after125)) + ' ש׳ ב-125%, ' +
          f.hours(Math.max(0, dayHours(cfg) - cfg.ot.after150)) + ' ש׳ ב-150% — ' +
          'סה״כ <strong>' + f.money(dayCost(cfg)) + '</strong> ליום.', '', '∑'));

      /* --- revenue --- */
      var revCard = ui.card('הכנסה', 'האתר מחויב לפי תפוקה (מדבקות), לא לפי שעות',
        '<div class="grid g-2">' +
          field('מחיר ליחידה (₪)', numInput('unitPrice', cfg.unitPrice, 0.01),
                'לפי הדרישות: 0.1 ₪ ליחידה') +
          '<div class="field"><label>איזון</label>' +
          '<button class="btn" id="beBtn">קבע מחיר איזון — ' + f.money(t.breakEvenPrice, 3) + '</button>' +
          '<span class="hint">מציב את המחיר שבו הרווח בתקופה שווה לאפס</span></div>' +
        '</div>');

      /* --- worker rates --- */
      var workers = M.calc.workerTotals(ctx.days, ctx.data);
      var rateRows = workers.map(function (w) {
        var ov = cfg.workerRates[w.id];
        return {
          name: '<span class="strong">' + ui.esc(w.name) + '</span>',
          days: w.days,
          rate: '<input type="number" step="0.5" class="inline-input" data-cfg="rate.' + w.id + '" value="' +
                (ov === undefined ? '' : ov) + '" placeholder="' + cfg.baseRate + '">',
          effective: f.money(ov === undefined ? cfg.baseRate : ov),
          kind: ov === undefined ? '<span class="muted">תעריף בסיס</span>' : ui.badge('תעריף חריג', 'info'),
          cost: f.money(w.cost)
        };
      });

      var ratesCard = ui.card('תעריפי שכר', 'תעריף בסיס לאתר, ומעליו תעריף חריג לעובד/ת ספציפי/ת — ' +
        'סדר הקדימות שנקבע במסמך האפיון',
        '<div class="grid g-3">' +
          field('תעריף בסיס לשעה (₪)', numInput('baseRate', cfg.baseRate, 0.5), 'חל על כל מי שאין לו תעריף חריג') +
          '<div class="field"><label>חריגים פעילים</label><div style="padding-top:6px">' +
            (Object.keys(cfg.workerRates).length
              ? Object.keys(cfg.workerRates).map(function (id) {
                  var w = null;
                  workers.forEach(function (x) { if (x.id === id) w = x; });
                  return ui.badge((w ? w.name : id) + ' · ' + f.money(cfg.workerRates[id]), 'info');
                }).join(' ')
              : '<span class="muted">אין</span>') +
          '</div></div>' +
          '<div class="field"><label>איפוס</label>' +
          '<button class="btn" id="resetBtn">החזר לתעריפי הדרישות</button>' +
          '<span class="hint">מוחק את השינויים שנשמרו בדפדפן</span></div>' +
        '</div><div style="height:14px"></div>' +
        ui.table([
          { t: 'עובד', k: 'name' }, { t: 'ימי עבודה', k: 'days', n: true },
          { t: 'תעריף חריג', k: 'rate', n: true }, { t: 'תעריף בפועל', k: 'effective', n: true },
          { t: 'סוג', k: 'kind' }, { t: 'עלות שכר בתקופה', k: 'cost', n: true }
        ], rateRows));

      /* --- carriers --- */
      var carrierTotals = {};
      M.calc.carrierTotals(ctx.days).forEach(function (c) { carrierTotals[c.carrier] = c; });

      var carrierRows = ctx.data.carriers.map(function (name) {
        var c = cfg.carriers[name] || { mode: 'none', amount: 0, source: 'assumed' };
        var tot = carrierTotals[name] || { cost: 0, days: 0, workerDays: 0 };
        return {
          carrier: '<span class="strong">' + ui.esc(name) + '</span>',
          mode: '<select data-cfg="carrier.' + name + '.mode">' +
            [['perWorker', 'לפי עובד'], ['perDay', 'לפי יום'], ['none', 'ללא חיוב']].map(function (o) {
              return '<option value="' + o[0] + '"' + (c.mode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('') + '</select>',
          amount: '<input type="number" step="5" class="inline-input" data-cfg="carrier.' + name + '.amount" value="' +
            c.amount + '"' + (c.mode === 'none' ? ' disabled' : '') + '>',
          days: tot.days,
          workerDays: tot.workerDays,
          cost: '<span class="strong">' + f.money(tot.cost) + '</span>',
          source: c.source === 'client' ? ui.badge('לפי דרישות הלקוח', 'pos') : ui.badge('הנחה — טעון אישור', 'warn'),
          note: '<span class="muted" style="white-space:normal">' + ui.esc(c.note || '') + '</span>'
        };
      });

      var carriersCard = ui.card('הסעות', 'שתי שיטות חיוב: סכום קבוע ליום (חברה חיצונית) או סכום לעובד (הסעת צוות)',
        ui.table([
          { t: 'מסיע', k: 'carrier' }, { t: 'שיטת חיוב', k: 'mode' }, { t: 'תעריף (₪)', k: 'amount', n: true },
          { t: 'ימים', k: 'days', n: true }, { t: 'ימי עובד', k: 'workerDays', n: true },
          { t: 'עלות בתקופה', k: 'cost', n: true }, { t: 'מקור', k: 'source' }, { t: 'הערה', k: 'note' }
        ], carrierRows) +
        '<div style="height:12px"></div>' +
        ui.notice('בדרישות נקבעו שני תעריפים בלבד: אבו רדאד 30 ₪ לעובד, וגיסלין 400 ₪ ליום. ' +
          'שאר המסיעים בגיליון (שאדי, נמר, מאריא, כריסתין) חושבו לפי 30 ₪ לעובד כהנחת עבודה — ' +
          'יש לאשר מול המשרד.', 'warn', '⚠'), { flush: false });

      mount.innerHTML = impact + '<div style="height:18px"></div>' +
        dayCard + revCard + ratesCard + carriersCard;

      /* --- wiring --- */
      Array.prototype.forEach.call(mount.querySelectorAll('[data-cfg]'), function (input) {
        var evt = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(evt, function () { apply(input.getAttribute('data-cfg'), input.value); });
      });

      mount.querySelector('#beBtn').addEventListener('click', function () {
        if (t.breakEvenPrice) M.config.set({ unitPrice: Math.ceil(t.breakEvenPrice * 1000) / 1000 });
      });
      mount.querySelector('#resetBtn').addEventListener('click', function () {
        M.config.reset(ctx.data);
      });
    }
  };

  function dayHours(cfg) {
    return Math.max(0, M.fmt.toHours(cfg.requiredOut) - M.fmt.toHours(cfg.requiredIn));
  }

  function dayCost(cfg) {
    var s = M.calc.splitHours(dayHours(cfg), cfg.ot);
    return s.h100 * cfg.baseRate + s.h125 * cfg.baseRate * cfg.ot.mult125 +
           s.h150 * cfg.baseRate * cfg.ot.mult150;
  }

  function field(label, control, hint) {
    return '<div class="field"><label>' + label + '</label>' + control +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }

  function numInput(path, value, step) {
    return '<input type="number" step="' + step + '" data-cfg="' + path + '" value="' + value + '">';
  }

  function apply(path, value) {
    var cfg = M.config.get();
    var p = path.split('.');

    if (p[0] === 'rate') {
      if (value === '') delete cfg.workerRates[p[1]];
      else cfg.workerRates[p[1]] = Number(value);
      M.config.set({});
      return;
    }
    if (p[0] === 'carrier') {
      // carrier names can contain dots in theory: field is always the last part
      var fieldName = p[p.length - 1];
      var carrier = p.slice(1, p.length - 1).join('.');
      var rule = cfg.carriers[carrier];
      if (!rule) return;
      rule[fieldName] = fieldName === 'amount' ? Number(value) : value;
      if (fieldName === 'mode' || fieldName === 'amount') rule.source = 'edited';
      M.config.set({});
      return;
    }
    if (p[0] === 'ot') {
      var patch = { ot: {} };
      patch.ot[p[1]] = Number(value);
      M.config.set(patch);
      return;
    }
    if (path === 'scheduleMode' || path === 'requiredIn' || path === 'requiredOut') {
      var o = {}; o[path] = value;
      M.config.set(o);
      return;
    }
    var n = {}; n[path] = Number(value);
    M.config.set(n);
  }
})(window.M = window.M || {});

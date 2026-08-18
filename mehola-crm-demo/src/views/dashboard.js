/* View: management dashboard — the P&L headline for the site. */
(function (M) {
  'use strict';

  M.views = M.views || {};

  M.views.dashboard = {
    title: 'סקירת אתר',
    sub: function (ctx) {
      return ctx.data.site.name + ' · ' + M.fmt.date(ctx.data.source.from) + ' – ' +
        M.fmt.date(ctx.data.source.to) + ' · ' + ctx.totals.days + ' ימי עבודה';
    },

    render: function (ctx, mount) {
      var days = ctx.days, t = ctx.totals, f = M.fmt, ui = M.ui, cfg = ctx.cfg;
      var carriers = M.calc.carrierTotals(days);
      var workers = M.calc.workerTotals(days, ctx.data);
      var months = M.calc.byMonth(days);

      /* --- KPI row --- */
      var kpis = '<div class="grid g-4">' +
        ui.kpi('הכנסה', f.money(t.revenue),
               f.num(t.units) + ' יחידות ייצור', { kind: 'income' }) +
        ui.kpi('עלות כוללת', f.money(t.totalCost),
               'עובדים ' + f.money(t.workerCost) + ' · הסעות ' + f.money(t.transportCost), { kind: 'cost' }) +
        ui.kpi('רווח / הפסד', '<span class="' + ui.tone(t.profit) + '">' + f.moneySigned(t.profit) + '</span>',
               'שיעור ' + f.pct(t.margin), { accent: true, kind: t.profit < 0 ? 'loss' : 'profit' }) +
        ui.kpi('מחיר איזון ליחידה', f.money(t.breakEvenPrice, 3),
               'מול ' + f.money(cfg.unitPrice, 2) + ' בפועל',
               { badge: t.breakEvenPrice > cfg.unitPrice ? 'מתחת לאיזון' : 'מעל האיזון',
                 badgeKind: t.breakEvenPrice > cfg.unitPrice ? 'neg' : 'pos', kind: 'breakeven' }) +
        '</div>';

      /* --- profit per day --- */
      var chartPoints = days.map(function (d) {
        return {
          label: f.dayMonth(d.date),
          value: d.hasUnits ? d.profit : 0,
          dim: !d.hasUnits,
          title: f.date(d.date) + ' ' + d.dayName + ' · ' +
                 (d.hasUnits ? 'רווח ' + f.moneySigned(d.profit) : 'אין נתוני ייצור') +
                 ' · עלות ' + f.money(d.totalCost)
        };
      });

      var profitCard = ui.card('רווח והפסד לפי יום', 'עמודה אדומה = יום הפסד. עמודה חיוורת = יום ללא רישום ייצור.',
        ui.columnChart(chartPoints) +
        '<div class="legend" style="margin-top:10px">' +
        '<span><i style="background:#1a6df0"></i>יום רווחי (' + t.profitDays + ')</span>' +
        '<span><i style="background:#d9534a"></i>יום הפסד (' + t.lossDays + ')</span>' +
        '<span><i style="background:#c8d0dc"></i>ללא נתוני ייצור (' + t.daysMissingUnits + ')</span>' +
        '</div>');

      /* --- revenue vs cost --- */
      var labels = days.map(function (d) { return f.dayMonth(d.date); });
      var trendCard = ui.card('הכנסה מול עלות', 'קו מקווקו = עלות יום כוללת (עובדים + הסעות)',
        ui.lineChart(labels, [
          { name: 'הכנסה', color: '#0f8a52', values: days.map(function (d) { return d.hasUnits ? d.revenue : null; }) },
          { name: 'עלות יום', color: '#d9534a', dash: true, values: days.map(function (d) { return d.totalCost; }) }
        ]) +
        ui.legend([{ name: 'הכנסה', color: '#0f8a52' }, { name: 'עלות יום', color: '#d9534a' }]));

      /* --- cost breakdown --- */
      var otShare = t.workerCost ? t.otCost / t.workerCost : 0;
      var breakdown = ui.card('מבנה העלות', 'לפי דרישת ההנהלה: עלות עובדים ועלות הסעות בנפרד',
        '<div class="stat-line"><span class="k">שעות רגילות (100%)</span><span class="v">' +
          f.hours(t.h100) + ' ש׳ · ' + f.money(t.workerCost - t.otCost) + '</span></div>' +
        '<div class="stat-line"><span class="k">שעות נוספות 125%</span><span class="v">' +
          f.hours(t.h125) + ' ש׳</span></div>' +
        '<div class="stat-line"><span class="k">שעות נוספות 150%</span><span class="v">' +
          f.hours(t.h150) + ' ש׳</span></div>' +
        '<div class="stat-line"><span class="k">תוספת בגין שעות נוספות</span><span class="v">' +
          f.money(t.otCost) + ' <span class="muted">(' + f.pct(otShare) + ' מעלות העובדים)</span></span></div>' +
        '<div class="stat-line"><span class="k">סה״כ עלות עובדים</span><span class="v">' +
          f.money(t.workerCost) + '</span></div>' +
        '<div class="stat-line"><span class="k">סה״כ עלות הסעות</span><span class="v">' +
          f.money(t.transportCost) + '</span></div>' +
        '<div class="stat-line total"><span class="k">עלות כוללת</span><span class="v">' +
          f.money(t.totalCost) + '</span></div>' +
        '<div class="stat-line"><span class="k">עלות ממוצעת ליום עבודה לעובד</span><span class="v">' +
          f.money(t.workerDays ? t.totalCost / t.workerDays : 0) + '</span></div>');

      /* --- carriers --- */
      var carrierRows = carriers.map(function (c) {
        return {
          label: c.carrier + (c.source === 'assumed' ? ' •' : ''),
          value: c.cost,
          display: f.money(c.cost),
          href: '#/rates'
        };
      });
      var assumedCount = carriers.filter(function (c) { return c.source === 'assumed'; }).length;
      var carriersCard = ui.card('עלות הסעות לפי מסיע', 'סה״כ ' + f.money(t.transportCost) +
        (assumedCount ? ' · <span class="badge warn">' + assumedCount + ' תעריפים בהנחה (•)</span>' : ''),
        ui.bars(carrierRows) +
        '<p class="muted" style="margin-top:10px;font-size:12px">' +
        'גיסלין מחויב לפי יום (' + f.money((cfg.carriers['גיסלין'] || {}).amount || 0) +
        ' ליום), שאר המסיעים לפי עובד. ניתן לשנות ב<a href="#/rates">הגדרות תעריפים</a>.</p>');

      /* --- top workers --- */
      var topWorkers = workers.slice(0, 8).map(function (w) {
        return {
          label: w.name, value: w.cost, display: f.money(w.cost), href: '#/worker/' + w.id
        };
      });
      var workersCard = ui.card('עלות לפי עובד', 'שמונת היקרים ביותר מתוך ' + workers.length + ' עובדים · ' +
        '<a href="#/workers">לרשימה המלאה</a>', ui.bars(topWorkers));

      /* --- months --- */
      var monthRows = months.map(function (m) {
        return {
          month: '<span class="strong">' + f.month(m.month) + '</span>',
          days: m.totals.days,
          workerDays: m.totals.workerDays,
          hours: f.hours(m.totals.hours),
          workerCost: f.money(m.totals.workerCost),
          transport: f.money(m.totals.transportCost),
          totalCost: f.money(m.totals.totalCost),
          units: f.num(m.totals.units),
          revenue: f.money(m.totals.revenue),
          profit: '<span class="strong ' + ui.tone(m.totals.profit) + '">' +
            f.moneySigned(m.totals.profit) + '</span>',
          margin: '<span class="' + ui.tone(m.totals.profit) + '">' + f.pct(m.totals.margin) + '</span>'
        };
      });
      var monthCard = ui.card('סיכום חודשי', null, M.ui.table([
        { t: 'חודש', k: 'month' }, { t: 'ימי עבודה', k: 'days', n: true },
        { t: 'ימי עובד', k: 'workerDays', n: true }, { t: 'שעות', k: 'hours', n: true },
        { t: 'עלות עובדים', k: 'workerCost', n: true }, { t: 'הסעות', k: 'transport', n: true },
        { t: 'עלות יום', k: 'totalCost', n: true }, { t: 'יחידות', k: 'units', n: true },
        { t: 'הכנסה', k: 'revenue', n: true }, { t: 'רווח/הפסד', k: 'profit', n: true },
        { t: 'שיעור', k: 'margin', n: true }
      ], monthRows), { flush: true });

      /* --- headline note --- */
      var headline = t.profit < 0
        ? ui.notice('<strong>האתר מפסיד בתקופה הנמדדת.</strong> בתעריפים הנוכחיים העלות ליחידה היא ' +
            f.money(t.breakEvenPrice, 3) + ' בעוד ההכנסה ליחידה היא ' + f.money(cfg.unitPrice, 2) +
            ' — פער של ' + f.money(t.breakEvenPrice - cfg.unitPrice, 3) + ' ליחידה. ' +
            'ב<a href="#/rates">הגדרות תעריפים</a> אפשר לבדוק מיידית איזה מחיר ליחידה מחזיר את האתר לאיזון.',
            'warn', '⚠')
        : ui.notice('האתר רווחי בתקופה הנמדדת בשיעור ' + f.pct(t.margin) + '.', '', '✔');

      mount.innerHTML =
        kpis +
        '<div style="height:18px"></div>' + headline +
        '<div style="height:18px"></div>' + profitCard +
        trendCard +
        '<div style="height:18px"></div><div class="grid g-2">' + breakdown + carriersCard + '</div>' +
        '<div style="height:18px"></div><div class="grid g-2">' + workersCard +
        ui.card('נתוני מקור', null,
          '<div class="stat-line"><span class="k">קובץ מקור</span><span class="v">' +
            ui.esc(ctx.data.source.file) + '</span></div>' +
          '<div class="stat-line"><span class="k">ימי עבודה</span><span class="v">' + ctx.data.source.days + '</span></div>' +
          '<div class="stat-line"><span class="k">רישומי נוכחות</span><span class="v">' + ctx.data.source.shifts + '</span></div>' +
          '<div class="stat-line"><span class="k">עובדים (לאחר איחוד כפילויות)</span><span class="v">' +
            ctx.data.source.workers + '</span></div>' +
          '<div class="stat-line"><span class="k">ממצאי איכות נתונים</span><span class="v">' +
            ctx.data.issues.length + ' · <a href="#/quality">לפירוט</a></span></div>' +
          '<div class="stat-line"><span class="k">מצב חישוב</span><span class="v">' +
            (cfg.scheduleMode === 'required' ? 'יום עבודה ' + cfg.requiredIn + '–' + cfg.requiredOut
                                             : 'שעות בפועל מהגיליון') + '</span></div>') +
        '</div>' +
        '<div style="height:18px"></div>' + monthCard;
    }
  };
})(window.M = window.M || {});

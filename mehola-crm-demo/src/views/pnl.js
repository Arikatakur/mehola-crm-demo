/* View: daily profit & loss — the sheet the client asked for in writing
   ("רוצים לדעת רווח והפסד בסוף יום בגיליון בנפרד"). */
(function (M) {
  'use strict';

  M.views = M.views || {};

  M.views.pnl = {
    title: 'רווח והפסד יומי',
    sub: function (ctx) {
      return 'עלות עובדים, עלות הסעות ועלות יום — כל אחת בנפרד — מול הכנסה לפי ' +
        M.fmt.money(ctx.cfg.unitPrice, 2) + ' ליחידה';
    },

    render: function (ctx, mount) {
      var days = ctx.days, t = ctx.totals, f = M.fmt, ui = M.ui;

      var cols = [
        { t: 'תאריך', k: 'date' },
        { t: 'יום', k: 'day' },
        { t: 'עובדים', k: 'workers', n: true },
        { t: 'שעות', k: 'hours', n: true },
        { t: 'ש. נוספות', k: 'ot', n: true },
        { t: 'עלות עובדים', k: 'workerCost', n: true },
        { t: 'עלות הסעות', k: 'transport', n: true },
        { t: 'עלות יום', k: 'totalCost', n: true },
        { t: 'יח׳ ייצור', k: 'units', n: true },
        { t: 'הכנסה', k: 'revenue', n: true },
        { t: 'רווח / הפסד', k: 'profit', n: true },
        { t: 'שיעור רווח', k: 'margin', n: true },
        { t: 'מחיר איזון ליח׳', k: 'be', n: true }
      ];

      var rows = days.map(function (d) {
        return {
          __cls: 'clickable',
          __attrs: 'onclick="location.hash=\'#/day/' + d.date + '\'"',
          date: '<span class="strong">' + f.date(d.date) + '</span>',
          day: '<span class="muted">' + ui.esc(d.dayName) + '</span>',
          workers: d.workers,
          hours: f.hours(d.hours),
          ot: d.h125 + d.h150 > 0
            ? f.hours(d.h125 + d.h150) + ' <span class="muted">ש׳</span>'
            : '<span class="muted">—</span>',
          workerCost: f.money(d.workerCost),
          transport: f.money(d.transportCost),
          totalCost: '<span class="strong">' + f.money(d.totalCost) + '</span>',
          units: d.hasUnits
            ? f.num(d.units) + (d.bonusUnits ? ' ' + ui.badge('כולל בונוס', 'info') : '')
            : ui.badge('חסר', 'warn'),
          revenue: d.hasUnits ? f.money(d.revenue) : '<span class="muted">—</span>',
          profit: d.hasUnits
            ? '<span class="strong ' + ui.tone(d.profit) + '">' + f.moneySigned(d.profit) + '</span>'
            : '<span class="muted">—</span>',
          margin: d.hasUnits ? '<span class="' + ui.tone(d.profit) + '">' + f.pct(d.margin) + '</span>' : null,
          be: d.breakEvenPrice ? f.money(d.breakEvenPrice, 3) : null
        };
      });

      var foot = {
        date: 'סה״כ',
        day: '<span class="muted">' + t.days + ' ימים</span>',
        workers: t.workerDays,
        hours: f.hours(t.hours),
        ot: f.hours(t.h125 + t.h150),
        workerCost: f.money(t.workerCost),
        transport: f.money(t.transportCost),
        totalCost: f.money(t.totalCost),
        units: f.num(t.units),
        revenue: f.money(t.revenue),
        profit: '<span class="' + ui.tone(t.profit) + '">' + f.moneySigned(t.profit) + '</span>',
        margin: '<span class="' + ui.tone(t.profit) + '">' + f.pct(t.margin) + '</span>',
        be: f.money(t.breakEvenPrice, 3)
      };

      var strip = '<div class="grid g-4">' +
        ui.kpi('הכנסה מצטברת', f.money(t.revenue), f.num(t.units) + ' יחידות × ' + f.money(ctx.cfg.unitPrice, 2)) +
        ui.kpi('עלות עובדים', f.money(t.workerCost),
               'מתוכה ' + f.money(t.otCost) + ' שעות נוספות') +
        ui.kpi('עלות הסעות', f.money(t.transportCost),
               t.transportCost && t.totalCost ? f.pct(t.transportCost / t.totalCost) + ' מסך העלות' : '') +
        ui.kpi('רווח / הפסד', '<span class="' + ui.tone(t.profit) + '">' + f.moneySigned(t.profit) + '</span>',
               t.profitDays + ' ימי רווח · ' + t.lossDays + ' ימי הפסד', { accent: true }) +
        '</div>';

      var notes = '';
      if (t.daysMissingUnits) {
        notes += ui.notice('ל-' + t.daysMissingUnits + ' ימים אין רישום ייצור בגיליון המקור. ' +
          'העלות שלהם נכללת בסיכום העלויות, אך הם אינם נספרים ברווח — ' +
          '<a href="#/quality">ראו איכות נתונים</a>.', 'warn', '⚠');
      }
      notes += ui.notice('שורת סיכום מציגה את כל התקופה. לחיצה על שורה פותחת את פירוט היום — ' +
        'עובד־עובד, שעה־שעה, כולל חלוקת ההסעות.', '', 'ℹ');

      var actions = '<button class="btn sm" data-csv="pnl">ייצוא CSV</button>';

      mount.innerHTML = strip +
        '<div style="height:18px"></div>' +
        ui.card('גיליון רווח והפסד — ' + ctx.data.site.name, this.sub(ctx),
                '<div style="padding:0 0 14px">' + notes + '</div>' +
                ui.table(cols, rows, { foot: foot }),
                { flush: false, actions: actions });

      ui.bindCsv(mount, {
        pnl: function () {
          M.ui.csv('rosman-pnl.csv',
            ['תאריך', 'יום', 'עובדים', 'שעות', 'שעות 100%', 'שעות 125%', 'שעות 150%',
             'עלות עובדים', 'עלות הסעות', 'עלות יום', 'יחידות ייצור', 'הכנסה',
             'רווח/הפסד', 'שיעור רווח', 'מחיר איזון ליחידה'],
            days.map(function (d) {
              return [d.date, d.dayName, d.workers, d.hours.toFixed(2), d.h100.toFixed(2),
                      d.h125.toFixed(2), d.h150.toFixed(2), Math.round(d.workerCost),
                      Math.round(d.transportCost), Math.round(d.totalCost),
                      d.hasUnits ? d.units : '', d.hasUnits ? Math.round(d.revenue) : '',
                      d.hasUnits ? Math.round(d.profit) : '',
                      d.hasUnits ? (d.margin * 100).toFixed(1) + '%' : '',
                      d.breakEvenPrice ? d.breakEvenPrice.toFixed(3) : ''];
            }));
        }
      });
    }
  };
})(window.M = window.M || {});

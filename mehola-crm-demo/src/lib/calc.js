/* Costing / revenue engine.
 *
 * Every number the app shows comes from here, so the arithmetic is in one
 * place and can be checked line by line against the client's brief.
 *
 * Per shift:   hours split into 100% / 125% / 150% tiers, then priced at the
 *              worker's rate (per-worker override, else site base rate).
 * Per day:     worker cost + transport cost (per carrier) = day cost;
 *              units x unit price = revenue; revenue - cost = profit.
 */
(function (M) {
  'use strict';

  function rateFor(cfg, workerId) {
    var r = cfg.workerRates[workerId];
    return (r === undefined || r === null || r === '') ? cfg.baseRate : Number(r);
  }

  /** Split a shift's length into the three pay tiers. */
  function splitHours(hours, ot) {
    var h100 = Math.min(hours, ot.after125);
    var h125 = Math.max(0, Math.min(hours, ot.after150) - ot.after125);
    var h150 = Math.max(0, hours - ot.after150);
    return { h100: h100, h125: h125, h150: h150, total: hours };
  }

  /** One attendance row -> costed line. */
  function costShift(shift, cfg, worker) {
    var useRequired = cfg.scheduleMode === 'required';
    var tin = useRequired ? cfg.requiredIn : shift['in'];
    var tout = useRequired ? cfg.requiredOut : shift.out;
    var hours = Math.max(0, M.fmt.toHours(tout) - M.fmt.toHours(tin));
    var s = splitHours(hours, cfg.ot);
    var rate = rateFor(cfg, shift.workerId);
    var cost100 = s.h100 * rate;
    var cost125 = s.h125 * rate * cfg.ot.mult125;
    var cost150 = s.h150 * rate * cfg.ot.mult150;

    return {
      workerId: shift.workerId,
      worker: worker,
      name: worker ? worker.name : shift.workerId,
      team: shift.team || '—',
      carrier: shift.carrier || '—',
      dept: shift.dept,
      'in': tin, out: tout,
      actualIn: shift['in'], actualOut: shift.out,
      adjusted: useRequired && (tin !== shift['in'] || tout !== shift.out),
      hours: hours,
      h100: s.h100, h125: s.h125, h150: s.h150,
      rate: rate,
      isOverrideRate: cfg.workerRates[shift.workerId] !== undefined,
      cost100: cost100, cost125: cost125, cost150: cost150,
      otCost: cost125 + cost150,
      cost: cost100 + cost125 + cost150,
      srcRow: shift.srcRow
    };
  }

  /** Transport cost for one day, broken out per carrier (requirement #2). */
  function transportFor(lines, cfg) {
    var byCarrier = {};
    lines.forEach(function (l) {
      var c = byCarrier[l.carrier] || (byCarrier[l.carrier] = { carrier: l.carrier, workers: 0, cost: 0 });
      c.workers++;
    });
    var rows = Object.keys(byCarrier).map(function (name) {
      var c = byCarrier[name];
      var rule = cfg.carriers[name] || { mode: 'none', amount: 0, source: 'assumed' };
      c.mode = rule.mode;
      c.amount = Number(rule.amount) || 0;
      c.source = rule.source;
      c.note = rule.note;
      if (rule.mode === 'perDay') c.cost = c.workers > 0 ? c.amount : 0;
      else if (rule.mode === 'perWorker') c.cost = c.workers * c.amount;
      else c.cost = 0;
      return c;
    });
    rows.sort(function (a, b) { return b.cost - a.cost; });
    return rows;
  }

  /** Full P&L for one day. */
  function costDay(day, cfg, workerById) {
    var lines = day.shifts.map(function (s) { return costShift(s, cfg, workerById[s.workerId]); });
    lines.sort(function (a, b) { return b.cost - a.cost; });

    var carriers = transportFor(lines, cfg);
    var workerCost = lines.reduce(function (a, l) { return a + l.cost; }, 0);
    var transportCost = carriers.reduce(function (a, c) { return a + c.cost; }, 0);
    var totalCost = workerCost + transportCost;

    var hasUnits = day.units !== null && day.units !== undefined;
    var units = hasUnits ? day.units : 0;
    var revenue = hasUnits ? units * cfg.unitPrice : null;
    var profit = revenue === null ? null : revenue - totalCost;

    return {
      date: day.date,
      dayName: day.dayName,
      lines: lines,
      carriers: carriers,
      workers: lines.length,
      hours: lines.reduce(function (a, l) { return a + l.hours; }, 0),
      h100: lines.reduce(function (a, l) { return a + l.h100; }, 0),
      h125: lines.reduce(function (a, l) { return a + l.h125; }, 0),
      h150: lines.reduce(function (a, l) { return a + l.h150; }, 0),
      otCost: lines.reduce(function (a, l) { return a + l.otCost; }, 0),
      workerCost: workerCost,
      transportCost: transportCost,
      totalCost: totalCost,
      units: hasUnits ? units : null,
      bonusUnits: day.bonusUnits || 0,
      hasUnits: hasUnits,
      revenue: revenue,
      profit: profit,
      margin: (revenue && revenue !== 0) ? profit / revenue : null,
      costPerWorker: lines.length ? totalCost / lines.length : 0,
      unitsPerWorkHour: hasUnits && lines.length ? units / lines.reduce(function (a, l) { return a + l.hours; }, 0) : null,
      /** what the unit price would have to be for this day to break even */
      breakEvenPrice: hasUnits && units > 0 ? totalCost / units : null
    };
  }

  function sum(arr, f) { return arr.reduce(function (a, x) { return a + (f(x) || 0); }, 0); }

  M.calc = {
    rateFor: rateFor,
    splitHours: splitHours,
    costShift: costShift,
    costDay: costDay,

    /** Cost every day in the dataset. Returns days newest-last. */
    run: function (data, cfg) {
      var byId = {};
      data.workers.forEach(function (w) { byId[w.id] = w; });
      var days = data.days.map(function (d) { return costDay(d, cfg, byId); });
      days.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      return days;
    },

    /** Roll a list of costed days into one summary. */
    totals: function (days) {
      var withUnits = days.filter(function (d) { return d.hasUnits; });
      var revenue = sum(withUnits, function (d) { return d.revenue; });
      var totalCost = sum(days, function (d) { return d.totalCost; });
      var costWithUnits = sum(withUnits, function (d) { return d.totalCost; });
      var units = sum(withUnits, function (d) { return d.units; });
      return {
        days: days.length,
        daysWithUnits: withUnits.length,
        daysMissingUnits: days.length - withUnits.length,
        workerDays: sum(days, function (d) { return d.workers; }),
        hours: sum(days, function (d) { return d.hours; }),
        h100: sum(days, function (d) { return d.h100; }),
        h125: sum(days, function (d) { return d.h125; }),
        h150: sum(days, function (d) { return d.h150; }),
        otCost: sum(days, function (d) { return d.otCost; }),
        workerCost: sum(days, function (d) { return d.workerCost; }),
        transportCost: sum(days, function (d) { return d.transportCost; }),
        totalCost: totalCost,
        units: units,
        revenue: revenue,
        /** profit is measured only over days that have production recorded */
        profit: revenue - costWithUnits,
        margin: revenue ? (revenue - costWithUnits) / revenue : null,
        breakEvenPrice: units > 0 ? costWithUnits / units : null,
        profitDays: withUnits.filter(function (d) { return d.profit > 0; }).length,
        lossDays: withUnits.filter(function (d) { return d.profit < 0; }).length
      };
    },

    /** Transport totals per carrier across days (requirement #2: "הכל בנפרד"). */
    carrierTotals: function (days) {
      var acc = {};
      days.forEach(function (d) {
        d.carriers.forEach(function (c) {
          var a = acc[c.carrier] || (acc[c.carrier] = {
            carrier: c.carrier, days: 0, workerDays: 0, cost: 0,
            mode: c.mode, amount: c.amount, source: c.source, note: c.note
          });
          a.days++;
          a.workerDays += c.workers;
          a.cost += c.cost;
        });
      });
      return Object.keys(acc).map(function (k) { return acc[k]; })
        .sort(function (a, b) { return b.cost - a.cost; });
    },

    /** Per-worker aggregation across days — the "Berut" view. */
    workerTotals: function (days, data) {
      var acc = {};
      data.workers.forEach(function (w) {
        acc[w.id] = {
          worker: w, id: w.id, name: w.name, tz: w.tz, aliases: w.aliases,
          days: 0, hours: 0, h100: 0, h125: 0, h150: 0, cost: 0, otCost: 0,
          transport: 0, rate: null, carriers: {}, teams: {}, entries: []
        };
      });
      days.forEach(function (d) {
        var perWorkerTransport = {};
        d.carriers.forEach(function (c) {
          perWorkerTransport[c.carrier] = c.workers ? c.cost / c.workers : 0;
        });
        d.lines.forEach(function (l) {
          var a = acc[l.workerId];
          if (!a) return;
          var t = perWorkerTransport[l.carrier] || 0;
          a.days++;
          a.hours += l.hours; a.h100 += l.h100; a.h125 += l.h125; a.h150 += l.h150;
          a.cost += l.cost; a.otCost += l.otCost; a.transport += t;
          a.rate = l.rate;
          a.carriers[l.carrier] = (a.carriers[l.carrier] || 0) + 1;
          if (l.team && l.team !== '—') a.teams[l.team] = (a.teams[l.team] || 0) + 1;
          a.entries.push({ date: d.date, dayName: d.dayName, line: l, transport: t });
        });
      });
      return Object.keys(acc).map(function (k) { return acc[k]; })
        .filter(function (a) { return a.days > 0; })
        .sort(function (a, b) { return b.cost - a.cost; });
    },

    /** Group costed days by calendar month. */
    byMonth: function (days) {
      var acc = {};
      days.forEach(function (d) {
        var m = d.date.slice(0, 7);
        (acc[m] || (acc[m] = [])).push(d);
      });
      return Object.keys(acc).sort().map(function (m) {
        return { month: m, days: acc[m], totals: M.calc.totals(acc[m]) };
      });
    }
  };
})(window.M = window.M || {});

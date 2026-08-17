/* Editable overlay on top of the generated dataset.
 *
 * src/data/rosman.js is produced by the migration and never changes at runtime.
 * Everything the user creates in the app — new workers, corrections to existing
 * ones, attendance entries, a day's production total — lives here and is layered
 * over that dataset on every render. Two consequences worth keeping:
 *   - the imported sheet stays exactly as it was imported, always comparable;
 *   - anything added is tagged, so a demo entry is never mistaken for source data.
 *
 * Persistence is localStorage (per browser). In the real product this module is
 * the seam where the API client goes.
 */
(function (M) {
  'use strict';

  var KEY = 'mehola.crm.store.v1';

  var EMPTY = {
    workers: [],      // added workers      {id,name,tz,phone,team,carrier,active,notes,createdAt}
    patches: {},      // edits to any worker {workerId: {tz,phone,team,notes,active,name}}
    shifts: [],       // added attendance    {id,date,workerId,in,out,team,carrier,dept}
    dayUnits: {},     // production overrides {date: units}
    days: []          // dates created in the app that are not in the sheet
  };

  var state = null;
  var listeners = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function read() {
    if (state) return state;
    state = clone(EMPTY);
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(EMPTY).forEach(function (k) {
          if (saved[k] !== undefined) state[k] = saved[k];
        });
      }
    } catch (e) { /* private mode / corrupt value — start empty */ }
    return state;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    listeners.forEach(function (fn) { fn(state); });
  }

  function nextId(prefix, list) {
    var n = 0;
    list.forEach(function (x) {
      var m = String(x.id || '').match(new RegExp('^' + prefix + '(\\d+)$'));
      if (m) n = Math.max(n, parseInt(m[1], 10));
    });
    return prefix + ('0' + (n + 1)).slice(-2);
  }

  M.store = {
    /** Israeli ID check digit — same rule as the migration script. */
    validId: function (tz) {
      if (!/^\d{1,9}$/.test(tz || '')) return false;
      var d = ('00000000' + tz).slice(-9), total = 0;
      for (var i = 0; i < 9; i++) {
        var n = parseInt(d.charAt(i), 10) * (i % 2 === 0 ? 1 : 2);
        total += n < 10 ? n : n - 9;
      }
      return total % 10 === 0;
    },

    raw: read,

    isEmpty: function () {
      var s = read();
      return !s.workers.length && !s.shifts.length &&
             !Object.keys(s.patches).length && !Object.keys(s.dayUnits).length;
    },

    counts: function () {
      var s = read();
      return { workers: s.workers.length, shifts: s.shifts.length,
               patches: Object.keys(s.patches).length,
               dayUnits: Object.keys(s.dayUnits).length };
    },

    // -- workers ---------------------------------------------------------
    addWorker: function (w) {
      var s = read();
      var rec = {
        id: nextId('u', s.workers),
        name: w.name, tz: w.tz || '', phone: w.phone || '',
        team: w.team || '', carrier: w.carrier || '',
        active: w.active !== false, notes: w.notes || '',
        createdAt: new Date().toISOString().slice(0, 10)
      };
      s.workers.push(rec);
      save();
      return rec;
    },

    updateWorker: function (id, patch) {
      var s = read();
      var added = null;
      s.workers.forEach(function (w) { if (w.id === id) added = w; });
      if (added) {
        Object.keys(patch).forEach(function (k) { added[k] = patch[k]; });
      } else {
        var p = s.patches[id] || (s.patches[id] = {});
        Object.keys(patch).forEach(function (k) { p[k] = patch[k]; });
      }
      save();
    },

    /** Only workers created in the app can be deleted; imported ones are source data. */
    removeWorker: function (id) {
      var s = read();
      s.workers = s.workers.filter(function (w) { return w.id !== id; });
      s.shifts = s.shifts.filter(function (x) { return x.workerId !== id; });
      save();
    },

    // -- attendance ------------------------------------------------------
    addShift: function (sh) {
      var s = read();
      var rec = {
        id: nextId('s', s.shifts),
        date: sh.date, workerId: sh.workerId,
        'in': sh['in'], out: sh.out,
        team: sh.team || '', carrier: sh.carrier || '', dept: sh.dept || 'כללי'
      };
      s.shifts.push(rec);
      if (s.days.indexOf(rec.date) === -1) s.days.push(rec.date);
      save();
      return rec;
    },

    removeShift: function (id) {
      var s = read();
      s.shifts = s.shifts.filter(function (x) { return x.id !== id; });
      save();
    },

    // -- production ------------------------------------------------------
    setDayUnits: function (date, units) {
      var s = read();
      if (units === null || units === '') delete s.dayUnits[date];
      else s.dayUnits[date] = Number(units);
      save();
    },

    addDay: function (date, units) {
      var s = read();
      if (s.days.indexOf(date) === -1) s.days.push(date);
      if (units !== null && units !== undefined && units !== '') s.dayUnits[date] = Number(units);
      save();
    },

    reset: function () {
      state = clone(EMPTY);
      try { localStorage.removeItem(KEY); } catch (e) {}
      listeners.forEach(function (fn) { fn(state); });
    },

    onChange: function (fn) { listeners.push(fn); },

    /**
     * Layer the overlay over the imported dataset.
     * Returns a new object; M.DATA itself is never mutated.
     */
    apply: function (base) {
      var s = read();
      if (M.store.isEmpty()) return base;

      var data = clone(base);

      // 1. corrections to imported workers
      data.workers.forEach(function (w) {
        var p = s.patches[w.id];
        if (!p) return;
        Object.keys(p).forEach(function (k) { w[k] = p[k]; });
        w.edited = true;
      });

      // 2. workers created in the app
      s.workers.forEach(function (w) {
        var rec = clone(w);
        rec.aliases = rec.aliases || [];
        rec.added = true;
        data.workers.push(rec);
      });

      // 3. attendance created in the app
      var byDate = {};
      data.days.forEach(function (d) { byDate[d.date] = d; });
      s.days.forEach(function (date) {
        if (!byDate[date]) {
          byDate[date] = { date: date, dayName: hebDay(date), units: null,
                           baseUnits: null, bonusUnits: 0, shifts: [], added: true };
          data.days.push(byDate[date]);
        }
      });
      s.shifts.forEach(function (sh) {
        var day = byDate[sh.date];
        if (!day) return;
        day.shifts.push({ workerId: sh.workerId, team: sh.team, carrier: sh.carrier,
                          dept: sh.dept, 'in': sh['in'], out: sh.out,
                          srcRow: null, shiftId: sh.id, added: true });
      });

      // 4. production totals entered in the app
      Object.keys(s.dayUnits).forEach(function (date) {
        var day = byDate[date];
        if (!day) return;
        day.units = s.dayUnits[date];
        day.unitsEdited = true;
      });

      // 5. keep the derived lists in sync
      data.days.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var carriers = {}, teams = {};
      data.days.forEach(function (d) {
        d.shifts.forEach(function (x) {
          if (x.carrier) carriers[x.carrier] = 1;
          if (x.team) teams[x.team] = 1;
        });
      });
      data.workers.forEach(function (w) {
        if (w.carrier) carriers[w.carrier] = 1;
        if (w.team) teams[w.team] = 1;
      });
      data.carriers = Object.keys(carriers).sort();
      data.teams = Object.keys(teams).sort();
      data.source = clone(data.source);
      data.source.days = data.days.length;
      data.source.workers = data.workers.length;
      data.source.shifts = data.days.reduce(function (a, d) { return a + d.shifts.length; }, 0);
      return data;
    }
  };

  var HEB = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function hebDay(iso) { return HEB[new Date(iso + 'T00:00:00').getDay()]; }
})(window.M = window.M || {});

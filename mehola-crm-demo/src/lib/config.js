/* Rate book / billing configuration.
 *
 * Defaults come from the client's written brief (what-the-company-wants.txt):
 *   - working day 07:00–18:00 "so that there are overtime hours to calculate"
 *   - worker hour = 40 ₪ ; exceptions: בושרה 43, רנא 44
 *   - Abu Radad private team transport = 30 ₪ per worker
 *   - Ghislain external transport company = 400 ₪ per day, any headcount
 *   - unit (sticker) price = 0.1 ₪
 * OT tiers come from the feature report §1.2 (125% after 8.5h, 150% after 10.5h).
 *
 * Anything the brief did not state is marked source:'assumed' so the UI can
 * show it as pending confirmation instead of passing it off as agreed.
 */
(function (M) {
  'use strict';

  var KEY = 'mehola.crm.config.v1';

  var DEFAULTS = {
    scheduleMode: 'required',        // 'required' = 07:00–18:00 | 'actual' = punches from the sheet
    requiredIn: '07:00',
    requiredOut: '18:00',
    baseRate: 40,
    // per-worker overrides, keyed by worker id (see src/data/rosman.js)
    workerRates: {},                 // filled below from names in the brief
    ot: { after125: 8.5, after150: 10.5, mult125: 1.25, mult150: 1.5 },
    unitPrice: 0.1,
    carriers: {}                     // filled below from the carriers in the data
  };

  var RATE_EXCEPTIONS = { 'בושרה שויקי': 43, 'רנא גיריס': 44 };

  var CARRIER_DEFAULTS = {
    'גיסלין':   { mode: 'perDay',    amount: 400, source: 'client',
                  note: 'חברת הסעות חיצונית — 400 ₪ ליום ללא תלות בכמות העובדים' },
    'אבו רדאד': { mode: 'perWorker', amount: 30,  source: 'client',
                  note: 'הסעה פרטית של צוות אבו רדאד — 30 ₪ לעובד' },
    'עצמאי':    { mode: 'none',      amount: 0,   source: 'client',
                  note: 'העובד/ת מגיע/ה עצמאית — ללא עלות הסעה' }
  };
  var CARRIER_ASSUMED = { mode: 'perWorker', amount: 30, source: 'assumed',
                          note: 'לא הוגדר בדרישות — הונח 30 ₪ לעובד כמו הסעת צוות. טעון אישור.' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function buildDefaults(data) {
    var d = clone(DEFAULTS);
    (data.workers || []).forEach(function (w) {
      if (RATE_EXCEPTIONS[w.name] !== undefined) d.workerRates[w.id] = RATE_EXCEPTIONS[w.name];
    });
    (data.carriers || []).forEach(function (name) {
      d.carriers[name] = clone(CARRIER_DEFAULTS[name] || CARRIER_ASSUMED);
    });
    return d;
  }

  var listeners = [];
  var current = null;

  M.config = {
    defaults: buildDefaults,

    load: function (data) {
      var d = buildDefaults(data);
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var saved = JSON.parse(raw);
          // shallow-merge so new fields in the code win over an old saved shape
          Object.keys(saved).forEach(function (k) {
            if (k === 'carriers' || k === 'workerRates' || k === 'ot') {
              Object.keys(saved[k] || {}).forEach(function (kk) { d[k][kk] = saved[k][kk]; });
            } else if (d[k] !== undefined) {
              d[k] = saved[k];
            }
          });
        }
      } catch (e) { /* private mode / corrupt value — fall back to defaults */ }
      current = d;
      return d;
    },

    get: function () { return current; },

    /** patch: partial config; nested objects are merged one level deep */
    set: function (patch) {
      Object.keys(patch).forEach(function (k) {
        if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && current[k]) {
          Object.keys(patch[k]).forEach(function (kk) { current[k][kk] = patch[k][kk]; });
        } else {
          current[k] = patch[k];
        }
      });
      try { localStorage.setItem(KEY, JSON.stringify(current)); } catch (e) {}
      listeners.forEach(function (fn) { fn(current); });
    },

    reset: function (data) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      current = buildDefaults(data);
      listeners.forEach(function (fn) { fn(current); });
    },

    onChange: function (fn) { listeners.push(fn); },

    isDirty: function () {
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    }
  };
})(window.M = window.M || {});

/* View: create / edit a worker.
   Same form both ways — a new worker, or corrections to one that came from the
   sheet (filling in a missing ת.ז is the common case: 20 of 32 arrived without one). */
(function (M) {
  'use strict';

  M.views = M.views || {};

  M.views.workerform = {
    title: function (ctx) { return ctx.path === 'worker-new' ? 'עובד חדש' : 'עריכת עובד'; },
    sub: function (ctx) {
      return ctx.path === 'worker-new'
        ? 'הוספת עובד למאגר — התעריף נכנס לחישוב מיד עם שיוך ליום עבודה'
        : 'עדכון פרטי עובד קיים. הנתון המקורי מהגיליון נשמר ומוצג לצד השינוי.';
    },

    render: function (ctx, mount) {
      var ui = M.ui, f = M.fmt, cfg = ctx.cfg;
      var isNew = ctx.path === 'worker-new';
      var w = null;
      if (!isNew) {
        ctx.data.workers.forEach(function (x) { if (x.id === ctx.params[0]) w = x; });
        if (!w) {
          mount.innerHTML = '<div class="card"><div class="empty">העובד לא נמצא. ' +
            '<a href="#/workers">חזרה למאגר</a></div></div>';
          return;
        }
      }

      var rateOverride = w ? cfg.workerRates[w.id] : undefined;
      var teams = ctx.data.teams;
      var carriers = ctx.data.carriers;

      function opts(list, sel, blank) {
        return (blank ? '<option value="">' + blank + '</option>' : '') +
          list.map(function (x) {
            return '<option value="' + ui.esc(x) + '"' + (sel === x ? ' selected' : '') + '>' +
              ui.esc(x) + '</option>';
          }).join('');
      }

      var identity =
        '<div class="grid g-3">' +
          fld('שם מלא <span class="neg">*</span>',
              '<input type="text" id="fName" value="' + ui.esc(w ? w.name : '') + '" ' +
              'placeholder="שם ושם משפחה" autocomplete="off">',
              'כפי שיופיע בכל הדוחות') +
          fld('תעודת זהות',
              '<input type="text" id="fTz" inputmode="numeric" value="' + ui.esc(w ? w.tz : '') + '" ' +
              'placeholder="9 ספרות">',
              '<span id="tzHint">המפתח לאיחוד העובד/ת בין האתרים</span>') +
          fld('טלפון',
              '<input type="text" id="fPhone" inputmode="tel" value="' +
              ui.esc(w && w.phone ? w.phone : '') + '" placeholder="05X-XXXXXXX">',
              'לשליחת סידור עבודה בהמשך') +
        '</div>' +
        '<div style="height:14px"></div>' +
        '<div class="grid g-3">' +
          fld('צוות',
              '<input type="text" id="fTeam" list="teamList" value="' +
              ui.esc(w && w.team ? w.team : '') + '" placeholder="ללא שיוך">' +
              '<datalist id="teamList">' + opts(teams, null) + '</datalist>',
              'אפשר לבחור מהרשימה או להקליד צוות חדש') +
          fld('מסיע ברירת מחדל',
              '<input type="text" id="fCarrier" list="carrierList" value="' +
              ui.esc(w && w.carrier ? w.carrier : '') + '" placeholder="בחרו מסיע">' +
              '<datalist id="carrierList">' + opts(carriers, null) + '</datalist>',
              'מסיע חדש ייווצר עם תעריף מונח של ' + f.money(30) + ' לעובד') +
          fld('סטטוס',
              '<select id="fActive">' +
              '<option value="1"' + (!w || w.active !== false ? ' selected' : '') + '>פעיל</option>' +
              '<option value="0"' + (w && w.active === false ? ' selected' : '') + '>לא פעיל</option>' +
              '</select>', 'עובד לא פעיל אינו מוצע לשיבוץ ליום עבודה') +
        '</div>';

      var salary =
        '<div class="grid g-3">' +
          fld('שכר לשעה',
              '<select id="fRateKind">' +
              '<option value="base"' + (rateOverride === undefined ? ' selected' : '') + '>' +
                'תעריף בסיס של האתר — ' + f.money(cfg.baseRate) + '</option>' +
              '<option value="custom"' + (rateOverride !== undefined ? ' selected' : '') + '>' +
                'תעריף חריג לעובד/ת</option>' +
              '</select>', 'סדר הקדימות: תעריף חריג גובר על תעריף הבסיס') +
          fld('תעריף חריג (₪ לשעה)',
              '<input type="number" step="0.5" min="0" id="fRate" value="' +
              (rateOverride === undefined ? cfg.baseRate : rateOverride) + '"' +
              (rateOverride === undefined ? ' disabled' : '') + '>',
              'נשמר בספר התעריפים יחד עם החריגים הקיימים') +
          fld('עלות יום מלא',
              '<div id="dayCost" class="value" style="font-size:20px;padding-top:4px"></div>',
              'לפי יום ' + cfg.requiredIn + '–' + cfg.requiredOut + ' ומדרג 125%/150%') +
        '</div>' +
        '<div style="height:14px"></div>' +
        fld('הערות', '<input type="text" id="fNotes" value="' +
            ui.esc(w && w.notes ? w.notes : '') + '" placeholder="מיומנויות, אישורים, הערות משרד">', '');

      var origin = '';
      if (w && !w.added) {
        origin = ui.notice('רשומה זו הגיעה מגיליון האתר. השינויים נשמרים כשכבת תיקון מעליה — ' +
          'הגיליון המקורי נשאר כפי שיובא, וניתן לראות את הפער במסך <a href="#/quality">איכות נתונים</a>.',
          '', 'ℹ');
      }

      var actions =
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
        '<button class="btn primary" id="fSave">' + (isNew ? 'הוספת עובד' : 'שמירת שינויים') + '</button>' +
        '<a class="btn ghost" href="#' + (w ? '/worker/' + w.id : '/workers') + '">ביטול</a>' +
        (w && w.added ? '<button class="btn" id="fDelete" style="margin-inline-start:auto">' +
          'מחיקת העובד/ת</button>' : '') +
        '</div>' +
        '<div id="fErr" style="margin-top:12px"></div>';

      mount.innerHTML =
        '<div class="crumb"><a href="#/workers">עובדים</a> ← ' +
          (isNew ? 'עובד חדש' : ui.esc(w.name)) + '</div>' +
        (origin ? origin + '<div style="height:16px"></div>' : '') +
        ui.card('פרטי עובד', 'שדה חובה מסומן ב-*', identity) +
        ui.card('שכר', 'התעריף נכנס לחישוב הרווח וההפסד ברגע שהעובד/ת משובץ/ת ליום עבודה', salary) +
        ui.card(null, null, actions);

      /* --- live bits --- */
      var $ = function (id) { return mount.querySelector('#' + id); };

      function currentRate() {
        return $('fRateKind').value === 'custom' ? Number($('fRate').value) || 0 : cfg.baseRate;
      }
      function paintDayCost() {
        var hours = Math.max(0, f.toHours(cfg.requiredOut) - f.toHours(cfg.requiredIn));
        var s = M.calc.splitHours(hours, cfg.ot);
        var r = currentRate();
        $('dayCost').innerHTML = f.money(s.h100 * r + s.h125 * r * cfg.ot.mult125 +
                                         s.h150 * r * cfg.ot.mult150);
      }
      function paintTz() {
        var tz = $('fTz').value.replace(/\D/g, '');
        var hint = $('tzHint');
        if (!tz) {
          hint.innerHTML = 'המפתח לאיחוד העובד/ת בין האתרים';
          hint.className = 'hint';
          return;
        }
        var dup = null;
        ctx.data.workers.forEach(function (x) {
          if (x.tz === tz && (!w || x.id !== w.id)) dup = x;
        });
        if (dup) {
          hint.innerHTML = '⚠ ת.ז זו כבר רשומה ל' + ui.esc(dup.name);
          hint.className = 'hint neg';
        } else if (!M.store.validId(tz)) {
          hint.innerHTML = '⚠ ספרת ביקורת שגויה — ניתן לשמור, יסומן לבדיקה';
          hint.className = 'hint neg';
        } else {
          hint.innerHTML = '✔ מספר זהות תקין';
          hint.className = 'hint pos';
        }
      }

      $('fRateKind').addEventListener('change', function () {
        $('fRate').disabled = this.value !== 'custom';
        if (this.value === 'base') $('fRate').value = cfg.baseRate;
        paintDayCost();
      });
      $('fRate').addEventListener('input', paintDayCost);
      $('fTz').addEventListener('input', paintTz);
      paintDayCost();
      paintTz();

      $('fSave').addEventListener('click', function () {
        // read the whole form first: saving re-renders the view and detaches these fields
        var rec = {
          name: $('fName').value.trim(),
          tz: $('fTz').value.replace(/\D/g, ''),
          phone: $('fPhone').value.trim(),
          team: $('fTeam').value.trim(),
          carrier: $('fCarrier').value.trim(),
          active: $('fActive').value === '1',
          notes: $('fNotes').value.trim()
        };
        var customRate = $('fRateKind').value === 'custom'
          ? (Number($('fRate').value) || cfg.baseRate) : null;

        if (!rec.name) {
          $('fErr').innerHTML = ui.notice('חובה להזין שם עובד.', 'warn', '⚠');
          $('fName').focus();
          return;
        }

        var id = isNew ? M.store.addWorker(rec).id : (M.store.updateWorker(w.id, rec), w.id);

        if (customRate !== null) {
          var patch = {};
          patch[id] = customRate;
          M.config.set({ workerRates: patch });
        } else if (M.config.get().workerRates[id] !== undefined) {
          delete M.config.get().workerRates[id];
          M.config.set({});
        }
        location.hash = '#/worker/' + id;
      });

      if ($('fDelete')) {
        $('fDelete').addEventListener('click', function () {
          var btn = this;
          if (btn.getAttribute('data-armed') !== '1') {
            btn.setAttribute('data-armed', '1');
            btn.textContent = 'לחצו שוב לאישור המחיקה';
            btn.className = 'btn neg';
            return;
          }
          if (M.config.get().workerRates[w.id] !== undefined) {
            delete M.config.get().workerRates[w.id];   // don't leave an orphan rate behind
            M.config.set({});
          }
          M.store.removeWorker(w.id);
          location.hash = '#/workers';
        });
      }
    }
  };

  function fld(label, control, hint) {
    return '<div class="field"><label>' + label + '</label>' + control +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }
})(window.M = window.M || {});

/* Small DOM + chart + export helpers. No dependencies by design:
   the demo has to open on any machine, offline, with no build step. */
(function (M) {
  'use strict';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var ui = M.ui = {
    esc: esc,

    /** tag helper: el('div.card', {onclick:fn}, 'text' | [children]) */
    el: function (spec, attrs, children) {
      var parts = spec.split('.');
      var node = document.createElement(parts[0] || 'div');
      if (parts.length > 1) node.className = parts.slice(1).join(' ');
      if (attrs) Object.keys(attrs).forEach(function (k) {
        if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (k === 'html') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
      if (children !== undefined) {
        (Array.isArray(children) ? children : [children]).forEach(function (c) {
          if (c === null || c === undefined) return;
          node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
      }
      return node;
    },

    kpi: function (label, value, sub, opts) {
      opts = opts || {};
      return '<div class="card kpi' + (opts.accent ? ' accent' : '') + '">' +
        '<div class="label">' + esc(label) + (opts.badge ? ' <span class="badge ' +
          (opts.badgeKind || '') + '">' + esc(opts.badge) + '</span>' : '') + '</div>' +
        '<div class="value ' + (opts.tone || '') + '">' + value + '</div>' +
        (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
    },

    card: function (title, sub, bodyHtml, opts) {
      opts = opts || {};
      return '<section class="card">' +
        (title ? '<div class="card-head"><div><h2>' + esc(title) + '</h2>' +
          (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
          (opts.actions || '') + '</div>' : '') +
        '<div class="card-body' + (opts.flush ? ' flush' : '') + '">' + bodyHtml + '</div>' +
        '</section>';
    },

    table: function (cols, rows, opts) {
      opts = opts || {};
      var head = '<thead><tr>' + cols.map(function (c) {
        return '<th class="' + (c.n ? 'n' : '') + '">' + esc(c.t) + '</th>';
      }).join('') + '</tr></thead>';
      var body = '<tbody>' + rows.map(function (r) {
        var attrs = r.__attrs || '';
        return '<tr class="' + (r.__cls || '') + '" ' + attrs + '>' + cols.map(function (c) {
          var v = r[c.k];
          return '<td class="' + (c.n ? 'n ' : '') + (c.cls || '') + '">' +
            (v === undefined || v === null ? '<span class="muted">—</span>' : v) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody>';
      var foot = opts.foot ? '<tfoot><tr>' + cols.map(function (c) {
        var v = opts.foot[c.k];
        return '<td class="' + (c.n ? 'n' : '') + '">' + (v === undefined ? '' : v) + '</td>';
      }).join('') + '</tr></tfoot>' : '';
      return '<div class="tbl-wrap"><table>' + head + body + foot + '</table></div>';
    },

    badge: function (text, kind) {
      return '<span class="badge ' + (kind || '') + '">' + esc(text) + '</span>';
    },

    tone: function (n) { return n === null || n === undefined ? '' : (n < 0 ? 'neg' : 'pos'); },

    notice: function (text, kind, icon) {
      return '<div class="notice ' + (kind || '') + '"><span class="ic">' +
        (icon || 'ℹ') + '</span><div>' + text + '</div></div>';
    },

    /** Horizontal bar list: [{label, value, display}] */
    bars: function (items, opts) {
      opts = opts || {};
      var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.value); }).concat([1]));
      return items.map(function (i) {
        var w = Math.max(2, Math.abs(i.value) / max * 100);
        return '<div class="bar-row">' +
          '<div class="nowrap">' + (i.href ? '<a href="' + i.href + '">' + esc(i.label) + '</a>' : esc(i.label)) + '</div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:' + w + '%;' +
            (i.color ? 'background:' + i.color : '') + '"></div></div>' +
          '<div class="n num">' + (i.display !== undefined ? i.display : i.value) + '</div>' +
          '</div>';
      }).join('');
    },

    /** Column chart of signed values (profit per day), SVG, no libs. */
    columnChart: function (points, opts) {
      opts = opts || {};
      var w = opts.width || 980, h = opts.height || 190;
      var padT = 14, padB = 26, padX = 4;
      var vals = points.map(function (p) { return p.value; });
      var max = Math.max.apply(null, vals.concat([0]));
      var min = Math.min.apply(null, vals.concat([0]));
      var span = (max - min) || 1;
      var plotH = h - padT - padB;
      var y0 = padT + (max / span) * plotH;                 // y of the zero line
      var n = points.length || 1;
      var slot = (w - padX * 2) / n;
      var bw = Math.max(3, Math.min(26, slot * 0.62));

      var bars = points.map(function (p, i) {
        // RTL: first point on the right
        var cx = w - padX - (i + 0.5) * slot;
        var v = p.value || 0;
        var bh = Math.abs(v) / span * plotH;
        var y = v >= 0 ? y0 - bh : y0;
        var fill = p.color || (v < 0 ? '#d9534a' : '#1a6df0');
        return '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) +
          '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, bh).toFixed(1) +
          '" rx="2" fill="' + fill + '" opacity="' + (p.dim ? .35 : 1) + '">' +
          '<title>' + esc(p.title || '') + '</title></rect>';
      }).join('');

      var labels = points.map(function (p, i) {
        if (n > 18 && i % Math.ceil(n / 12) !== 0) return '';
        var cx = w - padX - (i + 0.5) * slot;
        return '<text x="' + cx.toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' +
          esc(p.label) + '</text>';
      }).join('');

      return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">' +
        '<line class="zero-line" x1="' + padX + '" x2="' + (w - padX) + '" y1="' + y0.toFixed(1) +
        '" y2="' + y0.toFixed(1) + '"/>' + bars + labels + '</svg>';
    },

    /** Two-series line chart (revenue vs cost). */
    lineChart: function (labels, series, opts) {
      opts = opts || {};
      var w = opts.width || 980, h = opts.height || 210;
      var padT = 12, padB = 26, padX = 6;
      var all = series.reduce(function (a, s) { return a.concat(s.values.filter(function (v) { return v !== null; })); }, []);
      var max = Math.max.apply(null, all.concat([1])) * 1.08;
      var plotH = h - padT - padB;
      var n = labels.length || 1;
      var step = n > 1 ? (w - padX * 2) / (n - 1) : 0;
      var x = function (i) { return w - padX - i * step; };     // RTL
      var y = function (v) { return padT + plotH - (v / max) * plotH; };

      var grid = [0.25, 0.5, 0.75, 1].map(function (f) {
        return '<line class="grid-line" x1="' + padX + '" x2="' + (w - padX) +
          '" y1="' + y(max * f).toFixed(1) + '" y2="' + y(max * f).toFixed(1) + '"/>';
      }).join('');

      var paths = series.map(function (s) {
        var d = '', started = false;
        s.values.forEach(function (v, i) {
          if (v === null || v === undefined) { started = false; return; }
          d += (started ? ' L' : ' M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
          started = true;
        });
        return '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2" ' +
          'stroke-linejoin="round" stroke-linecap="round"' +
          (s.dash ? ' stroke-dasharray="4 3"' : '') + '/>';
      }).join('');

      var dots = series.map(function (s) {
        return s.values.map(function (v, i) {
          if (v === null || v === undefined) return '';
          return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.4" fill="' + s.color + '">' +
            '<title>' + esc(labels[i] + ' · ' + s.name + ': ' + M.fmt.money(v)) + '</title></circle>';
        }).join('');
      }).join('');

      var ticks = labels.map(function (l, i) {
        if (n > 18 && i % Math.ceil(n / 12) !== 0) return '';
        return '<text x="' + x(i).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(l) + '</text>';
      }).join('');

      return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '" role="img">' +
        grid + paths + dots + ticks + '</svg>';
    },

    legend: function (items) {
      return '<div class="legend">' + items.map(function (i) {
        return '<span><i style="background:' + i.color + '"></i>' + esc(i.name) + '</span>';
      }).join('') + '</div>';
    },

    /** Download rows as CSV (UTF-8 BOM so Excel opens Hebrew correctly). */
    csv: function (filename, header, rows) {
      var lines = [header].concat(rows).map(function (r) {
        return r.map(function (c) {
          var s = (c === null || c === undefined) ? '' : String(c);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',');
      }).join('\r\n');
      var blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },

    /** Wire [data-csv] buttons rendered inside a view. */
    bindCsv: function (root, handlers) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-csv]'), function (btn) {
        btn.addEventListener('click', function () {
          var fn = handlers[btn.getAttribute('data-csv')];
          if (fn) fn();
        });
      });
    }
  };

  ui.money = function (n, dec) { return M.fmt.money(n, dec); };
})(window.M = window.M || {});

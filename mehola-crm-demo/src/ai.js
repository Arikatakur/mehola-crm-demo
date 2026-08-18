/* Mehola AI assistant: contextual CRM Q&A through the local secure API proxy. */
(function (M) {
  'use strict';

  var history = [];

  function $(id) { return document.getElementById(id); }

  function open() {
    $('aiOverlay').removeAttribute('hidden');
    document.body.classList.add('ai-open');
    var route = M.app && M.app.ctx ? M.app.ctx() : null;
    var title = route && route.route ? route.route.nav || route.route.view : 'סקירת האתר';
    $('aiContextLabel').textContent = 'מחובר לנתוני המסך: ' + title;
    setTimeout(function () { $('aiInput').focus(); }, 60);
  }

  function close() {
    $('aiOverlay').setAttribute('hidden', '');
    document.body.classList.remove('ai-open');
  }

  function message(role, text, loading) {
    var row = document.createElement('div');
    row.className = 'ai-message ' + role + (loading ? ' loading' : '');
    var bubble = document.createElement('div');
    if (loading) bubble.innerHTML = '<i></i><i></i><i></i>';
    else bubble.textContent = text;
    row.appendChild(bubble);
    $('aiMessages').appendChild(row);
    $('aiMessages').scrollTop = $('aiMessages').scrollHeight;
    return row;
  }

  function setBusy(busy) {
    $('aiSend').disabled = busy;
    $('aiInput').disabled = busy;
  }

  async function ask(question) {
    question = String(question || '').trim();
    if (!question) return;
    message('user', question);
    $('aiInput').value = '';
    setBusy(true);
    var pending = message('assistant', '', true);
    try {
      var response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question, context: M.app.aiContext(), history: history.slice(-8) })
      });
      var result = await response.json();
      pending.remove();
      if (!response.ok) {
        if (result.error === 'AI_NOT_CONFIGURED') {
          message('assistant error', 'העוזר החכם עדיין לא מחובר. הגדירו OPENAI_API_KEY בסביבת השרת והפעילו את האפליקציה מחדש.');
        } else {
          message('assistant error', 'לא הצלחתי לקבל תשובה: ' + (result.message || 'שגיאת שירות'));
        }
        return;
      }
      message('assistant', result.answer);
      history.push({ role: 'user', content: question }, { role: 'assistant', content: result.answer });
      history = history.slice(-8);
    } catch (err) {
      pending.remove();
      message('assistant error', 'לא ניתן להתחבר לשירות ה-AI. ודאו שהאפליקציה הופעלה באמצעות tools/serve.py.');
    } finally {
      setBusy(false);
      $('aiInput').focus();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('aiOpen').addEventListener('click', open);
    $('aiClose').addEventListener('click', close);
    $('aiOverlay').addEventListener('click', function (e) { if (e.target === this) close(); });
    $('aiForm').addEventListener('submit', function (e) { e.preventDefault(); ask($('aiInput').value); });
    $('aiInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('aiForm').requestSubmit(); }
    });
    Array.prototype.forEach.call($('aiSuggestions').querySelectorAll('button'), function (button) {
      button.addEventListener('click', function () { ask(button.textContent); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });
})(window.M = window.M || {});

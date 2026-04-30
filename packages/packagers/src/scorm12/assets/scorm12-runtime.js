/*!
 * Lernkit SCORM 1.2 runtime bootstrap.
 *
 * Discovers the LMS's window.API (SCORM 1.2 convention) up the opener / parent
 * chain, and exposes a small, typed-ish wrapper at window.LernkitScorm12.
 *
 * Phase 1: a deliberately minimal surface that covers the fields our Tracker
 * (ADR 0004) uses. Phase 1+ will replace this with a vendored scorm-again
 * bundle once the legal memo on scorm-again's LGPL posture is back (OQ-P0-12).
 *
 * License: MIT (part of the Lernkit packagers zip output).
 */
(function () {
  'use strict';

  // SCORM 1.2 spec recommends 7 levels for the parent walk.
  var MAX_API_FIND_DEPTH = 7;
  var TERMINAL_STATUSES = ['completed', 'passed', 'failed'];

  function findAPI(win) {
    if (!win) return null;
    var depth = 0;
    var cur = win;
    try {
      // Walk parents. Cross-origin parent access throws SecurityError on
      // Chromium; we guard each property read with try/catch so the search
      // continues silently rather than aborting.
      while (cur && depth < MAX_API_FIND_DEPTH) {
        var apiHere = null;
        try {
          apiHere = cur.API;
        } catch (e) {
          apiHere = null;
        }
        if (apiHere) return apiHere;
        var parent = null;
        try {
          parent = cur.parent;
        } catch (e) {
          parent = null;
        }
        if (!parent || parent === cur) break;
        cur = parent;
        depth += 1;
      }
    } catch (e) {
      /* fall through */
    }
    var opener = null;
    try {
      opener = win.opener;
    } catch (e) {
      opener = null;
    }
    if (opener) {
      try {
        return findAPI(opener) || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function getAPI() {
    var theAPI = null;
    try {
      theAPI = findAPI(window);
    } catch (e) {
      theAPI = null;
    }
    if (!theAPI) {
      var opener = null;
      try {
        opener = window.opener;
      } catch (e) {
        opener = null;
      }
      if (opener) {
        try {
          theAPI = findAPI(opener);
        } catch (e) {
          theAPI = null;
        }
      }
    }
    return theAPI || null;
  }

  var api = getAPI();

  var debugEnabled = true;
  var lastErrorRecord = null;

  function safeWarn(line) {
    if (!debugEnabled) return;
    if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
      try {
        console.warn(line);
      } catch (e) {
        /* no-op */
      }
    }
  }

  function lastError(op) {
    if (!api) {
      lastErrorRecord = { code: -1, message: 'API adapter not found', diagnostic: '' };
      return lastErrorRecord;
    }
    var codeStr = '0';
    try {
      codeStr = String(api.LMSGetLastError());
    } catch (e) {
      codeStr = '0';
    }
    var code = parseInt(codeStr, 10);
    if (isNaN(code)) code = 0;
    var msg = '';
    var diag = '';
    try {
      msg = String(api.LMSGetErrorString(codeStr));
    } catch (e) {
      msg = '';
    }
    try {
      diag = String(api.LMSGetDiagnostic(codeStr));
    } catch (e) {
      diag = '';
    }
    lastErrorRecord = { code: code, message: msg, diagnostic: diag };
    if (code !== 0 && op) {
      safeWarn('[lernkit-scorm12] LMS' + op + ': code=' + code + ' msg="' + msg + '"');
    }
    return lastErrorRecord;
  }

  // SCORM 1.2 API helpers. All LMS*() calls return strings; we normalise "true"/"false".
  function lmsInit() {
    if (!api) return false;
    var result = 'false';
    try {
      result = api.LMSInitialize('');
    } catch (e) {
      result = 'false';
    }
    if (result !== 'true') {
      lastError('Initialize');
      return false;
    }
    return true;
  }
  function lmsSet(key, value) {
    if (!api) return false;
    var result = 'false';
    try {
      result = api.LMSSetValue(key, String(value));
    } catch (e) {
      result = 'false';
    }
    if (result !== 'true') {
      lastError('SetValue(' + key + ')');
      return false;
    }
    return true;
  }
  function lmsGet(key) {
    if (!api) return '';
    var result = '';
    var threw = false;
    try {
      result = api.LMSGetValue(key);
    } catch (e) {
      threw = true;
      result = '';
    }
    // LMSGetValue returns '' on error, but the spec wants us to drain
    // LMSGetLastError so subsequent calls see a clean slate.
    if (threw || result === '' || result === undefined || result === null) {
      lastError('GetValue(' + key + ')');
    }
    return result == null ? '' : String(result);
  }
  function lmsCommit() {
    if (!api) return false;
    var result = 'false';
    try {
      result = api.LMSCommit('');
    } catch (e) {
      result = 'false';
    }
    if (result !== 'true') {
      lastError('Commit');
      return false;
    }
    return true;
  }
  function lmsFinish() {
    if (!api) return false;
    var result = 'false';
    try {
      result = api.LMSFinish('');
    } catch (e) {
      result = 'false';
    }
    if (result !== 'true') {
      lastError('Finish');
      return false;
    }
    return true;
  }

  var initialized = false;
  var terminated = false;
  var startedAt = Date.now();

  /**
   * Format a ms diff into SCORM 1.2 session_time format: HH:MM:SS.SS (NOT ISO 8601).
   * SCORM 1.2 caps hours at 9999; clamp defensively.
   */
  function formatSessionTime(ms) {
    if (!isFinite(ms) || ms < 0) ms = 0;
    var totalSec = ms / 1000;
    var hours = Math.min(9999, Math.floor(totalSec / 3600));
    var minutes = Math.floor((totalSec - hours * 3600) / 60);
    var seconds = totalSec - hours * 3600 - minutes * 60;
    function pad2(n) {
      return (n < 10 ? '0' : '') + Math.floor(n);
    }
    var sStr = seconds.toFixed(2);
    if (seconds < 10) sStr = '0' + sStr;
    return pad2(hours) + ':' + pad2(minutes) + ':' + sStr;
  }

  var VALID_STATUSES = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'];

  function isTerminal(status) {
    for (var i = 0; i < TERMINAL_STATUSES.length; i += 1) {
      if (TERMINAL_STATUSES[i] === status) return true;
    }
    return false;
  }

  var runtime = {
    available: !!api,

    init: function () {
      if (!api) return false;
      if (initialized) return true;
      initialized = lmsInit();
      if (initialized) {
        startedAt = Date.now();
        // Some LMSes won't begin session tracking until we explicitly write
        // a status. Idempotent: only write when current status is empty,
        // 'not attempted', or otherwise non-terminal — never downgrade a
        // completed/passed/failed run.
        var current = lmsGet('cmi.core.lesson_status');
        if (!isTerminal(current)) {
          lmsSet('cmi.core.lesson_status', 'incomplete');
          lmsCommit();
        }
      }
      return initialized;
    },

    entry: function () {
      return initialized ? lmsGet('cmi.core.entry') : '';
    },

    status: function () {
      return initialized ? lmsGet('cmi.core.lesson_status') : '';
    },

    /** cmi.suspend_data — 4,096 character max per research §3.2. Callers must truncate upstream. */
    setSuspendData: function (data) {
      if (!initialized) return false;
      var s = typeof data === 'string' ? data : JSON.stringify(data);
      if (s.length > 4096) return false;
      return lmsSet('cmi.suspend_data', s);
    },

    /** cmi.core.lesson_location — 255 char limit. We truncate silently. */
    setBookmark: function (b) {
      if (!initialized) return false;
      var s = String(b);
      if (s.length > 255) s = s.slice(0, 255);
      return lmsSet('cmi.core.lesson_location', s);
    },

    /** Set scaled score in [0, 1]; written as raw 0–100 per SCORM 1.2 convention. */
    setScore: function (scaled) {
      if (!initialized) return false;
      if (typeof scaled !== 'number' || scaled < 0 || scaled > 1) return false;
      var raw = Math.round(scaled * 100);
      var ok = true;
      ok = lmsSet('cmi.core.score.raw', raw) && ok;
      ok = lmsSet('cmi.core.score.min', 0) && ok;
      ok = lmsSet('cmi.core.score.max', 100) && ok;
      return ok;
    },

    /**
     * SCORM 1.2 has ONE status field (cmi.core.lesson_status). Writing "passed"
     * AFTER "completed" overwrites "completed" — research §3.2. Callers must order
     * terminal writes intentionally. Non-terminal writes (incomplete/browsed) are
     * silently ignored when the LMS already reports a terminal state, so a late
     * progress save can't downgrade a completion.
     */
    setStatus: function (status) {
      if (!initialized) return false;
      if (VALID_STATUSES.indexOf(status) < 0) return false;
      if (status === 'incomplete' || status === 'browsed') {
        var current = lmsGet('cmi.core.lesson_status');
        if (isTerminal(current)) return true;
      }
      return lmsSet('cmi.core.lesson_status', status);
    },

    /** cmi.core.exit — '', 'suspend', 'logout', or 'time-out' (SCORM 1.2 §3.4.2). */
    setExit: function (value) {
      if (!initialized) return false;
      var v = value == null ? '' : String(value);
      if (v !== '' && v !== 'suspend' && v !== 'logout' && v !== 'time-out') return false;
      return lmsSet('cmi.core.exit', v);
    },

    commit: function () {
      return initialized ? lmsCommit() : false;
    },

    terminate: function () {
      if (!initialized || terminated) return true;
      var current = lmsGet('cmi.core.lesson_status');
      // Bookmark intent before writing session_time: 'suspend' if the SCO is
      // not yet terminal so the LMS knows to resume; '' otherwise.
      if (isTerminal(current)) {
        lmsSet('cmi.core.exit', '');
      } else {
        lmsSet('cmi.core.exit', 'suspend');
      }
      lmsSet('cmi.core.session_time', formatSessionTime(Date.now() - startedAt));
      lmsCommit();
      var ok = lmsFinish();
      terminated = true;
      return ok;
    },

    lastError: function () {
      return lastErrorRecord;
    },

    setDebug: function (flag) {
      debugEnabled = !!flag;
    },

    getApiVersion: function () {
      return '1.2';
    },
  };

  // Best-effort terminate on page unload so session_time and final status land.
  // 'pagehide' fires reliably on bfcache + navigation paths where 'beforeunload'
  // is increasingly throttled or skipped (Chromium, Safari).
  window.addEventListener('pagehide', function () {
    try {
      runtime.terminate();
    } catch (e) {
      /* no-op */
    }
  });

  window.LernkitScorm12 = runtime;
})();

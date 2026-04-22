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

  var MAX_API_FIND_DEPTH = 10;

  function findApi(win) {
    var depth = 0;
    var cur = win;
    while (cur && depth < MAX_API_FIND_DEPTH) {
      if (cur.API) return cur.API;
      if (cur === cur.parent) break;
      cur = cur.parent;
      depth += 1;
    }
    if (win.opener) {
      try {
        return findApi(win.opener) || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  var api = null;
  try {
    api = findApi(window);
  } catch (e) {
    api = null;
  }

  // SCORM 1.2 API helpers. All LMS*() calls return strings; we normalise "true"/"false".
  function lmsInit() {
    if (!api) return false;
    try {
      return api.LMSInitialize('') === 'true';
    } catch (e) {
      return false;
    }
  }
  function lmsSet(key, value) {
    if (!api) return false;
    try {
      return api.LMSSetValue(key, String(value)) === 'true';
    } catch (e) {
      return false;
    }
  }
  function lmsGet(key) {
    if (!api) return '';
    try {
      return api.LMSGetValue(key);
    } catch (e) {
      return '';
    }
  }
  function lmsCommit() {
    if (!api) return false;
    try {
      return api.LMSCommit('') === 'true';
    } catch (e) {
      return false;
    }
  }
  function lmsFinish() {
    if (!api) return false;
    try {
      return api.LMSFinish('') === 'true';
    } catch (e) {
      return false;
    }
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

  var runtime = {
    available: !!api,

    init: function () {
      if (!api) return false;
      if (initialized) return true;
      initialized = lmsInit();
      if (initialized) {
        startedAt = Date.now();
        // Signal tracking start per research §4: if the LMS reports "not attempted"
        // some LMSes won't begin session tracking until we explicitly write a status.
        if (lmsGet('cmi.core.lesson_status') === 'not attempted') {
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
     * terminal writes intentionally.
     */
    setStatus: function (status) {
      if (!initialized) return false;
      if (VALID_STATUSES.indexOf(status) < 0) return false;
      return lmsSet('cmi.core.lesson_status', status);
    },

    commit: function () {
      return initialized ? lmsCommit() : false;
    },

    terminate: function () {
      if (!initialized || terminated) return true;
      lmsSet('cmi.core.session_time', formatSessionTime(Date.now() - startedAt));
      lmsCommit();
      var ok = lmsFinish();
      terminated = true;
      return ok;
    },
  };

  // Best-effort terminate on page unload so session_time and final status land.
  window.addEventListener('beforeunload', function () {
    try {
      runtime.terminate();
    } catch (e) {
      /* no-op */
    }
  });

  window.LernkitScorm12 = runtime;
})();

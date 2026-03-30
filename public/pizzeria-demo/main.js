(function () {
  "use strict";

  var TZ = "Europe/Berlin";
  var words = ["Pizza?", "Pasta?", "Burger?", "Baguette?", "Speciale?", "Salat?"];
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
  var DAY_LABEL = { 0: "So", 1: "Mo", 2: "Di", 3: "Mi", 4: "Do", 5: "Fr", 6: "Sa" };
  var DAY_SUMMARY = {
    0: "17–21",
    1: "—",
    2: "—",
    3: "—",
    4: "11–14\n17–21",
    5: "11–14\n17–21",
    6: "17–22"
  };

  function berlinParts(d) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(d);
    var map = {};
    parts.forEach(function (p) {
      if (p.type !== "literal") map[p.type] = p.value;
    });
    var dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      dow: dowMap[map.weekday],
      minutes: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10)
    };
  }

  function isOpen(dow, minutes) {
    if (dow >= 1 && dow <= 3) return false;
    if (dow === 4 || dow === 5) return (minutes >= 660 && minutes < 840) || (minutes >= 1020 && minutes < 1260);
    if (dow === 6) return minutes >= 1020 && minutes < 1320;
    if (dow === 0) return minutes >= 1020 && minutes < 1260;
    return false;
  }

  function closingMinutes(dow, minutes) {
    if (!isOpen(dow, minutes)) return null;
    if (dow === 4 || dow === 5) {
      if (minutes >= 660 && minutes < 840) return 840;
      return 1260;
    }
    if (dow === 6) return 1320;
    return 1260;
  }

  function fmtClock(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  function formatDuration(totalMin) {
    if (totalMin <= 0) return "";
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    if (h === 0) return m + " Min.";
    if (m === 0) return h + " Std.";
    return h + " Std. " + m + " Min.";
  }

  function nextOpeningInstant(from) {
    var i;
    for (i = 0; i <= 10080; i++) {
      var t = new Date(from.getTime() + i * 60000);
      var p = berlinParts(t);
      var prev = i === 0 ? berlinParts(from) : berlinParts(new Date(from.getTime() + (i - 1) * 60000));
      if (isOpen(p.dow, p.minutes) && !isOpen(prev.dow, prev.minutes)) return t;
    }
    return null;
  }

  function weekdayNameLong(d) {
    return new Intl.DateTimeFormat("de-DE", { timeZone: TZ, weekday: "long" }).format(d);
  }

  function formatOpeningInstant(d) {
    var time = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
    return weekdayNameLong(d) + ", " + time + " Uhr";
  }

  function updateHoursUI() {
    var now = new Date();
    var p = berlinParts(now);
    var open = isOpen(p.dow, p.minutes);
    var pulseEl = document.querySelector("[data-hours-pulse]");
    var badgeEl = document.querySelector("[data-hours-badge]");
    var headEl = document.querySelector("[data-hours-headline]");
    var detEl = document.querySelector("[data-hours-detail]");
    var cdEl = document.querySelector("[data-hours-countdown]");
    var weekEl = document.querySelector("[data-hours-week]");

    if (!badgeEl || !headEl || !detEl) return;

    var closeM = closingMinutes(p.dow, p.minutes);
    var untilClose = closeM != null ? closeM - p.minutes : null;

    if (pulseEl) {
      pulseEl.className = "hours-pulse";
      if (open) pulseEl.classList.add("hours-pulse--open");
      else pulseEl.classList.add("hours-pulse--closed");
    }

    if (open) {
      badgeEl.textContent = "Jetzt geöffnet";
      headEl.textContent = "Wir haben für Sie auf.";
      var closeClock = fmtClock(closeM);
      detEl.textContent =
        "Kommen Sie rein – die Küche läuft. Heute schließen wir um " + closeClock + " Uhr (Küche 30 Min. vorher).";
      if (cdEl && untilClose != null) {
        if (untilClose <= 90 && untilClose > 0) {
          cdEl.hidden = false;
          cdEl.textContent = "Noch " + formatDuration(untilClose) + " bis zum Ende des Service.";
        } else if (untilClose > 90) {
          cdEl.hidden = true;
        } else {
          cdEl.hidden = true;
        }
      }
    } else {
      var next = nextOpeningInstant(now);
      var minsTo = next ? Math.round((next.getTime() - now.getTime()) / 60000) : null;
      var soon = minsTo != null && minsTo <= 120;
      if (pulseEl) {
        pulseEl.className = "hours-pulse";
        pulseEl.classList.add(soon ? "hours-pulse--soon" : "hours-pulse--closed");
      }

      if (p.dow >= 1 && p.dow <= 3) {
        badgeEl.textContent = "Ruhetag";
        headEl.textContent = "Wir atmen durch – bald duftet’s wieder.";
        detEl.textContent =
          "Montag bis Mittwoch machen wir Pause und rüsten uns aufs nächste Servieren. Ab Donnerstag geht’s wieder rund.";
      } else {
        badgeEl.textContent = soon ? "Gleich aufgedreht" : "Aktuell geschlossen";
        headEl.textContent = soon ? "Der Ofen wird schon warm." : "Gerade ist Ruhe vorm Sturm.";
        if (next) {
          detEl.textContent =
            "Nächster Start: " +
            formatOpeningInstant(next) +
            ". In dieser Demo verweisen wir bewusst auf neutrale Platzhalter – im Live-Auftritt kommen hier echte Links hin.";
        } else {
          detEl.textContent = "Bitte schauen Sie später wieder vorbei oder bestellen Sie online.";
        }
      }
      if (cdEl && minsTo != null && minsTo > 0 && minsTo < 2880) {
        cdEl.hidden = false;
        cdEl.textContent = "Noch " + formatDuration(minsTo) + " bis zur Öffnung.";
      } else if (cdEl) {
        cdEl.hidden = true;
      }
    }

    if (weekEl) {
      weekEl.innerHTML = "";
      WEEK_ORDER.forEach(function (dow) {
        var cell = document.createElement("div");
        cell.className = "hours-day";
        if (dow === p.dow) cell.classList.add("hours-day--today");
        if (dow >= 4 || dow === 0) cell.classList.add("hours-day--open");
        var abbr = document.createElement("span");
        abbr.className = "hours-day-abbr";
        abbr.textContent = DAY_LABEL[dow];
        var sub = document.createElement("span");
        sub.textContent = DAY_SUMMARY[dow].replace("\n", " · ");
        cell.appendChild(abbr);
        cell.appendChild(sub);
        weekEl.appendChild(cell);
      });
    }
  }

  /* Mobile nav */
  var toggle = document.querySelector(".nav-toggle");
  var drawer = document.getElementById("nav-drawer");
  if (toggle && drawer) {
    toggle.addEventListener("click", function () {
      var isOpenNav = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpenNav));
      drawer.hidden = isOpenNav;
    });
    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        drawer.hidden = true;
      });
    });
  }

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Hours panel toggle */
  var hoursBtn = document.querySelector("[data-hours-toggle]");
  var hoursPanel = document.querySelector("[data-hours-panel]");
  var hoursToggleLabel = document.querySelector("[data-hours-toggle-label]");
  if (hoursBtn && hoursPanel) {
    hoursBtn.addEventListener("click", function () {
      var exp = hoursBtn.getAttribute("aria-expanded") === "true";
      hoursBtn.setAttribute("aria-expanded", String(!exp));
      hoursPanel.hidden = exp;
      if (hoursToggleLabel) hoursToggleLabel.textContent = exp ? "Vollständige Zeiten anzeigen" : "Weniger anzeigen";
    });
  }

  updateHoursUI();
  window.setInterval(updateHoursUI, 60000);

  /* Scroll reveal */
  if (!reducedMotion) {
    var revealEls = document.querySelectorAll("[data-reveal]");
    if (revealEls.length && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      revealEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top < vh * 0.92) {
          el.classList.add("is-visible");
        } else {
          io.observe(el);
        }
      });
    } else {
      revealEls.forEach(function (el) {
        el.classList.add("is-visible");
      });
    }
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Word rotation */
  var el = document.querySelector("[data-words]");
  if (el && !reducedMotion) {
    var i = 0;
    function setWord(word) {
      el.textContent = word;
    }
    function cycle() {
      el.classList.add("is-exit");
      window.setTimeout(function () {
        i = (i + 1) % words.length;
        setWord(words[i]);
        el.classList.remove("is-exit");
        el.classList.add("is-enter");
        window.setTimeout(function () {
          el.classList.remove("is-enter");
        }, 450);
      }, 320);
    }
    window.setInterval(cycle, 3200);
  } else if (el) {
    el.textContent = words[0];
  }
})();

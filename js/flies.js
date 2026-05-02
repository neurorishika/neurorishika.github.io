/* flies.js — organic Drosophila walkers using the Bug.js movement algorithm
 * Sprite: img/fly-sprite.png  (65×56 px, 4 cols × 4 rows)
 *   row 0 — walk, wings open    (5 frames, last col empty — use WALK_FRAMES=4)
 *   row 1 — walk, wings closed  (5 frames, last col empty — use WALK_FRAMES=4)
 *   row 2 — fly, wings up       (4 frames)
 *   row 3 — fly, wings down     (4 frames)
 * Algorithm: https://github.com/Auz/Bug (MIT)
 */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════
   *  PARAMETERS — safe to edit
   * ═══════════════════════════════════════════════════ */
  var NUM_FLIES         = 10;     /* max simultaneous flies on screen */
  var MIN_SPEED         = 4;     /* walk speed range (px per 100 ms) */
  var MAX_SPEED         = 9;
  var WALK_FRAMES       = 4;     /* usable walking frames (cols 0-3; col 4 is blank) */
  var FLY_FRAMES        = 4;     /* usable flying frames (cols 0-3) */
  var BUG_W             = 13;    /* sprite frame width  px */
  var BUG_H             = 14;    /* sprite frame height px */
  var EDGE_RESIST       = 60;    /* px from viewport edge before organic steering */
  var MAX_LARGE_TURN    = 150;   /* degrees — max big random turn */
  var MAX_SMALL_TURN    = 10;    /* degrees — max small wiggle */
  var MAX_WIGGLE        = 5;     /* degrees — per-tick drift during large turn */
  var MOUSE_DIST        = 100;   /* px — cursor proximity that spooks a fly */
  var FLY_AWAY_SPEED    = 28;    /* px/100 ms during fly-flee */
  var FLY_LAND_MS_MIN   = 1500;  /* ms — earliest a flying fly can organically land */
  var FLY_LAND_MS_MAX   = 4000;  /* ms — latest */
  var MIN_ZOOM          = 0.9;   /* size range (1.0 = natural 13×14 px sprite) */
  var MAX_ZOOM          = 1.0;
  var PURSUE_DIST_MIN   = 10;    /* social: min body-lengths to trigger pursuit */
  var PURSUE_DIST_MAX   = 20;    /* social: max body-lengths to trigger pursuit */
  var PURSUE_CHANCE     = 0.25;  /* probability of starting pursuit when in range */
  var PURSUE_CHECK_MIN  = 2000;  /* ms between social-scan checks */
  var PURSUE_CHECK_MAX  = 5000;
  var FLY_COLLISION_PAD = 4;
  var ANT_AVOID_DIST    = 34;
  var ANT_ENCOUNTER_DIST = 18;
  var ANT_AVOID_BOOST   = 1.7;
  var FLY_FOOD_FREEZE_MS = 1600;
  var MALE_MALE_COURT_MS_MIN = 800;
  var MALE_MALE_COURT_MS_MAX = 1400;
  /* ═══════════════════════════════════════════════════ */

  var SPRITE_URL = 'img/fly-sprite.png';
  var insectWorld = window.__insectWorld = window.__insectWorld || {};
  insectWorld.pendingFlyFoods = insectWorld.pendingFlyFoods || [];

  /* rAF polyfill */
  var rAF = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function (cb) { return window.setTimeout(cb, 1000 / 60); };

  /* helpers */
  function rand(min, max) {
    var r = Math.round(min - 0.5 + Math.random() * (max - min + 1));
    return Math.max(min, Math.min(max, r));
  }
  function randSigned(min, max) {
    var r = rand(min, max);
    return Math.random() > 0.5 ? r : -r;
  }
  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;
  var nextFlyId = 1;

  function countLiveFlySexes() {
    var counts = { male: 0, female: 0 };
    for (var i = 0; i < flies.length; i++) {
      if (flies[i].isDead()) continue;
      counts[flies[i].getSex()] += 1;
    }
    return counts;
  }

  function pickFlySex() {
    var counts = countLiveFlySexes();
    var maleTarget = Math.floor(NUM_FLIES / 2);
    var femaleTarget = NUM_FLIES - maleTarget;

    if (counts.male >= maleTarget) return 'female';
    if (counts.female >= femaleTarget) return 'male';
    return counts.male <= counts.female ? 'male' : 'female';
  }

  /* track mouse */
  var mouseX = -9999, mouseY = -9999;
  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX; mouseY = e.clientY;
  }, { passive: true });
  
  /* ───────────────────────────────────────────────── */
  function makeFly() {
    var el = document.createElement('div');
    el.style.cssText = [
      'position:fixed',
      'top:0', 'left:0',
      'width:' + BUG_W + 'px',
      'height:' + BUG_H + 'px',
      'background:transparent url(' + SPRITE_URL + ') no-repeat 0 0',
      'image-rendering:pixelated',
      'pointer-events:none',
      'opacity:0.7',
      'z-index:0',
      'will-change:transform',
    ].join(';');
    document.body.insertBefore(el, document.body.firstChild || null);

    var zoom      = MIN_ZOOM + Math.random() * (MAX_ZOOM - MIN_ZOOM);
    var wingsOpen = Math.random() > 0.5;
    var walkSpeed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    var angleDeg  = rand(0, 360);
    var x = rand(EDGE_RESIST, window.innerWidth  - EDGE_RESIST);
    var y = rand(EDGE_RESIST, window.innerHeight - EDGE_RESIST);
    var id = nextFlyId++;
    var sex = pickFlySex();
    var frameIdx      = 0;
    var frameTimer    = 0;
    var largeTurnAng  = 0;

    /* counters (decremented each tick, not time-based) */
    var statCounter  = rand(50, 200);
    var edgeCounter  = 10;
    var smallCounter = rand(0, 10);
    var largeCounter = rand(0, 40);
    var stationary   = false;
    var fleeing      = false;
    var dead         = false;
    var flying          = false;  /* true = using flying-sprite rows 2-3 */
    var fleeType        = '';     /* 'walk' or 'fly' — set once per spook, never changes mid-bout */
    var flyWingRow      = 0;      /* 0/1 alternates rows 2/3 for wing-beat animation */
    var flyStopTimer    = -1;     /* ms until flying fly organically lands; -1 = fly until off-screen */
    var pursuing        = false;  /* chasing another fly */
    var following       = false;  /* trailing at 1 body-length */
    var target          = null;   /* fly being pursued/followed */
    var pursueCheckTimer = rand(PURSUE_CHECK_MIN, PURSUE_CHECK_MAX);
    var thisFly         = null;   /* self-reference, set after object is created */
    var frozen          = false;
    var frozenTimer     = 0;
    var courtshipTimer  = -1;
    var courtshipTargetSex = '';

    /* edge-flag bitmask → safe heading ° */
    var NEAR_TOP = 1, NEAR_BOT = 2, NEAR_L = 4, NEAR_R = 8;
    var EDGE_DIR = {};
    EDGE_DIR[NEAR_TOP]           = 270;
    EDGE_DIR[NEAR_BOT]           = 90;
    EDGE_DIR[NEAR_L]             = 0;
    EDGE_DIR[NEAR_R]             = 180;
    EDGE_DIR[NEAR_TOP + NEAR_L]  = 315;
    EDGE_DIR[NEAR_TOP + NEAR_R]  = 225;
    EDGE_DIR[NEAR_BOT + NEAR_L]  = 45;
    EDGE_DIR[NEAR_BOT + NEAR_R]  = 135;

    function nearEdge() {
      var W = window.innerWidth, H = window.innerHeight, f = 0;
      if (y < EDGE_RESIST)          f |= NEAR_TOP;
      else if (y > H - EDGE_RESIST) f |= NEAR_BOT;
      if (x < EDGE_RESIST)          f |= NEAR_L;
      else if (x > W - EDGE_RESIST) f |= NEAR_R;
      return f;
    }

    function setSprite() {
      var rowY;
      if (flying) {
        rowY = -(BUG_H * (2 + flyWingRow)); /* rows 2 and 3 for wing beat */
      } else {
        rowY = wingsOpen ? 0 : -BUG_H;
      }
      var col = (stationary && !flying) ? 0 : (-frameIdx * BUG_W);
      el.style.backgroundPosition = col + 'px ' + rowY + 'px';
    }

    function draw() {
      el.style.transform =
        'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)' +
        ' rotate(' + (90 - angleDeg) + 'deg)' +
        ' scale(' + zoom + ')';
    }

    function bodyRadius() {
      return Math.max(4.5, BUG_W * zoom * 0.42);
    }

    function clampToViewport(pad) {
      var W = window.innerWidth, H = window.innerHeight;
      x = Math.max(pad, Math.min(W - BUG_W - pad, x));
      y = Math.max(pad, Math.min(H - BUG_H - pad, y));
    }

    function retire(minDelay, maxDelay) {
      dead = true;
      if (el.parentNode) el.parentNode.removeChild(el);
      setTimeout(function () { flies.push(makeFly()); }, rand(minDelay, maxDelay));
    }

    function stopCourtship() {
      pursuing = false;
      following = false;
      target = null;
      courtshipTimer = -1;
      courtshipTargetSex = '';
    }

    function freezeForFood(antState, duration) {
      var now = performance.now ? performance.now() : Date.now();
      if (dead || frozen) return false;
      fleeing = false;
      flying = false;
      fleeType = '';
      flyStopTimer = -1;
      stationary = true;
      stopCourtship();
      frozen = true;
      frozenTimer = duration || FLY_FOOD_FREEZE_MS;
      frameIdx = 0;
      setSprite();
      draw();
      insectWorld.pendingFlyFoods.push({
        flyId: id,
        x: x,
        y: y,
        createdAt: now,
        expiresAt: now + frozenTimer,
        antX: antState ? antState.x : null,
        antY: antState ? antState.y : null,
        claimed: false
      });
      return true;
    }

    function tick(dt) {
      if (dead) return;

      if (frozen) {
        frozenTimer -= dt;
        draw();
        if (frozenTimer <= 0) retire(500, 1400);
        return;
      }

      var W = window.innerWidth, H = window.innerHeight;
      var dx = x - mouseX, dy = y - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var antStates = insectWorld.getAntStates ? insectWorld.getAntStates() : [];
      var nearestAnt = null;
      var nearestClaimant = null;
      var ai;

      for (ai = 0; ai < antStates.length; ai++) {
        var antState = antStates[ai];
        var adx = antState.x - x;
        var ady = antState.y - y;
        var antDist = Math.sqrt(adx * adx + ady * ady);
        if (!nearestAnt || antDist < nearestAnt.distance)
          nearestAnt = { ant: antState, distance: antDist };
        if (antState.canClaimFood && (!nearestClaimant || antDist < nearestClaimant.distance))
          nearestClaimant = { ant: antState, distance: antDist };
      }

      if (!fleeing) {
        if (nearestClaimant && nearestClaimant.distance < ANT_ENCOUNTER_DIST) {
          freezeForFood(nearestClaimant.ant, FLY_FOOD_FREEZE_MS);
          return;
        }
        if (nearestAnt && nearestAnt.distance < ANT_AVOID_DIST) {
          stationary = false;
          stopCourtship();
          angleDeg = Math.atan2(-(y - nearestAnt.ant.y), x - nearestAnt.ant.x) * R2D;
        }
      }

      var speedBoost = nearestAnt && nearestAnt.distance < ANT_AVOID_DIST ? ANT_AVOID_BOOST : 1;

      /* ── spook: trigger flee ── */
      if (!fleeing && dist < MOUSE_DIST) {
        fleeing    = true;
        stationary = false;
        stopCourtship();
        fleeType   = Math.random() < 0.5 ? 'walk' : 'fly';
        /* angle AWAY from cursor */
        angleDeg   = Math.atan2(-dy, dx) * R2D;
        if (fleeType === 'fly') {
          flying       = true;
          flyWingRow   = 0;
          frameIdx     = 0;
          /* random chance to land organically on-screen; otherwise fly off edge */
          flyStopTimer = Math.random() < 0.35
            ? rand(FLY_LAND_MS_MIN, FLY_LAND_MS_MAX)
            : -1;
        }
      }

      /* ── walk-flee mode: fast tortuous walk toward margin ── */
      if (fleeing && fleeType === 'walk') {
        var walkFleeSpeed = walkSpeed * 2.5 * (dt / 100);
        angleDeg += randSigned(1, 18);
        var arW = angleDeg * D2R;
        x += Math.cos(arW) * walkFleeSpeed;
        y -= Math.sin(arW) * walkFleeSpeed;
        frameTimer += dt;
        if (frameTimer > 55) {
          frameTimer = 0;
          frameIdx   = (frameIdx + 1) % WALK_FRAMES;
          setSprite();
        }
        draw();
        /* respawn as soon as fly leaves the visible region */
        if (x < -BUG_W || x > W + BUG_W || y < -BUG_H || y > H + BUG_H) {
          retire(300, 1000);
        }
        return;
      }

      /* ── fly-flee mode: flying sprite rows 2-3 ── */
      if (fleeing && fleeType === 'fly') {
        angleDeg += randSigned(0, 4);
        var arF      = angleDeg * D2R;
        var flySpeed = FLY_AWAY_SPEED * (dt / 100);
        x += Math.cos(arF) * flySpeed;
        y -= Math.sin(arF) * flySpeed;
        frameTimer += dt;
        if (frameTimer > 50) {
          frameTimer = 0;
          frameIdx   = (frameIdx + 1) % FLY_FRAMES;
          flyWingRow = 1 - flyWingRow; /* alternate rows 2/3 for wing-beat */
          setSprite();
        }
        /* organic landing: decelerate and resume walk at current position */
        if (flyStopTimer > 0) {
          flyStopTimer -= dt;
          if (flyStopTimer <= 0) {
            fleeing     = false;
            flying      = false;
            fleeType    = '';
            flyStopTimer = -1;
            angleDeg    = rand(0, 360);
            statCounter = rand(40, 120);
            frameIdx    = 0;
            setSprite();
            draw();
            return;
          }
        }
        draw();
        /* respawn as soon as fly leaves the visible region */
        if (x < -BUG_W || x > W + BUG_W || y < -BUG_H || y > H + BUG_H) {
          retire(300, 1000);
        }
        return;
      }

      /* ── social: periodic pursuit check ── */
      pursueCheckTimer -= dt;
      if (sex === 'male' && !pursuing && !following && pursueCheckTimer <= 0) {
        pursueCheckTimer = rand(PURSUE_CHECK_MIN, PURSUE_CHECK_MAX);
        var bodyPxC = BUG_W * zoom;
        for (var si = 0; si < flies.length; si++) {
          var other = flies[si];
          if (other === thisFly || other.isDead() || other.isFleeing()) continue;
          var os   = other.getState();
          var odx  = os.x - x, ody = os.y - y;
          var oDst = Math.sqrt(odx * odx + ody * ody);
          if (oDst < bodyPxC * PURSUE_DIST_MIN || oDst > bodyPxC * PURSUE_DIST_MAX) continue;
          /* must be in forward visual field (±90°) */
          var bearing = Math.atan2(-ody, odx) * R2D;
          var adiff   = ((bearing - angleDeg + 540) % 360) - 180;
          if (Math.abs(adiff) > 90) continue;
          if (Math.random() < PURSUE_CHANCE) {
            pursuing = true;
            target = other;
            courtshipTargetSex = os.sex;
            courtshipTimer = courtshipTargetSex === 'male'
              ? rand(MALE_MALE_COURT_MS_MIN, MALE_MALE_COURT_MS_MAX)
              : -1;
            break;
          }
        }
      }

      /* ── pursuit / follow execution ── */
      if ((pursuing || following) && target) {
        if (target.isDead() || target.isFleeing()) {
          stopCourtship();
        } else {
          if (courtshipTimer > 0) {
            courtshipTimer -= dt;
            if (courtshipTimer <= 0) stopCourtship();
          }
          if (!target) {
            draw();
            return;
          }
          var ts      = target.getState();
          var bodyPxS = BUG_W * zoom;
          var tdx     = ts.x - x, tdy = ts.y - y;
          var tDist   = Math.sqrt(tdx * tdx + tdy * tdy);
          if (pursuing) {
            if (tDist < bodyPxS) {
              pursuing = false;
              if (Math.random() >= (courtshipTargetSex === 'male' ? 0.85 : 0.5)) {
                following = true;
              } else {
                stopCourtship();
              }
            } else {
              stationary = false;
              angleDeg   = Math.atan2(-tdy, tdx) * R2D;
              var arP    = angleDeg * D2R;
              x += Math.cos(arP) * walkSpeed * 1.5 * speedBoost * (dt / 100);
              y -= Math.sin(arP) * walkSpeed * 1.5 * speedBoost * (dt / 100);
              x  = Math.max(4, Math.min(W - BUG_W - 4, x));
              y  = Math.max(4, Math.min(H - BUG_H - 4, y));
              frameTimer += dt;
              if (frameTimer > 70) { frameTimer = 0; frameIdx = (frameIdx + 1) % WALK_FRAMES; setSprite(); }
              draw(); return;
            }
          }
          if (following) {
            /* slot in 1 body-length behind target's heading */
            var behindX = ts.x - Math.cos(ts.angleDeg * D2R) * bodyPxS;
            var behindY = ts.y + Math.sin(ts.angleDeg * D2R) * bodyPxS;
            var fdx     = behindX - x, fdy = behindY - y;
            var fDist   = Math.sqrt(fdx * fdx + fdy * fdy);
            if (fDist > bodyPxS * 0.4) {
              stationary = false;
              angleDeg   = Math.atan2(-fdy, fdx) * R2D;
              var arFo   = angleDeg * D2R;
              x += Math.cos(arFo) * walkSpeed * speedBoost * (dt / 100);
              y -= Math.sin(arFo) * walkSpeed * speedBoost * (dt / 100);
            } else {
              angleDeg   = ts.angleDeg;
              stationary = true;
            }
            x  = Math.max(4, Math.min(W - BUG_W - 4, x));
            y  = Math.max(4, Math.min(H - BUG_H - 4, y));
            frameTimer += dt;
            if (frameTimer > 80) { frameTimer = 0; frameIdx = (frameIdx + 1) % WALK_FRAMES; setSprite(); }
            draw(); return;
          }
        }
      } else if (pursuing || following) {
        stopCourtship();
      }

      /* toggle stationary */
      if (--statCounter <= 0) {
        stationary   = !stationary;
        statCounter  = stationary ? rand(20, 80) : rand(80, 300);
        setSprite();
      }
      if (stationary) { draw(); return; }

      /* edge steering */
      if (--edgeCounter <= 0) {
        edgeCounter = 10;
        var flag = nearEdge();
        if (flag) {
          var safe = EDGE_DIR[flag];
          var cur  = ((angleDeg % 360) + 360) % 360;
          if (Math.abs(safe - cur) > 15) {
            largeTurnAng = safe - cur;
            largeCounter = 100;
            smallCounter = 30;
          }
        }
      }

      /* large random turn */
      if (--largeCounter <= 0) {
        largeTurnAng = randSigned(1, MAX_LARGE_TURN);
        largeCounter = rand(20, 60);
      }

      /* small wiggle / drift */
      if (--smallCounter <= 0) {
        angleDeg    += rand(1, MAX_SMALL_TURN);
        smallCounter = rand(0, 10);
      } else {
        var wig = randSigned(1, MAX_WIGGLE);
        if ((largeTurnAng > 0 && wig < 0) || (largeTurnAng < 0 && wig > 0)) wig = -wig;
        largeTurnAng -= wig;
        angleDeg     += wig;
      }

      /* move */
      var ar    = angleDeg * D2R;
      var speed = walkSpeed * speedBoost * (dt / 100);
      x += Math.cos(ar) * speed;
      y -= Math.sin(ar) * speed;

      /* hard clamp to viewport */
      x = Math.max(4, Math.min(W - BUG_W - 4, x));
      y = Math.max(4, Math.min(H - BUG_H - 4, y));

      /* advance walk frame every ~80 ms */
      frameTimer += dt;
      if (frameTimer > 80) {
        frameTimer = 0;
        frameIdx   = (frameIdx + 1) % WALK_FRAMES;
        setSprite();
      }


      draw();
    }

    /* walk in from a random screen edge */
    var side = rand(0, 3);
    var W0 = window.innerWidth, H0 = window.innerHeight;
    if      (side === 0) { x = Math.random() * W0; y = -BUG_H * 2; }
    else if (side === 1) { x = W0 + BUG_W;         y = Math.random() * H0; }
    else if (side === 2) { x = Math.random() * W0; y = H0 + BUG_H; }
    else                 { x = -BUG_W * 2;         y = Math.random() * H0; }

    setSprite();
    draw();

    thisFly = {
      id:         id,
      tick:       tick,
      getSex:     function () { return sex; },
      isDead:     function () { return dead; },
      isFleeing:  function () { return fleeing; },
      isFrozen:   function () { return frozen; },
      nudge:      function (dxNudge, dyNudge) {
        x += dxNudge;
        y += dyNudge;
        clampToViewport(4);
        draw();
      },
      freezeForFood: freezeForFood,
      getState:   function () {
        return {
          id: id,
          x: x,
          y: y,
          angleDeg: angleDeg,
          sex: sex,
          zoom: zoom,
          radius: bodyRadius(),
          frozen: frozen
        };
      }
    };
    return thisFly;
  }

  /* ── main loop ── */
  var flies = [];
  var lastT = null;

  insectWorld.getFlyStates = function () {
    var live = [];
    for (var i = 0; i < flies.length; i++) {
      if (!flies[i].isDead()) live.push(flies[i].getState());
    }
    return live;
  };

  function resolveFlyCollisions() {
    for (var i = 0; i < flies.length; i++) {
      var flyA = flies[i];
      if (flyA.isDead()) continue;
      var stateA = flyA.getState();
      for (var j = i + 1; j < flies.length; j++) {
        var flyB = flies[j];
        if (flyB.isDead()) continue;
        var stateB = flyB.getState();
        var dx = stateB.x - stateA.x;
        var dy = stateB.y - stateA.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var minDist = stateA.radius + stateB.radius + FLY_COLLISION_PAD;
        if (dist >= minDist) continue;
        if (dist === 0) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          dist = Math.sqrt(dx * dx + dy * dy) || 1;
        }
        var overlap = minDist - dist;
        var nx = dx / dist;
        var ny = dy / dist;
        var shareA = flyA.isFrozen() ? 0 : 0.5;
        var shareB = flyB.isFrozen() ? 0 : 0.5;
        if (shareA === 0 && shareB === 0) continue;
        if (shareA === 0) shareB = 1;
        else if (shareB === 0) shareA = 1;
        flyA.nudge(-nx * overlap * shareA, -ny * overlap * shareA);
        flyB.nudge(nx * overlap * shareB, ny * overlap * shareB);
        stateA = flyA.getState();
      }
    }
  }

  function loop(now) {
    if (!lastT) lastT = now;
    var dt = Math.min(now - lastT, 100); /* cap delta at 100 ms */
    lastT = now;
    flies = flies.filter(function (f) { return !f.isDead(); });
    for (var i = 0; i < flies.length; i++) flies[i].tick(dt);
    resolveFlyCollisions();
    rAF(loop);
  }

  function init() {
    /* stagger fly entrances */
    for (var i = 0; i < NUM_FLIES; i++) {
      (function (delay) {
        setTimeout(function () { flies.push(makeFly()); }, delay);
      })(rand(300, 9000));
    }
    rAF(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ants.js — Clonal raider ant foraging simulation
 * Biology: Ooceraea biroi (Kronauer lab, PNAS)
 * Foragers: explore → find food (stochastic by distance, or click) →
 *   return on tortuous path laying trail → recruit nestmates at colony →
 *   recruited ants sweep wide until they sense the trail → on_trail to food.
 * Nurses: move / groom / spin in place — colony feels alive.
 */
(function () {
  'use strict';

  /* ─── PARAMETERS ───────────────────────────────────────────── */
  var NUM_NURSES        = 30;
  var NUM_FORAGERS      = 10;
  var ANT_R             = 1.35;

  var NURSE_SPEED       = 0.55;
  var SPEED_EXPLORE     = 1.6;
  var SPEED_RETURN      = 2.4;
  var SPEED_RECRUITED   = 2.8;
  var SPEED_ON_TRAIL    = 2.3;

  /* Nurse behavioral state durations (ms) */
  var NURSE_MOVE_MIN      = 1200;
  var NURSE_MOVE_MAX      = 4500;
  var NURSE_GROOM_MIN     = 900;
  var NURSE_GROOM_MAX     = 3800;
  var NURSE_TURN_MIN      = 350;
  var NURSE_TURN_MAX      = 1100;
  var NURSE_FOOD_PAUSE_MIN = 600;
  var NURSE_FOOD_PAUSE_MAX = 1400;
  var TRAIL_FOLLOW_SNAP   = 14;   /* px — advance to next waypoint when this close */

  var COLONY_WANDER_R   = 65;
  var CLUSTER_REPULSE_R = 7;
  var COLONY_MARGIN     = 70;
  var SPAWN_MARGIN_SPREAD = 170;
  var SPAWN_MARGIN_DEPTH  = 26;
  var SPAWN_OFFSCREEN_MIN = 18;
  var SPAWN_OFFSCREEN_MAX = 44;
  var SPAWN_RELEASE_MIN_MS = 0;
  var SPAWN_RELEASE_MAX_MS = 2200;
  var SPAWN_ENTRY_OFFSET = 96;
  var SPAWN_ENTRY_SPREAD = 72;
  var NEST_ESTABLISH_RADIUS = 92;
  var NEST_ESTABLISH_FRACTION = 0.8;
  var NEST_ESTABLISH_HOLD_MS = 1200;
  var LARVA_ESTABLISH_FRACTION = 0.78;
  var SETTLE_SPEED = 6;
  var SETTLE_SWARM_R    = 54;
  var SETTLE_TARGET_MIN_R = 18;
  var SETTLE_TARGET_MAX_R = 88;
  var SETTLE_TARGET_REASSIGN_MIN = 700;
  var SETTLE_TARGET_REASSIGN_MAX = 2200;
  var MIGRATION_POINT_SPACING = 18;
  var MIGRATION_COLUMN_FILL = 0.9;
  var MIGRATION_WAVE_AMP = 165;
  var MIGRATION_JITTER = 5.5;
  var MIGRATION_LOOKAHEAD = 3;
  var MIGRATION_ADVANCE_R = 12;
  var MIGRATION_REACQUIRE_R = 54;
  var MIGRATION_RELEASE_GAP_MIN = 220;
  var MIGRATION_RELEASE_GAP_MAX = 520;
  var MIGRATION_QUEUE_GAP = 14;
  var MIGRATION_RELEASE_IMMUNITY_MS = 220;
  var MIGRATION_WEAVE_AMP_MIN = 1.5;
  var MIGRATION_WEAVE_AMP_MAX = 10.5;
  var MIGRATION_WEAVE_RATE_MIN = 0.0038;
  var MIGRATION_WEAVE_RATE_MAX = 0.0062;
  var MIGRATION_SETTLE_R = 18;
  var MIGRATION_SETTLE_HOLD_R = 26;

  /* Food finding — power-law probability: near-zero close to nest, high on far side of screen */
  var FOOD_MIN_DIST     = 220;    /* no food within this radius of nest */
  var FOOD_BASE_CHANCE  = 8e-6;   /* prob/ms at FOOD_SCALE_DIST beyond FOOD_MIN_DIST */
  var FOOD_SCALE_DIST   = 500;    /* normalization distance (px beyond MIN) */
  var FOOD_EXP_POWER    = 3;      /* exponent — cubic keeps probability tiny until ~400px out */
  var FOOD_CONSUME_FRACTION = 0.1;
  var RAID_REFRACTORY_MS = 12000; /* rest period between raids (ms) */
  var MAX_TRAIL_STRENGTH = 12;    /* reinforcement cap per trail point */
  var EXPLORE_DIR_SPREAD = 85;    /* ± degrees around away-from-colony when picking personal heading */
  var EXPLORE_DIR_PULL   = 0.008; /* how strongly personal heading steers (very gentle) */
  var EXPLORE_DIR_FADE_DIST = 420;
  var MAX_ACTIVE_TRAILS = 2;

  var TRAIL_SPACING     = 12;
  var TRAIL_FADE_MS     = 40000;
  var TRAIL_SNAP_R      = 32;
  var TRAIL_REACQUIRE_R = 64;
  var TRAIL_LANE_OFFSET = 5;
  var TRAIL_RETREAT_GRACE_MS = 9000;
  var NEST_R            = 25;
  var FOOD_R            = 18;

  var FOOD_PAUSE_MIN    = 800;
  var FOOD_PAUSE_MAX    = 2000;
  var NEST_PAUSE_MIN    = 500;
  var NEST_PAUSE_MAX    = 1300;
  var RECRUIT_TIMEOUT   = 14000;
  var RECRUIT_VOLATILE_R = 110;  /* volatile odor radius — ants within this of nest get recruited */
  var ANT_COLLISION_R   = 10;
  var ANT_COLLISION_TURN_R = 18;
  var NEST_CLUSTER_RADIUS = 95;
  var NEST_MIN_SPACING_SCALE = 0.42;
  var NEST_MIN_TURN_SCALE = 0.5;
  var FLY_AVOID_R       = 24;
  var FLY_FOOD_CLAIM_R  = 22;

  var MAX_SMALL_TURN      = 8;
  var MAX_LARGE_TURN      = 52;
  var MAX_LARGE_RETURN    = 68;  /* returning ants: wider random turns → tortuous path */
  var MAX_LARGE_RECRUITED = 95;
  var MAX_WIGGLE          = 3;
  var EDGE_RESIST         = 70;
  var RETURN_HOME_PULL    = 0.012; /* fraction of heading error corrected per tick */
  var TRAIL_LOOKAHEAD     = 2;     /* trail waypoints to look ahead when on-trail */
  var TRAIL_LOCK_R        = 8;     /* must be within this of nearest point to be "on trail" */
  var NURSE_DEPART_STAGGER = 350;  /* ms between each nurse's departure on a trail */
  var LARVA_COUNT        = 32;
  var LARVA_SIGMA_X      = 18;
  var LARVA_SIGMA_Y      = 12;
  var LARVA_SQUIRM_SHIFT = 1.4;
  /* ─────────────────────────────────────────────────────────── */

  var canvas, ctx, W, H;
  var colonyX, colonyY, colonySide, migrationSourceSide;
  var ants   = [];
  var trails = [];
  var larvae = [];
  var migrationTrail = null;
  var activeFood = null;
  var raidRefractoryTimer = 0;
  var nestEstablished = false;
  var nestEstablishTimer = 0;
  var lastT  = null;
  var nextAntId = 1;
  var D2R    = Math.PI / 180;
  var insectWorld = window.__insectWorld = window.__insectWorld || {};
  insectWorld.pendingFlyFoods = insectWorld.pendingFlyFoods || [];

  var NEAR_TOP = 1, NEAR_BOT = 2, NEAR_L = 4, NEAR_R = 8;
  var EDGE_DIR = {};
  EDGE_DIR[NEAR_TOP]          = 90;
  EDGE_DIR[NEAR_BOT]          = 270;
  EDGE_DIR[NEAR_L]            = 0;
  EDGE_DIR[NEAR_R]            = 180;
  EDGE_DIR[NEAR_TOP + NEAR_L] = 45;
  EDGE_DIR[NEAR_TOP + NEAR_R] = 135;
  EDGE_DIR[NEAR_BOT + NEAR_L] = 315;
  EDGE_DIR[NEAR_BOT + NEAR_R] = 225;

  function rand(a, b)    { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function dst(ax, ay, bx, by) { var dx=ax-bx, dy=ay-by; return Math.sqrt(dx*dx+dy*dy); }
  function aDeg(ax, ay, bx, by) { return Math.atan2(by-ay, bx-ax) * (180/Math.PI); }
  function aDiff(from, to) { return ((to - from + 540) % 360) - 180; }
  function gauss() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function mixCh(a, b, t) { return Math.round(a + (b-a) * Math.max(0, Math.min(1, t))); }
  function mixRgb(a, b, t) {
    return 'rgb(' + mixCh(a[0],b[0],t) + ',' + mixCh(a[1],b[1],t) + ',' + mixCh(a[2],b[2],t) + ')';
  }

  function smoothPolyline(points, passes) {
    var smoothed = points;
    for (var pass = 0; pass < passes; pass++) {
      var next = [smoothed[0]];
      for (var i = 0; i < smoothed.length - 1; i++) {
        var p0 = smoothed[i];
        var p1 = smoothed[i + 1];
        next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 });
        next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 });
      }
      next.push(smoothed[smoothed.length - 1]);
      smoothed = next;
    }
    return smoothed;
  }

  function nearEdge(ant) {
    var f = 0;
    if (ant.y < EDGE_RESIST) f |= NEAR_TOP; else if (ant.y > H - EDGE_RESIST) f |= NEAR_BOT;
    if (ant.x < EDGE_RESIST) f |= NEAR_L;   else if (ant.x > W - EDGE_RESIST) f |= NEAR_R;
    return f;
  }

  function trailFresh(trail, now) {
    return trail.points.length > 0 &&
      now - (trail.lastTouchedAt || trail.points[trail.points.length - 1].t) < TRAIL_FADE_MS;
  }

  function trailRetreatable(trail, now) {
    return trail && trail.points.length > 1 &&
      now - (trail.lastTouchedAt || trail.points[trail.points.length - 1].t) < TRAIL_FADE_MS + TRAIL_RETREAT_GRACE_MS;
  }

  function countActiveTrails(now) {
    var n = 0;
    for (var i = 0; i < trails.length; i++) {
      if (trailFresh(trails[i], now) && trails[i].foodAvailable !== false) n++;
    }
    return n;
  }

  function hasActiveFood() {
    return !!activeFood;
  }

  function hasEstablishedNest() {
    return nestEstablished;
  }

  function getNestEstablishThreshold() {
    return Math.max(1, Math.ceil(ants.length * NEST_ESTABLISH_FRACTION));
  }

  function getLarvaEstablishThreshold() {
    return Math.max(1, Math.ceil(LARVA_COUNT * LARVA_ESTABLISH_FRACTION));
  }

  function getDroppedLarvaCount() {
    var count = 0;
    for (var i = 0; i < larvae.length; i++) {
      if (larvae[i].active) count++;
    }
    return count;
  }

  function getMarginPoint(side, offscreen) {
    var x, y;
    offscreen = offscreen || 0;
    if (side === 0) {
      x = rand(COLONY_MARGIN * 2, W - COLONY_MARGIN * 2);
      y = -offscreen;
    } else if (side === 1) {
      x = W + offscreen;
      y = rand(COLONY_MARGIN * 2, H - COLONY_MARGIN * 2);
    } else if (side === 2) {
      x = rand(COLONY_MARGIN * 2, W - COLONY_MARGIN * 2);
      y = H + offscreen;
    } else {
      x = -offscreen;
      y = rand(COLONY_MARGIN * 2, H - COLONY_MARGIN * 2);
    }
    return { x: x, y: y };
  }

  function initMigrationTrail() {
    var start = getMarginPoint(migrationSourceSide, 0);
    var dx = colonyX - start.x;
    var dy = colonyY - start.y;
    var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var perpX = -dy / length;
    var perpY = dx / length;
    var rawPoints = [];
    var points;
    var steps = Math.max(34, Math.round(length / Math.max(12, MIGRATION_POINT_SPACING - 3)));
    var macroAmp = Math.min(MIGRATION_WAVE_AMP, length * 0.19);
    var microAmp = Math.min(MIGRATION_WAVE_AMP * 0.26, length * 0.05);
    var phaseA = rand(0, Math.PI * 2);
    var phaseB = rand(0, Math.PI * 2);
    var phaseC = rand(0, Math.PI * 2);
    var phaseD = rand(0, Math.PI * 2);
    var macroWaveA = rand(0.7, 1.35);
    var macroWaveB = rand(1.6, 2.6);
    var microWaveA = rand(3.4, 5.2);
    var microWaveB = rand(5.8, 8.2);

    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var envelope = Math.pow(Math.sin(Math.PI * t), 0.82);
      var baseX = start.x + dx * t;
      var baseY = start.y + dy * t;
      var macroBend =
        Math.sin(t * Math.PI * 2 * macroWaveA + phaseA) * macroAmp +
        Math.sin(t * Math.PI * 2 * macroWaveB + phaseB) * macroAmp * 0.45;
      var microBend =
        Math.sin(t * Math.PI * 2 * microWaveA + phaseC) * microAmp +
        Math.sin(t * Math.PI * 2 * microWaveB + phaseD) * microAmp * 0.3;
      var wobble = envelope * (macroBend + microBend);
      rawPoints.push({
        x: baseX + perpX * wobble,
        y: baseY + perpY * wobble,
      });
    }

    points = smoothPolyline(rawPoints, 2);
    points[0].x = start.x;
    points[0].y = start.y;
    points[points.length - 1].x = colonyX;
    points[points.length - 1].y = colonyY;
    for (i = 0; i < points.length; i++) {
      points[i].t = 0;
      points[i].strength = 0;
    }
    migrationTrail = { points: points };
  }

  function assignLarvaCarriers() {
    var carriers = [];
    var i;
    for (i = 0; i < ants.length; i++) if (ants[i].type === 'nurse') carriers.push(ants[i]);
    for (i = 0; i < ants.length; i++) if (ants[i].type === 'forager') carriers.push(ants[i]);
    for (i = 0; i < carriers.length; i++) {
      carriers[i].carryingLarva = i < larvae.length;
      carriers[i].larvaIndex = i < larvae.length ? i : -1;
    }
  }

  function setupMigrationColumn() {
    var order = ants.slice();
    var startPoint = migrationTrail.points[0];
    var nextPoint = migrationTrail.points[Math.min(1, migrationTrail.points.length - 1)];
    var releaseDelay = 0;

    for (var si = order.length - 1; si > 0; si--) {
      var swapIndex = randInt(0, si);
      var swap = order[si];
      order[si] = order[swapIndex];
      order[swapIndex] = swap;
    }

    for (var i = 0; i < order.length; i++) {
      order[i].x = startPoint.x;
      order[i].y = startPoint.y;
      order[i].angle = aDeg(startPoint.x, startPoint.y, nextPoint.x, nextPoint.y);
      order[i].spawnDelay = releaseDelay;
      order[i].migrationSpawned = false;
      order[i].justReleasedTimer = 0;
      order[i].migrationSettled = false;
      order[i].migrationIdx = 0;
      order[i].migrationOrder = i;
      releaseDelay += rand(MIGRATION_RELEASE_GAP_MIN, MIGRATION_RELEASE_GAP_MAX);
    }
  }

  function dropLarva(ant) {
    var larva;
    if (!ant.carryingLarva || ant.larvaIndex < 0) return;
    larva = larvae[ant.larvaIndex];
    if (!larva) return;
    larva.active = true;
    ant.carryingLarva = false;
    ant.larvaIndex = -1;
  }

  function followMigrationStep(ant, dt) {
    var points = migrationTrail && migrationTrail.points;
    var idx;
    var windowStart;
    var windowEnd;
    var bestIdx;
    var bestD = Infinity;
    var targetIdx;
    var target;
    var targetD;
    var steer;
    var leader = null;
    var leaderDist = Infinity;
    var prevPoint;
    var nextPoint;
    var tangentX;
    var tangentY;
    var tangentLen;
    var normalX;
    var normalY;
    var weaveRamp;
    var weave;
    var targetX;
    var targetY;

    if (!points || !points.length) return 'nest';

    idx = Math.max(0, Math.min(points.length - 1, ant.migrationIdx || 0));
    windowStart = Math.max(0, idx - 2);
    windowEnd = Math.min(points.length - 1, idx + 7);
    bestIdx = idx;

    for (var i = windowStart; i <= windowEnd; i++) {
      var d = dst(ant.x, ant.y, points[i].x, points[i].y);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }

    idx = bestIdx;
    while (idx < points.length - 2 && dst(ant.x, ant.y, points[idx].x, points[idx].y) < MIGRATION_ADVANCE_R) idx++;

    ant.migrationIdx = idx;
    targetIdx = Math.min(points.length - 1, idx + MIGRATION_LOOKAHEAD);
    target = points[targetIdx];
    steer = bestD > TRAIL_LOCK_R ? 0.52 : 0.34;

    for (var ai = 0; ai < ants.length; ai++) {
      var other = ants[ai];
      var dToOther;
      if (other === ant || other.spawnDelay > 0 || other.migrationSettled) continue;
      if (other.migrationOrder !== ant.migrationOrder - 1) continue;
      dToOther = dst(ant.x, ant.y, other.x, other.y);
      if (dToOther < leaderDist) {
        leader = other;
        leaderDist = dToOther;
      }
    }

    ant.migrationWeavePhase += dt * ant.migrationWeaveRate;
    prevPoint = points[Math.max(0, targetIdx - 1)];
    nextPoint = points[Math.min(points.length - 1, targetIdx + 1)];
    tangentX = nextPoint.x - prevPoint.x;
    tangentY = nextPoint.y - prevPoint.y;
    tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
    tangentX /= tangentLen;
    tangentY /= tangentLen;
    normalX = -tangentY;
    normalY = tangentX;
    weaveRamp = Math.min(1, idx / 8);
    if (leader && leaderDist < MIGRATION_QUEUE_GAP * 1.6) {
      weaveRamp *= Math.max(0.18, leaderDist / (MIGRATION_QUEUE_GAP * 1.6));
    }
    weave = Math.sin(ant.migrationWeavePhase + idx * 0.28) * ant.migrationWeaveAmp * weaveRamp;
    targetX = target.x + normalX * weave;
    targetY = target.y + normalY * weave;
    targetD = dst(ant.x, ant.y, targetX, targetY);

    ant.speed = ant.type === 'nurse' ? SETTLE_SPEED * 0.85 : SETTLE_SPEED;
    ant.angle += aDiff(ant.angle, aDeg(ant.x, ant.y, targetX, targetY)) * steer;
    ant.angle += (Math.random() < 0.5 ? -1 : 1) * rand(0.05, 0.45);

    if (leader && leaderDist < MIGRATION_QUEUE_GAP) {
      ant.speed *= Math.max(0.12, leaderDist / MIGRATION_QUEUE_GAP);
      ant.angle += aDiff(ant.angle, aDeg(ant.x, ant.y, leader.x, leader.y)) * 0.08;
    }

    if (bestD > MIGRATION_REACQUIRE_R) {
      ant.x += (points[idx].x - ant.x) * 0.08;
      ant.y += (points[idx].y - ant.y) * 0.08;
    }

    stepAnt(ant, dt);

    if (idx >= points.length - 2 && targetD < NEST_ESTABLISH_RADIUS * 0.55) return 'nest';
    return 'ok';
  }

  function resetAggregationTarget(ant, distHome) {
    var targetRadiusMax = distHome > NEST_ESTABLISH_RADIUS * 1.2
      ? SETTLE_TARGET_MAX_R
      : SETTLE_SWARM_R;
    var targetRadiusMin = distHome > SETTLE_SWARM_R
      ? SETTLE_TARGET_MIN_R
      : 8;
    var targetAngle = rand(0, 360) * D2R;
    var targetRadius = rand(targetRadiusMin, targetRadiusMax);

    ant.aggregateTargetX = colonyX + Math.cos(targetAngle) * targetRadius;
    ant.aggregateTargetY = colonyY + Math.sin(targetAngle) * targetRadius;
    ant.aggregateTimer = rand(SETTLE_TARGET_REASSIGN_MIN, SETTLE_TARGET_REASSIGN_MAX);
    ant.aggregateDrift = Math.random() < 0.5 ? -1 : 1;
  }

  function getSpawnEntryTarget() {
    var halfSpread = SPAWN_ENTRY_SPREAD * 0.5;

    if (colonySide === 0) {
      return {
        x: Math.max(24, Math.min(W - 24, colonyX + rand(-halfSpread, halfSpread))),
        y: Math.max(SPAWN_ENTRY_OFFSET, colonyY + SPAWN_ENTRY_OFFSET * 0.55)
      };
    }
    if (colonySide === 1) {
      return {
        x: Math.min(W - SPAWN_ENTRY_OFFSET, colonyX - SPAWN_ENTRY_OFFSET * 0.55),
        y: Math.max(24, Math.min(H - 24, colonyY + rand(-halfSpread, halfSpread)))
      };
    }
    if (colonySide === 2) {
      return {
        x: Math.max(24, Math.min(W - 24, colonyX + rand(-halfSpread, halfSpread))),
        y: Math.min(H - SPAWN_ENTRY_OFFSET, colonyY - SPAWN_ENTRY_OFFSET * 0.55)
      };
    }
    return {
      x: Math.max(SPAWN_ENTRY_OFFSET, colonyX + SPAWN_ENTRY_OFFSET * 0.55),
      y: Math.max(24, Math.min(H - 24, colonyY + rand(-halfSpread, halfSpread)))
    };
  }

  function finalizeNestEstablishment() {
    nestEstablished = true;
    nestEstablishTimer = 0;

    for (var li = 0; li < larvae.length; li++) larvae[li].active = true;

    for (var i = 0; i < ants.length; i++) {
      var ant = ants[i];
      ant.angle = rand(0, 360);
      ant.trail = null;
      ant.foodX = 0;
      ant.foodY = 0;
      ant.waitTimer = 0;
      ant.sweepTimer = 0;
      ant.aggregateTimer = 0;
      ant.enteredArena = true;
      ant.migrationSettled = true;
      ant.carryingLarva = false;
      ant.larvaIndex = -1;

      if (ant.type === 'nurse') {
        resetNurseToWander(ant);
        if (Math.random() < 0.45) {
          ant.nurseState = Math.random() < 0.6 ? 'groom' : 'turn';
          ant.nurseTimer = rand(300, 2000);
          ant.speed = 0;
        }
      } else {
        ant.state = 'explore';
        ant.speed = SPEED_EXPLORE;
      }
    }
  }

  function updateNestEstablishment(dt) {
    if (nestEstablished) return;

    var settledCount = 0;
    var droppedLarvae = getDroppedLarvaCount();
    for (var i = 0; i < ants.length; i++) {
      if (dst(ants[i].x, ants[i].y, colonyX, colonyY) < NEST_ESTABLISH_RADIUS) settledCount++;
    }

    if (settledCount >= getNestEstablishThreshold() && droppedLarvae >= getLarvaEstablishThreshold()) nestEstablishTimer += dt;
    else nestEstablishTimer = 0;

    if (nestEstablishTimer >= NEST_ESTABLISH_HOLD_MS) finalizeNestEstablishment();
  }

  function getFoodReachThreshold() {
    return Math.max(1, Math.ceil(ants.length * FOOD_CONSUME_FRACTION));
  }

  /* Phase 1 of raid end: food is depleted. Foragers heading to food turn back; nurses
   * that are outbound or at food turn around to inbound. activeFood stays non-null. */
  function consumeFood() {
    if (!activeFood || activeFood.consumed) return;
    activeFood.consumed = true;
    insectWorld.pendingFlyFoods = [];

    for (var i = 0; i < ants.length; i++) {
      var ant = ants[i];
      if (ant.type === 'forager') {
        if (ant.state === 'found_food' || ant.state === 'recruited') {
          ant.state = 'explore'; ant.speed = SPEED_EXPLORE;
          ant.waitTimer = 0; ant.sweepTimer = 0; ant.trail = null;
        } else if (ant.state === 'at_nest') {
          ant.trail = null;
        }
        /* on_trail foragers get individual staggered give-up timers so they peel off the trail
         * one by one rather than all arriving at the empty food site simultaneously */
        if (ant.state === 'on_trail') ant.giveUpTimer = rand(500, 3500);
        ant.foodX = 0; ant.foodY = 0;
      }
      /* nurses walk all the way to the food site and discover it empty there — no early U-turn */
    }
  }

  /* Phase 2: called every frame after food consumed. Once every recruited nurse has
   * returned to wander state (none left in outbound/nurse_at_food/inbound), the raid
   * is over and new food can spawn. */
  function checkRaidEnd() {
    if (!activeFood || !activeFood.consumed) return;
    for (var i = 0; i < ants.length; i++) {
      var a = ants[i];
      if (a.type !== 'nurse') continue;
      if (a.nurseState === 'outbound' || a.nurseState === 'nurse_at_food' || a.nurseState === 'inbound') return;
    }
    activeFood = null;
    trails = [];
    for (var j = 0; j < ants.length; j++) ants[j].trail = null;
    raidRefractoryTimer = RAID_REFRACTORY_MS;
  }

  function registerFoodReach(ant) {
    if (!activeFood || activeFood.consumed) return;
    if (activeFood.reachedAntIds[ant.id]) return;

    activeFood.reachedAntIds[ant.id] = true;
    activeFood.reachedCount++;

    if (activeFood.reachedCount >= getFoodReachThreshold()) consumeFood();
  }

  function findNearestTrail(x, y, now) {
    var best = null, bestD = Infinity;
    for (var ti = 0; ti < trails.length; ti++) {
      var t = trails[ti];
      if (!trailFresh(t, now)) continue;
      for (var pi = 0; pi < t.points.length; pi++) {
        var d = dst(x, y, t.points[pi].x, t.points[pi].y);
        if (d < bestD) { bestD = d; best = t; }
      }
    }
    return bestD < TRAIL_SNAP_R ? best : null;
  }

  function depositPoint(trail, ant, now) {
    if (!trail) return;
    trail.lastTouchedAt = now;
    if (trail.points.length === 0) { trail.points.push({ x: ant.x, y: ant.y, t: now, strength: 1 }); return; }
    var last = trail.points[trail.points.length - 1];
    if (dst(ant.x, ant.y, last.x, last.y) > TRAIL_SPACING)
      trail.points.push({ x: ant.x, y: ant.y, t: now, strength: 1 });
  }

  function triggerFoodFind(ant, now, foodX, foodY) {
    if (activeFood || !nestEstablished || raidRefractoryTimer > 0) return false;

    var nextFoodX = typeof foodX === 'number' ? foodX : ant.x;
    var nextFoodY = typeof foodY === 'number' ? foodY : ant.y;

    activeFood = {
      x: nextFoodX,
      y: nextFoodY,
      createdAt: now,
      reachedCount: 0,
      reachedAntIds: {}
    };

    ant.state     = 'found_food';
    ant.speed     = 0;
    ant.waitTimer = rand(FOOD_PAUSE_MIN, FOOD_PAUSE_MAX);
    ant.foodX     = nextFoodX;
    ant.foodY     = nextFoodY;

    registerFoodReach(ant);
    return true;
  }

  function canClaimFlyFood(ant) {
    return nestEstablished && ant.type === 'forager' && (ant.state === 'explore' || ant.state === 'recruited');
  }

  function steerAwayFromPoint(ant, x, y, weight) {
    ant.angle += aDiff(ant.angle, aDeg(x, y, ant.x, ant.y)) * weight;
  }

  function nestSpacingScale(x, y, minScale) {
    var t = Math.min(1, dst(x, y, colonyX, colonyY) / NEST_CLUSTER_RADIUS);
    return minScale + (1 - minScale) * t;
  }

  function desiredAntSpacing(ant) {
    return ANT_COLLISION_R * nestSpacingScale(ant.x, ant.y, NEST_MIN_SPACING_SCALE);
  }

  function desiredAntTurnRadius(ant) {
    return ANT_COLLISION_TURN_R * nestSpacingScale(ant.x, ant.y, NEST_MIN_TURN_SCALE);
  }

  function desiredNurseRepulsionRadius(ant) {
    return CLUSTER_REPULSE_R * nestSpacingScale(ant.x, ant.y, 0.55);
  }

  function steerAntSpacing(ant) {
    for (var i = 0; i < ants.length; i++) {
      var other = ants[i];
      if (other === ant) continue;
      var d = dst(ant.x, ant.y, other.x, other.y);
      var turnR = (desiredAntTurnRadius(ant) + desiredAntTurnRadius(other)) * 0.5;
      if (d > 0 && d < turnR) {
        steerAwayFromPoint(ant, other.x, other.y, 0.1 + (1 - d / turnR) * 0.18);
      }
    }

    var flyStates = insectWorld.getFlyStates ? insectWorld.getFlyStates() : [];
    for (var fi = 0; fi < flyStates.length; fi++) {
      var fly = flyStates[fi];
      var fd = dst(ant.x, ant.y, fly.x, fly.y);
      if (fd < FLY_AVOID_R) {
        steerAwayFromPoint(ant, fly.x, fly.y, fly.frozen ? 0.2 : 0.11);
      }
    }
  }

  function clampAnt(ant) {
    ant.x = Math.max(2, Math.min(W - 2, ant.x));
    ant.y = Math.max(2, Math.min(H - 2, ant.y));
  }

  function resolveAntOverlaps() {
    for (var i = 0; i < ants.length; i++) {
      var antA = ants[i];
      if (antA.spawnDelay > 0 || antA.justReleasedTimer > 0) continue;
      for (var j = i + 1; j < ants.length; j++) {
        var antB = ants[j];
        if (antB.spawnDelay > 0 || antB.justReleasedTimer > 0) continue;
        var dx = antB.x - antA.x;
        var dy = antB.y - antA.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var minDist = (desiredAntSpacing(antA) + desiredAntSpacing(antB)) * 0.5;
        if (d >= minDist) continue;
        if (d === 0) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          d = Math.sqrt(dx * dx + dy * dy) || 1;
        }
        var overlap = (minDist - d) * 0.5;
        var nx = dx / d;
        var ny = dy / d;
        antA.x -= nx * overlap;
        antA.y -= ny * overlap;
        antB.x += nx * overlap;
        antB.y += ny * overlap;
        clampAnt(antA);
        clampAnt(antB);
      }
    }
  }

  function claimPendingFlyFood(now) {
    var queue = insectWorld.pendingFlyFoods || [];
    if (!queue.length) return;
    if (!nestEstablished) {
      insectWorld.pendingFlyFoods = [];
      return;
    }
    if (hasActiveFood() || raidRefractoryTimer > 0) {
      insectWorld.pendingFlyFoods = [];
      return;
    }

    for (var qi = 0; qi < queue.length; qi++) {
      var req = queue[qi];
      if (req.claimed || req.expiresAt <= now) continue;
      var best = null;
      var bestD = Infinity;
      for (var ai = 0; ai < ants.length; ai++) {
        var ant = ants[ai];
        if (!canClaimFlyFood(ant)) continue;
        var d = dst(ant.x, ant.y, req.x, req.y);
        if (d < FLY_FOOD_CLAIM_R && d < bestD) {
          best = ant;
          bestD = d;
        }
      }
      if (best) {
        triggerFoodFind(best, now, req.x, req.y);
        req.claimed = true;
      }
    }

    insectWorld.pendingFlyFoods = queue.filter(function (req) {
      return !req.claimed && req.expiresAt > now;
    });
  }

  /* ─── MOVEMENT PRIMITIVES ───────────────────────────────────── */
  function stepAnt(ant, dt) {
    var ar = ant.angle * D2R;
    var dx = Math.cos(ar) * ant.speed * (dt / 100);
    var dy = Math.sin(ar) * ant.speed * (dt / 100);
    ant.x = Math.max(2, Math.min(W - 2, ant.x + dx));
    ant.y = Math.max(2, Math.min(H - 2, ant.y + dy));
    ant.legPhase = (ant.legPhase + Math.sqrt(dx*dx + dy*dy) * 0.75) % (Math.PI * 2);
  }

  function bugMove(ant, dt, maxLarge) {
    if (--ant.edgeCounter <= 0) {
      ant.edgeCounter = randInt(5, 12);
      var flag = nearEdge(ant);
      if (flag) {
        var safe = EDGE_DIR[flag], cur = ((ant.angle % 360) + 360) % 360;
        var diff = aDiff(cur, safe);
        if (Math.abs(diff) > 15) { ant.largeTurnAng = diff; ant.largeCounter = 100; ant.smallCounter = 30; }
      }
    }
    if (--ant.largeCounter <= 0) {
      ant.largeTurnAng = (Math.random() < 0.5 ? 1 : -1) * rand(1, maxLarge);
      ant.largeCounter = randInt(12, 55);
    }
    if (--ant.smallCounter <= 0) {
      ant.angle += (Math.random() < 0.5 ? 1 : -1) * rand(1, MAX_SMALL_TURN);
      ant.smallCounter = randInt(0, 10);
    } else {
      var wig = (Math.random() < 0.5 ? 1 : -1) * rand(1, MAX_WIGGLE);
      if ((ant.largeTurnAng > 0 && wig < 0) || (ant.largeTurnAng < 0 && wig > 0)) wig = -wig;
      ant.largeTurnAng -= wig;
      ant.angle += wig;
    }
    stepAnt(ant, dt);
  }

  function goalMove(ant, dt, targetAngle) {
    ant.angle += aDiff(ant.angle, targetAngle) * 0.18;
    stepAnt(ant, dt);
  }

  /* Tortuous return: random walk with homeward pull that strengthens near nest */
  function returnMove(ant, dt) {
    bugMove(ant, dt, MAX_LARGE_RETURN);
    var distHome  = dst(ant.x, ant.y, colonyX, colonyY);
    var homeAngle = aDeg(ant.x, ant.y, colonyX, colonyY);
    /* weak pull when far (tortuous path), ramps up sharply inside 120px to guarantee arrival */
    var pull = distHome > 120
      ? RETURN_HOME_PULL
      : RETURN_HOME_PULL + (1 - distHome / 120) * 0.30;
    ant.angle += aDiff(ant.angle, homeAngle) * pull;
  }

  function startReturnState(ant, nextState) {
    ant.state = nextState;
    ant.speed = SPEED_RETURN;
    ant.angle = aDeg(ant.x, ant.y, colonyX, colonyY);
    ant.largeTurnAng = 0;
    ant.smallCounter = randInt(0, 4);
    ant.largeCounter = randInt(8, 20);
    ant.exploreDirTimer = 0;
  }

  function sendNurseHome(ant) {
    ant.nurseState = 'inbound';
    ant.trail = null;
    ant.speed = SPEED_RETURN;
    ant.nurseTimer = 0;
    ant.angle = aDeg(ant.x, ant.y, colonyX, colonyY);
  }

  function startTrailRetreat(ant) {
    if (!ant.trail) return false;
    startReturnState(ant, 'return_on_trail');
    ant.giveUpTimer = 0;
    return true;
  }

  function startNurseTrailRetreat(ant) {
    if (!ant.trail) return false;
    ant.nurseState = 'inbound';
    ant.speed = SPEED_RETURN;
    ant.nurseTimer = 0;
    ant.angle = aDeg(ant.x, ant.y, colonyX, colonyY);
    return true;
  }

  function tickNestEstablishingAnt(ant, dt, now) {
    var distHome;
    var settleSpeed;
    var targetDist;
    var targetAngle;
    var orbitAngle;
    var startPoint;
    var nextPoint;

    if (ant.spawnDelay > 0) {
      ant.spawnDelay -= dt;
      if (ant.spawnDelay > 0) return;
      ant.spawnDelay = 0;
    }

    if (!ant.migrationSpawned) {
      startPoint = migrationTrail.points[0];
      nextPoint = migrationTrail.points[Math.min(1, migrationTrail.points.length - 1)];
      ant.x = startPoint.x;
      ant.y = startPoint.y;
      ant.angle = aDeg(startPoint.x, startPoint.y, nextPoint.x, nextPoint.y);
      ant.migrationSpawned = true;
      ant.justReleasedTimer = MIGRATION_RELEASE_IMMUNITY_MS;
    }

    if (ant.justReleasedTimer > 0) {
      ant.justReleasedTimer = Math.max(0, ant.justReleasedTimer - dt);
      if (ant.justReleasedTimer > 0) return;
    }

    if (!ant.migrationSettled) {
      var followResult = followMigrationStep(ant, dt);
      if (followResult === 'nest' || dst(ant.x, ant.y, colonyX, colonyY) < NEST_ESTABLISH_RADIUS * 0.58) {
        ant.migrationSettled = true;
        ant.enteredArena = true;
        resetAggregationTarget(ant, 0);
        dropLarva(ant);
      }
      return;
    }

    steerAntSpacing(ant);

    distHome = dst(ant.x, ant.y, colonyX, colonyY);
    settleSpeed = ant.type === 'nurse' ? SETTLE_SPEED * 0.9 : SETTLE_SPEED;

    if (ant.carryingLarva && distHome < NEST_ESTABLISH_RADIUS * 0.8) dropLarva(ant);

    ant.aggregateTimer -= dt;
    targetDist = dst(ant.x, ant.y, ant.aggregateTargetX, ant.aggregateTargetY);
    if (ant.aggregateTimer <= 0 || targetDist < 18) resetAggregationTarget(ant, distHome);

    targetDist = dst(ant.x, ant.y, ant.aggregateTargetX, ant.aggregateTargetY);
    targetAngle = aDeg(ant.x, ant.y, ant.aggregateTargetX, ant.aggregateTargetY);
    orbitAngle = aDeg(ant.x, ant.y, colonyX, colonyY) + ant.aggregateDrift * 90;

    if (Math.random() < 0.03) ant.aggregateDrift *= -1;

    if (distHome > NEST_ESTABLISH_RADIUS) {
      ant.speed = settleSpeed;
      ant.angle += aDiff(ant.angle, targetAngle) * 0.16;
      ant.angle += ant.aggregateDrift * rand(0.4, 2.1);
      stepAnt(ant, dt);
      return;
    }

    ant.speed = ant.type === 'nurse' ? NURSE_SPEED : SPEED_EXPLORE * 0.65;
    ant.angle += aDiff(ant.angle, orbitAngle) * 0.12;
    ant.angle += aDiff(ant.angle, targetAngle) * 0.08;
    ant.angle += ant.aggregateDrift * rand(0.2, 1.4);
    bugMove(ant, dt, 16);
  }

  /* Follow a deposited trail. dir=-1 → toward food (index 0); dir=+1 → toward nest (index last).
   * Two-radius model: within TRAIL_LOCK_R = on trail (full speed, lookahead target).
   *                   within TRAIL_SNAP_R = approach mode (snap hard to nearest, 75% speed).
   *                   beyond TRAIL_SNAP_R = lost (slow random search).
   * Uses 0.5 correction (vs goalMove's 0.18) so ants stay physically ON the dotted line. */
  function getTrailLanePoint(trail, idx, dir, offset) {
    var point = trail.points[idx];
    var prev = trail.points[Math.max(0, idx - 1)];
    var next = trail.points[Math.min(trail.points.length - 1, idx + 1)];
    var tangentX = next.x - prev.x;
    var tangentY = next.y - prev.y;
    var tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
    var normalX = -tangentY / tangentLen;
    var normalY = tangentX / tangentLen;

    return {
      x: point.x + normalX * offset * dir,
      y: point.y + normalY * offset * dir
    };
  }

  function followTrailStep(ant, trail, dir, moveSpeed, dt, now) {
    var nearest = -1, nearestD = Infinity;
    var lanePoint;
    for (var pi = 0; pi < trail.points.length; pi++) {
      var d = dst(ant.x, ant.y, trail.points[pi].x, trail.points[pi].y);
      if (d < nearestD) { nearestD = d; nearest = pi; }
    }
    if (nearest < 0 || nearestD > TRAIL_REACQUIRE_R) {
      ant.speed = moveSpeed * 0.5;
      bugMove(ant, dt, 22);
      return 'lost';
    }
    trail.points[nearest].t = now;
    trail.lastTouchedAt = now;
    trail.points[nearest].strength = Math.min(MAX_TRAIL_STRENGTH, (trail.points[nearest].strength || 0) + 0.4);
    /* Approach mode: detected but off-trail — hard-steer toward nearest point */
    if (nearestD > TRAIL_LOCK_R) {
      lanePoint = getTrailLanePoint(trail, nearest, dir, TRAIL_LANE_OFFSET);
      ant.speed = nearestD > TRAIL_SNAP_R ? moveSpeed * 0.9 : moveSpeed * 0.75;
      ant.angle += aDiff(ant.angle, aDeg(ant.x, ant.y, lanePoint.x, lanePoint.y)) * (nearestD > TRAIL_SNAP_R ? 0.72 : 0.55);
      stepAnt(ant, dt);
      return 'ok';
    }
    /* On-trail terminal checks */
    if (dir === -1 && nearest <= 1)                        return 'food';
    if (dir ===  1 && nearest >= trail.points.length - 2) return 'nest';
    /* On-trail: strong correction toward lookahead so ants walk the line, not around it */
    var target = Math.max(0, Math.min(trail.points.length - 1, nearest + dir * TRAIL_LOOKAHEAD));
    lanePoint = getTrailLanePoint(trail, target, dir, TRAIL_LANE_OFFSET);
    ant.speed = moveSpeed;
    ant.angle += aDiff(ant.angle, aDeg(ant.x, ant.y, lanePoint.x, lanePoint.y)) * 0.5;
    stepAnt(ant, dt);
    return 'ok';
  }

  /* ─── NURSE TICK ────────────────────────────────────────────── */
  function resetNurseToWander(ant) {
    ant.nurseState   = 'move';
    ant.nurseTimer   = rand(NURSE_MOVE_MIN, NURSE_MOVE_MAX);
    ant.trail        = null;
    ant.trailIdx     = 0;
    ant.speed        = NURSE_SPEED;
    ant.smallCounter = randInt(0, 10);
    ant.largeCounter = randInt(5, 20);
  }

  function tickNurse(ant, dt, now) {
    if (!nestEstablished) {
      tickNestEstablishingAnt(ant, dt, now);
      return;
    }

    /* ── Trail-following mission states (purposeful, no home pull) ── */
    /* steerAntSpacing intentionally skipped here — lateral repulsion would push
     * ants off the trail line; resolveAntOverlaps handles physical collision. */
    if (ant.nurseState === 'outbound') {
      if (!ant.trail) { sendNurseHome(ant); return; }
      if (!trailFresh(ant.trail, now)) {
        if (trailRetreatable(ant.trail, now) && startNurseTrailRetreat(ant)) return;
        sendNurseHome(ant);
        return;
      }
      /* No early consumed-check: nurse walks to food site and discovers it empty on arrival */
      /* Stagger departure: nurses wait their turn so they form a queue, not a swarm */
      if (ant.nurseTimer > 0) { ant.nurseTimer -= dt; ant.speed = 0; return; }
      var outResult = followTrailStep(ant, ant.trail, -1, SPEED_ON_TRAIL, dt, now);
      if (outResult === 'lost') {
        sendNurseHome(ant);
        return;
      }
      if (outResult === 'food') {
        if (activeFood && activeFood.consumed) {
          /* Arrived at empty food site — turn around individually */
          ant.nurseState = 'inbound'; ant.speed = SPEED_RETURN;
        } else {
          ant.nurseState = 'nurse_at_food';
          ant.nurseTimer = rand(NURSE_FOOD_PAUSE_MIN, NURSE_FOOD_PAUSE_MAX);
          ant.speed = 0;
          registerFoodReach(ant);
        }
      }
      return;
    }
    if (ant.nurseState === 'nurse_at_food') {
      ant.nurseTimer -= dt;
      if (ant.nurseTimer <= 0 || (activeFood && activeFood.consumed)) {
        ant.nurseState = 'inbound';
        ant.speed      = SPEED_RETURN;
      }
      return;
    }
    if (ant.nurseState === 'inbound') {
      if (ant.trail && (trailFresh(ant.trail, now) || trailRetreatable(ant.trail, now))) {
        var inbResult = followTrailStep(ant, ant.trail, 1, SPEED_RETURN, dt, now);
        /* 'nest' means we reached the trail end — detach so the direct walk-in runs this tick */
        if (inbResult === 'nest' || inbResult === 'lost') ant.trail = null;
      }
      if (!ant.trail || (!trailFresh(ant.trail, now) && !trailRetreatable(ant.trail, now))) {
        /* No trail (or just detached) — walk straight into colony with strong correction */
        ant.speed = SPEED_RETURN;
        ant.angle += aDiff(ant.angle, aDeg(ant.x, ant.y, colonyX, colonyY)) * 0.5;
        stepAnt(ant, dt);
      }
      if (dst(ant.x, ant.y, colonyX, colonyY) < NEST_R) resetNurseToWander(ant);
      return;
    }

    /* ── Wander states: home pull + nestmate repulsion ── */
    steerAntSpacing(ant);
    var distC   = dst(ant.x, ant.y, colonyX, colonyY);
    var homeDir = aDeg(ant.x, ant.y, colonyX, colonyY);
    /* Inside wander radius: gentle pull. Outside: strong pull that grows with distance */
    var pull = distC <= COLONY_WANDER_R
      ? (0.025 + (distC / COLONY_WANDER_R) * 0.08)
      : Math.min(0.75, 0.40 + (distC - COLONY_WANDER_R) / COLONY_WANDER_R * 0.30);
    ant.angle  += aDiff(ant.angle, homeDir) * pull;

    /* Repulsion from overlapping nestmates */
    for (var i = 0; i < ants.length; i++) {
      var o = ants[i];
      if (o === ant || o.type !== 'nurse') continue;
      var d = dst(ant.x, ant.y, o.x, o.y);
      var repulseR = (desiredNurseRepulsionRadius(ant) + desiredNurseRepulsionRadius(o)) * 0.5;
      if (d < repulseR && d > 0)
        ant.angle += aDiff(ant.angle, aDeg(o.x, o.y, ant.x, ant.y)) * 0.12;
    }

    ant.nurseTimer -= dt;

    if (ant.nurseState === 'move') {
      ant.speed = NURSE_SPEED;
      /* Outside wander radius: cap random turns so home pull can dominate */
      var maxWanderTurn = distC > COLONY_WANDER_R ? 8 : 35;
      bugMove(ant, dt, maxWanderTurn);
      if (ant.nurseTimer <= 0) {
        if (Math.random() < 0.65) {
          /* transition → groom */
          ant.nurseState = 'groom';
          ant.nurseTimer = rand(NURSE_GROOM_MIN, NURSE_GROOM_MAX);
          ant.groomPhase = rand(0, Math.PI * 2);
          ant.speed = 0;
        } else {
          /* transition → spin in place */
          ant.nurseState = 'turn';
          ant.nurseTimer = rand(NURSE_TURN_MIN, NURSE_TURN_MAX);
          ant.nurseTurnDir   = Math.random() < 0.5 ? 1 : -1;
          ant.nurseTurnSpeed = rand(110, 260); /* degrees per second */
          ant.speed = 0;
        }
      }

    } else if (ant.nurseState === 'groom') {
      ant.speed = 0;
      ant.groomPhase += dt * 0.004;
      /* subtle body sway while grooming */
      ant.angle += Math.sin(ant.groomPhase * 1.7) * 0.35;
      if (ant.nurseTimer <= 0) {
        ant.nurseState   = 'move';
        ant.nurseTimer   = rand(NURSE_MOVE_MIN, NURSE_MOVE_MAX);
        ant.smallCounter = randInt(0, 10);
        ant.largeCounter = randInt(5, 20);
      }

    } else if (ant.nurseState === 'turn') {
      ant.speed = 0;
      ant.angle += ant.nurseTurnDir * ant.nurseTurnSpeed * (dt / 1000);
      if (ant.nurseTimer <= 0) {
        ant.nurseState   = 'move';
        ant.nurseTimer   = rand(NURSE_MOVE_MIN, NURSE_MOVE_MAX);
        ant.smallCounter = randInt(0, 10);
        ant.largeCounter = randInt(5, 20);
      }
    }
  }

  /* ─── FORAGER STATE MACHINE ─────────────────────────────────── */
  function tickForager(ant, dt, now) {
    if (!nestEstablished) {
      tickNestEstablishingAnt(ant, dt, now);
      return;
    }

    steerAntSpacing(ant);

    if (ant.state === 'explore') {
      bugMove(ant, dt, MAX_LARGE_TURN);
      /* Personal outward heading: each ant drifts in its own away-from-colony direction,
       * reassigned every few seconds — fans them out without a shared march target */
      if (!ant.exploreDirTimer || ant.exploreDirTimer <= 0) {
        ant.exploreDir     = aDeg(colonyX, colonyY, ant.x, ant.y) + rand(-EXPLORE_DIR_SPREAD, EXPLORE_DIR_SPREAD);
        ant.exploreDirTimer = rand(4000, 9000);
      }
      ant.exploreDirTimer -= dt;
      var distNest = dst(ant.x, ant.y, colonyX, colonyY);
      var exploreFade = Math.max(0.18, 1 - Math.max(0, distNest - FOOD_MIN_DIST) / EXPLORE_DIR_FADE_DIST);
      ant.angle += aDiff(ant.angle, ant.exploreDir) * (EXPLORE_DIR_PULL * exploreFade);
      /* Contact recruitment: cross within TRAIL_SNAP_R of an active trail → join immediately */
      if (activeFood && !activeFood.consumed) {
        var contactTrail = findNearestTrail(ant.x, ant.y, now);
        if (contactTrail) {
          ant.state = 'on_trail'; ant.trail = contactTrail; ant.speed = SPEED_ON_TRAIL;
          return;
        }
      }
      if (!hasActiveFood() && distNest > FOOD_MIN_DIST && countActiveTrails(now) < MAX_ACTIVE_TRAILS) {
        var excess = distNest - FOOD_MIN_DIST;
        var norm   = Math.min(2.5, excess / FOOD_SCALE_DIST);
        var chance = FOOD_BASE_CHANCE * Math.pow(norm, FOOD_EXP_POWER) * dt;
        if (Math.random() < chance) triggerFoodFind(ant, now);
      }

    } else if (ant.state === 'found_food') {
      ant.waitTimer -= dt;
      if (ant.waitTimer <= 0) {
        var near = findNearestTrail(ant.x, ant.y, now);
        if (near) {
          ant.trail = near;
          startReturnState(ant, 'return_on_trail');
        } else {
          ant.trail = {
            points: [{ x: ant.x, y: ant.y, t: now }],
            foodX: ant.foodX,
            foodY: ant.foodY,
            lastTouchedAt: now,
            foodAvailable: true
          };
          trails.push(ant.trail);
          startReturnState(ant, 'return_new');
        }
      }

    } else if (ant.state === 'return_new') {
      if (!ant.trail) {
        startReturnState(ant, 'return_on_trail');
      }
      returnMove(ant, dt);
      depositPoint(ant.trail, ant, now);
      if (dst(ant.x, ant.y, colonyX, colonyY) < NEST_R) {
        ant.state = 'at_nest'; ant.speed = 0;
        ant.waitTimer = rand(NEST_PAUSE_MIN, NEST_PAUSE_MAX);
      }

    } else if (ant.state === 'return_on_trail') {
      if (ant.trail && (trailFresh(ant.trail, now) || trailRetreatable(ant.trail, now))) {
        var retResult = followTrailStep(ant, ant.trail, 1, SPEED_RETURN, dt, now);
        if (retResult === 'nest') {
          ant.state = 'at_nest'; ant.speed = 0;
          ant.waitTimer = rand(NEST_PAUSE_MIN, NEST_PAUSE_MAX);
          return;
        }
        if (retResult === 'lost') {
          ant.trail = null;
        }
      } else {
        returnMove(ant, dt);
      }
      if (dst(ant.x, ant.y, colonyX, colonyY) < NEST_R) {
        ant.state = 'at_nest'; ant.speed = 0;
        ant.waitTimer = rand(NEST_PAUSE_MIN, NEST_PAUSE_MAX);
      }

    } else if (ant.state === 'at_nest') {
      ant.waitTimer -= dt;
      if (ant.waitTimer <= 0) {
        var tgt = ant.trail;
        ant.trail = null;
        ant.state = 'explore';
        ant.speed = SPEED_EXPLORE;
        if (tgt && trailFresh(tgt, now) && activeFood && !activeFood.consumed) {
          /* Volatile odor: any ant within RECRUIT_VOLATILE_R of nest detects the signal */
          var recruitCount = 0;
          for (var ri = 0; ri < ants.length; ri++) {
            var a = ants[ri];
            if (dst(a.x, a.y, colonyX, colonyY) > RECRUIT_VOLATILE_R) continue;
            if (a.type === 'nurse') {
              if (a.nurseState !== 'move' && a.nurseState !== 'groom' && a.nurseState !== 'turn') continue;
              a.nurseState = 'outbound';
              a.trail      = tgt;
              a.nurseTimer = recruitCount * NURSE_DEPART_STAGGER; /* staggered departure */
              a.speed      = 0;
              recruitCount++;
            } else if (a.type === 'forager' && a.state === 'explore') {
              /* Forager near nest joins the trail column directly */
              a.state  = 'on_trail';
              a.trail  = tgt;
              a.speed  = SPEED_ON_TRAIL;
            }
          }
        }
      }

    } else if (ant.state === 'recruited') {
      ant.sweepTimer -= dt;
      bugMove(ant, dt, MAX_LARGE_RECRUITED);
      var found = findNearestTrail(ant.x, ant.y, now);
      if (found) {
        ant.state = 'on_trail'; ant.trail = found; ant.speed = SPEED_ON_TRAIL;
      } else if (ant.sweepTimer <= 0) {
        ant.state = 'explore'; ant.trail = null; ant.speed = SPEED_EXPLORE;
      }

    } else if (ant.state === 'on_trail') {
      if (!ant.trail) {
        ant.state = 'explore'; ant.speed = SPEED_EXPLORE; ant.giveUpTimer = 0; return;
      }
      if (!trailFresh(ant.trail, now)) {
        if (trailRetreatable(ant.trail, now) && startTrailRetreat(ant)) return;
        ant.state = 'explore'; ant.trail = null; ant.speed = SPEED_EXPLORE; ant.giveUpTimer = 0; return;
      }
      /* Staggered give-up: each ant has an individual timer assigned at food consumption.
       * Ants near food arrive naturally; far-away ants reverse onto the return lane in waves. */
      if (ant.giveUpTimer > 0) {
        ant.giveUpTimer -= dt;
        if (ant.giveUpTimer <= 0) {
          startTrailRetreat(ant);
          return;
        }
      }
      var onResult = followTrailStep(ant, ant.trail, -1, SPEED_ON_TRAIL, dt, now);
      if (onResult === 'food') {
        ant.foodX = ant.trail.foodX; ant.foodY = ant.trail.foodY;
        ant.giveUpTimer = 0;
        startReturnState(ant, 'return_on_trail');
        registerFoodReach(ant);
      }
    }
  }

  /* ─── DRAWING ───────────────────────────────────────────────── */
  function drawAnt(ant) {
    if (ant.spawnDelay > 0) return;

    var ar = ant.angle * D2R;
    var fx = Math.cos(ar), fy = Math.sin(ar);
    var rx = -fy, ry = fx;
    var s = ANT_R, phase = ant.legPhase;

    var isGrooming = ant.type === 'nurse' && ant.nurseState === 'groom';

    var cBase    = mixRgb([188,102,68], [82,48,38],   ant.melanin);
    var cReturn  = mixRgb([210,130,90], [100,62,48],  ant.melanin);
    var cRecruit = mixRgb([232,152,102],[130,82,62],   ant.melanin);
    var cTrail   = mixRgb([200,116,76], [92,54,42],   ant.melanin);

    var color = ant.type === 'nurse' ? '#c97a52'
      : (ant.state === 'return_new' || ant.state === 'return_on_trail' || ant.state === 'found_food') ? cReturn
      : ant.state === 'recruited' ? cRecruit
      : ant.state === 'on_trail'  ? cTrail
      : cBase;

    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 0.65;

    var bases  = [s * 0.55, -s * 0.05, -s * 0.65];
    var legLen = s * 3.8, stepAmt = s * 1.55;

    for (var li = 0; li < 3; li++) {
      var bx = ant.x + fx * bases[li], by = ant.y + fy * bases[li];
      for (var side = 0; side < 2; side++) {
        var ss  = side === 0 ? 1 : -1;
        var po  = ((li + side) % 2 === 0) ? 0 : Math.PI;
        var sw  = isGrooming ? Math.sin(ant.groomPhase + po + li) : Math.sin(phase + po);
        var lft = Math.max(0, sw);
        var lat = legLen * (1 - lft * 0.22);
        var fa  = sw * stepAmt;
        var kx  = bx + rx*(ss*lat*0.52) + fx*(fa*0.25);
        var ky  = by + ry*(ss*lat*0.52) + fy*(fa*0.25);
        var tx  = bx + rx*(ss*lat) + fx*fa;
        var ty  = by + ry*(ss*lat) + fy*fa;
        ctx.globalAlpha = lft > 0.45 ? 0.5 : 1;
        ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(kx,ky); ctx.lineTo(tx,ty); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    /* body: abdomen / thorax / head */
    ctx.beginPath(); ctx.arc(ant.x - fx*(s*2.2), ant.y - fy*(s*2.2), s*1.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ant.x, ant.y, s*0.85, 0, Math.PI*2); ctx.fill();
    var hx = ant.x + fx*(s*1.9), hy = ant.y + fy*(s*1.9);
    ctx.beginPath(); ctx.arc(hx, hy, s, 0, Math.PI*2); ctx.fill();

    /* antennae — spread wider and oscillate when grooming */
    var aFwd = s * 2;
    var aLat = isGrooming
      ? s * (2.4 + Math.sin(ant.groomPhase) * 1.1)
      : s * 1.8;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(hx+fx*aFwd+rx*aLat, hy+fy*aFwd+ry*aLat); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(hx+fx*aFwd-rx*aLat, hy+fy*aFwd-ry*aLat); ctx.stroke();

    if (!nestEstablished && ant.carryingLarva) {
      ctx.fillStyle = 'rgba(240,224,194,0.92)';
      ctx.beginPath();
      ctx.ellipse(ant.x - fx * (s * 0.15), ant.y - fy * (s * 0.15), s * 0.9, s * 0.55, ar, 0, Math.PI * 2);
      ctx.fill();
    }

    /* food droplet on returning ants and inbound nurses */
    if (ant.state === 'return_new' || ant.state === 'return_on_trail' ||
        (ant.type === 'nurse' && ant.nurseState === 'inbound')) {
      ctx.fillStyle = 'rgba(205,145,72,0.85)';
      ctx.beginPath(); ctx.arc(hx, hy, s * 0.7, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawTrails(now) {
    trails = trails.filter(function (t) {
      return t.points.length > 0 && now - (t.lastTouchedAt || t.points[t.points.length - 1].t) < TRAIL_FADE_MS;
    });
    ctx.save();
    ctx.setLineDash([2, 5]);
    for (var ti = 0; ti < trails.length; ti++) {
      var pts = trails[ti].points;
      for (var pi = 1; pi < pts.length; pi++) {
        var age       = now - pts[pi-1].t;
        var freshness = Math.max(0, 1 - age / TRAIL_FADE_MS);
        var alpha     = freshness * 0.45;
        if (alpha < 0.01) continue;
        var str = (pts[pi-1].strength || 0) / MAX_TRAIL_STRENGTH;
        ctx.lineWidth   = 0.7 + str * 2.1;
        ctx.strokeStyle = 'rgba(166,94,48,' + (alpha * (0.75 + str * 0.25)).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(pts[pi-1].x, pts[pi-1].y); ctx.lineTo(pts[pi].x, pts[pi].y); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawMigrationTrail() {
    if (nestEstablished || !migrationTrail || !migrationTrail.points.length) return;
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(188,168,132,0.22)';
    ctx.beginPath();
    ctx.moveTo(migrationTrail.points[0].x, migrationTrail.points[0].y);
    for (var i = 1; i < migrationTrail.points.length; i++) {
      ctx.lineTo(migrationTrail.points[i].x, migrationTrail.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function initLarvae() {
    larvae = [];
    for (var i = 0; i < LARVA_COUNT; i++) {
      larvae.push({
        x: colonyX + gauss() * LARVA_SIGMA_X,
        y: colonyY + gauss() * LARVA_SIGMA_Y,
        len: rand(4.2, 7.6),
        width: rand(1.6, 2.8),
        angle: rand(0, Math.PI * 2),
        phase: rand(0, Math.PI * 2),
        tone: rand(0, 1),
        active: false
      });
    }
  }

  function drawLarvae(now) {
    if (!larvae.length) return;
    ctx.save();
    for (var i = 0; i < larvae.length; i++) {
      var larva = larvae[i];
      if (!larva.active) continue;
      var wiggle = Math.sin(now * 0.004 + larva.phase);
      var x = larva.x + Math.cos(larva.phase * 0.7) * wiggle * LARVA_SQUIRM_SHIFT;
      var y = larva.y + Math.sin(larva.phase * 0.9) * wiggle * LARVA_SQUIRM_SHIFT;
      var angle = larva.angle + wiggle * 0.18;
      var fill = mixRgb([247, 232, 206], [228, 206, 170], larva.tone);

      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = fill;
      ctx.strokeStyle = 'rgba(177,139,103,0.35)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.ellipse(0, 0, larva.len, larva.width + Math.max(0, wiggle) * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
  }

  function drawFoodSources(now) {
    if (!activeFood || activeFood.consumed) return;
    ctx.beginPath(); ctx.arc(activeFood.x, activeFood.y, 3.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(200,140,70,0.7)'; ctx.fill();
  }

  /* ─── INIT ──────────────────────────────────────────────────── */
  function initCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'ant-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:0;opacity:0.7';
    canvas.width = W = window.innerWidth;
    canvas.height = H = window.innerHeight;
    document.body.insertBefore(canvas, document.body.firstChild || null);
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', function () {
      canvas.width = W = window.innerWidth;
      canvas.height = H = window.innerHeight;
    }, { passive: true });
  }

  function initColony() {
    var m = COLONY_MARGIN;
    migrationSourceSide = Math.floor(rand(0, 4));
    colonySide = (migrationSourceSide + 2) % 4;
    if      (colonySide === 0) { colonyX = rand(m*2, W-m*2);   colonyY = rand(m*0.4, m); }
    else if (colonySide === 1) { colonyX = rand(W-m, W-m*0.4); colonyY = rand(m*2, H-m*2); }
    else if (colonySide === 2) { colonyX = rand(m*2, W-m*2);   colonyY = rand(H-m, H-m*0.4); }
    else                       { colonyX = rand(m*0.4, m);     colonyY = rand(m*2, H-m*2); }
  }

  function getNestMarginSpawnPoint() {
    var halfSpread = SPAWN_MARGIN_SPREAD * 0.5;
    var minX = 24;
    var maxX = W - 24;
    var minY = 24;
    var maxY = H - 24;
    var offscreen = rand(SPAWN_OFFSCREEN_MIN, SPAWN_OFFSCREEN_MAX);

    if (colonySide === 0) {
      return {
        x: Math.max(minX, Math.min(maxX, colonyX + rand(-halfSpread, halfSpread))),
        y: -offscreen
      };
    }
    if (colonySide === 1) {
      return {
        x: W + offscreen,
        y: Math.max(minY, Math.min(maxY, colonyY + rand(-halfSpread, halfSpread)))
      };
    }
    if (colonySide === 2) {
      return {
        x: Math.max(minX, Math.min(maxX, colonyX + rand(-halfSpread, halfSpread))),
        y: H + offscreen
      };
    }
    return {
      x: -offscreen,
      y: Math.max(minY, Math.min(maxY, colonyY + rand(-halfSpread, halfSpread)))
    };
  }

  function makeAnt(type) {
    var startPoint = migrationTrail.points[0];
    var nextPoint = migrationTrail.points[Math.min(1, migrationTrail.points.length - 1)];
    var ant = {
      id:           nextAntId++,
      type:         type,
      state:        type === 'nurse' ? 'wander' : 'explore',
      x:            startPoint.x,
      y:            startPoint.y,
      angle:        aDeg(startPoint.x, startPoint.y, nextPoint.x, nextPoint.y),
      speed:        type === 'nurse' ? SETTLE_SPEED * 0.9 : SETTLE_SPEED,
      smallCounter: randInt(0, 10),
      largeCounter: randInt(0, 40),
      edgeCounter:  randInt(0, 10),
      largeTurnAng: 0,
      legPhase:     rand(0, Math.PI * 2),
      melanin:      type === 'forager' ? rand(0.2, 1) : rand(0, 0.1),
      trail:        null,
      trailIdx:     0,
      foodX:        0, foodY: 0,
      waitTimer:    0,
      sweepTimer:   0,
      spawnDelay:   0,
      entryTargetX: colonyX,
      entryTargetY: colonyY,
      enteredArena: true,
      aggregateTargetX: colonyX,
      aggregateTargetY: colonyY,
      aggregateTimer:   0,
      aggregateDrift:   Math.random() < 0.5 ? -1 : 1,
      migrationSettled: false,
      migrationSpawned: false,
      migrationIdx: 0,
      migrationOrder: 0,
      migrationWeaveAmp: rand(MIGRATION_WEAVE_AMP_MIN, MIGRATION_WEAVE_AMP_MAX),
      migrationWeaveRate: rand(MIGRATION_WEAVE_RATE_MIN, MIGRATION_WEAVE_RATE_MAX),
      migrationWeavePhase: rand(0, Math.PI * 2),
      justReleasedTimer: 0,
      carryingLarva: false,
      larvaIndex: -1,
      /* nurse-specific */
      nurseState:     'move',
      nurseTimer:     rand(200, NURSE_MOVE_MAX),
      nurseTurnDir:   Math.random() < 0.5 ? 1 : -1,
      nurseTurnSpeed: rand(110, 260),
      groomPhase:     rand(0, Math.PI * 2),
    };
    resetAggregationTarget(ant, dst(ant.x, ant.y, colonyX, colonyY));
    return ant;
  }

  function setupClickHandler() {
    document.addEventListener('click', function (e) {
      if (hasActiveFood() || raidRefractoryTimer > 0 || !nestEstablished) return;

      var now = performance.now();
      for (var i = 0; i < ants.length; i++) {
        var ant = ants[i];
        if (ant.type !== 'forager' || ant.state !== 'explore') continue;
        if (dst(ant.x, ant.y, e.clientX, e.clientY) < 14) { triggerFoodFind(ant, now); break; }
      }
    });
  }

  insectWorld.getAntStates = function () {
    var states = [];
    for (var i = 0; i < ants.length; i++) {
      var ant = ants[i];
      states.push({
        x: ant.x,
        y: ant.y,
        type: ant.type,
        state: ant.state,
        canClaimFood: canClaimFlyFood(ant)
      });
    }
    return states;
  };

  insectWorld.getColonyState = function () {
    return { x: colonyX, y: colonyY, established: nestEstablished };
  };

  function loop(now) {
    if (!lastT) lastT = now;
    var dt = Math.min(now - lastT, 100);
    lastT = now;
    if (raidRefractoryTimer > 0) raidRefractoryTimer = Math.max(0, raidRefractoryTimer - dt);
    claimPendingFlyFood(now);
    checkRaidEnd();
    ctx.clearRect(0, 0, W, H);
    drawMigrationTrail();
    drawLarvae(now);
    drawTrails(now);
    drawFoodSources(now);
    for (var i = 0; i < ants.length; i++) {
      var ant = ants[i];
      if (ant.type === 'nurse') tickNurse(ant, dt, now);
      else tickForager(ant, dt, now);
    }
    resolveAntOverlaps();
    updateNestEstablishment(dt);
    for (var di = 0; di < ants.length; di++) drawAnt(ants[di]);
    requestAnimationFrame(loop);
  }

  function init() {
    initCanvas();
    initColony();
    initMigrationTrail();
    initLarvae();
    for (var i = 0; i < NUM_NURSES; i++)   ants.push(makeAnt('nurse'));
    for (var j = 0; j < NUM_FORAGERS; j++) ants.push(makeAnt('forager'));
    assignLarvaCarriers();
    setupMigrationColumn();
    setupClickHandler();
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

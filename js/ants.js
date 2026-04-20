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
  var NUM_NURSES        = 25;
  var NUM_FORAGERS      = 15;
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
  var NEST_ESTABLISH_RADIUS = 92;
  var NEST_ESTABLISH_FRACTION = 0.8;
  var NEST_ESTABLISH_HOLD_MS = 1200;
  var SETTLE_SPEED      = 2.1;
  var SETTLE_SWARM_R    = 54;
  var SETTLE_TARGET_MIN_R = 18;
  var SETTLE_TARGET_MAX_R = 88;
  var SETTLE_TARGET_REASSIGN_MIN = 700;
  var SETTLE_TARGET_REASSIGN_MAX = 2200;

  /* Food finding — power-law probability: near-zero close to nest, high on far side of screen */
  var FOOD_MIN_DIST     = 220;    /* no food within this radius of nest */
  var FOOD_BASE_CHANCE  = 8e-6;   /* prob/ms at FOOD_SCALE_DIST beyond FOOD_MIN_DIST */
  var FOOD_SCALE_DIST   = 500;    /* normalization distance (px beyond MIN) */
  var FOOD_EXP_POWER    = 3;      /* exponent — cubic keeps probability tiny until ~400px out */
  var FOOD_CONSUME_FRACTION = 0.4;
  var RAID_REFRACTORY_MS = 12000; /* rest period between raids (ms) */
  var MAX_TRAIL_STRENGTH = 12;    /* reinforcement cap per trail point */
  var EXPLORE_DIR_SPREAD = 85;    /* ± degrees around away-from-colony when picking personal heading */
  var EXPLORE_DIR_PULL   = 0.008; /* how strongly personal heading steers (very gentle) */
  var MAX_ACTIVE_TRAILS = 2;

  var TRAIL_SPACING     = 12;
  var TRAIL_FADE_MS     = 40000;
  var TRAIL_SNAP_R      = 32;
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
  /* ─────────────────────────────────────────────────────────── */

  var canvas, ctx, W, H;
  var colonyX, colonyY, colonySide;
  var ants   = [];
  var trails = [];
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
  function mixCh(a, b, t) { return Math.round(a + (b-a) * Math.max(0, Math.min(1, t))); }
  function mixRgb(a, b, t) {
    return 'rgb(' + mixCh(a[0],b[0],t) + ',' + mixCh(a[1],b[1],t) + ',' + mixCh(a[2],b[2],t) + ')';
  }

  function nearEdge(ant) {
    var f = 0;
    if (ant.y < EDGE_RESIST) f |= NEAR_TOP; else if (ant.y > H - EDGE_RESIST) f |= NEAR_BOT;
    if (ant.x < EDGE_RESIST) f |= NEAR_L;   else if (ant.x > W - EDGE_RESIST) f |= NEAR_R;
    return f;
  }

  function trailFresh(trail, now) {
    return trail.points.length > 0 &&
      now - trail.points[trail.points.length - 1].t < TRAIL_FADE_MS;
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

  function finalizeNestEstablishment() {
    nestEstablished = true;
    nestEstablishTimer = 0;

    for (var i = 0; i < ants.length; i++) {
      var ant = ants[i];
      ant.angle = rand(0, 360);
      ant.trail = null;
      ant.foodX = 0;
      ant.foodY = 0;
      ant.waitTimer = 0;
      ant.sweepTimer = 0;
      ant.aggregateTimer = 0;

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
    for (var i = 0; i < ants.length; i++) {
      if (dst(ants[i].x, ants[i].y, colonyX, colonyY) < NEST_ESTABLISH_RADIUS) settledCount++;
    }

    if (settledCount >= getNestEstablishThreshold()) nestEstablishTimer += dt;
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
        if (ant.state === 'found_food') {
          /* Already at food site — start returning immediately */
          ant.state = 'return_on_trail'; ant.speed = SPEED_RETURN; ant.waitTimer = 0;
        } else if (ant.state === 'at_nest') {
          ant.trail = null; /* suppress re-recruitment on now-dead trail */
        }
        /* on_trail / recruited: keep walking — they reach the food end and find nothing */
        ant.foodX = 0; ant.foodY = 0;
      }
      /* nurses: keep walking to food end — they discover it's gone upon arrival */
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
      for (var j = i + 1; j < ants.length; j++) {
        var antB = ants[j];
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

  function tickNestEstablishingAnt(ant, dt) {
    if (ant.spawnDelay > 0) {
      ant.spawnDelay -= dt;
      if (ant.spawnDelay > 0) return;
    }

    steerAntSpacing(ant);

    var distHome = dst(ant.x, ant.y, colonyX, colonyY);
    var settleSpeed = ant.type === 'nurse' ? SETTLE_SPEED * 0.9 : SETTLE_SPEED;
    var targetDist;
    var targetAngle;
    var orbitAngle;

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
  function followTrailStep(ant, trail, dir, moveSpeed, dt, now) {
    var nearest = -1, nearestD = Infinity;
    for (var pi = 0; pi < trail.points.length; pi++) {
      var d = dst(ant.x, ant.y, trail.points[pi].x, trail.points[pi].y);
      if (d < nearestD) { nearestD = d; nearest = pi; }
    }
    if (nearest < 0 || nearestD > TRAIL_SNAP_R) {
      ant.speed = moveSpeed * 0.5;
      bugMove(ant, dt, 22);
      return 'lost';
    }
    trail.points[nearest].t = now;
    trail.points[nearest].strength = Math.min(MAX_TRAIL_STRENGTH, (trail.points[nearest].strength || 0) + 0.4);
    /* Approach mode: detected but off-trail — hard-steer toward nearest point */
    if (nearestD > TRAIL_LOCK_R) {
      ant.speed = moveSpeed * 0.75;
      ant.angle += aDiff(ant.angle, aDeg(ant.x, ant.y, trail.points[nearest].x, trail.points[nearest].y)) * 0.55;
      stepAnt(ant, dt);
      return 'ok';
    }
    /* On-trail terminal checks */
    if (dir === -1 && nearest <= 1)                        return 'food';
    if (dir ===  1 && nearest >= trail.points.length - 2) return 'nest';
    /* On-trail: strong correction toward lookahead so ants walk the line, not around it */
    var target = Math.max(0, Math.min(trail.points.length - 1, nearest + dir * TRAIL_LOOKAHEAD));
    ant.speed = moveSpeed;
    ant.angle += aDiff(ant.angle, aDeg(ant.x, ant.y, trail.points[target].x, trail.points[target].y)) * 0.5;
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
      tickNestEstablishingAnt(ant, dt);
      return;
    }

    /* ── Trail-following mission states (purposeful, no home pull) ── */
    /* steerAntSpacing intentionally skipped here — lateral repulsion would push
     * ants off the trail line; resolveAntOverlaps handles physical collision. */
    if (ant.nurseState === 'outbound') {
      if (!ant.trail || !trailFresh(ant.trail, now)) { resetNurseToWander(ant); return; }
      /* Stagger departure: nurses wait their turn so they form a queue, not a swarm */
      if (ant.nurseTimer > 0) { ant.nurseTimer -= dt; ant.speed = 0; return; }
      var outResult = followTrailStep(ant, ant.trail, -1, SPEED_ON_TRAIL, dt, now);
      if (outResult === 'food') {
        if (activeFood && !activeFood.consumed) {
          ant.nurseState = 'nurse_at_food';
          ant.nurseTimer = rand(NURSE_FOOD_PAUSE_MIN, NURSE_FOOD_PAUSE_MAX);
          ant.speed = 0;
          registerFoodReach(ant);
        } else {
          /* Arrived at empty food site — turn around without pausing */
          ant.nurseState = 'inbound'; ant.speed = SPEED_RETURN;
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
      if (ant.trail && trailFresh(ant.trail, now)) {
        var inbResult = followTrailStep(ant, ant.trail, 1, SPEED_RETURN, dt, now);
        /* 'nest' means we reached the trail end — detach so the direct walk-in runs this tick */
        if (inbResult === 'nest' || inbResult === 'lost') ant.trail = null;
      }
      if (!ant.trail || !trailFresh(ant.trail, now)) {
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
      tickNestEstablishingAnt(ant, dt);
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
      ant.angle += aDiff(ant.angle, ant.exploreDir) * EXPLORE_DIR_PULL;
      /* Contact recruitment: cross within TRAIL_SNAP_R of an active trail → join immediately */
      if (activeFood && !activeFood.consumed) {
        var contactTrail = findNearestTrail(ant.x, ant.y, now);
        if (contactTrail) {
          ant.state = 'on_trail'; ant.trail = contactTrail; ant.speed = SPEED_ON_TRAIL;
          return;
        }
      }
      var distNest = dst(ant.x, ant.y, colonyX, colonyY);
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
          ant.state = 'return_on_trail';
        } else {
          ant.trail = {
            points: [{ x: ant.x, y: ant.y, t: now }],
            foodX: ant.foodX,
            foodY: ant.foodY,
            foodAvailable: true
          };
          trails.push(ant.trail);
          ant.state = 'return_new';
        }
        ant.speed = SPEED_RETURN;
      }

    } else if (ant.state === 'return_new') {
      returnMove(ant, dt);
      depositPoint(ant.trail, ant, now);
      if (dst(ant.x, ant.y, colonyX, colonyY) < NEST_R) {
        ant.state = 'at_nest'; ant.speed = 0;
        ant.waitTimer = rand(NEST_PAUSE_MIN, NEST_PAUSE_MAX);
      }

    } else if (ant.state === 'return_on_trail') {
      if (ant.trail && trailFresh(ant.trail, now)) {
        var retResult = followTrailStep(ant, ant.trail, 1, SPEED_RETURN, dt, now);
        if (retResult === 'nest') {
          ant.state = 'at_nest'; ant.speed = 0;
          ant.waitTimer = rand(NEST_PAUSE_MIN, NEST_PAUSE_MAX);
          return;
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
      if (!ant.trail || !trailFresh(ant.trail, now)) {
        ant.state = 'explore'; ant.trail = null; ant.speed = SPEED_EXPLORE; return;
      }
      var onResult = followTrailStep(ant, ant.trail, -1, SPEED_ON_TRAIL, dt, now);
      if (onResult === 'food') {
        ant.foodX = ant.trail ? ant.trail.foodX : ant.x;
        ant.foodY = ant.trail ? ant.trail.foodY : ant.y;
        ant.state = 'return_on_trail'; ant.speed = SPEED_RETURN;
        if (activeFood && !activeFood.consumed) registerFoodReach(ant);
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

    /* food droplet on returning ants and inbound nurses */
    if (ant.state === 'return_new' || ant.state === 'return_on_trail' ||
        (ant.type === 'nurse' && ant.nurseState === 'inbound')) {
      ctx.fillStyle = 'rgba(205,145,72,0.85)';
      ctx.beginPath(); ctx.arc(hx, hy, s * 0.7, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawTrails(now) {
    trails = trails.filter(function (t) {
      return t.points.length > 0 && now - t.points[t.points.length-1].t < TRAIL_FADE_MS;
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

  function drawFoodSources(now) {
    if (!activeFood || activeFood.consumed) return;
    ctx.beginPath(); ctx.arc(activeFood.x, activeFood.y, 3.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(200,140,70,0.7)'; ctx.fill();
  }

  /* ─── INIT ──────────────────────────────────────────────────── */
  function initCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'ant-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:0;opacity:0.5';
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
    var side = Math.floor(rand(0, 4)), m = COLONY_MARGIN;
    colonySide = side;
    if      (side === 0) { colonyX = rand(m*2, W-m*2);   colonyY = rand(m*0.4, m); }
    else if (side === 1) { colonyX = rand(W-m, W-m*0.4); colonyY = rand(m*2, H-m*2); }
    else if (side === 2) { colonyX = rand(m*2, W-m*2);   colonyY = rand(H-m, H-m*0.4); }
    else                 { colonyX = rand(m*0.4, m);     colonyY = rand(m*2, H-m*2); }
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
    var spawn = getNestMarginSpawnPoint();
    var ant = {
      id:           nextAntId++,
      type:         type,
      state:        type === 'nurse' ? 'wander' : 'explore',
      x:            spawn.x,
      y:            spawn.y,
      angle:        rand(0, 360),
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
      spawnDelay:   rand(SPAWN_RELEASE_MIN_MS, SPAWN_RELEASE_MAX_MS),
      aggregateTargetX: colonyX,
      aggregateTargetY: colonyY,
      aggregateTimer:   0,
      aggregateDrift:   Math.random() < 0.5 ? -1 : 1,
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
    for (var i = 0; i < NUM_NURSES; i++)   ants.push(makeAnt('nurse'));
    for (var j = 0; j < NUM_FORAGERS; j++) ants.push(makeAnt('forager'));
    setupClickHandler();
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

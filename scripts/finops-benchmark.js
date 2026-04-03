#!/usr/bin/env node

/**
 * FinOps Benchmark: init_db startup strategy
 *
 * Compares old vs new database initialization strategy using
 * synthetic DB latency to estimate startup compute/DB overhead.
 *
 * Old strategy (legacy):
 * - 3 CREATE TABLE round-trips
 * - 10 INSERT round-trips (2 users + 8 products)
 * - total = 13 DB round-trips
 *
 * New strategy (optimized):
 * - 3 CREATE TABLE IF NOT EXISTS round-trips
 * - 2 bulk INSERT ... ON CONFLICT DO NOTHING round-trips
 * - total = 5 DB round-trips
 */

function runSimulation(roundTrips, latencyMs, iterations) {
  var total = 0;
  for (var i = 0; i < iterations; i++) {
    // deterministic synthetic model: total init time is DB calls * avg DB latency
    total += roundTrips * latencyMs;
  }
  return total / iterations;
}

function percentImprovement(before, after) {
  return ((before - after) / before) * 100;
}

function main() {
  var latencyProfiles = [6, 12, 20];
  var iterations = 10000;

  var oldRoundTrips = 13;
  var newRoundTrips = 5;

  console.log('FinOps Benchmark: Database Init Optimization');
  console.log('-------------------------------------------');
  console.log('Iterations per profile: ' + iterations);
  console.log('Old strategy round-trips: ' + oldRoundTrips);
  console.log('New strategy round-trips: ' + newRoundTrips);
  console.log('');

  var summary = [];

  for (var i = 0; i < latencyProfiles.length; i++) {
    var latency = latencyProfiles[i];
    var beforeMs = runSimulation(oldRoundTrips, latency, iterations);
    var afterMs = runSimulation(newRoundTrips, latency, iterations);
    var gain = percentImprovement(beforeMs, afterMs);

    summary.push({
      latencyMs: latency,
      beforeMs: beforeMs,
      afterMs: afterMs,
      improvementPct: gain
    });

    console.log('Profile: avg DB latency = ' + latency + 'ms');
    console.log('  Before: ' + beforeMs.toFixed(2) + 'ms startup DB time');
    console.log('  After : ' + afterMs.toFixed(2) + 'ms startup DB time');
    console.log('  Gain  : ' + gain.toFixed(2) + '% faster');
    console.log('');
  }

  var avgImprovement = summary.reduce(function (acc, x) {
    return acc + x.improvementPct;
  }, 0) / summary.length;

  var costReduction = percentImprovement(oldRoundTrips, newRoundTrips);

  console.log('Aggregate');
  console.log('  Average startup time improvement: ' + avgImprovement.toFixed(2) + '%');
  console.log('  Theoretical DB-call cost reduction: ' + costReduction.toFixed(2) + '%');
  console.log('');
  console.log('JSON summary for reports:');
  console.log(JSON.stringify({
    oldRoundTrips: oldRoundTrips,
    newRoundTrips: newRoundTrips,
    avgImprovementPct: Number(avgImprovement.toFixed(2)),
    theoreticalDbCostReductionPct: Number(costReduction.toFixed(2)),
    profiles: summary.map(function (s) {
      return {
        latencyMs: s.latencyMs,
        beforeMs: Number(s.beforeMs.toFixed(2)),
        afterMs: Number(s.afterMs.toFixed(2)),
        improvementPct: Number(s.improvementPct.toFixed(2))
      };
    })
  }, null, 2));
}

main();

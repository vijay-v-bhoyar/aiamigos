import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBenchmark, buildRunReport, isBenchmarkPublishable, MIN_BENCHMARK_SAMPLE, playbooks } from '../src/data/outcome-network.mjs';

const cohort = (count=10) => Array.from({length:count},(_,index)=>({value:index+1,organizationId:`org-${index%3}`}));

test('benchmark aggregation suppresses small or unreviewed cohorts', () => {
  const small=aggregateBenchmark(cohort(MIN_BENCHMARK_SAMPLE-1),{reviewStatus:'reviewed'});
  assert.equal(small.publishable,false);
  assert.match(small.suppressionReason,/At least 10/);
  const unreviewed=aggregateBenchmark(cohort(),{reviewStatus:'collecting'});
  assert.equal(unreviewed.publishable,false);
  assert.match(unreviewed.suppressionReason,/Editorial review/);
});

test('reviewed cohorts expose median and interquartile range', () => {
  const result=aggregateBenchmark(cohort(),{reviewStatus:'reviewed'});
  assert.equal(result.publishable,true);
  assert.equal(result.median,5.5);
  assert.equal(result.q1,3.25);
  assert.equal(result.q3,7.75);
  assert.equal(isBenchmarkPublishable(result),true);
});

test('benchmark aggregation suppresses single-organization and concentrated cohorts', () => {
  const single=aggregateBenchmark(Array.from({length:10},(_,index)=>({value:index+1,organizationId:'org-1'})),{reviewStatus:'reviewed'});
  assert.equal(single.publishable,false);
  assert.match(single.suppressionReason,/3 independent organizations/);
  const concentrated=aggregateBenchmark(Array.from({length:10},(_,index)=>({value:index+1,organizationId:index<6?'org-1':index<8?'org-2':'org-3'})),{reviewStatus:'reviewed'});
  assert.equal(concentrated.publishable,false);
  assert.match(concentrated.suppressionReason,/more than half/);
});

test('run reports contain counts but never copy raw project inputs', () => {
  const project={id:'project-1',track:'builders',goal:'private goal',experiments:[{output:'private output'}],evaluations:[{score:4}],outcomes:[{value:10}]};
  const report=buildRunReport(project,playbooks[0].slug);
  assert.equal(report.evaluationCount,1);
  assert.equal(report.outcomeCount,1);
  assert.equal(report.containsRawInputs,false);
  assert.doesNotMatch(JSON.stringify(report),/private goal|private output/);
});

test('seed playbooks identify themselves as protocols rather than outcomes', () => {
  assert.equal(playbooks.length,4);
  for(const playbook of playbooks){
    assert.equal(playbook.status,'reviewed-protocol');
    assert.match(playbook.sample,/no .*outcome is claimed/i);
    assert.ok(playbook.sources.length>=2);
    assert.ok(playbook.limitations.length>=2);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCollection, filterStateFromEntries, itemMatchesFilters, normalizeFilterText } from '../src/lib/collection-filter.mjs';
import { pathfinderPaths, recommendPath } from '../src/lib/pathfinder.mjs';

const records = [
  { search: 'RAG change evaluation gate', track: 'builders', difficulty: 'advanced' },
  { search: 'AI vendor scorecard', track: 'business', difficulty: 'intermediate' },
  { search: 'Learner AI disclosure', track: 'teaching', difficulty: 'beginner' },
];

test('filter text is case, punctuation, whitespace, and accent tolerant', () => {
  assert.equal(normalizeFilterText('  Évaluation—RAG  '), 'evaluation rag');
});

test('collection filters combine tokenized query and exact facets with AND semantics', () => {
  assert.deepEqual(filterCollection(records, { q: 'change RAG', track: 'builders' }), [records[0]]);
  assert.equal(itemMatchesFilters(records[0], { q: 'rag gate', track: 'business' }), false);
  assert.deepEqual(filterCollection(records, { track: 'teaching', difficulty: 'beginner' }), [records[2]]);
});

test('empty filter controls are omitted instead of forcing zero results', () => {
  assert.deepEqual(filterStateFromEntries([['q', ''], ['track', 'builders'], ['difficulty', '  ']]), { track: 'builders' });
  assert.equal(filterCollection(records, {}).length, 3);
});

test('every pathfinder area and preferred resource produces a distinct working recommendation', () => {
  for (const area of Object.keys(pathfinderPaths)) {
    for (const mode of ['tool', 'template', 'guide']) {
      const recommendation = recommendPath({ area, mode, experience: 'Some practical use' });
      assert.equal(recommendation.area, area);
      assert.equal(recommendation.primary.type, mode);
      assert.match(recommendation.primary.href, /^\//);
      assert.equal(recommendation.secondary.length, 2);
      assert.match(recommendation.ownerNote, new RegExp(`Preferred starting resource: ${mode}`));
    }
  }
});

test('experience changes the pathfinder guidance and invalid values fail safely', () => {
  const beginner = recommendPath({ area: 'builders', mode: 'tool', experience: 'Starting out' });
  const leader = recommendPath({ area: 'builders', mode: 'tool', experience: 'Building or leading' });
  assert.notEqual(beginner.note, leader.note);
  const fallback = recommendPath({ area: 'unknown', mode: 'unknown', experience: 'unknown' });
  assert.equal(fallback.area, 'business');
  assert.equal(fallback.mode, 'tool');
  assert.equal(fallback.experience, 'Starting out');
});

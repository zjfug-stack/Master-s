import assert from 'node:assert/strict';
import test from 'node:test';
import { computeLeaderboardRows } from '../lib/leaderboardEngine.ts';

const basePicks = [1, 2, 3, 4, 5, 6].map((tierNum) => ({ tierNum, golferId: `g${tierNum}` }));

test('MC uses round1 + round2 when to_par missing', () => {
  const rows = computeLeaderboardRows({
    winnerFinalScoreToPar: null,
    entries: [
      {
        id: 'e1',
        createdAt: new Date('2026-04-01T00:00:00Z'),
        tiebreakWinnerScore: -10,
        picks: basePicks
      }
    ],
    scores: [
      { golferId: 'g1', status: 'mc', toPar: null, roundToPar1: 2, roundToPar2: 3 },
      { golferId: 'g2', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null },
      { golferId: 'g3', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null },
      { golferId: 'g4', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null },
      { golferId: 'g5', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null },
      { golferId: 'g6', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null }
    ]
  });

  assert.equal(rows[0].totalToPar, 10);
  assert.equal(rows[0].isDead, false);
});

test('WD marks entry dead and rank null', () => {
  const rows = computeLeaderboardRows({
    winnerFinalScoreToPar: null,
    entries: [
      { id: 'e1', createdAt: new Date('2026-04-01T00:00:00Z'), tiebreakWinnerScore: -10, picks: basePicks }
    ],
    scores: [
      { golferId: 'g1', status: 'wd', toPar: 2, roundToPar1: null, roundToPar2: null },
      { golferId: 'g2', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null },
      { golferId: 'g3', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null },
      { golferId: 'g4', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null },
      { golferId: 'g5', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null },
      { golferId: 'g6', status: 'active', toPar: 1, roundToPar1: null, roundToPar2: null }
    ]
  });

  assert.equal(rows[0].isDead, true);
  assert.equal(rows[0].rank, null);
});

test('Tie breaker uses winner score diff then tier6', () => {
  const rows = computeLeaderboardRows({
    winnerFinalScoreToPar: -9,
    entries: [
      { id: 'e1', createdAt: new Date('2026-04-02T00:00:00Z'), tiebreakWinnerScore: -8, picks: basePicks },
      { id: 'e2', createdAt: new Date('2026-04-01T00:00:00Z'), tiebreakWinnerScore: -9, picks: basePicks }
    ],
    scores: [
      { golferId: 'g1', status: 'active', toPar: 0, roundToPar1: null, roundToPar2: null },
      { golferId: 'g2', status: 'active', toPar: 0, roundToPar1: null, roundToPar2: null },
      { golferId: 'g3', status: 'active', toPar: 0, roundToPar1: null, roundToPar2: null },
      { golferId: 'g4', status: 'active', toPar: 0, roundToPar1: null, roundToPar2: null },
      { golferId: 'g5', status: 'active', toPar: 0, roundToPar1: null, roundToPar2: null },
      { golferId: 'g6', status: 'active', toPar: 0, roundToPar1: null, roundToPar2: null }
    ]
  });

  assert.equal(rows[0].entryId, 'e2');
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[1].rank, 2);
});

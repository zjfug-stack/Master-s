export type EngineEntry = {
  id: string;
  createdAt: Date;
  tiebreakWinnerScore: number;
  picks: Array<{ tierNum: number; golferId: string }>;
};

export type EngineScore = {
  golferId: string;
  status: 'active' | 'mc' | 'wd' | 'dq' | 'ns';
  toPar: number | null;
  roundToPar1: number | null;
  roundToPar2: number | null;
};

export type ComputedLeaderboardRow = {
  entryId: string;
  isDead: boolean;
  deadReason: string | null;
  totalToPar: number;
  tier6ToPar: number;
  tier3ToPar: number;
  tier4ToPar: number;
  rank: number | null;
};

function golferScore(score: EngineScore | undefined): { value: number; dead: boolean; deadReason: string | null } {
  if (!score) return { value: 999, dead: false, deadReason: null };

  if (score.status === 'wd' || score.status === 'dq') {
    return { value: 999, dead: true, deadReason: `Golfer status ${score.status.toUpperCase()}` };
  }

  if (score.status === 'mc') {
    if (typeof score.toPar === 'number') return { value: score.toPar, dead: false, deadReason: null };
    if (typeof score.roundToPar1 === 'number' && typeof score.roundToPar2 === 'number') {
      return { value: score.roundToPar1 + score.roundToPar2, dead: false, deadReason: null };
    }
    return { value: 999, dead: false, deadReason: null };
  }

  if (score.status === 'ns') {
    return { value: 999, dead: false, deadReason: null };
  }

  return { value: typeof score.toPar === 'number' ? score.toPar : 999, dead: false, deadReason: null };
}

export function computeLeaderboardRows(input: {
  entries: EngineEntry[];
  scores: EngineScore[];
  winnerFinalScoreToPar: number | null;
}): ComputedLeaderboardRow[] {
  const scoreMap = new Map(input.scores.map((score) => [score.golferId, score]));

  const rows = input.entries.map((entry) => {
    let totalToPar = 0;
    let tier6ToPar = 999;
    let tier3ToPar = 999;
    let tier4ToPar = 999;
    let isDead = false;
    let deadReason: string | null = null;

    for (const pick of entry.picks) {
      const calc = golferScore(scoreMap.get(pick.golferId));
      totalToPar += calc.value;
      if (pick.tierNum === 6) tier6ToPar = calc.value;
      if (pick.tierNum === 3) tier3ToPar = calc.value;
      if (pick.tierNum === 4) tier4ToPar = calc.value;
      if (calc.dead) {
        isDead = true;
        deadReason = calc.deadReason;
      }
    }

    return {
      entryId: entry.id,
      createdAt: entry.createdAt,
      tiebreakWinnerScore: entry.tiebreakWinnerScore,
      isDead,
      deadReason,
      totalToPar,
      tier6ToPar,
      tier3ToPar,
      tier4ToPar,
      rank: null as number | null
    };
  });

  const nonDead = rows
    .filter((row) => !row.isDead)
    .sort((a, b) => {
      if (a.totalToPar !== b.totalToPar) return a.totalToPar - b.totalToPar;
      if (typeof input.winnerFinalScoreToPar === 'number') {
        const aDiff = Math.abs(a.tiebreakWinnerScore - input.winnerFinalScoreToPar);
        const bDiff = Math.abs(b.tiebreakWinnerScore - input.winnerFinalScoreToPar);
        if (aDiff !== bDiff) return aDiff - bDiff;
        if (a.tier6ToPar !== b.tier6ToPar) return a.tier6ToPar - b.tier6ToPar;
        if (a.tier3ToPar !== b.tier3ToPar) return a.tier3ToPar - b.tier3ToPar;
        if (a.tier4ToPar !== b.tier4ToPar) return a.tier4ToPar - b.tier4ToPar;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  nonDead.forEach((row, index) => {
    row.rank = index + 1;
  });

  const dead = rows
    .filter((row) => row.isDead)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => ({ ...row, rank: null }));

  return [...nonDead, ...dead].map((row) => ({
    entryId: row.entryId,
    isDead: row.isDead,
    deadReason: row.deadReason,
    totalToPar: row.totalToPar,
    tier6ToPar: row.tier6ToPar,
    tier3ToPar: row.tier3ToPar,
    tier4ToPar: row.tier4ToPar,
    rank: row.rank
  }));
}

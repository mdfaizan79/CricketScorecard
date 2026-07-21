function getObjectId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (typeof value.toString === 'function') return value.toString();
  return '';
}

function getPlayerName(player) {
  if (!player) return 'Unknown';
  if (typeof player === 'string') return player;
  return player.name || player.username || 'Unknown';
}

function formatOvers(overs = 0, balls = 0) {
  return `${overs}.${balls}`;
}

function totalBalls(overs = 0, balls = 0) {
  return (overs * 6) + balls;
}

function runRate(runs = 0, balls = 0) {
  if (!balls) return 0;
  return Number(((runs * 6) / balls).toFixed(2));
}

function getMaxOvers(format) {
  switch (format) {
    case 'T20':
      return 20;
    case 'ODI':
      return 50;
    case 'Test':
      return Infinity;
    default:
      return 50;
  }
}

function normalizeBall(ball, overIndex, ballIndex) {
  const extrasType = ball?.extras || '';

  return {
    runs: ball?.runs || 0,
    isWicket: Boolean(ball?.isWicket),
    isWide: extrasType === 'wide',
    isNoBall: extrasType === 'noBall',
    isBye: extrasType === 'bye',
    isLegBye: extrasType === 'legBye',
    extras: extrasType,
    description: ball?.description || '',
    over: `${overIndex}.${ballIndex + 1}`,
  };
}

function buildDismissalText(entry) {
  if (!entry?.isOut) {
    return entry?.isNotOut ? 'not out' : '';
  }

  const dismissal = (entry.dismissal || 'out').toLowerCase();
  const bowlerName = getPlayerName(entry.bowler);
  const fielderName = getPlayerName(entry.fielder);

  if (dismissal === 'bowled' && entry.bowler) {
    return `b ${bowlerName}`;
  }

  if (dismissal === 'lbw' && entry.bowler) {
    return `lbw b ${bowlerName}`;
  }

  if (dismissal === 'caught' && entry.fielder && entry.bowler) {
    return `c ${fielderName} b ${bowlerName}`;
  }

  if (dismissal === 'caught & bowled' && entry.bowler) {
    return `c & b ${bowlerName}`;
  }

  if (dismissal === 'stumped' && entry.fielder && entry.bowler) {
    return `st ${fielderName} b ${bowlerName}`;
  }

  if (dismissal === 'run out' && entry.fielder) {
    return `run out (${fielderName})`;
  }

  return dismissal.replace(/\b\w/g, (char) => char.toUpperCase());
}

function serializeBatsman(entry) {
  return {
    playerId: getObjectId(entry?.player),
    name: getPlayerName(entry?.player),
    runs: entry?.runs || 0,
    balls: entry?.balls || 0,
    fours: entry?.fours || 0,
    sixes: entry?.sixes || 0,
    strikeRate: entry?.strikeRate || 0,
    dismissal: buildDismissalText(entry),
    isOut: Boolean(entry?.isOut),
    isNotOut: Boolean(entry?.isNotOut),
  };
}

function serializeBowler(entry) {
  const ballsBowled = totalBalls(entry?.overs || 0, entry?.balls || 0);

  return {
    playerId: getObjectId(entry?.player),
    name: getPlayerName(entry?.player),
    overs: formatOvers(entry?.overs || 0, entry?.balls || 0),
    oversDisplay: formatOvers(entry?.overs || 0, entry?.balls || 0),
    maidens: entry?.maidens || 0,
    runs: entry?.runs || 0,
    wickets: entry?.wickets || 0,
    economy: entry?.economy || runRate(entry?.runs || 0, ballsBowled),
    dots: entry?.dots || 0,
    fours: entry?.fours || 0,
    sixes: entry?.sixes || 0,
  };
}

function serializeCurrentBatsmen(currentBatsmen = {}) {
  const striker = currentBatsmen?.striker;
  const nonStriker = currentBatsmen?.nonStriker;
  const list = [];

  if (striker?.player) {
    list.push({
      playerId: getObjectId(striker.player),
      name: getPlayerName(striker.player),
      runs: striker.runs || 0,
      balls: striker.balls || 0,
      fours: striker.fours || 0,
      sixes: striker.sixes || 0,
      isStriker: true,
    });
  }

  if (nonStriker?.player) {
    list.push({
      playerId: getObjectId(nonStriker.player),
      name: getPlayerName(nonStriker.player),
      runs: nonStriker.runs || 0,
      balls: nonStriker.balls || 0,
      fours: nonStriker.fours || 0,
      sixes: nonStriker.sixes || 0,
      isStriker: false,
    });
  }

  return list;
}

function serializeCurrentBowler(currentBowler = {}, bowlingScorecard = []) {
  if (!currentBowler?.player) return null;

  const playerId = getObjectId(currentBowler.player);
  const scorecardEntry = bowlingScorecard.find(
    (entry) => getObjectId(entry.player) === playerId
  );
  const runs = currentBowler.runs ?? scorecardEntry?.runs ?? 0;
  const overs = currentBowler.overs ?? scorecardEntry?.overs ?? 0;
  const balls = currentBowler.balls ?? scorecardEntry?.balls ?? 0;
  const wickets = currentBowler.wickets ?? scorecardEntry?.wickets ?? 0;
  const maidens = currentBowler.maidens ?? scorecardEntry?.maidens ?? 0;
  const ballsBowled = totalBalls(overs, balls);

  return {
    playerId,
    name: getPlayerName(currentBowler.player),
    overs: formatOvers(overs, balls),
    oversDisplay: formatOvers(overs, balls),
    maidens,
    runs,
    wickets,
    economy: scorecardEntry?.economy || runRate(runs, ballsBowled),
  };
}

function serializeOverHistory(overHistory = []) {
  return overHistory.map((balls, index) => {
    const normalizedBalls = balls.map((ball, ballIndex) => normalizeBall(ball, index, ballIndex));
    return {
      overNumber: index + 1,
      runs: normalizedBalls.reduce((sum, ball) => sum + (ball.runs || 0), 0),
      balls: normalizedBalls,
    };
  });
}

function serializeCommentary(overHistory = []) {
  const commentary = [];

  overHistory.forEach((over, overIndex) => {
    over.forEach((ball, ballIndex) => {
      const normalizedBall = normalizeBall(ball, overIndex, ballIndex);
      commentary.push({
        over: normalizedBall.over,
        text: normalizedBall.description || 'Ball recorded',
        runs: normalizedBall.runs,
        isWicket: normalizedBall.isWicket,
      });
    });
  });

  return commentary;
}

function serializeFallOfWickets(fallOfWickets = []) {
  return fallOfWickets.map((entry) => ({
    wicket: entry?.wicketNumber || 0,
    runs: entry?.runs || 0,
    overs: entry?.overs || '0.0',
    player: getPlayerName(entry?.player),
    playerId: getObjectId(entry?.player),
  }));
}

function serializeInnings(innings = {}, format = 'T20') {
  const batting = (innings.battingScorecard || []).map(serializeBatsman);
  const bowling = (innings.bowlingScorecard || []).map(serializeBowler);
  const oversBowled = totalBalls(innings.overs || 0, innings.balls || 0);
  const firstInningsTarget = innings.target || null;
  const currentRunRate = runRate(innings.runs || 0, oversBowled);
  const maxOvers = getMaxOvers(format);
  const maxOversBalls = maxOvers === Infinity ? 0 : maxOvers * 6;
  const remainingBalls = firstInningsTarget && maxOversBalls
    ? Math.max(maxOversBalls - oversBowled, 0)
    : 0;
  const requiredRunRate = firstInningsTarget && remainingBalls > 0
    ? Number(((Math.max(firstInningsTarget - (innings.runs || 0), 0) * 6) / remainingBalls).toFixed(2))
    : 0;
  const flattenedBalls = (innings.overHistory || []).flatMap((over, overIndex) =>
    over.map((ball, ballIndex) => normalizeBall(ball, overIndex, ballIndex))
  );
  const currentOverBalls = (innings.overHistory?.[innings.overHistory.length - 1] || []).map((ball, ballIndex) =>
    normalizeBall(ball, innings.overHistory.length - 1, ballIndex)
  );
  const currentBatsmen = serializeCurrentBatsmen(innings.currentBatsmen);
  const striker = currentBatsmen.find((player) => player.isStriker);
  const nonStriker = currentBatsmen.find((player) => !player.isStriker);

  return {
    battingTeam: innings.battingTeam || '',
    bowlingTeam: innings.bowlingTeam || '',
    totalRuns: innings.runs || 0,
    totalWickets: innings.wickets || 0,
    overs: formatOvers(innings.overs || 0, innings.balls || 0),
    oversDisplay: formatOvers(innings.overs || 0, innings.balls || 0),
    ballsBowled: oversBowled,
    currentRunRate,
    requiredRunRate,
    target: firstInningsTarget,
    extras: innings.extras?.total || 0,
    wides: innings.extras?.wides || 0,
    noBalls: innings.extras?.noBalls || 0,
    byes: innings.extras?.byes || 0,
    legByes: innings.extras?.legByes || 0,
    batting,
    bowling,
    battingScorecard: batting,
    bowlingScorecard: bowling,
    currentBatsmen,
    striker,
    nonStriker,
    currentBowler: serializeCurrentBowler(innings.currentBowler, innings.bowlingScorecard || []),
    recentBalls: flattenedBalls.slice(-6),
    currentOverBalls,
    overHistory: serializeOverHistory(innings.overHistory || []),
    commentary: serializeCommentary(innings.overHistory || []),
    fallOfWickets: serializeFallOfWickets(innings.fallOfWickets || []),
    partnership: striker && nonStriker
      ? {
          runs: (striker.runs || 0) + (nonStriker.runs || 0),
          balls: (striker.balls || 0) + (nonStriker.balls || 0),
        }
      : null,
    isCompleted: Boolean(innings.isCompleted),
  };
}

function serializeTeam(team = {}, currentInnings = null) {
  const battingScorecard = currentInnings?.battingTeam === team?.name
    ? currentInnings.battingScorecard || []
    : [];
  const battingMap = new Map(
    battingScorecard.map((entry) => [getObjectId(entry.player), entry])
  );

  return {
    name: team?.name || '',
    shortName: team?.shortName || '',
    players: (team?.players || []).map((entry) => {
      const playerId = getObjectId(entry.player);
      const battingEntry = battingMap.get(playerId);
      return {
        playerId,
        _id: playerId,
        name: getPlayerName(entry.player),
        role: entry.role || entry.player?.role || '',
        team: team?.name || '',
        isOut: Boolean(battingEntry?.isOut),
      };
    }),
  };
}

function serializeMatch(match) {
  if (!match) return null;

  const rawInnings = match.innings || [];
  const currentRawInningsIndex = match.currentInnings || 0;
  const currentRawInnings = rawInnings[currentRawInningsIndex] || rawInnings[0] || null;
  const teamAData = match.teams?.[0] || {};
  const teamBData = match.teams?.[1] || {};
  const teamARawInnings = rawInnings.find((entry) => entry?.battingTeam === teamAData.name) || null;
  const teamBRawInnings = rawInnings.find((entry) => entry?.battingTeam === teamBData.name) || null;
  const innings = [
    teamARawInnings ? serializeInnings(teamARawInnings, match.format) : null,
    teamBRawInnings ? serializeInnings(teamBRawInnings, match.format) : null,
  ];
  const currentInningsIndex = currentRawInnings?.battingTeam === teamBData.name ? 1 : 0;
  const currentInnings = innings[currentInningsIndex] || innings.find(Boolean) || null;
  const currentBattingInnings = rawInnings.find((entry) => entry?.battingTeam === currentRawInnings?.battingTeam) || currentRawInnings;
  const teamA = serializeTeam(teamAData, currentBattingInnings);
  const teamB = serializeTeam(teamBData, currentBattingInnings);
  const playerOfMatch = match.result?.playerOfTheMatch
    ? {
        playerId: getObjectId(match.result.playerOfTheMatch),
        name: getPlayerName(match.result.playerOfTheMatch),
      }
    : null;

  return {
    _id: getObjectId(match),
    id: getObjectId(match),
    format: match.format || '',
    status: match.status || 'upcoming',
    venue: match.venue || '',
    date: match.date || null,
    toss: match.toss || {},
    teamA,
    teamB,
    teams: [teamA, teamB],
    innings,
    currentInnings: currentInningsIndex,
    currentOverBalls: currentInnings?.currentOverBalls || [],
    result: match.result?.summary || '',
    resultMeta: match.result || {},
    playerOfMatch,
    series: match.series || null,
    createdAt: match.createdAt || null,
    updatedAt: match.updatedAt || null,
  };
}

function serializeSeries(series) {
  if (!series) return null;

  const matches = (series.matches || []).map((entry) => (
    entry?.teams ? serializeMatch(entry) : {
      _id: getObjectId(entry),
      id: getObjectId(entry),
      status: entry?.status || 'upcoming',
    }
  ));
  const completedMatches = matches.filter((match) => match.status === 'completed').length;

  return {
    _id: getObjectId(series),
    id: getObjectId(series),
    name: series.name || '',
    format: series.format || '',
    teams: series.teams || [],
    status: series.status || 'upcoming',
    startDate: series.startDate || null,
    endDate: series.endDate || null,
    totalMatches: matches.length,
    completedMatches,
    matches,
    pointsTable: series.pointsTable || [],
  };
}

function serializePlayer(player) {
  if (!player) return null;

  const battingDismissals = Math.max((player.batting?.innings || 0) - (player.batting?.notOuts || 0), 1);
  const battingAverage = player.batting?.innings
    ? Number(((player.batting?.runs || 0) / battingDismissals).toFixed(2))
    : 0;
  const battingStrikeRate = player.batting?.balls
    ? Number((((player.batting?.runs || 0) / player.batting.balls) * 100).toFixed(2))
    : 0;
  const bowlingAverage = player.bowling?.wickets
    ? Number(((player.bowling?.runs || 0) / player.bowling.wickets).toFixed(2))
    : 0;
  const bowlingEconomy = player.bowling?.balls
    ? Number((((player.bowling?.runs || 0) / player.bowling.balls) * 6).toFixed(2))
    : 0;

  return {
    _id: getObjectId(player),
    id: getObjectId(player),
    name: player.name || '',
    team: player.team || '',
    role: player.role || '',
    jerseyNumber: player.jerseyNumber ?? null,
    image: player.image || '',
    battingStats: {
      matches: player.batting?.matches || 0,
      innings: player.batting?.innings || 0,
      runs: player.batting?.runs || 0,
      balls: player.batting?.balls || 0,
      average: battingAverage,
      strikeRate: battingStrikeRate,
      fifties: player.batting?.fifties || 0,
      hundreds: player.batting?.hundreds || 0,
      highestScore: player.batting?.highScore || 0,
      fours: player.batting?.fours || 0,
      sixes: player.batting?.sixes || 0,
      notOuts: player.batting?.notOuts || 0,
    },
    bowlingStats: {
      matches: player.bowling?.matches || 0,
      innings: player.bowling?.innings || 0,
      overs: formatOvers(player.bowling?.overs || 0, player.bowling?.balls ? player.bowling.balls % 6 : 0),
      runs: player.bowling?.runs || 0,
      wickets: player.bowling?.wickets || 0,
      average: bowlingAverage,
      economy: bowlingEconomy,
      best: player.bowling?.bestFigures || '0/0',
      fiveWickets: player.bowling?.fiveWickets || 0,
    },
    recentMatches: [],
  };
}

module.exports = {
  formatOvers,
  getObjectId,
  getPlayerName,
  normalizeBall,
  serializeCurrentBowler,
  serializeInnings,
  serializeMatch,
  serializePlayer,
  serializeSeries,
  totalBalls,
};

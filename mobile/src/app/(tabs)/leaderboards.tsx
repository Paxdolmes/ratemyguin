import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PubRow } from './discover';
import { Body, Card, Chip, H1, H2, Initials, Small } from '@/components/ui';
import { usePalette } from '@/constants/theme';
import { explorerPoints, rankLeaderboard, type Stamp } from '@/domain/passport';
import { useStore } from '@/lib/store';

type Board = 'friends' | 'city' | 'pubs';

export default function Leaderboards() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { ratings, pubs, pub, people: everyone, me, friends } = useStore();
  const [board, setBoard] = useState<Board>('pubs');
  const [since] = useState(() => Date.now() - 30 * 86_400_000);
  const month = new Date().toLocaleDateString('en-GB', { month: 'long' });

  const people = useMemo(() => {
    const rows = everyone.map((person) => {
      const mine = ratings.filter((r) => r.userId === person.id);
      const before = new Set(mine.filter((r) => Date.parse(r.ratedAt) < since).map((r) => r.pubId));
      const stamps: Stamp[] = mine
        .filter((r) => Date.parse(r.ratedAt) >= since)
        .flatMap((r) => {
          const p = pub(r.pubId);
          return p ? [{ pubId: r.pubId, city: p.city, country: p.country, at: r.ratedAt, pubIndex: p.score.index, verified: r.verification !== 'none' }] : [];
        });
      return { userId: person.id, name: person.name, points: explorerPoints(stamps, before) };
    });
    const london = rows.filter((r) => ratings.some((x) => x.userId === r.userId && pub(x.pubId)?.city === 'London'));
    return rankLeaderboard(board === 'friends' ? rows.filter((r) => friends.has(r.userId) || r.userId === me?.id) : london).filter((r) => r.points > 0 || r.userId === me?.id);
  }, [ratings, pub, everyone, board, since, friends, me]);

  const topPubs = [...pubs].filter((p) => p.score.index != null).sort((a, b) => b.score.index! - a.score.index!).slice(0, 10);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 14 }}>
      <H1>Leaderboards</H1>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Top pubs" active={board === 'pubs'} onPress={() => setBoard('pubs')} />
        <Chip label="Friends" active={board === 'friends'} onPress={() => setBoard('friends')} />
        <Chip label="London explorers" active={board === 'city'} onPress={() => setBoard('city')} />
      </View>
      {board === 'pubs' ? (
        <>
          <H2>London&apos;s best Guinness, {month}</H2>
          {topPubs.map((p, i) => (
            <PubRow key={p.id} pub={p} rank={i + 1} />
          ))}
        </>
      ) : (
        <>
          <H2>{month} explorer points</H2>
          <Small>10 for a new verified pub, 15 if it&apos;s Gold Standard or better, 2 for a repeat visit.</Small>
          {people.map((r) => (
            <Card key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: r.userId === me?.id ? c.brand : c.border }}>
              <Body style={{ width: 24, fontFamily: 'Jost_600SemiBold' }}>{r.rank}</Body>
              <Initials name={r.name} size={36} />
              <Body style={{ flex: 1 }}>{r.name}</Body>
              <H2>{r.points}</H2>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

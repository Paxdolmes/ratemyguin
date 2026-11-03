import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PubRow } from './discover';
import { Trophy, Users } from 'lucide-react-native';

import { Body, Card, EmptyState, H1, H2, Initials, Segmented, Small } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { MIN_RATINGS_FOR_INDEX } from '@/domain/scores';
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

  const topPubs = [...pubs].filter((p) => p.score.index != null && p.city === 'London').sort((a, b) => b.score.index! - a.score.index!).slice(0, 20);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, padding: 20, gap: 14, paddingBottom: 40 }}>
      <H1>Rankings</H1>
      <Segmented
        options={[
          { value: 'pubs', label: 'Top pubs' },
          { value: 'friends', label: 'Friends' },
          { value: 'city', label: 'Explorers' },
        ]}
        value={board}
        onChange={setBoard}
      />
      {board === 'pubs' ? (
        <>
          <View style={{ gap: 2 }}>
            <H2>London&apos;s best Guinness</H2>
            <Small>Excellence Index, {month}. Pubs need {MIN_RATINGS_FOR_INDEX} ratings to appear.</Small>
          </View>
          {topPubs.map((p, i) => (
            <PubRow key={p.id} pub={p} rank={i + 1} />
          ))}
          {topPubs.length === 0 ? <EmptyState icon={<Trophy size={22} color={c.inkSubtle} />} title="No pubs ranked yet" body="Rankings fill up as people rate pints." /> : null}
        </>
      ) : (
        <>
          <View style={{ gap: 2 }}>
            <H2>{board === 'friends' ? 'You and your friends' : 'London explorers'}, {month}</H2>
            <Small>Points for exploring: 10 for a new verified pub, 15 if it&apos;s Gold Standard or better, 2 for a repeat visit.</Small>
          </View>
          {people.length <= 1 && board === 'friends' ? (
            <EmptyState icon={<Users size={22} color={c.inkSubtle} />} title="Your friends will show up here" body="Follow friends on ratemyguin.com to compare points each month." />
          ) : null}
          {people.length === 0 && board === 'city' ? <EmptyState icon={<Trophy size={22} color={c.inkSubtle} />} title="No explorers yet this month" body="Rate pints at new pubs to get on the board." /> : null}
          {people.map((r) => (
            <Card key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: r.userId === me?.id ? c.brand : c.border }}>
              <Body style={{ width: 24, fontFamily: Fonts.bodySemi }}>{r.rank}</Body>
              <Initials name={r.name} size={36} />
              <Body style={{ flex: 1 }} numberOfLines={1}>
                {r.userId === me?.id ? 'You' : r.name}
              </Body>
              <H2>{r.points}</H2>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

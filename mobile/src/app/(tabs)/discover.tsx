import { router } from 'expo-router';
import { List, Map as MapIcon, Search, SearchX, Sparkles, Tag } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Lockup } from '@/components/brand';
import { PubMap } from '@/components/map';
import { AwardChip, Body, Button, Chip, EmptyState, H1, H2, IndexScore, Initials, LinkRow, SearchField, Segmented, Small, tick } from '@/components/ui';
import { Fonts, Radius, usePalette } from '@/constants/theme';
import { formatDistance, formatPrice, useStore, type PubWithScore } from '@/lib/store';

type Sort = 'near' | 'best' | 'cheapest';
const ATMOS = ['Any', 'Traditional', 'Cosy', 'Lively', 'Sports'] as const;
const SCOPES = ['Near me', 'London', 'United Kingdom'] as const;
const SORTS = [
  { value: 'best', label: 'Best rated' },
  { value: 'near', label: 'Nearest' },
  { value: 'cheapest', label: 'Cheapest' },
] as const;
const TOP_SCORE = 90;
const PAGE = 30;

const nearest = (a: PubWithScore, b: PubWithScore) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);

export default function Discover() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { pubs, here, loading, error, refresh, searchPubs } = useStore();
  const [sort, setSort] = useState<Sort>('best');
  const [atmos, setAtmos] = useState<(typeof ATMOS)[number]>('Any');
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('Near me');
  const [topOnly, setTopOnly] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 1000;

  // Search every pub by name, a moment after typing stops.
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<PubWithScore[] | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let current = true;
    const t = setTimeout(() => {
      void searchPubs(q).then((r) => current && setFound(r));
    }, 250);
    return () => {
      current = false;
      clearTimeout(t);
    };
  }, [query, searchPubs]);
  const searching = query.trim().length >= 2;

  const list = useMemo(() => {
    let l: PubWithScore[] = pubs;
    if (scope === 'Near me') l = l.filter((p) => (p.distanceM ?? Infinity) <= 5000);
    else if (scope === 'London') l = l.filter((p) => p.city === 'London');
    else l = l.filter((p) => p.country === 'United Kingdom');
    if (atmos !== 'Any') l = l.filter((p) => p.atmosphere === atmos);
    if (topOnly) l = l.filter((p) => (p.score.index ?? 0) >= TOP_SCORE);
    return [...l].sort((a, b) => {
      if (sort === 'near') return nearest(a, b);
      if (sort === 'cheapest') return (a.score.medianPricePence ?? Infinity) - (b.score.medianPricePence ?? Infinity) || nearest(a, b);
      return (b.score.index ?? -1) - (a.score.index ?? -1) || nearest(a, b);
    });
  }, [pubs, sort, atmos, scope, topOnly]);

  const rated = list.filter((p) => p.score.index != null).length;
  const filtering = topOnly || atmos !== 'Any';
  const clearFilters = () => {
    setTopOnly(false);
    setAtmos('Any');
  };
  const openPub = (id: string) => router.push(`/pub/${id}`);
  const onRefresh = async () => {
    setRefreshing(true);
    await refresh().catch(() => {});
    setRefreshing(false);
  };

  const filters = (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {SCOPES.map((s) => (
          <Chip
            key={s}
            label={s}
            active={scope === s}
            onPress={() => {
              setScope(s);
              setShown(PAGE);
            }}
          />
        ))}
      </ScrollView>
      <Segmented options={SORTS} value={sort} onChange={setSort} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
        <Chip toggle label={`Top rated ${TOP_SCORE}+`} active={topOnly} onPress={() => setTopOnly(!topOnly)} />
        {ATMOS.slice(1).map((a) => (
          <Chip toggle key={a} label={a} active={atmos === a} onPress={() => setAtmos(atmos === a ? 'Any' : a)} />
        ))}
        {filtering ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={clearFilters}>
            <Small style={{ color: c.brand, fontFamily: Fonts.bodySemi, paddingHorizontal: 4 }}>Clear</Small>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );

  const title = rated === 0 && list.length > 0 ? 'Pubs to rate' : sort === 'best' ? 'Rankings' : sort === 'near' ? 'Nearest pubs' : 'Cheapest pints';
  const table = (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <H2>{title}</H2>
          <Small>
            {list.length} pubs · {rated} rated
          </Small>
        </View>
        {wide ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tick();
              setShowMap(!showMap);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.surfaceMuted, borderRadius: Radius.pill, paddingHorizontal: 13, paddingVertical: 8 }}>
            {showMap ? <List size={15} color={c.ink} /> : <MapIcon size={15} color={c.ink} />}
            <Text style={{ fontFamily: Fonts.bodySemi, fontSize: 13, color: c.ink }}>{showMap ? 'List' : 'Map'}</Text>
          </Pressable>
        )}
      </View>
      {showMap && !wide ? (
        <View style={{ marginHorizontal: -20 }}>
          <PubMap pubs={list} here={here} height={420} onPick={openPub} />
        </View>
      ) : (
        <>
          {rated === 0 && list.length > 0 ? (
            <View style={{ backgroundColor: c.stout, borderRadius: 20, padding: 18, gap: 10 }}>
              <Body style={{ color: c.cream, fontFamily: Fonts.displayBold, fontSize: 21 }}>No pints rated around here yet</Body>
              <Body style={{ color: c.cream, opacity: 0.8 }}>Rate the first Guinness and put your local at the top of the table. Pubs need 3 ratings to get an Excellence Index.</Body>
              <Button label="Rate a pint" onPress={() => router.push('/rate')} />
            </View>
          ) : null}
          {list.slice(0, shown).map((p, i) => (
            <PubRow key={p.id} pub={p} rank={sort === 'best' && p.score.index != null ? i + 1 : null} />
          ))}
          {list.length > shown ? <Button kind="secondary" label={`Show ${Math.min(PAGE, list.length - shown)} more`} onPress={() => setShown(shown + PAGE)} /> : null}
          {error ? <Body style={{ color: c.danger }}>Couldn&apos;t load pubs. Pull down to try again.</Body> : null}
          {list.length === 0 && !error ? (
            loading ? (
              <ActivityIndicator color={c.brand} style={{ marginTop: 24 }} />
            ) : (
              <EmptyState
                icon={<SearchX size={22} color={c.inkSubtle} />}
                title="No pubs match"
                body={filtering ? 'Try fewer filters.' : 'Try a wider area.'}
                action={filtering ? { label: 'Clear filters', onPress: clearFilters } : scope === 'Near me' ? { label: 'Show all of London', onPress: () => setScope('London') } : undefined}
              />
            )
          ) : null}
        </>
      )}
    </View>
  );

  const results = (
    <View style={{ gap: 10 }}>
      {found === null ? <ActivityIndicator color={c.brand} style={{ marginTop: 16 }} /> : null}
      {found?.map((p) => (
        <PubRow key={p.id} pub={p} rank={null} />
      ))}
      {found?.length === 0 ? <EmptyState icon={<Search size={22} color={c.inkSubtle} />} title={`No pubs called "${query.trim()}"`} body="Check the spelling, or try part of the name." /> : null}
    </View>
  );

  const header = (
    <View style={{ gap: 12 }}>
      <Lockup />
      <H1 style={{ marginTop: 4 }}>The best pint near you</H1>
      <SearchField
        value={query}
        onChange={(q) => {
          setQuery(q);
          if (q.trim().length < 2) setFound(null);
        }}
        placeholder="Search pubs by name"
      />
      {searching ? null : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <LinkRow label="Offers" hint="Deals near you" icon={<Tag size={18} color={c.brand} />} onPress={() => router.push('/offers')} />
          <LinkRow label="New pubs" hint="Just opened" icon={<Sparkles size={18} color={c.brand} />} onPress={() => router.push('/new')} />
        </View>
      )}
    </View>
  );

  const body = searching ? (
    results
  ) : (
    <>
      {filters}
      {table}
    </>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 28, paddingHorizontal: 32, paddingBottom: 40, gap: 18, maxWidth: 760 }} keyboardShouldPersistTaps="handled">
          {header}
          {body}
        </ScrollView>
        <View style={{ width: '45%', borderLeftWidth: 1, borderColor: c.border }}>
          <PubMap pubs={searching ? (found ?? []) : list} here={here} height="100%" onPick={openPub} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.brand} />}>
      {header}
      {body}
    </ScrollView>
  );
}

/** One pub in a list: name, where, price, award and its Excellence Index. */
export function PubRow({ pub, rank }: { pub: PubWithScore; rank: number | null }) {
  const c = usePalette();
  const facts = [pub.neighbourhood, formatDistance(pub.distanceM), pub.score.medianPricePence != null ? formatPrice(pub.score.medianPricePence) : null].filter(Boolean).join(' · ');
  const unrated = pub.score.index == null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${rank ? `Number ${rank}, ` : ''}${pub.name}, ${unrated ? 'not yet rated' : `Excellence Index ${pub.score.index}`}`}
      onPress={() => router.push(`/pub/${pub.id}`)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.surfaceMuted : c.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: c.border })}>
      <Initials name={pub.name.replace(/^The /, '')} size={44} />
      <View style={{ flex: 1, gap: 3 }}>
        <Body style={{ fontFamily: Fonts.bodySemi }} numberOfLines={1}>
          {rank ? `${rank}. ` : ''}
          {pub.name}
        </Body>
        {facts ? <Small numberOfLines={1}>{facts}</Small> : null}
        {unrated ? <Small style={{ color: c.brand }}>Not yet rated · be the first</Small> : <AwardChip tier={pub.score.award} />}
      </View>
      {unrated ? null : (
        <View style={{ alignItems: 'flex-end' }}>
          <IndexScore value={pub.score.index} />
          <Small>
            {pub.score.ratingCount} {pub.score.ratingCount === 1 ? 'pint' : 'pints'}
          </Small>
        </View>
      )}
    </Pressable>
  );
}

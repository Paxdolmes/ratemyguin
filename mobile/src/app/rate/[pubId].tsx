import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Camera, MapPin } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Chip, H1, ScorePicker, Small, Segmented } from '@/components/ui';
import { Fonts, usePalette } from '@/constants/theme';
import { SUB_SCORE_LABELS, SUB_SCORES, validateRating, type SubScore } from '@/domain/scores';
import { FEATURES, TAGS, type FeatureKey, type TagKey } from '@/domain/tags';
import { verifyVisit, type Fix } from '@/domain/trust';
import { useAccountGate } from '@/lib/auth';
import { useStore } from '@/lib/store';

type Scores = Record<SubScore | 'overall' | 'atmosphere', number>;

export default function RatePint() {
  const { pubId } = useLocalSearchParams<{ pubId: string }>();
  const c = usePalette();
  const { pub, addRating, loadPub } = useStore();
  const gate = useAccountGate();
  const [busy, setBusy] = useState(false);
  const p = pub(pubId);
  const [scores, setScores] = useState<Scores>({ overall: 8, taste: 8, temperature: 8, head: 8, texture: 8, pour: 8, atmosphere: 8 });
  const [rateAtmos, setRateAtmos] = useState(true);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [tags, setTags] = useState<TagKey[]>([]);
  const [features, setFeatures] = useState<FeatureKey[]>([]);
  const flip = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GPS-assisted verification: ask once, quietly, and show the result.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (live) setFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy ?? 999, at: new Date(pos.timestamp).toISOString() });
      } catch {
        // No location: the rating still posts, unverified.
      } finally {
        if (live) setLocating(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!p) void loadPub(pubId);
  }, [p, pubId, loadPub]);

  if (!p) return <Body>Loading…</Body>;
  const visit = verifyVisit(p, fix);
  const set = (k: keyof Scores) => (v: number) => setScores((s) => ({ ...s, [k]: v }));

  const pickPhoto = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
    const res = cam?.granted
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 5] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 5] });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  };

  const post = async () => {
    if (!gate()) return;
    const pricePence = price ? Math.round(parseFloat(price.replace(/[£,]/g, '')) * 100) : null;
    const draft = { ...scores, atmosphere: rateAtmos ? scores.atmosphere : null, pricePence };
    const invalid = validateRating(draft);
    if (invalid) return setError(invalid);
    setBusy(true);
    const res = await addRating({ pubId: p.id, ...draft, note: note.trim(), photoUri: photo, anonymous, fix, tags, features });
    setBusy(false);
    if (!res.ok) return setError(res.reason);
    router.replace(`/card/${res.rating.id}`);
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 8 }}>
        <H1>{p.name}</H1>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {visit.verified ? <BadgeCheck size={16} color={c.success} /> : <MapPin size={16} color={c.inkMuted} />}
          <Small style={{ color: visit.verified ? c.success : c.inkMuted }}>{locating ? 'Checking you are at the pub…' : visit.reason}</Small>
        </View>
        {!locating && !visit.verified ? <Small>Unverified ratings still post, but count for less in the Index.</Small> : null}
      </View>

      <Card style={{ alignItems: 'center', gap: 6 }}>
        <Small>Overall</Small>
        <Text style={{ fontFamily: Fonts.display, fontSize: 72, lineHeight: 76, color: c.ink }}>{scores.overall.toFixed(1)}</Text>
        <Small>out of 10</Small>
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <ScorePicker label="Overall score" value={scores.overall} onChange={set('overall')} />
        </View>
      </Card>

      <Card style={{ gap: 18 }}>
        {SUB_SCORES.map((k) => (
          <ScorePicker key={k} label={SUB_SCORE_LABELS[k]} value={scores[k]} onChange={set(k)} />
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Body>Rate atmosphere and service too</Body>
          <Switch value={rateAtmos} onValueChange={setRateAtmos} />
        </View>
        {rateAtmos ? <ScorePicker label="Atmosphere and service" value={scores.atmosphere} onChange={set('atmosphere')} /> : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <Body style={{ fontFamily: Fonts.bodySemi }}>Why that score?</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(TAGS) as TagKey[]).map((t) => (
            <Chip toggle key={t} label={TAGS[t].label} active={tags.includes(t)} onPress={() => setTags((xs) => flip(xs, t))} />
          ))}
        </View>
        <Body style={{ fontFamily: Fonts.bodySemi, marginTop: 6 }}>Does the pub have…</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(FEATURES) as FeatureKey[]).map((f) => (
            <Chip toggle key={f} label={FEATURES[f]} active={features.includes(f)} onPress={() => setFeatures((xs) => flip(xs, f))} />
          ))}
        </View>
        <Small>Optional. Features help others filter and never change the score.</Small>
      </Card>

      <Card style={{ gap: 12 }}>
        <Body style={{ fontFamily: 'Jost_600SemiBold' }}>Price paid</Body>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="£6.20"
          placeholderTextColor={c.inkSubtle}
          keyboardType="decimal-pad"
          style={{ fontFamily: Fonts.bodySemi, fontSize: 18, color: c.ink, backgroundColor: c.surfaceMuted, borderRadius: 12, padding: 12 }}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="How was it? (optional)"
          placeholderTextColor={c.inkSubtle}
          multiline
          maxLength={500}
          style={{ fontFamily: Fonts.body, fontSize: 15, color: c.ink, backgroundColor: c.surfaceMuted, borderRadius: 12, padding: 12, minHeight: 80 }}
        />
        <Pressable onPress={pickPhoto} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, borderRadius: 14, padding: 14 }}>
          {photo ? <Image source={{ uri: photo }} style={{ width: 48, height: 60, borderRadius: 8 }} /> : <Camera size={22} color={c.inkMuted} />}
          <Body muted>{photo ? 'Change photo' : 'Add a photo of your pint'}</Body>
        </Pressable>
        <Segmented
          options={[
            { value: 'named', label: 'Show my name' },
            { value: 'anon', label: 'Anonymous' },
          ]}
          value={anonymous ? 'anon' : 'named'}
          onChange={(v) => setAnonymous(v === 'anon')}
        />
      </Card>

      {error ? <Body style={{ color: c.danger }}>{error}</Body> : null}
      <Button label={busy ? 'Posting…' : 'Post rating'} disabled={busy} onPress={() => void post()} />
      <Small style={{ textAlign: 'center' }}>Rated {new Date().toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}. One rating a visit.</Small>
    </ScrollView>
  );
}

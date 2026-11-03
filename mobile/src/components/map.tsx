// The phone map: Apple Maps on iPhone (Google Maps on Android) through react-native-maps.
// Rated pubs get a pin showing their Index, coloured by award; unrated pubs are small dots.

import { useMemo } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Fonts, usePalette } from '@/constants/theme';
import type { PubWithScore } from '@/lib/store';

type Props = { pubs: PubWithScore[]; here: { lat: number; lng: number }; height?: number | `${number}%`; onPick: (id: string) => void };

const MAX_RATED = 80;
const MAX_UNRATED = 120;

export function PubMap({ pubs, here, height = 360, onPick }: Props) {
  const c = usePalette();
  const { rated, unrated, region } = useMemo(() => {
    const near = [...pubs].sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
    const r = near.filter((p) => p.score.index != null).slice(0, MAX_RATED);
    const u = near.filter((p) => p.score.index == null).slice(0, MAX_UNRATED);
    // Start on where you are, wide enough to take in the nearest dozen pubs.
    const ring = near.slice(0, 12);
    const span = ring.reduce((m, p) => Math.max(m, Math.abs(p.lat - here.lat), Math.abs(p.lng - here.lng) * 0.62), 0.006);
    return { rated: r, unrated: u, region: { latitude: here.lat, longitude: here.lng, latitudeDelta: Math.min(span * 2.4, 0.2), longitudeDelta: Math.min(span * 2.4, 0.2) / 0.62 } };
  }, [pubs, here.lat, here.lng]);

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: c.surfaceMuted }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        showsPointsOfInterests={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}>
        {unrated.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name} description="Not yet rated · tap to rate" onCalloutPress={() => onPick(p.id)} tracksViewChanges={false}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.inkSubtle, borderWidth: 2, borderColor: '#fff' }} />
          </Marker>
        ))}
        {rated.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} anchor={{ x: 0.5, y: 1 }} onPress={() => onPick(p.id)} tracksViewChanges={false} accessibilityLabel={`${p.name}, ${p.score.index}`}>
            <ScorePin index={p.score.index!} tier={p.score.award} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

function ScorePin({ index, tier }: { index: number; tier: PubWithScore['score']['award'] }) {
  const c = usePalette();
  const bg = tier === 'exceptional' ? c.stout : tier === 'gold' ? c.brass : tier === 'recommended' ? '#8A6516' : '#FFFFFF';
  const fg = tier === 'exceptional' ? c.brass : tier === 'gold' ? c.stout : tier === 'recommended' ? '#FFFFFF' : '#17110D';
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ backgroundColor: bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, minWidth: 34, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' }}>
        <Text style={{ fontFamily: Fonts.display, fontSize: 16, color: fg }}>{index}</Text>
      </View>
      <View style={{ width: 8, height: 8, backgroundColor: bg, transform: [{ rotate: '45deg' }], marginTop: -5 }} />
    </View>
  );
}

/** One pub on a small map. Tapping it opens walking directions in the phone's maps app. */
export function PubMiniMap({ pub }: { pub: PubWithScore }) {
  const c = usePalette();
  const directions = () =>
    void Linking.openURL(
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${pub.lat},${pub.lng}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${pub.lat},${pub.lng}&travelmode=walking`,
    );
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`Walking directions to ${pub.name}`} onPress={directions} style={{ height: 150, borderRadius: 18, overflow: 'hidden', backgroundColor: c.surfaceMuted }}>
      <MapView
        pointerEvents="none"
        style={{ flex: 1 }}
        initialRegion={{ latitude: pub.lat, longitude: pub.lng, latitudeDelta: 0.006, longitudeDelta: 0.01 }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}>
        <Marker coordinate={{ latitude: pub.lat, longitude: pub.lng }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          {pub.score.index != null ? <ScorePin index={pub.score.index} tier={pub.score.award} /> : <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.brand, borderWidth: 3, borderColor: '#fff' }} />}
        </Marker>
      </MapView>
    </Pressable>
  );
}

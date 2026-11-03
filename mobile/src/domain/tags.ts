// Pour and fault tags, and pub features, shared with the website and the database.

export const TAGS = {
  two_part_pour: { label: 'Two-part pour', good: true },
  settled: { label: 'Left to settle', good: true },
  good_head: { label: 'Proper head', good: true },
  creamy: { label: 'Creamy', good: true },
  cold: { label: 'Well chilled', good: true },
  fresh: { label: 'Fresh lines', good: true },
  clean_glass: { label: 'Clean glass', good: true },
  rushed_pour: { label: 'Rushed pour', good: false },
  flat: { label: 'Flat', good: false },
  thin_head: { label: 'Thin head', good: false },
  too_warm: { label: 'Too warm', good: false },
  too_cold: { label: 'Too cold', good: false },
  metallic: { label: 'Metallic', good: false },
  sour: { label: 'Sour', good: false },
  dirty_glass: { label: 'Dirty glass', good: false },
} as const;
export type TagKey = keyof typeof TAGS;

export const FEATURES = {
  beer_garden: 'Beer garden',
  food: 'Food',
  sport: 'Live sport',
  quiet: 'Quiet corners',
  step_free: 'Step-free',
  guinness_zero: 'Guinness 0.0',
} as const;
export type FeatureKey = keyof typeof FEATURES;

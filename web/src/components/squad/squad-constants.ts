export const POSITIONS = [
  'ALL',
  'CF',
  'SS',
  'LWF',
  'RWF',
  'AMF',
  'LMF',
  'RMF',
  'CMF',
  'DMF',
  'LB',
  'RB',
  'CB',
  'GK',
] as const;

export const CARD_TYPES = [
  { value: 'ALL', label: 'Semua Tipe Kartu' },
  { value: 'Trending', label: 'Trending (Wajib Min. 2)' },
  { value: 'Standard', label: 'Standard' },
  { value: 'Highlight', label: 'Highlight' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Show Time', label: 'Show Time' },
  { value: 'Featured', label: 'Featured' },
  { value: 'Big Time', label: 'Big Time' },
  { value: 'Legend', label: 'Legend' },
] as const;

export interface FormationSlot {
  code: string;
  label: string;
  line: 'FWD' | 'MID' | 'DEF' | 'GK';
}

export const FORMATION_SLOTS: FormationSlot[] = [
  { code: 'LWF', label: 'LWF', line: 'FWD' },
  { code: 'CF', label: 'CF', line: 'FWD' },
  { code: 'RWF', label: 'RWF', line: 'FWD' },
  { code: 'CMF1', label: 'CMF / AMF (Kiri)', line: 'MID' },
  { code: 'DMF', label: 'DMF / CMF (Tengah)', line: 'MID' },
  { code: 'CMF2', label: 'CMF / AMF (Kanan)', line: 'MID' },
  { code: 'LB', label: 'LB', line: 'DEF' },
  { code: 'CB1', label: 'CB (Kiri)', line: 'DEF' },
  { code: 'CB2', label: 'CB (Kanan)', line: 'DEF' },
  { code: 'RB', label: 'RB', line: 'DEF' },
  { code: 'GK', label: 'GK (Starter)', line: 'GK' },
];

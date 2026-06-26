export type DogMascotPose = 'stand' | 'sit' | 'ball' | 'sleep' | 'read' | 'glasses' | 'yawn';

export const DOG_MASCOT_POSES: DogMascotPose[] = [
  'stand',
  'sit',
  'ball',
  'read',
  'glasses',
  'yawn',
  'sleep',
];

export const DOG_MASCOT_BUBBLES = [
  'Wuff!',
  'Hier!',
  'Atlas?',
  'Schnüff…',
  'Los!',
  'Mmh.',
  'Pfote!',
  'Gassi?',
  'Nasen?',
  'Spürst du?',
  'Ich auch!',
  'Wau!',
  'Hmm…',
  'Da!',
  'Ja!',
  'Cool.',
  'Grün?',
  'Hopp!',
] as const;

/** Längster Blase-Text — für stabile Breite im Logo. */
export const DOG_MASCOT_BUBBLE_MEASURE = 'Spürst du?';

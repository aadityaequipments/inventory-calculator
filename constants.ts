
import { AngleData } from './types';

// Based on the first CSV file provided
export const ANGLE_WEIGHT_TABLE: AngleData[] = [
  { size: "20 x 20", thickness: 3, weightPerMeter: 0.9 },
  { size: "20 x 20", thickness: 4, weightPerMeter: 1.1 },
  { size: "25 x 25", thickness: 3, weightPerMeter: 1.1 },
  { size: "25 x 25", thickness: 4, weightPerMeter: 1.4 },
  { size: "25 x 25", thickness: 5, weightPerMeter: 1.8 },
  { size: "30 x 30", thickness: 3, weightPerMeter: 1.4 },
  { size: "30 x 30", thickness: 4, weightPerMeter: 1.8 },
  { size: "30 x 30", thickness: 5, weightPerMeter: 2.2 },
  { size: "35 x 35", thickness: 3, weightPerMeter: 1.6 },
  { size: "35 x 35", thickness: 4, weightPerMeter: 2.1 },
  { size: "35 x 35", thickness: 5, weightPerMeter: 2.6 },
  { size: "35 x 35", thickness: 6, weightPerMeter: 3.0 },
  { size: "40 x 40", thickness: 3, weightPerMeter: 1.8 },
  { size: "40 x 40", thickness: 4, weightPerMeter: 2.4 },
  { size: "40 x 40", thickness: 5, weightPerMeter: 3.0 },
  { size: "40 x 40", thickness: 6, weightPerMeter: 3.5 },
  { size: "50 x 50", thickness: 3, weightPerMeter: 2.3 },
  { size: "50 x 50", thickness: 4, weightPerMeter: 3.0 },
  { size: "50 x 50", thickness: 5, weightPerMeter: 3.8 },
  { size: "50 x 50", thickness: 6, weightPerMeter: 4.5 },
  { size: "75 x 75", thickness: 5, weightPerMeter: 5.7 },
  { size: "75 x 75", thickness: 6, weightPerMeter: 6.8 },
  { size: "75 x 75", thickness: 8, weightPerMeter: 8.9 },
  { size: "75 x 75", thickness: 10, weightPerMeter: 11.0 }
];

export const PIPE_WEIGHTS = {
  OD48: 3.3, // kg per meter (from CSV 2: 3m = 9.9kg)
  OD60: 3.87 // kg per meter (derived from Prop CSV 3: 2.5m = 9.68kg)
};

export const ROD_WEIGHTS = {
  "28mm": 1.2, // Derived: 1.8m/pcs? (CSV 5 says size 18, wt 2.16kg)
  "30mm": 1.41, // Derived: CSV 5 says size 18, wt 2.538kg
  "32mm": 1.61  // Derived: CSV 5 says size 18, wt 2.898kg
};

export const COMPONENT_WEIGHTS = {
  TOP_CUP: 0.36,    // 360 grams
  BOTTOM_CUP: 0.18, // 180 grams
  LEDGER_BLADE: 0.2,
  PROP_NUT: 1.0,
  JACK_NUT: 0.18
};

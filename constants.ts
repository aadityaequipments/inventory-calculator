
import { AngleData } from './types';

// Based on Aditya's master weight table with added 6mm options
export const ANGLE_WEIGHT_TABLE: AngleData[] = [
  { size: "20 x 20", thickness: 3, weightPerMeter: 0.9 },
  { size: "20 x 20", thickness: 4, weightPerMeter: 1.1 },
  { size: "25 x 25", thickness: 3, weightPerMeter: 1.1 },
  { size: "25 x 25", thickness: 4, weightPerMeter: 1.4 },
  { size: "25 x 25", thickness: 5, weightPerMeter: 1.8 },
  { size: "25 x 25", thickness: 6, weightPerMeter: 2.1 },
  { size: "30 x 30", thickness: 3, weightPerMeter: 1.4 },
  { size: "30 x 30", thickness: 4, weightPerMeter: 1.8 },
  { size: "30 x 30", thickness: 5, weightPerMeter: 2.2 },
  { size: "30 x 30", thickness: 6, weightPerMeter: 2.6 },
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
  OD48_32: 3.56,
  OD48_29: 3.25,
  OD60_32: 4.48, // 3.2mm for Prop Outer
  OD60_35: 4.88  // 3.5mm for 2" Coil Pipe
};

export const ROD_WEIGHTS_METER = {
  "10mm": 0.617,
  "28mm": 4.83, 
  "30mm": 5.55, 
  "32mm": 6.31  
};

export const COMPONENT_WEIGHTS = {
  TOP_CUP: 0.365, 
  BOTTOM_CUP: 0.18,
  LEDGER_BLADE: 0.175, 
  PROP_NUT: 0.55, // Updated from 1kg to 550g as per latest request
  CUP_NUT: 0.18,
  JACK_FLAT_BASE: 1.0, // 1 kg for Base Plate/U-Head/Angle
  PROP_COIL_LEN: 0.3,   // 300mm Coil Pipe
  PROP_HANDLE_LEN: 0.5  // 500mm for 10mm round handle
};

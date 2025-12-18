
export enum ProductType {
  SPAN = 'Telescopic Span',
  PLATE = 'Centering Plate',
  CUPLOCK = 'Cuplock (Vertical/Ledger)',
  PROP = 'Adjustable Prop',
  JACK = 'Base / U-Jack'
}

export interface MaterialRequirement {
  item: string;
  specification: string;
  quantity: number;
  unit: string;
  totalWeightKg: number;
}

export interface CalculationResult {
  productName: string;
  quantity: number;
  indents: MaterialRequirement[];
}

export interface AngleData {
  size: string;
  thickness: number;
  weightPerMeter: number;
}

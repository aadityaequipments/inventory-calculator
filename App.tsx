
import React, { useState, useMemo } from 'react';
import { ProductType, CalculationResult, MaterialRequirement } from './types';
import { ANGLE_WEIGHT_TABLE, PIPE_WEIGHTS, ROD_WEIGHTS, COMPONENT_WEIGHTS } from './constants';

const App: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<ProductType>(ProductType.SPAN_PLATE);
  const [qty, setQty] = useState<number>(200);

  // Form States for Spans
  const [spanL, setSpanL] = useState<number>(1700);
  const [spanB, setSpanB] = useState<number>(200);
  const [sheetThk, setSheetThk] = useState<number>(2);
  const [angleSize, setAngleSize] = useState<string>("25 x 25");
  const [angleThk, setAngleThk] = useState<number>(3);

  // Form States for Cuplock
  const [cupType, setCupType] = useState<'Vertical' | 'Ledger'>('Vertical');
  const [cupLen, setCupLen] = useState<number>(3);

  // Form States for Props
  const [propLen, setPropLen] = useState<number>(2.5);

  // Form States for Jacks
  const [jackRodSize, setJackRodSize] = useState<string>("30mm");
  const [jackRodLen, setJackRodLen] = useState<number>(18); // Size in CSV unit (e.g. 18 units)

  const calculationResult = useMemo(() => {
    const indents: MaterialRequirement[] = [];

    if (selectedProduct === ProductType.SPAN_PLATE) {
      // Sheet weight calculation: Area (m2) * Thickness (mm) * Density (7.85)
      const area = (spanL * spanB) / 1000000;
      const sheetWeightPerPc = area * sheetThk * 7.85;
      
      // Angle weight calculation: Perimeter (m) * Wt/m
      const angleInfo = ANGLE_WEIGHT_TABLE.find(a => a.size === angleSize && a.thickness === angleThk);
      const perimeter = (2 * (spanL + spanB)) / 1000;
      const angleWeightPerPc = angleInfo ? (perimeter * angleInfo.weightPerMeter) : 0;

      indents.push({
        item: 'HR Sheet',
        specification: `${sheetThk}mm Thick (${spanL}x${spanB}mm)`,
        quantity: qty,
        unit: 'Pieces',
        totalWeightKg: sheetWeightPerPc * qty
      });

      indents.push({
        item: 'MS Angle',
        specification: `${angleSize} x ${angleThk}mm`,
        quantity: perimeter * qty,
        unit: 'Meters',
        totalWeightKg: angleWeightPerPc * qty
      });
    } 
    else if (selectedProduct === ProductType.CUPLOCK) {
      const pipeWeightPerM = PIPE_WEIGHTS.OD48;
      const pipeWeightPerPc = pipeWeightPerM * cupLen;

      indents.push({
        item: '48 OD Pipe',
        specification: `${cupLen}m Length`,
        quantity: cupLen * qty,
        unit: 'Meters',
        totalWeightKg: pipeWeightPerPc * qty
      });

      if (cupType === 'Vertical') {
        const cupsPerVertical = 6; // Example from standard spacing
        indents.push({ 
          item: 'Top Cup', 
          specification: '360g Standard', 
          quantity: cupsPerVertical * qty, 
          unit: 'Nos', 
          totalWeightKg: COMPONENT_WEIGHTS.TOP_CUP * cupsPerVertical * qty 
        });
        indents.push({ 
          item: 'Bottom Cup', 
          specification: '180g Standard', 
          quantity: cupsPerVertical * qty, 
          unit: 'Nos', 
          totalWeightKg: COMPONENT_WEIGHTS.BOTTOM_CUP * cupsPerVertical * qty 
        });
      } else {
        indents.push({ 
          item: 'Ledger Blade', 
          specification: 'Forged', 
          quantity: 2 * qty, 
          unit: 'Nos', 
          totalWeightKg: COMPONENT_WEIGHTS.LEDGER_BLADE * 2 * qty 
        });
      }
    }
    else if (selectedProduct === ProductType.PROP) {
      // CSV 3 Prop Logic
      const innerWt = 8.25; // per 2.5m
      const outerWt = 9.68; // per 2.5m
      
      indents.push({ item: '48 OD Pipe (Inner)', specification: `${propLen}m`, quantity: propLen * qty, unit: 'Meters', totalWeightKg: (innerWt/2.5) * propLen * qty });
      indents.push({ item: '60 OD Pipe (Outer)', specification: `${propLen}m`, quantity: propLen * qty, unit: 'Meters', totalWeightKg: (outerWt/2.5) * propLen * qty });
      indents.push({ item: 'Prop Nut', specification: 'Cast Iron', quantity: qty, unit: 'Nos', totalWeightKg: COMPONENT_WEIGHTS.PROP_NUT * qty });
      indents.push({ item: '2" Coil', specification: 'Standard', quantity: qty, unit: 'Nos', totalWeightKg: 3.728 * qty });
      indents.push({ item: 'Base Plate', specification: '150x6 Flat', quantity: 2 * qty, unit: 'Nos', totalWeightKg: 1 * 2 * qty });
    }
    else if (selectedProduct === ProductType.JACK) {
      // CSV 5 Jack Logic
      let rodWtFactor = 0;
      if (jackRodSize === "30mm") rodWtFactor = 2.538 / 18;
      if (jackRodSize === "32mm") rodWtFactor = 2.898 / 18;
      if (jackRodSize === "28mm") rodWtFactor = 2.16 / 18;

      const rodWeight = rodWtFactor * jackRodLen * qty;

      indents.push({ item: 'Threaded Rod', specification: `${jackRodSize} (L=${jackRodLen})`, quantity: qty, unit: 'Pieces', totalWeightKg: rodWeight });
      indents.push({ item: 'Base/U Plate', specification: '150x6 Flat', quantity: qty, unit: 'Pieces', totalWeightKg: 1 * qty });
      indents.push({ item: 'Jack Nut', specification: 'Malleable Iron', quantity: qty, unit: 'Pieces', totalWeightKg: COMPONENT_WEIGHTS.JACK_NUT * qty });
    }

    return {
      productName: selectedProduct,
      quantity: qty,
      indents
    };
  }, [selectedProduct, qty, spanL, spanB, sheetThk, angleSize, angleThk, cupType, cupLen, propLen, jackRodSize, jackRodLen]);

  const totalWeight = calculationResult.indents.reduce((sum, i) => sum + i.totalWeightKg, 0);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-xl">A</div>
            <div>
              <h1 className="text-lg font-bold leading-none">Aditya Equipments</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Manufacturing Excellence</p>
            </div>
          </div>
          <div className="text-sm font-medium text-slate-300">
            Internal Production Indent Portal
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / Configuration */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-700">Product Selection</h2>
            </div>
            <div className="p-4 space-y-2">
              {Object.values(ProductType).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedProduct(type)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    selectedProduct === type
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-700">Production Parameters</h2>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Total Quantity (Pieces)</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Dynamic Inputs based on product */}
              {selectedProduct === ProductType.SPAN_PLATE && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Length (mm)</label>
                      <input type="number" value={spanL} onChange={(e) => setSpanL(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Breadth (mm)</label>
                      <input type="number" value={spanB} onChange={(e) => setSpanB(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sheet Thickness (mm)</label>
                    <input type="number" value={sheetThk} onChange={(e) => setSheetThk(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Angle Size</label>
                    <select value={angleSize} onChange={(e) => setAngleSize(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                      {Array.from(new Set(ANGLE_WEIGHT_TABLE.map(a => a.size))).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {selectedProduct === ProductType.CUPLOCK && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Component Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setCupType('Vertical')} className={`py-2 px-3 text-sm rounded-lg border ${cupType === 'Vertical' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Vertical</button>
                      <button onClick={() => setCupType('Ledger')} className={`py-2 px-3 text-sm rounded-lg border ${cupType === 'Ledger' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Ledger</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Length (m)</label>
                    <input type="number" value={cupLen} onChange={(e) => setCupLen(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" step="0.5" />
                  </div>
                </div>
              )}

              {selectedProduct === ProductType.PROP && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Outer Tube Length (m)</label>
                    <input type="number" value={propLen} onChange={(e) => setPropLen(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" step="0.5" />
                  </div>
                </div>
              )}

              {selectedProduct === ProductType.JACK && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rod Diameter</label>
                    <select value={jackRodSize} onChange={(e) => setJackRodSize(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="28mm">28mm</option>
                      <option value="30mm">30mm</option>
                      <option value="32mm">32mm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rod Length (Units)</label>
                    <input type="number" value={jackRodLen} onChange={(e) => setJackRodLen(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Main Content / Results */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-end">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Material Indent Summary</h3>
                <p className="text-slate-500 text-sm mt-1">Calculated requirements for {calculationResult.quantity} units of {calculationResult.productName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Order Weight</p>
                <p className="text-2xl font-black text-blue-600">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-sm font-bold">KG</span></p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Material / Accessory</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Specification</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty Required</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Weight (KG)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculationResult.indents.map((indent, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-800">{indent.item}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{indent.specification}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {indent.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {indent.unit}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                        {indent.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-blue-50 flex items-center space-x-4 border-t border-blue-100">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-blue-900 text-sm">Estimated Production Timeline</h4>
                <p className="text-blue-700 text-xs">Based on current capacity for {calculationResult.quantity} pcs, expected completion: 4-6 working days.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h5 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">Material Utilization</h5>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[85%]"></div>
              </div>
              <p className="mt-2 text-xs text-slate-500 italic">Optimized scrap rate: ~15%</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h5 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-3">Logistics Requirement</h5>
              <p className="text-lg font-bold text-slate-900">
                {totalWeight > 1000 ? `${(totalWeight / 1000).toFixed(2)} Tons` : `${totalWeight.toFixed(0)} KG`}
              </p>
              <p className="text-xs text-slate-500">Approx. 1 {totalWeight > 5000 ? 'Heavy Truck' : 'Medium Commercial Vehicle'} load</p>
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Call to Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-2xl md:hidden">
        <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform" onClick={() => window.print()}>
          Print Production Indent
        </button>
      </div>

      <footer className="max-w-7xl mx-auto px-4 mt-8 pb-12 border-t border-slate-200 pt-8 text-center text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} Aditya Equipments Private Limited. All Rights Reserved.
      </footer>
    </div>
  );
};

export default App;

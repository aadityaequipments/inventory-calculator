
import React, { useState, useMemo } from 'react';
import { ProductType, CalculationResult, MaterialRequirement } from './types';
import { ANGLE_WEIGHT_TABLE, COMPONENT_WEIGHTS, PIPE_WEIGHTS, ROD_WEIGHTS_METER } from './constants';

type PlateFramingType = '2L3S' | '2L4S' | '3L2S';
type DimensionUnit = 'mm' | 'feet';
type JackType = 'Base Jack' | 'U-Jack';
type PropTopType = 'Plate' | 'U-Head' | 'L-Angle';

const App: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState<ProductType>(ProductType.PLATE);
  const [qty, setQty] = useState<number>(100);

  // --- Centering Plate States ---
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>('mm');
  const [plateL, setPlateL] = useState<number>(900);
  const [plateB, setPlateB] = useState<number>(600);
  const [plateSheetThk, setPlateSheetThk] = useState<number>(2);
  const [plateAngleSize, setPlateAngleSize] = useState<string>("25 x 25");
  const [plateAngleThk, setPlateAngleThk] = useState<number>(5);
  const [plateType, setPlateType] = useState<PlateFramingType>('2L3S');

  // --- Cuplock States ---
  const [cupType, setCupType] = useState<'Vertical' | 'Ledger'>('Vertical');
  const [cupLen, setCupLen] = useState<number>(3.0);
  const [cupThk, setCupThk] = useState<number>(2.9); 

  // --- Adjustable Prop States ---
  const [propOuterLen, setPropOuterLen] = useState<number>(2.0);
  const [propInnerLen, setPropInnerLen] = useState<number>(2.0);
  const [propTopType, setPropTopType] = useState<PropTopType>('Plate');

  // --- Jack States ---
  const [jackType, setJackType] = useState<JackType>('Base Jack');
  const [jackRodSize, setJackRodSize] = useState<string>("30mm");
  const [jackRodLen, setJackRodLen] = useState<number>(18);

  const availablePlateAngleThks = useMemo(() => {
    return ANGLE_WEIGHT_TABLE
      .filter(a => a.size === plateAngleSize)
      .map(a => a.thickness)
      .sort((a, b) => a - b);
  }, [plateAngleSize]);

  const calculationResult = useMemo(() => {
    const indents: MaterialRequirement[] = [];

    if (selectedProduct === ProductType.PLATE) {
      const L_mm = dimensionUnit === 'feet' ? plateL * 304.8 : plateL;
      const B_mm = dimensionUnit === 'feet' ? plateB * 304.8 : plateB;
      const areaSqM = (L_mm * B_mm) / 1000000;
      const sheetWeightPerPc = areaSqM * plateSheetThk * 7.85;
      
      const longer = Math.max(L_mm, B_mm);
      const shorter = Math.min(L_mm, B_mm);
      
      let largeCount = 2;
      let smallCount = 3;
      let typeLabel = "Type A (2L+3S)";

      if (plateType === '2L4S') {
        largeCount = 2;
        smallCount = 4;
        typeLabel = "Type B (2L+4S)";
      } else if (plateType === '3L2S') {
        largeCount = 3;
        smallCount = 2;
        typeLabel = "Type C (3L+2S)";
      }

      const totalAngleMeters = (largeCount * longer + smallCount * shorter) / 1000;
      const angleInfo = ANGLE_WEIGHT_TABLE.find(a => a.size === plateAngleSize && a.thickness === plateAngleThk);
      const angleWeightPerPc = angleInfo ? (totalAngleMeters * angleInfo.weightPerMeter) : 0;
      const dimString = dimensionUnit === 'mm' ? `${plateL}x${plateB}mm` : `${plateL}'x${plateB}'`;

      indents.push({
        item: 'HR Sheet (Plate Body)',
        specification: `${plateSheetThk}mm Thick (${dimString})`,
        quantity: qty,
        unit: 'Pieces',
        totalWeightKg: sheetWeightPerPc * qty
      });

      indents.push({
        item: `MS Angle (${typeLabel})`,
        specification: `${plateAngleSize} x ${plateAngleThk}mm`,
        quantity: totalAngleMeters * qty,
        unit: 'Meters',
        totalWeightKg: angleWeightPerPc * qty
      });
    }
    else if (selectedProduct === ProductType.SPAN) {
      const spanMaterialList = [
        { item: 'HR Sheet', spec: 'Main Body Sheet', wt: 15.34 },
        { item: '10mm MS Round Rod', spec: 'Lattice Support', wt: 8.40 },
        { item: 'T-Angle', spec: 'Spine Member', wt: 7.75 },
        { item: 'MS Flat 65x5 (Patti)', spec: 'Support Strip', wt: 4.80 },
        { item: 'MS Flat 40x5 (Patti)', spec: 'Outer Strip', wt: 2.00 },
        { item: '75x5 MS Angle', spec: 'End Base Angles', wt: 1.92 }
      ];
      spanMaterialList.forEach(mat => {
        indents.push({
          item: mat.item,
          specification: mat.spec,
          quantity: qty,
          unit: 'Pieces',
          totalWeightKg: mat.wt * qty
        });
      });
    }
    else if (selectedProduct === ProductType.CUPLOCK) {
      const pipeWeightPerM = cupThk === 3.2 ? PIPE_WEIGHTS.OD48_32 : PIPE_WEIGHTS.OD48_29;
      
      if (cupType === 'Vertical') {
        const cupsPerVertical = Math.round(cupLen / 0.5);
        const totalTopCups = cupsPerVertical * qty;
        const totalBottomCups = cupsPerVertical * qty;
        const totalPipeMeters = cupLen * qty;

        indents.push({ 
          item: `48.3 OD MS Pipe (${cupThk}mm)`, 
          specification: `${cupLen}m Standard Length`, 
          quantity: totalPipeMeters, 
          unit: 'Meters', 
          totalWeightKg: totalPipeMeters * pipeWeightPerM 
        });
        indents.push({ 
          item: 'Top Cup (Forged)', 
          specification: `${cupsPerVertical} Cups/Pc (365g)`, 
          quantity: totalTopCups, 
          unit: 'Nos', 
          totalWeightKg: totalTopCups * COMPONENT_WEIGHTS.TOP_CUP 
        });
        indents.push({ 
          item: 'Bottom Cup (Pressed)', 
          specification: `${cupsPerVertical} Cups/Pc (180g)`, 
          quantity: totalBottomCups, 
          unit: 'Nos', 
          totalWeightKg: totalBottomCups * COMPONENT_WEIGHTS.BOTTOM_CUP 
        });
      } else {
        const ledgerLengthMm = cupLen * 1000;
        const pipeCutLengthMm = ledgerLengthMm - 60; 
        const pipeCutLengthMeters = pipeCutLengthMm / 1000;
        const totalPipeMeters = pipeCutLengthMeters * qty;
        const totalBlades = 2 * qty;

        indents.push({ 
          item: `48.3 OD MS Pipe (${cupThk}mm)`, 
          specification: `Cut Length: ${pipeCutLengthMm}mm (for ${ledgerLengthMm}mm Ledger/Laser)`, 
          quantity: totalPipeMeters, 
          unit: 'Meters', 
          totalWeightKg: totalPipeMeters * pipeWeightPerM 
        });
        indents.push({ 
          item: 'Ledger Blade (Laser Blade)', 
          specification: '2 Pcs/Pc (175g each)', 
          quantity: totalBlades, 
          unit: 'Nos', 
          totalWeightKg: totalBlades * COMPONENT_WEIGHTS.LEDGER_BLADE 
        });
      }
    }
    else if (selectedProduct === ProductType.PROP) {
      // Outer logic: 60 OD 3.2mm pipe with 300mm coil deduction
      const outerPipeCutLen = propOuterLen - COMPONENT_WEIGHTS.PROP_COIL_LEN;
      const totalOuterPipeM = outerPipeCutLen * qty;
      const totalCoilPipeM = COMPONENT_WEIGHTS.PROP_COIL_LEN * qty;
      
      // Inner logic: Full length of 48 OD 2.9mm pipe
      const totalInnerPipeM = propInnerLen * qty;

      // Handle logic: 10mm round item, 500mm length
      const totalHandleMeters = COMPONENT_WEIGHTS.PROP_HANDLE_LEN * qty;
      const handleWeightPerPc = COMPONENT_WEIGHTS.PROP_HANDLE_LEN * ROD_WEIGHTS_METER["10mm"];

      indents.push({ 
        item: '60 OD MS Pipe (Outer)', 
        specification: `3.2mm Wall (${outerPipeCutLen}m cut length)`, 
        quantity: totalOuterPipeM, 
        unit: 'Meters', 
        totalWeightKg: totalOuterPipeM * PIPE_WEIGHTS.OD60_32 
      });

      indents.push({ 
        item: '2-inch Coil Pipe', 
        specification: `60 OD x 3.5mm (300mm length)`, 
        quantity: totalCoilPipeM, 
        unit: 'Meters', 
        totalWeightKg: totalCoilPipeM * PIPE_WEIGHTS.OD60_35 
      });

      indents.push({ 
        item: '48 OD MS Pipe (Inner)', 
        specification: `2.9mm Wall (${propInnerLen}m full length)`, 
        quantity: totalInnerPipeM, 
        unit: 'Meters', 
        totalWeightKg: totalInnerPipeM * PIPE_WEIGHTS.OD48_29 
      });

      indents.push({ 
        item: '10mm Round Handle / Pin', 
        specification: `500mm length (${(handleWeightPerPc * 1000).toFixed(0)}g)`, 
        quantity: totalHandleMeters, 
        unit: 'Meters', 
        totalWeightKg: handleWeightPerPc * qty 
      });

      indents.push({ 
        item: 'Prop Nut', 
        specification: 'Standard (550g)', 
        quantity: qty, 
        unit: 'Nos', 
        totalWeightKg: COMPONENT_WEIGHTS.PROP_NUT * qty 
      });

      indents.push({ 
        item: 'Base Plate (Outer)', 
        specification: '150x6 Flat (1 kg)', 
        quantity: qty, 
        unit: 'Nos', 
        totalWeightKg: COMPONENT_WEIGHTS.JACK_FLAT_BASE * qty 
      });

      indents.push({ 
        item: propTopType === 'Plate' ? 'Base Plate (Inner)' : propTopType === 'U-Head' ? 'U-Head (Inner)' : 'L-Angle (Inner)', 
        specification: `${propTopType === 'Plate' ? '150x6' : propTopType === 'U-Head' ? '100x6' : 'Custom Angle'} (1 kg)`, 
        quantity: qty, 
        unit: 'Nos', 
        totalWeightKg: COMPONENT_WEIGHTS.JACK_FLAT_BASE * qty 
      });
    }
    else if (selectedProduct === ProductType.JACK) {
      const rodWtPerMeter = ROD_WEIGHTS_METER[jackRodSize as keyof typeof ROD_WEIGHTS_METER] || 5.55;
      const rodLenMeters = (jackRodLen * 25.4) / 1000; 
      const totalRodWeight = rodWtPerMeter * rodLenMeters * qty;

      indents.push({ 
        item: 'Threaded Solid Rod', 
        specification: `${jackRodSize} (L=${jackRodLen}")`, 
        quantity: qty, 
        unit: 'Pieces', 
        totalWeightKg: totalRodWeight 
      });
      
      indents.push({ 
        item: jackType === 'Base Jack' ? 'Base Plate (150x6 Flat)' : 'U-Plate (100x6 Flat)', 
        specification: '1 kg per piece', 
        quantity: qty, 
        unit: 'Pieces', 
        totalWeightKg: COMPONENT_WEIGHTS.JACK_FLAT_BASE * qty 
      });

      indents.push({ 
        item: 'Cup Nut', 
        specification: 'Standard (180g)', 
        quantity: qty, 
        unit: 'Pieces', 
        totalWeightKg: COMPONENT_WEIGHTS.CUP_NUT * qty 
      });
    }

    return {
      productName: selectedProduct,
      quantity: qty,
      indents
    };
  }, [selectedProduct, qty, plateL, plateB, plateSheetThk, plateAngleSize, plateAngleThk, plateType, dimensionUnit, cupType, cupLen, cupThk, propOuterLen, propInnerLen, propTopType, jackRodSize, jackRodLen, jackType]);

  const totalWeight = calculationResult.indents.reduce((sum, i) => sum + i.totalWeightKg, 0);

  return (
    <div className="min-h-screen pb-12 bg-[#F8FAFC] font-sans text-slate-900">
      <header className="bg-slate-950 text-white shadow-2xl sticky top-0 z-50 border-b border-blue-500/40 print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center font-black text-3xl shadow-xl shadow-blue-500/20 rotate-3">A</div>
            <div>
              <h1 className="text-2xl font-black leading-none tracking-tight uppercase">ADITYA EQUIPMENTS</h1>
              <div className="flex items-center gap-2 mt-1.5">
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                 <p className="text-[10px] text-blue-300 uppercase tracking-[0.3em] font-black italic">Manufacturing Indent Portal</p>
              </div>
            </div>
          </div>
          <button onClick={() => window.print()} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
             Print Indent
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8 print:hidden">
          <section className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <h2 className="font-black text-slate-900 text-[11px] uppercase tracking-widest">01. Material Selection</h2>
            </div>
            <div className="p-4 space-y-2">
              {Object.values(ProductType).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedProduct(type)}
                  className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all duration-300 relative group ${
                    selectedProduct === type
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xl'
                      : 'border-slate-50 hover:border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm font-black uppercase tracking-tight">{type}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <h2 className="font-black text-slate-900 text-[11px] uppercase tracking-widest">02. Dimension & Specs</h2>
            </div>
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Production Quantity</label>
                <div className="relative">
                   <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full pl-6 pr-16 py-4 border-2 border-slate-100 rounded-2xl focus:border-blue-500 bg-slate-50 outline-none transition-all font-black text-2xl text-slate-800"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black uppercase">PCS</span>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
                {selectedProduct === ProductType.CUPLOCK && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Category</label>
                      <div className="flex bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => { setCupType('Vertical'); setCupLen(3.0); }} className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${cupType === 'Vertical' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>VERTICAL (STD)</button>
                        <button onClick={() => { setCupType('Ledger'); setCupLen(1.2); }} className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${cupType === 'Ledger' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>LEDGER (LASER)</button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipe Wall Thickness</label>
                      <div className="flex bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setCupThk(2.9)} className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${cupThk === 2.9 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>2.9 MM (STD)</button>
                        <button onClick={() => setCupThk(3.2)} className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${cupThk === 3.2 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>3.2 MM (CLASS B)</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standard Length (Meters)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {cupType === 'Vertical' ? (
                          [0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map(len => (
                            <button key={len} onClick={() => setCupLen(len)} className={`py-3 rounded-xl border-2 text-[11px] font-black transition-all ${cupLen === len ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>{len}m</button>
                          ))
                        ) : (
                          [0.6, 0.9, 1.0, 1.2, 1.5, 1.8].map(len => (
                            <button key={len} onClick={() => setCupLen(len)} className={`py-3 rounded-xl border-2 text-[11px] font-black transition-all ${cupLen === len ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>{len}m</button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedProduct === ProductType.PROP && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Outer Pipe (M)</label>
                        <input type="number" step="0.1" value={propOuterLen} onChange={(e) => setPropOuterLen(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inner Pipe (M)</label>
                        <input type="number" step="0.1" value={propInnerLen} onChange={(e) => setPropInnerLen(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Attachment</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Plate', 'U-Head', 'L-Angle'].map(type => (
                          <button key={type} onClick={() => setPropTopType(type as PropTopType)} className={`py-3 text-[9px] font-black rounded-xl border-2 transition-all ${propTopType === type ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>{type.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedProduct === ProductType.JACK && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jack Type</label>
                      <div className="flex bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setJackType('Base Jack')} className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${jackType === 'Base Jack' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>BASE JACK</button>
                        <button onClick={() => setJackType('U-Jack')} className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${jackType === 'U-Jack' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>U-JACK</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solid Rod Diameter</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["28mm", "30mm", "32mm"].map(size => (
                          <button key={size} onClick={() => setJackRodSize(size)} className={`py-3 rounded-xl border-2 text-[11px] font-black transition-all ${jackRodSize === size ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>{size}</button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rod Length (Inches)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[12, 18, 24].map(len => (
                          <button key={len} onClick={() => setJackRodLen(len)} className={`py-3 rounded-xl border-2 text-[11px] font-black transition-all ${jackRodLen === len ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>{len}"</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedProduct === ProductType.PLATE && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type of Centering Plate</label>
                      <div className="grid grid-cols-1 gap-3">
                        <button onClick={() => setPlateType('2L3S')} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${plateType === '2L3S' ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                          <div className="w-16 h-12 bg-white border border-slate-300 relative rounded shadow-sm overflow-hidden flex-shrink-0">
                            <div className="absolute inset-0 border-2 border-slate-400"></div>
                            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-400 -translate-x-1/2"></div>
                          </div>
                          <div className="text-left">
                            <p className="text-[11px] font-black text-slate-900 uppercase">TYPE A (2 LARGE + 3 SMALL)</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Standard Stiffener</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-8">
           <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200/50 flex flex-col min-h-full overflow-hidden">
              <div className="p-10 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                   <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-full mb-3 border border-blue-200">Production Verified Indent</span>
                   <h3 className="text-4xl font-black text-slate-950 tracking-tighter leading-none mb-2 uppercase">
                    {selectedProduct === ProductType.CUPLOCK ? `CUPLOCK ${cupType === 'Ledger' ? 'LEDGER' : 'VERTICAL'}` : 
                     selectedProduct === ProductType.JACK ? jackType.toUpperCase() :
                     selectedProduct === ProductType.PROP ? `PROP (${propOuterLen}x${propInnerLen})` :
                     calculationResult.productName}
                   </h3>
                   <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Batch Quantity: <span className="text-slate-900 font-black decoration-blue-500 underline underline-offset-4 decoration-2">{calculationResult.quantity.toLocaleString()} UNITS</span></p>
                </div>
                <div className="bg-slate-950 p-8 rounded-[2.5rem] text-right min-w-[320px] shadow-2xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Total Material Weight</p>
                  <div className="flex items-baseline justify-end gap-2">
                    <span className="text-6xl font-black text-white tabular-nums">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    <span className="text-2xl font-black text-blue-500 italic uppercase">KG</span>
                  </div>
                </div>
              </div>

              <div className="flex-grow overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Indent Component</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Specification</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Batch Qty</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Net Weight (KG)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculationResult.indents.map((indent, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-10 py-8">
                          <div className="font-black text-slate-800 text-sm uppercase tracking-tight">{indent.item}</div>
                        </td>
                        <td className="px-10 py-8">
                          <span className="text-[10px] font-black text-slate-500 px-3 py-1.5 bg-white rounded-lg border border-slate-200 uppercase shadow-sm">
                            {indent.specification}
                          </span>
                        </td>
                        <td className="px-10 py-8">
                          <div className="text-sm font-black text-slate-950">
                            {indent.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-slate-400 font-bold ml-1 text-xs uppercase">{indent.unit}</span>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="text-2xl font-black text-slate-950 tabular-nums">
                            {indent.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-10 bg-slate-950 border-t border-slate-800 flex items-center justify-between rounded-b-[3rem]">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl rotate-3">
                       <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-widest">Production Logic Synchronized</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic">Aditya Equipments Unit I Production Guidelines</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;

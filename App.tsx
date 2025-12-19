import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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

  // Sync angle thickness if current selection becomes invalid
  useMemo(() => {
    if (!availablePlateAngleThks.includes(plateAngleThk)) {
      setPlateAngleThk(availablePlateAngleThks[0] || 5);
    }
  }, [availablePlateAngleThks]);

  const calculationResult = useMemo(() => {
    const indents: MaterialRequirement[] = [];

    if (selectedProduct === ProductType.PLATE) {
      const L_mm = dimensionUnit === 'feet' ? plateL * 304.8 : plateL;
      const B_mm = dimensionUnit === 'feet' ? plateB * 304.8 : plateB;
      const areaSqM = (L_mm * B_mm) / 1000000;
      const sheetWeightPerPc = areaSqM * plateSheetThk * 7.85;
      const longer = Math.max(L_mm, B_mm);
      const shorter = Math.min(L_mm, B_mm);
      let largeCount = 2, smallCount = 3, typeLabel = "Type A (2L+3S)";
      if (plateType === '2L4S') { largeCount = 2; smallCount = 4; typeLabel = "Type B (2L+4S)"; }
      else if (plateType === '3L2S') { largeCount = 3; smallCount = 2; typeLabel = "Type C (3L+2S)"; }
      const totalAngleMeters = (largeCount * longer + smallCount * shorter) / 1000;
      const angleInfo = ANGLE_WEIGHT_TABLE.find(a => a.size === plateAngleSize && a.thickness === plateAngleThk);
      const angleWeightPerPc = angleInfo ? (totalAngleMeters * angleInfo.weightPerMeter) : 0;
      const dimString = dimensionUnit === 'mm' ? `${plateL}x${plateB}mm` : `${plateL}'x${plateB}'`;
      indents.push({ item: 'HR Sheet (Plate Body)', specification: `${plateSheetThk}mm Thick (${dimString})`, quantity: qty, unit: 'Pieces', totalWeightKg: sheetWeightPerPc * qty, isAccessory: false });
      indents.push({ item: `MS Angle (${typeLabel})`, specification: `${plateAngleSize} x ${plateAngleThk}mm`, quantity: totalAngleMeters * qty, unit: 'Meters', totalWeightKg: angleWeightPerPc * qty, isAccessory: false });
    }
    else if (selectedProduct === ProductType.SPAN) {
      const spanMaterials = [
        { item: 'HR Sheet', spec: 'Main Body Sheet', wt: 15.34 },
        { item: '10mm MS Round Rod', spec: 'Lattice Support', wt: 8.40 },
        { item: 'T-Angle', spec: 'Spine Member', wt: 7.75 },
        { item: 'MS Flat 65x5 (Patti)', spec: 'Support Strip', wt: 4.80 },
        { item: 'MS Flat 40x5 (Patti)', spec: 'Outer Strip', wt: 2.00 },
        { item: '75x5 MS Angle', spec: 'End Base Angles', wt: 1.92 }
      ];
      spanMaterials.forEach(m => indents.push({ item: m.item, specification: m.spec, quantity: qty, unit: 'Pieces', totalWeightKg: m.wt * qty, isAccessory: false }));
      indents.push({ item: 'I-Bolt & Nut Set', specification: '2 Sets per Span', quantity: qty * 2, unit: 'Nos', totalWeightKg: 0, isAccessory: true });
    }
    else if (selectedProduct === ProductType.CUPLOCK) {
      const pipeWeightPerM = cupThk === 3.2 ? PIPE_WEIGHTS.OD48_32 : PIPE_WEIGHTS.OD48_29;
      if (cupType === 'Vertical') {
        const cups = Math.round(cupLen / 0.5);
        indents.push({ item: `48.3 OD MS Pipe (${cupThk}mm)`, specification: `Length: ${cupLen}m`, quantity: cupLen * qty, unit: 'Meters', totalWeightKg: cupLen * qty * pipeWeightPerM, isAccessory: false });
        indents.push({ item: 'Top Cup (Forged)', specification: `${cups} Cups/Pc`, quantity: cups * qty, unit: 'Nos', totalWeightKg: cups * qty * COMPONENT_WEIGHTS.TOP_CUP, isAccessory: true });
        indents.push({ item: 'Bottom Cup (Pressed)', specification: `${cups} Cups/Pc`, quantity: cups * qty, unit: 'Nos', totalWeightKg: cups * qty * COMPONENT_WEIGHTS.BOTTOM_CUP, isAccessory: true });
      } else {
        const pipeCut = (cupLen * 1000 - 60) / 1000;
        indents.push({ item: `48.3 OD MS Pipe (${cupThk}mm)`, specification: `Laser Cut: ${pipeCut*1000}mm (for ${cupLen}m)`, quantity: pipeCut * qty, unit: 'Meters', totalWeightKg: pipeCut * qty * pipeWeightPerM, isAccessory: false });
        indents.push({ item: 'Ledger Blade (Laser Blade)', specification: '2 Pcs/Pc', quantity: 2 * qty, unit: 'Nos', totalWeightKg: 2 * qty * COMPONENT_WEIGHTS.LEDGER_BLADE, isAccessory: true });
      }
    }
    else if (selectedProduct === ProductType.PROP) {
      const outerCut = propOuterLen - COMPONENT_WEIGHTS.PROP_COIL_LEN;
      indents.push({ item: '60 OD MS Pipe (Outer)', specification: `${outerCut}m cut`, quantity: outerCut * qty, unit: 'Meters', totalWeightKg: outerCut * qty * PIPE_WEIGHTS.OD60_32, isAccessory: false });
      indents.push({ item: '2-inch Coil Pipe', specification: `300mm length`, quantity: 0.3 * qty, unit: 'Meters', totalWeightKg: 0.3 * qty * PIPE_WEIGHTS.OD60_35, isAccessory: false });
      indents.push({ item: '48 OD MS Pipe (Inner)', specification: `${propInnerLen}m`, quantity: propInnerLen * qty, unit: 'Meters', totalWeightKg: propInnerLen * qty * PIPE_WEIGHTS.OD48_29, isAccessory: false });
      indents.push({ item: '10mm Round Handle / Pin', specification: `500mm length`, quantity: 0.5 * qty, unit: 'Meters', totalWeightKg: 0.5 * qty * ROD_WEIGHTS_METER["10mm"], isAccessory: false });
      indents.push({ item: 'Base Plate (Outer)', specification: '150x6 Flat', quantity: qty, unit: 'Nos', totalWeightKg: qty * 1.0, isAccessory: false });
      indents.push({ item: propTopType === 'Plate' ? 'Base Plate (Inner)' : propTopType === 'U-Head' ? 'U-Head (Inner)' : 'L-Angle (Inner)', specification: '1 kg per piece', quantity: qty, unit: 'Nos', totalWeightKg: qty * 1.0, isAccessory: false });
      indents.push({ item: 'Prop Nut', specification: 'Standard (550g)', quantity: qty, unit: 'Nos', totalWeightKg: qty * 0.55, isAccessory: true });
    }
    else if (selectedProduct === ProductType.JACK) {
      const rodLenM = (jackRodLen * 25.4) / 1000;
      const rodWtPerM = ROD_WEIGHTS_METER[jackRodSize as keyof typeof ROD_WEIGHTS_METER] || 5.55;
      indents.push({ item: 'Threaded Solid Rod', specification: `${jackRodSize} (L=${jackRodLen}")`, quantity: qty, unit: 'Pieces', totalWeightKg: rodWtPerM * rodLenM * qty, isAccessory: false });
      indents.push({ item: jackType === 'Base Jack' ? 'Base Plate' : 'U-Plate', specification: `Standard (1.0 kg)`, quantity: qty, unit: 'Pieces', totalWeightKg: qty * COMPONENT_WEIGHTS.JACK_FLAT_BASE, isAccessory: false });
      indents.push({ item: 'Cup Nut', specification: '180g each', quantity: qty, unit: 'Nos', totalWeightKg: qty * 0.18, isAccessory: true });
    }

    return { productName: selectedProduct, quantity: qty, indents };
  }, [selectedProduct, qty, plateL, plateB, plateSheetThk, plateAngleSize, plateAngleThk, plateType, dimensionUnit, cupType, cupLen, cupThk, propOuterLen, propInnerLen, propTopType, jackRodSize, jackRodLen, jackType]);

  const totalWeight = calculationResult.indents.reduce((sum, i) => sum + i.totalWeightKg, 0);
  const rawMaterials = useMemo(() => calculationResult.indents.filter(i => !i.isAccessory), [calculationResult]);
  const accessories = useMemo(() => calculationResult.indents.filter(i => i.isAccessory), [calculationResult]);

  // --- Export Functions ---
  const exportToExcel = () => {
    const data = [
      ["ADITYA EQUIPMENTS - PRODUCTION INDENT"],
      [`Product: ${calculationResult.productName}`, `Batch Qty: ${calculationResult.quantity}`],
      [`Total Weight: ${totalWeight.toFixed(2)} KG`],
      [],
      ["RAW MATERIAL INDENT (BY WEIGHT)"],
      ["Item", "Specification", "Quantity", "Unit", "Weight (KG)"]
    ];
    rawMaterials.forEach(m => data.push([m.item, m.specification, m.quantity.toString(), m.unit, m.totalWeightKg.toFixed(2)]));
    data.push([], ["ACCESSORIES INDENT (BY PIECES)"], ["Item", "Specification", "Quantity", "Unit"]);
    accessories.forEach(a => data.push([a.item, a.specification, a.quantity.toString(), a.unit]));
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indent");
    XLSX.writeFile(wb, `Aditya_Indent_${selectedProduct.split(' ')[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    const element = document.getElementById('indent-card');
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Aditya_Indent_${selectedProduct.split(' ')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen pb-12 bg-[#F1F5F9] font-sans text-slate-900">
      {/* PROFESSIONAL HEADER */}
      <header className="bg-slate-950 text-white shadow-2xl sticky top-0 z-50 print-hidden">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-4xl shadow-2xl shadow-blue-500/40">A</div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">ADITYA EQUIPMENTS</h1>
              <p className="text-blue-400 text-xs font-black uppercase tracking-[0.4em] italic">Manufacturing Excellence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={exportToExcel} 
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all shadow-xl flex items-center gap-3 text-sm font-black uppercase tracking-widest border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
            >
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14.5,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V7.5L14.5,2M10,19L7,19L10,15L7,11L10,11L11.5,13L13,11L16,11L13,15L16,19L13,19L11.5,17L10,19Z"/></svg>
               Download Excel
            </button>
            <button 
              onClick={exportToPDF} 
              className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl transition-all shadow-xl flex items-center gap-3 text-sm font-black uppercase tracking-widest border-b-4 border-rose-800 active:border-b-0 active:translate-y-1"
            >
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19,3H5C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.11,3 19,3M19,19H5V5H19V19M11,17H13V15H15V13H13V11H11V13H9V15H11V17Z"/></svg>
               Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* BIG STEP 1: PRODUCT CARDS */}
        <section className="mb-12 print-hidden">
          <div className="flex items-center gap-4 mb-8">
            <span className="w-10 h-10 bg-slate-950 text-white rounded-full flex items-center justify-center font-black">1</span>
            <h2 className="text-2xl font-black uppercase tracking-tight">Select What You are Manufacturing</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.values(ProductType).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedProduct(type)}
                className={`p-6 rounded-3xl border-4 transition-all flex flex-col items-center text-center gap-4 group ${
                  selectedProduct === type 
                    ? 'bg-white border-blue-600 shadow-2xl scale-105' 
                    : 'bg-white/50 border-transparent hover:border-slate-300 text-slate-500'
                }`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${selectedProduct === type ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 group-hover:bg-slate-300'}`}>
                  {type === ProductType.PLATE && '⬛'}
                  {type === ProductType.SPAN && '↔️'}
                  {type === ProductType.CUPLOCK && '🏗️'}
                  {type === ProductType.PROP && '🗼'}
                  {type === ProductType.JACK && '🔩'}
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest leading-tight ${selectedProduct === type ? 'text-slate-950' : ''}`}>{type}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* STEP 2: DETAILS */}
          <div className="lg:col-span-4 space-y-8 print-hidden">
             <section className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-sm">2</span>
                  <h2 className="font-black text-slate-900 text-xs uppercase tracking-widest">Specifications</h2>
                </div>
                <div className="p-10 space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Production Quantity</label>
                    <div className="relative">
                       <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full pl-8 pr-20 py-5 border-4 border-slate-100 rounded-2xl focus:border-blue-500 bg-slate-50 outline-none font-black text-3xl transition-all" />
                       <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black uppercase tracking-widest">PCS</span>
                    </div>
                  </div>

                  {/* DYNAMIC FORM SECTION */}
                  <div className="pt-8 border-t border-slate-100 space-y-8">
                    {selectedProduct === ProductType.PLATE && (
                      <div className="space-y-6">
                        <div className="flex bg-slate-100 p-2 rounded-2xl">
                          <button onClick={() => setDimensionUnit('mm')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${dimensionUnit === 'mm' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400'}`}>MM</button>
                          <button onClick={() => setDimensionUnit('feet')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${dimensionUnit === 'feet' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400'}`}>FEET</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Length</label>
                            <input type="number" step="any" value={plateL} onChange={(e) => setPlateL(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-lg font-black outline-none focus:border-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Width</label>
                            <input type="number" step="any" value={plateB} onChange={(e) => setPlateB(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-lg font-black outline-none focus:border-blue-500" />
                          </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Angle Size</label>
                            <select value={plateAngleSize} onChange={(e) => setPlateAngleSize(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-black outline-none cursor-pointer">
                              {Array.from(new Set(ANGLE_WEIGHT_TABLE.map(a => a.size))).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Angle Thickness</label>
                            <div className="grid grid-cols-3 gap-2">
                              {availablePlateAngleThks.map(t => (
                                <button key={t} onClick={() => setPlateAngleThk(t)} className={`py-3 rounded-xl border-2 text-[10px] font-black transition-all ${plateAngleThk === t ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{t}mm</button>
                              ))}
                            </div>
                        </div>
                      </div>
                    )}

                    {selectedProduct === ProductType.CUPLOCK && (
                      <div className="space-y-8">
                         <div className="grid grid-cols-1 gap-3">
                            {['Vertical', 'Ledger'].map(t => (
                              <button key={t} onClick={() => setCupType(t as any)} className={`w-full py-5 rounded-2xl border-4 text-sm font-black uppercase tracking-widest transition-all ${cupType === t ? 'bg-slate-950 text-white border-slate-950 shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>{t}</button>
                            ))}
                         </div>
                         <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Length (Meters)</label>
                            <input type="number" step="0.01" value={cupLen} onChange={(e) => setCupLen(Number(e.target.value))} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black outline-none focus:border-blue-500" />
                         </div>
                      </div>
                    )}

                    {selectedProduct === ProductType.PROP && (
                       <div className="space-y-8">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Outer Pipe Length (M)</label>
                            <input type="number" step="0.1" value={propOuterLen} onChange={(e) => setPropOuterLen(Number(e.target.value))} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xl font-black outline-none" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Inner Pipe Length (M)</label>
                            <input type="number" step="0.1" value={propInnerLen} onChange={(e) => setPropInnerLen(Number(e.target.value))} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-xl font-black outline-none" />
                          </div>
                       </div>
                    )}

                    {selectedProduct === ProductType.JACK && (
                       <div className="space-y-8">
                          <div className="grid grid-cols-2 gap-3">
                            {['Base Jack', 'U-Jack'].map(t => (
                              <button key={t} onClick={() => setJackType(t as any)} className={`w-full py-4 rounded-xl border-4 text-xs font-black uppercase transition-all ${jackType === t ? 'bg-slate-950 text-white border-slate-950 shadow-xl' : 'bg-white border-slate-100 text-slate-400'}`}>{t}</button>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Rod Length (Inches)</label>
                            <input type="number" value={jackRodLen} onChange={(e) => setJackRodLen(Number(e.target.value))} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-2xl font-black outline-none" />
                          </div>
                       </div>
                    )}
                  </div>
                </div>
             </section>
          </div>

          {/* THE INDENT CARD */}
          <div className="lg:col-span-8">
             <div id="indent-card" className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-12 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                   <div>
                      <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-4 border border-blue-200">Official Production Indent</span>
                      <h3 className="text-5xl font-black text-slate-950 tracking-tighter uppercase mb-2">{calculationResult.productName}</h3>
                      <p className="text-slate-500 font-black text-xs uppercase tracking-[0.3em]">Batch Order: <span className="text-blue-600">{calculationResult.quantity.toLocaleString()} PCS</span></p>
                   </div>
                   <div className="bg-slate-950 p-10 rounded-[2.5rem] min-w-[340px] text-right shadow-2xl shadow-slate-950/30 border border-slate-800">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Total Estimated Weight</p>
                      <div className="flex items-baseline justify-end gap-3">
                        <span className="text-7xl font-black text-white tabular-nums tracking-tighter">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                        <span className="text-2xl font-black text-blue-500 italic uppercase">KG</span>
                      </div>
                   </div>
                </div>

                <div className="p-12">
                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-4">
                     <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                     Material Breakdown
                   </h4>
                   <div className="space-y-4">
                      {calculationResult.indents.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all group">
                           <div className="flex items-center gap-6">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${m.isAccessory ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                {m.isAccessory ? 'A' : 'M'}
                              </div>
                              <div>
                                 <p className="text-sm font-black uppercase text-slate-950 group-hover:text-blue-600 transition-colors">{m.item}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{m.specification}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-2xl font-black text-slate-900 tabular-nums">
                                {m.isAccessory ? m.quantity.toLocaleString() : m.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                              </p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.unit}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="p-10 bg-slate-950 text-center rounded-b-[3rem]">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] italic">ADITYA EQUIPMENTS • UNIT I • MANUFACTURING PORTAL</p>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
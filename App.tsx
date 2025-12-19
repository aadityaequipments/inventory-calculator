
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

  const exportToWord = () => {
    let content = `
      <div style="font-family: Arial; padding: 20px;">
        <h1 style="color: #020617; text-align: center;">ADITYA EQUIPMENTS</h1>
        <h2 style="text-align: center;">PRODUCTION INDENT: ${calculationResult.productName}</h2>
        <p><strong>Batch Quantity:</strong> ${calculationResult.quantity} PCS</p>
        <p><strong>Total Weight:</strong> ${totalWeight.toFixed(2)} KG</p>
        <h3>RAW MATERIALS</h3>
        <table border="1" style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f1f5f9;"><th>Item</th><th>Spec</th><th>Weight (KG)</th></tr>
          ${rawMaterials.map(m => `<tr><td>${m.item}</td><td>${m.specification}</td><td align="right">${m.totalWeightKg.toFixed(2)}</td></tr>`).join('')}
        </table>
        <h3>ACCESSORIES</h3>
        <table border="1" style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f1f5f9;"><th>Item</th><th>Spec</th><th>Qty (NOS)</th></tr>
          ${accessories.map(a => `<tr><td>${a.item}</td><td>${a.specification}</td><td align="right">${a.quantity}</td></tr>`).join('')}
        </table>
      </div>
    `;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Aditya_Indent_${selectedProduct.split(' ')[0]}.doc`;
    link.click();
  };

  return (
    <div className="min-h-screen pb-12 bg-[#F8FAFC] font-sans text-slate-900">
      <header className="bg-slate-950 text-white shadow-2xl sticky top-0 z-50 border-b border-blue-500/40 print-hidden">
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
          
          <div className="flex items-center gap-3">
            <button onClick={exportToExcel} className="p-2.5 bg-green-600 hover:bg-green-500 rounded-xl transition-all shadow-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14.5,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V7.5L14.5,2M10,19L7,19L10,15L7,11L10,11L11.5,13L13,11L16,11L13,15L16,19L13,19L11.5,17L10,19Z"/></svg>
               Excel
            </button>
            <button onClick={exportToPDF} className="p-2.5 bg-red-600 hover:bg-red-500 rounded-xl transition-all shadow-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19,3H5C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.11,3 19,3M19,19H5V5H19V19M11,17H13V15H15V13H13V11H11V13H9V15H11V17Z"/></svg>
               PDF
            </button>
            <button onClick={exportToWord} className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M15.2,20H13.8L12,13.2L10.2,20H8.8L6.6,11H8.1L9.5,17.8L11.3,11H12.7L14.5,17.8L15.9,11H17.4L15.2,20Z"/></svg>
               Word
            </button>
            <button onClick={() => window.print()} className="px-5 py-2.5 bg-slate-100 hover:bg-white text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 border border-slate-700">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
               Print
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8 print-hidden">
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
                    selectedProduct === type ? 'bg-slate-950 border-slate-950 text-white shadow-xl' : 'border-slate-50 hover:border-slate-200 bg-white text-slate-500'
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Production Quantity</label>
                <div className="relative">
                   <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full pl-6 pr-16 py-4 border-2 border-slate-100 rounded-2xl focus:border-blue-500 bg-slate-50 outline-none font-black text-2xl" />
                   <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black uppercase">Units</span>
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
                {selectedProduct === ProductType.CUPLOCK && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Category</label>
                      <div className="flex bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setCupType('Vertical')} className={`flex-1 py-3 text-[10px] font-black rounded-lg ${cupType === 'Vertical' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500'}`}>VERTICAL</button>
                        <button onClick={() => setCupType('Ledger')} className={`flex-1 py-3 text-[10px] font-black rounded-lg ${cupType === 'Ledger' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500'}`}>LEDGER (LASER)</button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Size (Meters)</label>
                      <div className="relative">
                         <input type="number" step="0.001" value={cupLen} onChange={(e) => setCupLen(Number(e.target.value))} className="w-full pl-6 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black outline-none focus:border-blue-500" />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black uppercase">MTR</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipe Thickness</label>
                      <div className="flex bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setCupThk(2.9)} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${cupThk === 2.9 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>2.9MM</button>
                        <button onClick={() => setCupThk(3.2)} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${cupThk === 3.2 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>3.2MM</button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedProduct === ProductType.PLATE && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Framing Type</label>
                      <div className="grid grid-cols-1 gap-3">
                        {(['2L3S', '2L4S', '3L2S'] as PlateFramingType[]).map((type) => (
                          <button key={type} onClick={() => setPlateType(type)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${plateType === type ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                            <div className="w-16 h-12 bg-white border border-slate-300 relative rounded overflow-hidden">
                               <div className="absolute inset-0 border-2 border-slate-400"></div>
                               {type === '2L3S' && <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-400 -translate-x-1/2"></div>}
                               {type === '2L4S' && <><div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-slate-400"></div><div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-slate-400"></div></>}
                               {type === '3L2S' && <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-400 -translate-y-1/2"></div>}
                            </div>
                            <div className="text-left">
                              <p className="text-[11px] font-black uppercase">{type === '2L3S' ? 'TYPE A' : type === '2L4S' ? 'TYPE B' : 'TYPE C'}</p>
                              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">{type === '2L3S' ? '2L + 3S' : type === '2L4S' ? '2L + 4S' : '3L + 2S'}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex bg-slate-100 p-1.5 rounded-xl mb-4">
                      <button onClick={() => setDimensionUnit('mm')} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${dimensionUnit === 'mm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>MM</button>
                      <button onClick={() => setDimensionUnit('feet')} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${dimensionUnit === 'feet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>FEET</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Length</label>
                        <input type="number" step="any" value={plateL} onChange={(e) => setPlateL(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Width</label>
                        <input type="number" step="any" value={plateB} onChange={(e) => setPlateB(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Angle Size</label>
                        <select value={plateAngleSize} onChange={(e) => setPlateAngleSize(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none">
                          {Array.from(new Set(ANGLE_WEIGHT_TABLE.map(a => a.size))).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Angle Thickness</label>
                        <div className="grid grid-cols-3 gap-2">
                          {availablePlateAngleThks.map(t => (
                            <button key={t} onClick={() => setPlateAngleThk(t)} className={`py-2 rounded-lg border-2 text-[10px] font-black ${plateAngleThk === t ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{t}mm</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Sheet Gauge (mm)</label>
                        <input type="number" step="0.1" value={plateSheetThk} onChange={(e) => setPlateSheetThk(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </div>
                )}

                {selectedProduct === ProductType.PROP && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Outer Pipe (M)</label>
                        <input type="number" step="0.1" value={propOuterLen} onChange={(e) => setPropOuterLen(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">Inner Pipe (M)</label>
                        <input type="number" step="0.1" value={propInnerLen} onChange={(e) => setPropInnerLen(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-black outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Attachment</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Plate', 'U-Head', 'L-Angle'] as PropTopType[]).map(type => (
                          <button key={type} onClick={() => setPropTopType(type)} className={`py-3 rounded-xl border-2 text-[9px] font-black uppercase ${propTopType === type ? 'bg-slate-950 text-white border-slate-950 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>{type}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedProduct === ProductType.JACK && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jack Type</label>
                      <div className="flex bg-slate-100 p-1.5 rounded-xl">
                        <button onClick={() => setJackType('Base Jack')} className={`flex-1 py-3 text-[10px] font-black rounded-lg ${jackType === 'Base Jack' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500'}`}>BASE JACK</button>
                        <button onClick={() => setJackType('U-Jack')} className={`flex-1 py-3 text-[10px] font-black rounded-lg ${jackType === 'U-Jack' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500'}`}>U-JACK</button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rod Specifications</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["28mm", "30mm", "32mm"].map(size => (
                          <button key={size} onClick={() => setJackRodSize(size)} className={`py-3 rounded-xl border-2 text-[10px] font-black ${jackRodSize === size ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{size}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Rod Length</label>
                      <div className="relative">
                        <input type="number" value={jackRodLen} onChange={(e) => setJackRodLen(Number(e.target.value))} className="w-full pl-6 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black outline-none focus:border-blue-500" />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black uppercase">INCH</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedProduct === ProductType.SPAN && (
                  <div className="space-y-6">
                    <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed italic border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-xl">
                      Standard Span Indent: Master formulas verified for S1 to S4 series.
                    </p>
                    <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                       <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Master Specs:</p>
                       <ul className="space-y-2">
                         <li className="text-[10px] text-slate-500 flex justify-between"><span>HR Body Sheet:</span> <span>15.34 KG</span></li>
                         <li className="text-[10px] text-slate-500 flex justify-between"><span>MS Round Lattice:</span> <span>8.40 KG</span></li>
                         <li className="text-[10px] text-slate-500 flex justify-between"><span>T-Angle member:</span> <span>7.75 KG</span></li>
                       </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Indent Display Card */}
        <div className="lg:col-span-8 flex flex-col items-stretch">
           <div id="indent-card" className="bg-white rounded-[3rem] shadow-2xl border border-slate-200/50 flex flex-col flex-grow overflow-hidden">
              <div className="p-10 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                   <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-full mb-3 border border-blue-200">Production Ready Indent</span>
                   <h3 className="text-4xl font-black text-slate-950 tracking-tighter leading-none mb-2 uppercase">
                    {selectedProduct === ProductType.CUPLOCK ? `CUPLOCK ${cupType.toUpperCase()}` : selectedProduct === ProductType.JACK ? jackType.toUpperCase() : calculationResult.productName}
                   </h3>
                   <div className="space-y-1.5">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Batch: <span className="text-slate-950 underline underline-offset-4 decoration-blue-500 decoration-2">{calculationResult.quantity.toLocaleString()} UNITS</span></p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedProduct === ProductType.CUPLOCK && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase italic tracking-widest">{cupLen}M Length | {cupThk}mm Pipe</span>}
                      {selectedProduct === ProductType.JACK && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase italic tracking-widest">{jackRodLen}" Rod | {jackRodSize} Dia | 1.0kg Plate</span>}
                      {selectedProduct === ProductType.PLATE && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase italic tracking-widest">{plateL}x{plateB}{dimensionUnit} | {plateAngleSize}x{plateAngleThk}mm</span>}
                    </div>
                   </div>
                </div>
                <div className="bg-slate-950 p-8 rounded-[2.5rem] text-right min-w-[300px] shadow-2xl shadow-slate-950/20 border border-slate-800">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Total Indent Weight</p>
                  <div className="flex items-baseline justify-end gap-2">
                    <span className="text-6xl font-black text-white tabular-nums tracking-tighter">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    <span className="text-2xl font-black text-blue-500 italic uppercase">KG</span>
                  </div>
                </div>
              </div>

              <div className="flex-grow">
                <div className="px-10 py-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                   <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
                   <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">01. Raw Material Indent (Weight Analysis)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-white/50">
                        <th className="px-10 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Item / Material</th>
                        <th className="px-10 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Specification</th>
                        <th className="px-10 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Weight (KG)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawMaterials.map((m, i) => (
                        <tr key={i} className="group hover:bg-slate-50/80 transition-all duration-200">
                          <td className="px-10 py-6">
                            <div className="font-black text-slate-800 uppercase text-sm group-hover:text-blue-600 transition-colors">{m.item}</div>
                          </td>
                          <td className="px-10 py-6">
                            <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm uppercase">{m.specification}</span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className="font-black text-2xl tabular-nums text-slate-950">{m.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {accessories.length > 0 && (
                  <>
                    <div className="px-10 py-6 bg-slate-50 border-y border-slate-100 flex items-center gap-3 mt-4">
                       <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                       <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">02. Accessories Indent (Piece Count)</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-white/50">
                            <th className="px-10 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Bought-Out Item</th>
                            <th className="px-10 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Spec</th>
                            <th className="px-10 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Quantity (NOS)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accessories.map((a, i) => (
                            <tr key={i} className="hover:bg-emerald-50/40 transition-all duration-200">
                              <td className="px-10 py-6">
                                <div className="font-black text-slate-800 uppercase text-sm">{a.item}</div>
                              </td>
                              <td className="px-10 py-6">
                                <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg uppercase">{a.specification}</span>
                              </td>
                              <td className="px-10 py-6 text-right">
                                <div className="inline-block px-5 py-2.5 bg-slate-950 text-white rounded-2xl shadow-xl">
                                  <div className="text-2xl font-black tabular-nums">{a.quantity.toLocaleString()}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="p-10 bg-slate-950 border-t border-slate-800 flex items-center justify-between rounded-b-[3rem]">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Unit I - Production Portal - ADITYA EQUIPMENTS</p>
                 <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;

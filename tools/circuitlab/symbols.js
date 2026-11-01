'use strict';
const PARTS={
 cell:{name:'Cell',value:3,unit:'V',range:[1,12,.5],info:'Gives energy. Long line = +.'},
 battery:{name:'Battery',value:6,unit:'V',range:[1,24,.5],info:'Two or more cells together.'},
 supply:{name:'DC supply',value:6,unit:'V',range:[1,24,.5],info:'Provides electrical energy.'},
 switch:{name:'Switch',info:'Turns the path on or off. Double-tap to flip.'},
 resistor:{name:'Resistor',value:330,unit:'Ω',range:[1,1000,1],info:'Limits current.'},
 variable:{name:'Variable resistor',value:100,unit:'Ω',range:[1,1000,1],info:'The arrow marks a variable resistor.'},
 lamp:{name:'Lamp',value:20,unit:'Ω',range:[1,200,1],info:'Lights when current flows. Fixed resistance here.'},
 ammeter:{name:'Ammeter',info:'Measures current (A). Put it in series.'},
 voltmeter:{name:'Voltmeter',info:'Measures voltage (V). Put it in parallel.'},
 fuse:{name:'Fuse',value:1,unit:'Ω',range:[.1,10,.1],info:'Helps protect a circuit.'},
 capacitor:{name:'Capacitor',info:'Stores charge. Blocks steady DC.'},
 diode:{name:'Diode',info:'One-way: flows toward the bar.'},
 led:{name:'LED',info:'Lights one way. Use a resistor in series.'},
 thermistor:{name:'Thermistor',value:100,unit:'Ω',range:[10,1000,10],info:'Hotter = less resistance.'},
 ldr:{name:'LDR',value:500,unit:'Ω',range:[10,2000,10],info:'Brighter light = less resistance.'},
 junction:{name:'Junction',info:'Joins wires at one point.'},
 wire:{name:'Wire',info:'Zero resistance. Or just join two dots.'}
};
function symbol(type,closed=false){
 let body='';const line='<path d="M-50 0H-24 M24 0H50"/>';
 switch(type){
 case 'cell':body='<path d="M-50 0H-7 M7 0H50 M-7 -21V21 M7 -11V11"/><text x="-24" y="-24">+</text>';break;
 case 'battery':body='<path d="M-50 0H-18 M18 0H50 M-18 -21V21 M-7 -11V11 M7 -21V21 M18 -11V11"/><text x="-34" y="-24">+</text>';break;
 case 'supply':body=line+'<circle r="24"/><text x="-17" y="6">+ −</text>';break;
 case 'switch':body='<path d="M-50 0H-22 M22 0H50 M-22 0L22 '+(closed?'0':'-24')+'"/><circle cx="-22" r="3"/><circle cx="22" r="3"/>';break;
 case 'resistor':case 'variable':case 'thermistor':case 'ldr':case 'fuse':body=line+'<rect x="-24" y="-13" width="48" height="26"/>';
 if(type==='variable')body+='<path d="M-28 28L28 -28 M15 -26L28 -28L26 -15"/>';
 if(type==='thermistor')body+='<path d="M-29 23H-18L23 -23"/>';
 if(type==='fuse')body+='<path d="M-24 0H24"/>';
 if(type==='ldr')body+='<circle r="34"/><path d="M-44 -40L-18 -21 M-29 -22L-18 -21L-22 -32 M-26 -49L0 -30 M-11 -31L0 -30L-4 -41"/>';
 break;
 case 'lamp':body=line+'<circle r="24"/><path d="M-17 -17L17 17 M-17 17L17 -17"/>';break;
 case 'ammeter':case 'voltmeter':body=line+'<circle r="24"/><text text-anchor="middle" y="8" font-size="25">'+(type==='ammeter'?'A':'V')+'</text>';break;
 case 'capacitor':body='<path d="M-50 0H-8 M8 0H50 M-8 -23V23 M8 -23V23"/>';break;
 case 'diode':case 'led':body='<path d="M-50 0H-20 M20 0H50 M-20 -21L20 0L-20 21Z M20 -21V21"/>';
 if(type==='led')body+='<path d="M0 -29L21 -49 M10 -48L21 -49L20 -38 M19 -20L40 -40 M29 -39L40 -40L39 -29"/>';break;
 case 'junction':body='<path d="M-50 0H50 M0 -26V26"/><circle r="5" fill="currentColor"/>';break;
 default:body='<path d="M-50 0H50"/>';
 }
 return '<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">'+body+'</g>';
}
function icon(type){return '<svg viewBox="-60 -55 120 100" aria-hidden="true">'+symbol(type)+'</svg>'}

// Lightweight SVG depth rendering: decorative geometry only; terminals and solver stay planar.
function physicalDefs(){return `
 <linearGradient id="part-metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff"/><stop offset=".35" stop-color="var(--line)"/><stop offset=".65" stop-color="#fff"/><stop offset="1" stop-color="var(--muted)"/></linearGradient>
 <linearGradient id="part-teal" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="var(--teal)"/><stop offset="1" stop-color="var(--navy)"/></linearGradient>
 <linearGradient id="part-dark" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--muted)"/><stop offset=".4" stop-color="var(--navy)"/><stop offset="1" stop-color="var(--ink, var(--navy))"/></linearGradient>
 <linearGradient id="part-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="var(--line)" stop-opacity=".4"/><stop offset="1" stop-color="var(--teal)" stop-opacity=".35"/></linearGradient>
 <radialGradient id="part-light"><stop stop-color="#fff"/><stop offset=".35" stop-color="var(--orange)" stop-opacity=".9"/><stop offset="1" stop-color="var(--orange)" stop-opacity="0"/></radialGradient>
 <filter id="part-shadow" x="-40%" y="-50%" width="190%" height="220%"><feDropShadow dx="2" dy="5" stdDeviation="2.5" flood-color="var(--navy)" flood-opacity=".22"/></filter>`;}
function physicalPart(c,reading){
 const metal='url(#part-metal)',teal='url(#part-teal)',dark='url(#part-dark)',glass='url(#part-glass)';
 const rect=(x,y,w,h,fill,rx=5)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
 const text=(value,x=0,y=5,size=13,fill='#fff')=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" style="fill:${fill}" stroke="none">${value}</text>`;
 const path=(d,stroke='var(--muted)',width=3)=>`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
 const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
 const leads=path('M-50 0H-26 M26 0H50','var(--muted)',5)+path('M-50 -1H-26 M26 -1H50','#fff',1);
 const bevel=(w=70,h=42)=>rect(-w/2,-h/2+5,w,h,dark,7)+rect(-w/2,-h/2,w,h,teal,7)+path(`M${-w/2+8} ${-h/2+3}H${w/2-8}`,'#fff',1);
 let body='',glow='';
 switch(c.type){
 case 'cell':case 'battery':
  body=rect(-34,-18,68,36,dark,10)+rect(-34,-18,24,36,teal,7)+circle(-32,0,5,metal)+rect(-40,-6,6,12,metal,2)+rect(33,-14,5,28,metal,2)+path('M-23 -13H23','#fff',1)+text('+',-22,6,17)+text('−',24,6,16)+text(c.type==='cell'?'CELL':'DC',6,5,10);break;
 case 'supply':body=bevel(76,50)+rect(-27,-17,54,22,dark,3)+text(Number.isFinite(+c.value)?c.value+' V':'DC',0,-2,14,'var(--orange)')+circle(-19,17,5,metal)+circle(19,17,5,metal)+text('+',-32,22,10)+text('−',32,22,10);break;
 case 'resistor':body=rect(-30,-12,60,29,dark,9)+rect(-30,-16,60,29,metal,9)+rect(-21,-16,42,29,teal,3)+text('Ω',0,5,19)+path('M-16 -12H16','#fff',1);break;
 case 'variable':body=bevel(64,44)+circle(0,-1,19,metal)+circle(0,-1,14,dark)+`<g transform="rotate(${Math.min(1,Math.max(0,(c.value-1)/999))*240-120} 0 -1)">${path('M0 -2V-12','var(--orange)',3)}</g>`+text('Ω',25,15,10);break;
 case 'lamp':{
  const power=reading?.power||0,level=Math.min(1,Math.max(0,power/1.8));
  if(power>1e-8)glow=`<g class="part-glow" opacity="${level}">${circle(0,-6,42,'url(#part-light)')}</g>`;
  body=rect(-33,11,66,22,dark,7)+rect(-29,9,58,15,teal,6)+rect(-12,7,24,15,metal,3)+circle(0,-7,23,glass)+path('M-10 11L-7 -5L-3 -9L1 -5L5 -9L9 -5L11 11',power>1e-8?'var(--orange)':'var(--muted)',2)+path('M-14 -18Q-19 -12-17 -4','#fff',3);break;}
 case 'ammeter':case 'voltmeter':{
  const unit=c.type==='ammeter'?'A':'V',v=c.type==='ammeter'?reading?.current:reading?.voltage;
  const value=Number.isFinite(v)?(+v.toPrecision(3))+'':'—';
  body=bevel(76,52)+rect(-29,-19,58,26,dark,4)+text(value,0,0,14,'var(--orange)')+text(unit,0,23,13)+circle(-23,18,4,metal)+circle(23,18,4,metal);break;}
 case 'switch':body=bevel(72,40)+circle(-23,0,7,metal)+circle(23,0,7,metal)+path(c.closed?'M-23 0H23':'M-23 0L13 -26','var(--orange)',7)+circle(-23,0,4,dark)+circle(c.closed?23:13,c.closed?0:-26,5,metal);break;
 case 'fuse':body=rect(-32,-13,64,30,dark,7)+rect(-31,-17,62,29,glass,7)+rect(-34,-17,12,29,metal,3)+rect(22,-17,12,29,metal,3)+path(c.blown?'M-22 -3H-7 M8 -3H22':'M-22 -3L-10 -7L0 0L10 -7L22 -3','var(--orange)',2);break;
 case 'capacitor':body=rect(-24,-23,48,50,dark,8)+rect(-24,-27,48,47,teal,8)+`<ellipse cx="0" cy="-24" rx="23" ry="7" fill="${metal}"/>`+path('M-13 -24H13 M0 -28V-20','var(--muted)',1)+rect(-21,-14,7,33,metal,2)+text('−',-17,8,12,'var(--navy)')+text('C',6,10,18);break;
 case 'diode':body=rect(-30,-12,60,29,dark,10)+rect(15,-12,7,29,metal,1)+path('M-20 -8H9','#fff',1)+text('A',-37,-14,9,'var(--navy)')+text('K',32,-14,9,'var(--navy)');break;
 case 'led':{
  const lit=(reading?.current||0)>1e-5;
  if(lit)glow=`<g class="part-glow" opacity="${Math.min(1,reading.current/.02)}">${circle(0,-7,40,'url(#part-light)')}</g>`;
  body=rect(-29,15,58,14,dark,7)+rect(-25,11,50,13,teal,5)+`<path d="M-20 13V-5A20 20 0 0 1 20 -5V13Z" fill="${lit?'var(--orange)':glass}"/>`+rect(-23,9,46,6,metal,3)+path('M-10 -12Q-14 -8-14 2','#fff',3)+path('M-7 10V0H5V10','var(--muted)',2)+text('+',-35,-13,12,'var(--navy)')+text('−',35,-13,12,'var(--navy)');break;}
 case 'thermistor':body=circle(1,4,24,dark)+circle(0,-1,24,teal)+path('M-12 -15Q-18 -8-16 -1','#fff',2)+text('NTC',0,5,12);break;
 case 'ldr':body=circle(1,4,25,dark)+circle(0,0,25,metal)+circle(0,-1,21,teal)+path('M-12 -12H12V-6H-12V0H12V6H-12V12H12','var(--orange)',2)+path('M-18 -24L-27 -33 M-5 -28L-9 -39','var(--orange)',2);break;
 case 'junction':body=path('M-38 0H38 M0 -23V23','var(--muted)',12)+path('M-38 -2H38 M-2 -23V23','var(--line)',3)+circle(0,0,12,metal)+circle(0,0,6,teal);break;
 case 'wire':body=path('M-44 0H44','var(--navy)',9)+path('M-44 -2H44','var(--teal)',4);break;
 }
 return `<g class="physical-part" data-renderer="physical" data-type="${c.type}">${glow}<g filter="url(#part-shadow)">${leads}${body}</g></g>`;
}

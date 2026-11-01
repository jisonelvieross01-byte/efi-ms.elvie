'use strict';
const PARTS={
 cell:{name:'Cell',value:3,unit:'V',range:[1,12,.5],info:'Gives energy. Long line = +.'},
 battery:{name:'Battery',value:6,unit:'V',range:[1,24,.5],info:'Two or more cells together.'},
 supply:{name:'DC supply',value:6,unit:'V',range:[1,24,.5],info:'Adjustable DC voltage.'},
 switch:{name:'Switch',info:'Turns the path on or off. Double-tap to flip.'},
 resistor:{name:'Resistor',value:100,unit:'Ω',range:[1,1000,1],info:'Limits current. V = IR.'},
 variable:{name:'Variable resistor',value:100,unit:'Ω',range:[1,1000,1],info:'Slide to change resistance.'},
 lamp:{name:'Lamp',value:20,unit:'Ω',range:[1,200,1],info:'Lights when current flows. Fixed resistance here.'},
 ammeter:{name:'Ammeter',info:'Measures current (A). Put it in series.'},
 voltmeter:{name:'Voltmeter',info:'Measures voltage (V). Put it in parallel.'},
 fuse:{name:'Fuse',value:1,unit:'Ω',range:[.1,10,.1],info:'Warns above 1 A. Does not melt here.'},
 capacitor:{name:'Capacitor',info:'Stores charge. Blocks steady DC.'},
 diode:{name:'Diode',info:'One-way: flows toward the bar. 0.7 V drop.'},
 led:{name:'LED',info:'Lights one way. Add a resistor. Keep under 30 mA.'},
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

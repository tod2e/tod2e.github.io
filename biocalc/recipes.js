window.BIOCALC_RECIPES = [
  {
    id:"pbs1x", name:"PBS 1×", category:"Buffers", baseVolumeMl:1000,
    note:"Common starter formulation, pH 7.4. Replace with your lab protocol when provided.",
    components:[
      {name:"NaCl",amount:8.0,unit:"g"},
      {name:"KCl",amount:0.2,unit:"g"},
      {name:"Na2HPO4",amount:1.44,unit:"g"},
      {name:"KH2PO4",amount:0.24,unit:"g"}
    ],
    instructions:["Dissolve salts in ~800 mL water.","Adjust to pH 7.4 if required by your protocol.","Bring to final volume with water.","Sterilise as appropriate for downstream use."]
  },
  {
    id:"lb-miller", name:"LB broth (Miller)", category:"Media", baseVolumeMl:1000,
    note:"Common Miller LB starter formulation.",
    components:[
      {name:"Tryptone",amount:10,unit:"g"},
      {name:"Yeast extract",amount:5,unit:"g"},
      {name:"NaCl",amount:10,unit:"g"}
    ],
    instructions:["Dissolve components in ~900 mL water.","Bring to final volume.","Autoclave using your local media cycle."]
  },
  {
    id:"tb", name:"Terrific Broth (TB)", category:"Media", baseVolumeMl:1000,
    note:"Common TB starter formulation. Phosphate-buffer preparation varies between labs.",
    components:[
      {name:"Tryptone",amount:12,unit:"g"},
      {name:"Yeast extract",amount:24,unit:"g"},
      {name:"Glycerol",amount:4,unit:"mL"},
      {name:"Sterile TB phosphate buffer",amount:100,unit:"mL",detail:"typically added after sterilising the broth base"}
    ],
    instructions:["Prepare tryptone, yeast extract and glycerol in ~900 mL water.","Sterilise the broth base.","Add 100 mL sterile phosphate buffer after cooling according to your protocol.","Final volume: 1 L."],
    subrecipe:"A common 10× TB phosphate buffer is 0.17 M KH2PO4 + 0.72 M K2HPO4; verify against your lab protocol."
  },
  {
    id:"m9", name:"M9 minimal medium", category:"Media", baseVolumeMl:1000,
    note:"Common glucose M9 starter formulation using sterile stocks.",
    components:[
      {name:"5× M9 salts",amount:200,unit:"mL"},
      {name:"1 M MgSO4",amount:2,unit:"mL"},
      {name:"1 M CaCl2",amount:0.1,unit:"mL"},
      {name:"20% (w/v) glucose",amount:20,unit:"mL",detail:"0.4% final"},
      {name:"Sterile water",amount:777.9,unit:"mL"}
    ],
    instructions:["Combine sterile components aseptically.","Add carbon source and supplements after sterilisation as required.","For expression media, add antibiotics and any trace elements/amino acids separately."]
  },
  {
    id:"m9-5x", name:"M9 salts 5×", category:"Stocks", baseVolumeMl:1000,
    note:"Common 5× M9 salts formulation using Na2HPO4·7H2O.",
    components:[
      {name:"Na2HPO4·7H2O",amount:64,unit:"g"},
      {name:"KH2PO4",amount:15,unit:"g"},
      {name:"NaCl",amount:2.5,unit:"g"},
      {name:"NH4Cl",amount:5,unit:"g"}
    ],
    instructions:["Dissolve salts in water.","Bring to 1 L.","Sterilise according to your protocol."]
  },
  {
    id:"soc", name:"SOC medium", category:"Media", baseVolumeMl:1000,
    note:"Common rich recovery-medium formulation; glucose/Mg stocks are often added after autoclaving.",
    components:[
      {name:"Tryptone",amount:20,unit:"g"},
      {name:"Yeast extract",amount:5,unit:"g"},
      {name:"NaCl",amount:0.5,unit:"g"},
      {name:"KCl",amount:0.186,unit:"g"},
      {name:"1 M MgCl2",amount:10,unit:"mL",detail:"10 mM final"},
      {name:"1 M MgSO4",amount:10,unit:"mL",detail:"10 mM final"},
      {name:"1 M glucose",amount:20,unit:"mL",detail:"20 mM final"}
    ],
    instructions:["Prepare the tryptone/yeast extract/salt base and sterilise.","Aseptically add sterile MgCl2, MgSO4 and glucose stocks after cooling.","Bring to final volume if required."]
  },
  {
    id:"tbs", name:"TBS 1×", category:"Buffers", baseVolumeMl:1000,
    note:"Common Tris-buffered saline starter formulation, pH 7.4–7.6.",
    components:[
      {name:"Tris base",amount:3.03,unit:"g",detail:"25 mM"},
      {name:"NaCl",amount:8.77,unit:"g",detail:"150 mM"}
    ],
    instructions:["Dissolve in ~800 mL water.","Adjust pH with HCl to your required value.","Bring to 1 L."]
  }
];
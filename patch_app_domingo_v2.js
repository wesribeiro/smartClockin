const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. cacheSelectors
const mapUI = `  mesDom.modalDayAtrasoInfo = document.getElementById("modal-day-atraso-info");
  mesDom.modalDayAtrasoTxt = document.getElementById("modal-day-atraso-txt");
  mesDom.modalDayDomingo = document.getElementById("modal-day-domingo");
  mesDom.modalDayDomingoContainer = document.getElementById("modal-day-domingo-container");`;

content = content.replace(
  /mesDom\.modalDayAtrasoInfo = document\.getElementById\("modal-day-atraso-info"\);\s*mesDom\.modalDayAtrasoTxt = document\.getElementById\("modal-day-atraso-txt"\);/,
  mapUI
);

// 2. update abrirModalDia (around line 3217)
// Instead of: mesDom.modalDayFeriado.checked = !!rec.is_holiday;
// We add mesDom.modalDayDomingo.checked
const openModalStr = `  const isSunday = recDateObj.getDay() === 0;

  mesDom.modalDayFeriado.checked = !!rec.is_holiday;
  mesDom.modalDayFolga.checked = !!rec.is_folga;
  
  if (mesDom.modalDayDomingo) mesDom.modalDayDomingo.checked = !!rec.is_domingo_trabalhado;
  if (mesDom.modalDayDomingoContainer) {
    if (isSunday || rec.is_domingo_trabalhado) {
      mesDom.modalDayDomingoContainer.classList.remove("hidden");
    } else {
      mesDom.modalDayDomingoContainer.classList.add("hidden");
    }
  }`;

content = content.replace(
  /mesDom\.modalDayFeriado\.checked = !!rec\.is_holiday;\s*mesDom\.modalDayFolga\.checked = !!rec\.is_folga;/,
  openModalStr
);

// 3. update salvarEdicaoDia
content = content.replace(
  /const is_folga = mesDom\.modalDayFolga\.checked;/,
  'const is_folga = mesDom.modalDayFolga.checked;\n  const is_domingo_trabalhado = mesDom.modalDayDomingo ? mesDom.modalDayDomingo.checked : false;'
);

content = content.replace(
  /is_holiday, is_folga, is_finalized:/,
  'is_holiday, is_folga, is_domingo_trabalhado, is_finalized:'
);

content = content.replace(
  /is_folga,\s*is_finalized:\s*rec\.is_finalized\s*\}\)/,
  'is_folga,\n      is_domingo_trabalhado,\n      is_finalized: rec.is_finalized\n    })'
);


fs.writeFileSync(filePath, content, 'utf8');
console.log('App.js patched correctly for modal domingo!');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. cacheSelectors
const mapUI = `  dom.mesDayInfoContainer = document.getElementById("modal-day-atraso-info");
  dom.mesDayInfoTxt = document.getElementById("modal-day-atraso-txt");
  dom.mesBtnDomingo = document.getElementById("modal-day-domingo");
  dom.mesBtnDomingoContainer = document.getElementById("modal-day-domingo-container");`;

content = content.replace(
  /dom\.mesDayInfoContainer = document\.getElementById\("modal-day-atraso-info"\);\s*dom\.mesDayInfoTxt = document\.getElementById\("modal-day-atraso-txt"\);/,
  mapUI
);

// 2. add to abrirModalDia (around line 3480)
// The modal initialization sets dom.mesBtnFeriado.checked = rec.is_holiday;
// We need to add dom.mesBtnDomingo.checked = rec.is_domingo_trabalhado;
const openModalStr = `  const isSunday = recDateObj.getDay() === 0;

  dom.mesBtnFeriado.checked = !!rec.is_holiday;
  dom.mesBtnFolga.checked = !!rec.is_folga;
  
  if (dom.mesBtnDomingo) dom.mesBtnDomingo.checked = !!rec.is_domingo_trabalhado;
  if (dom.mesBtnDomingoContainer) {
    if (isSunday || rec.is_domingo_trabalhado) {
      dom.mesBtnDomingoContainer.classList.remove("hidden");
    } else {
      dom.mesBtnDomingoContainer.classList.add("hidden");
    }
  }`;

content = content.replace(
  /dom\.mesBtnFeriado\.checked = !!rec\.is_holiday;\s*dom\.mesBtnFolga\.checked = !!rec\.is_folga;/,
  openModalStr
);

// 3. update salvarEdicaoDia (in page-mes)
content = content.replace(
  /const is_folga = dom\.mesBtnFolga\.checked;/,
  'const is_folga = dom.mesBtnFolga.checked;\n  const is_domingo_trabalhado = dom.mesBtnDomingo ? dom.mesBtnDomingo.checked : false;'
);

content = content.replace(
  /is_holiday, is_folga, is_finalized:/,
  'is_holiday, is_folga, is_domingo_trabalhado, is_finalized:'
);

content = content.replace(
  /is_folga,\s*is_finalized:\s*rec\.is_finalized\s*\}\)/,
  'is_folga,\n      is_domingo_trabalhado,\n      is_finalized: rec.is_finalized\n    })'
);

// 4. Update contarDomingosFeriados
// Instead of: const domingoTrabalhado = isSunday && rec && rec.events && rec.events.length > 0 && !rec.is_folga;
// It should be: const domingoTrabalhado = isSunday && rec && (rec.is_domingo_trabalhado || (rec.events && rec.events.length > 0 && !rec.is_folga));
const contarStr = `const domingoTrabalhado = isSunday && rec && (rec.is_domingo_trabalhado || (rec.events && rec.events.length > 0 && !rec.is_folga));`;
content = content.replace(
  /const domingoTrabalhado = isSunday && rec && rec\.events && rec\.events\.length > 0 && !rec\.is_folga;/,
  contarStr
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.js patched for modal domingo_trabalhado!');

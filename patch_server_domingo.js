const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend/server.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1: GET /api/point/month
content = content.replace(
  /is_holiday, is_folga, is_finalized FROM pointRecords/,
  'is_holiday, is_folga, is_domingo_trabalhado, is_finalized FROM pointRecords'
);
content = content.replace(
  /is_holiday: false, is_finalized: false, is_folga: false \};/,
  'is_holiday: false, is_domingo_trabalhado: false, is_finalized: false, is_folga: false };'
);
content = content.replace(
  /is_holiday: !!row\.is_holiday, \/\* \[.*\] \*\//,
  'is_holiday: !!row.is_holiday, is_domingo_trabalhado: !!row.is_domingo_trabalhado, /* [RH] */'
);
if (!content.includes('is_domingo_trabalhado: !!row.is_domingo_trabalhado')) {
    // try fallback 
    content = content.replace(
        /is_folga: !!row\.is_folga,/,
        'is_folga: !!row.is_folga,\n            is_domingo_trabalhado: !!row.is_domingo_trabalhado,'
    );
}

// Replacement 2: POST /api/point/sync (retroativo)
content = content.replace(
  /const \{ events, is_holiday, is_folga, is_finalized \} = req\.body;/,
  'const { events, is_holiday, is_folga, is_domingo_trabalhado, is_finalized } = req.body;'
);

content = content.replace(
  /const currentIsFolga = typeof is_folga === "boolean" \? is_folga : \(row \? !!row\.is_folga : false\);/,
  `const currentIsFolga = typeof is_folga === "boolean" ? is_folga : (row ? !!row.is_folga : false);
    const currentIsDomingoTrabalhado = typeof is_domingo_trabalhado === "boolean" ? is_domingo_trabalhado : (row ? !!row.is_domingo_trabalhado : false);`
);

content = content.replace(
  /\(recordId, userId, date, events, aggregates, is_holiday, is_folga, is_finalized\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)/g,
  '(recordId, userId, date, events, aggregates, is_holiday, is_folga, is_domingo_trabalhado, is_finalized) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

content = content.replace(
  /\[recordId, userId, date, JSON\.stringify\(sortedEvents\), JSON\.stringify\(newAggregates\), currentIsHoliday \? 1 : 0, currentIsFolga \? 1 : 0, currentIsFinalized \? 1 : 0\]/,
  '[recordId, userId, date, JSON.stringify(sortedEvents), JSON.stringify(newAggregates), currentIsHoliday ? 1 : 0, currentIsFolga ? 1 : 0, currentIsDomingoTrabalhado ? 1 : 0, currentIsFinalized ? 1 : 0]'
);

content = content.replace(
  /is_folga: currentIsFolga, is_finalized: currentIsFinalized \}\);/,
  'is_folga: currentIsFolga, is_domingo_trabalhado: currentIsDomingoTrabalhado, is_finalized: currentIsFinalized });'
);

// Replacement 3: POST /api/point (today's update)
// Actually we only update is_domingo_trabalhado via modal, which calls /api/point/sync!
// So today's POST /api/point doesn't strictly need it, but we can add it to the INSERT statement.
content = content.replace(
    /row = \{ recordId: null, userId, date, events: "\[\]", aggregates: "\{\}", is_holiday: 0, is_finalized: 0 \};/,
    'row = { recordId: null, userId, date, events: "[]", aggregates: "{}", is_holiday: 0, is_folga: 0, is_domingo_trabalhado: 0, is_finalized: 0 };'
);

content = content.replace(
    /\[recordId, userId, date, row\.events, JSON\.stringify\(newAggregates\), is_holiday \? 1 : 0, row\.is_folga \? 1 : 0, row\.is_finalized \? 1 : 0\]/,
    '[recordId, userId, date, row.events, JSON.stringify(newAggregates), is_holiday ? 1 : 0, row.is_folga ? 1 : 0, row.is_domingo_trabalhado ? 1 : 0, row.is_finalized ? 1 : 0]'
);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Server.js patched for is_domingo_trabalhado');

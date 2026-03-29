const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/index.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. entrada_padrao & saida_almoco_padrao -> add retorno_almoco_padrao and saida_padrao
content = content.replace(
  /<div class="grid grid-cols-2 gap-4 pt-2">[\s\S]*?<div[\s\S]*?for="entrada_padrao"[\s\S]*?<\/div>[\s\S]*?<div[\s\S]*?for="saida_almoco_padrao"[\s\S]*?<\/div>\s*<\/div>/,
  `<div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div>
                      <label
                        for="entrada_padrao"
                        class="block text-sm font-medium text-muted"
                        >Entrada Padrão</label
                      >
                      <input
                        type="time"
                        id="entrada_padrao"
                        class="form-input-light"
                      />
                    </div>
                    <div>
                      <label
                        for="saida_almoco_padrao"
                        class="block text-sm font-medium text-muted"
                        >Saída (Alm)</label
                      >
                      <input
                        type="time"
                        id="saida_almoco_padrao"
                        class="form-input-light"
                      />
                    </div>
                    <div>
                      <label
                        for="retorno_almoco_padrao"
                        class="block text-sm font-medium text-muted"
                        >Retorno (Alm)</label
                      >
                      <input
                        type="time"
                        id="retorno_almoco_padrao"
                        class="form-input-light"
                      />
                    </div>
                    <div>
                      <label
                        for="saida_padrao"
                        class="block text-sm font-medium text-muted"
                        >Saída Padrão</label
                      >
                      <input
                        type="time"
                        id="saida_padrao"
                        class="form-input-light"
                      />
                    </div>
                  </div>`
);

// 2. dias_trabalho_por_semana and divisor_mensal
content = content.replace(
  /<div>\s*<label\s*for="dias_trabalho_por_semana"[\s\S]*?<\/div>/,
  `<div>
                    <label
                      for="divisor_mensal"
                      class="block text-sm font-medium text-muted"
                      >Divisor Mensal</label
                    ><input
                      type="number"
                      id="divisor_mensal"
                      class="form-input-light"
                      placeholder="220"
                    />
                  </div>
                  <div class="col-span-2">
                    <label class="block text-sm font-medium text-muted mb-2">Dias Trabalhados na Semana</label>
                    <div id="dias_trabalho_container" class="flex flex-wrap gap-2">
                      <button type="button" class="btn-dia flex-1 py-1.5 px-1 rounded border border-gray-300 dark:border-gray-600 font-medium text-sm transition-colors text-muted hover:bg-blue-50 dark:hover:bg-blue-900/30" data-dia="0">Dom</button>
                      <button type="button" class="btn-dia flex-1 py-1.5 px-1 rounded border border-gray-300 dark:border-gray-600 font-medium text-sm transition-colors text-muted hover:bg-blue-50 dark:hover:bg-blue-900/30" data-dia="1">Seg</button>
                      <button type="button" class="btn-dia flex-1 py-1.5 px-1 rounded border border-gray-300 dark:border-gray-600 font-medium text-sm transition-colors text-muted hover:bg-blue-50 dark:hover:bg-blue-900/30" data-dia="2">Ter</button>
                      <button type="button" class="btn-dia flex-1 py-1.5 px-1 rounded border border-gray-300 dark:border-gray-600 font-medium text-sm transition-colors text-muted hover:bg-blue-50 dark:hover:bg-blue-900/30" data-dia="3">Qua</button>
                      <button type="button" class="btn-dia flex-1 py-1.5 px-1 rounded border border-gray-300 dark:border-gray-600 font-medium text-sm transition-colors text-muted hover:bg-blue-50 dark:hover:bg-blue-900/30" data-dia="4">Qui</button>
                      <button type="button" class="btn-dia flex-1 py-1.5 px-1 rounded border border-gray-300 dark:border-gray-600 font-medium text-sm transition-colors text-muted hover:bg-blue-50 dark:hover:bg-blue-900/30" data-dia="5">Sex</button>
                      <button type="button" class="btn-dia flex-1 py-1.5 px-1 rounded border border-gray-300 dark:border-gray-600 font-medium text-sm transition-colors text-muted hover:bg-blue-50 dark:hover:bg-blue-900/30" data-dia="6">Sáb</button>
                    </div>
                  </div>`
);

// 3. multiplicador_hora_extra
content = content.replace(
  /Multiplic\. HE(?:\s*\(%\))?[\s\S]*?id="multiplicador_hora_extra"[\s\S]*?>/g,
  `Multiplic. HE (%)</label
                    ><input
                      type="number"
                      step="1"
                      id="multiplicador_hora_extra"
                      class="form-input-light"
                      placeholder="50"
                    />`
);

// 4. multiplicador_feriado_domingo
content = content.replace(
  /Multiplic\. Feriado\/Dom[\s\S]*?id="multiplicador_feriado_domingo"[\s\S]*?>/g,
  `Multiplic. Feriado/Dom (%)</label
                    ><input
                      type="number"
                      step="1"
                      id="multiplicador_feriado_domingo"
                      class="form-input-light"
                      placeholder="100"
                    />`
);

// 5. max_he_minutes & tolerancia_entrada_minutes
content = content.replace(
  /<div>\s*<label\s*for="tolerancia_entrada_minutes"[\s\S]*?<\/div>\s*<div>\s*<label\s*for="max_he_minutes"[\s\S]*?<\/div>/,
  `<div>
                    <label
                      for="max_he_minutes"
                      class="block text-sm font-medium text-muted"
                      >Limite HE (dia)</label
                    ><input
                      type="time"
                      id="max_he_minutes"
                      class="form-input-light"
                    />
                  </div>`
);

// 6. domingo_policy
content = content.replace(
  /<div class="flex items-center justify-between">\s*<span[^>]*>\s*Desativar mult\. de Domingo\?[\s\S]*?id="disable_sunday_auto_multiplier"[\s\S]*?<\/div>/,
  `<div>
                    <label
                      for="domingo_policy"
                      class="block text-sm font-medium text-muted"
                      >Política de Domingos</label
                    ><select id="domingo_policy" class="form-input-light">
                      <option value="folga_compensatoria">Gera Folga Compensatória</option>
                      <option value="100_percent">Paga 100% como Extra</option>
                    </select>
                  </div>`
);

// 7. horas_extras_padrao_dia and button wrapper fix
content = content.replace(
  /<button\s+type="submit"\s+class="w-full bg-green-600[\s\S]*?>\s*(?:<!-- NOVO:.*?-->\s*)?<div class="card p-5">[\s\S]*?Painel Mensal[\s\S]*?<\/button>/,
  `</div>
              <div class="card p-5">
                <h3 class="text-lg font-semibold text-default border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">Painel Mensal</h3>
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label for="horas_extras_padrao_dia" class="block text-sm font-medium text-muted mb-1">Meta de HE (dia)</label>
                      <input type="time" id="horas_extras_padrao_dia" class="form-input-light" />
                    </div>
                    <div class="flex items-center justify-between col-span-2">
                        <div>
                          <span class="text-sm font-medium text-muted">DSR</span>
                          <p class="text-xs text-muted">Considerar Descanso Semanal Remunerado?</p>
                        </div>
                        <label class="toggle-switch">
                          <input type="checkbox" id="dsr_ativo" checked />
                          <span class="slider"></span>
                        </label>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-green-500/30 transition-all"
              >
                Salvar Configurações
              </button>`
);


fs.writeFileSync(filePath, content, 'utf8');
console.log('HTML Patched');

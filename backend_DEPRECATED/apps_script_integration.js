// ============================================================================
// CONFIGURAÇÃO E INSTALAÇÃO
// ============================================================================
// 1. Cole este código no Apps Script.
// 2. Salve.
// 3. Recarregue a planilha (F5).
// 4. No menu "Sistema", clique em "🔧 Configurar Tudo" (Isso é obrigatório para o clique funcionar).
// ============================================================================

var BACKEND_URL = "http://cardapyia.com/api"; // ⚠️ ATENÇÃO: Use uma URL pública (ngrok/deploy), não localhost!

// Lista de profissões de fallback caso a API falhe (para testes)
var FALLBACK_PROFESSIONS = [
  "Eletricista", "Encanador", "Pedreiro", "Pintor", 
  "Jardineiro", "Diarista", "Montador de Móveis", 
  "Chaveiro", "Mecânico", "Técnico de Refrigeração"
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sistema')
      .addItem('🔧 Configurar Tudo (Obrigatório)', 'setupEnvironment')
      .addSeparator()
      .addItem('➕ Criar Novo Serviço', 'openCreateServiceModal')
      .addItem('📥 Baixar do Banco (Resetar Planilha)', 'downloadFromDatabase')
      .addItem('� Salvar Alterações no Banco', 'syncWithDatabase')
      .addSeparator()
      .addItem('📊 Recriar Gráfico', 'createDashboard')
      .addToUi();
}

// ============================================================================
// CONFIGURAÇÃO AUTOMÁTICA (TRIGGERS E COLUNAS)
// ============================================================================

function setupEnvironment() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var ui = SpreadsheetApp.getUi();
  
  // 1. Criar Coluna de Ação (EDITAR) se não existir
  var header = sheet.getRange("H1").getValue();
  if (header !== "EDITAR") {
    sheet.getRange("H1").setValue("EDITAR").setFontWeight("bold");
    sheet.setColumnWidth(8, 60); // Coluna H estreita
    
    // Adicionar checkboxes até a última linha com dados
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 8, lastRow - 1, 1).insertCheckboxes();
    }
  }

  // 2. Configurar Gatilho de Edição (Trigger)
  // Remove triggers antigos para não duplicar
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  // Cria novo trigger para detectar o clique na checkbox
  ScriptApp.newTrigger('onCheckboxEdit')
      .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
      .onEdit()
      .create();
      
  ui.alert('✅ Configuração Concluída!\n\nAgora, basta clicar na caixinha da coluna "EDITAR" para abrir o formulário.');
}

// ============================================================================
// DETECTOR DE CLIQUES (GATILHO)
// ============================================================================

function onCheckboxEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var row = range.getRow();
  var col = range.getColumn();
  
  // Verifica se o clique foi na coluna 8 (H - EDITAR) e se não é cabeçalho
  if (col === 8 && row > 1 && e.value === "TRUE") {
    // 1. Desmarca a caixa imediatamente
    range.setValue(false);
    
    // 2. Abre o Modal de Edição para esta linha
    openEditModalForRow(row);
  }
}

// ============================================================================
// MODAIS E FORMULÁRIOS
// ============================================================================

function openEditModalForRow(row) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Assumes columns: A:ID, B:Prof, C:Name, D:Unit, E:Price, F:Key, G:Active
  var data = {
    row: row,
    id: sheet.getRange(row, 1).getValue(),
    professionName: sheet.getRange(row, 2).getValue(),
    name: sheet.getRange(row, 3).getValue(),
    unitName: sheet.getRange(row, 4).getValue(),
    unitPrice: sheet.getRange(row, 5).getValue(),
    keywords: sheet.getRange(row, 6).getValue(),
    active: sheet.getRange(row, 7).getValue()
  };
  
  var html = createServiceFormHtml(data);
  SpreadsheetApp.getUi().showModalDialog(html, '✏️ Editando: ' + data.name);
}

function openCreateServiceModal() {
  var html = createServiceFormHtml(null);
  SpreadsheetApp.getUi().showModalDialog(html, '➕ Criar Novo Serviço');
}

function createServiceFormHtml(data) {
  var isNew = (data == null);
  if (!data) {
    data = { id: '', row: '', professionName: '', name: '', unitName: '', unitPrice: '', keywords: '', active: true };
  }
  
  // Busca profissões (Síncrono para renderizar no HTML)
  var professions = getProfessionOptions();

  var htmlString = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
        <style>
          body { padding: 20px; font-family: sans-serif; }
          .form-group label { font-weight: bold; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <form id="serviceForm" onsubmit="handleFormSubmit(this)">
          <input type="hidden" name="id" value="${data.id}">
          <input type="hidden" name="row" value="${data.row}">
          
          <div class="form-group">
            <label>Profissão</label>
            <select class="form-control" name="professionName" required>
              <option value="">Selecione...</option>
              ${professions.map(p => `<option value="${p}" ${p === data.professionName ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Nome do Serviço</label>
            <input type="text" class="form-control" name="name" value="${data.name}" required>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label>Unidade</label>
              <input type="text" class="form-control" name="unitName" value="${data.unitName}">
            </div>
            <div class="form-group col-6">
              <label>Preço</label>
              <input type="number" step="0.01" class="form-control" name="unitPrice" value="${data.unitPrice}" required>
            </div>
          </div>

          <div class="form-group">
            <label>Palavras-chave</label>
            <input type="text" class="form-control" name="keywords" value="${data.keywords}">
          </div>

          <div class="form-check mb-3">
            <input type="checkbox" class="form-check-input" name="active" id="activeCheck" ${data.active ? 'checked' : ''}>
            <label class="form-check-label" for="activeCheck">Ativo</label>
          </div>

          <button type="submit" class="btn btn-primary btn-block">
            ${isNew ? 'Criar Serviço' : 'Salvar Alterações'}
          </button>
        </form>

        <script>
          function handleFormSubmit(formObject) {
            var btn = formObject.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = 'Salvando...';

            var data = {
              id: formObject.id.value,
              row: formObject.row.value,
              professionName: formObject.professionName.value,
              name: formObject.name.value,
              unitName: formObject.unitName.value,
              unitPrice: formObject.unitPrice.value,
              keywords: formObject.keywords.value,
              active: formObject.active.checked
            };

            google.script.run
              .withSuccessHandler(closeModal)
              .withFailureHandler(showError)
              .processForm(data);
          }

          function closeModal() {
            google.script.host.close();
          }

          function showError(msg) {
            alert('Erro: ' + msg);
            var btn = document.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.innerHTML = 'Tentar Novamente';
          }
        </script>
      </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(htmlString).setWidth(400).setHeight(600);
}

function processForm(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var price = data.unitPrice.toString().replace('.', ',');
  
  if (data.id === "") {
    // CREATE
    // Usamos getRange/setValue em vez de appendRow para não tocar na Coluna A (ID Protegido)
    var newRow = sheet.getLastRow() + 1;
    
    // Define valores da Coluna B (2) até G (7)
    sheet.getRange(newRow, 2, 1, 6).setValues([[
      data.professionName, 
      data.name, 
      data.unitName, 
      price, 
      data.keywords, 
      data.active
    ]]);
    
    // Adiciona Checkbox nas colunas G (Ativo) e H (Editar)
    sheet.getRange(newRow, 7).insertCheckboxes();
    sheet.getRange(newRow, 8).insertCheckboxes();
    sheet.getRange(newRow, 8).setValue(false);
    
  } else {
    // UPDATE
    var r = parseInt(data.row);
    // Safety check
    var currentId = sheet.getRange(r, 1).getValue();
    if (currentId.toString() !== data.id.toString()) {
      throw new Error("ID incompatível. A linha pode ter mudado.");
    }
    
    sheet.getRange(r, 2).setValue(data.professionName);
    sheet.getRange(r, 3).setValue(data.name);
    sheet.getRange(r, 4).setValue(data.unitName);
    sheet.getRange(r, 5).setValue(price);
    sheet.getRange(r, 6).setValue(data.keywords);
    sheet.getRange(r, 7).setValue(data.active);
  }
  
  syncWithDatabase();
  try {
    Utilities.sleep(1500);
    UrlFetchApp.fetch(BACKEND_URL + "/integrations/catalog/export", {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true
    });
  } catch (e) {}
}

// ============================================================================
// HELPERS & DASHBOARD
// ============================================================================

function createDashboard() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Limpa gráficos antigos
  var charts = sheet.getCharts();
  for (var i = 0; i < charts.length; i++) {
    sheet.removeChart(charts[i]);
  }
  
  // Cria Gráfico na Coluna J
  var chart = sheet.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sheet.getRange("B2:B"))
    .setPosition(2, 10, 0, 0)
    .setOption('title', 'Serviços por Profissão')
    .setOption('hAxis', {title: 'Quantidade'})
    .build();
    
  sheet.insertChart(chart);
  SpreadsheetApp.getActiveSpreadsheet().toast("Gráfico atualizado!", "Sucesso");
}

function getProfessionOptions() {
  var endpoint = BACKEND_URL + "/integrations/professions";
  try {
    var response = UrlFetchApp.fetch(endpoint, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var json = JSON.parse(response.getContentText());
      if (json.success && json.professions) return json.professions;
    }
  } catch (e) { 
    Logger.log("Erro ao buscar profissões: " + e); 
    // Se falhar a conexão (ex: localhost não acessível), usa fallback
  }
  return FALLBACK_PROFESSIONS; 
}

function syncWithDatabase() {
  var endpoint = BACKEND_URL + "/integrations/catalog/sync";
  try {
    var response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ source: 'google_sheets_trigger' }),
      muteHttpExceptions: true
    });
    SpreadsheetApp.getActiveSpreadsheet().toast("✅ Dados Salvos no Banco!", "Sistema");
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast("❌ Erro ao Salvar", "Erro");
  }
}

function downloadFromDatabase() {
  var endpoint = BACKEND_URL + "/integrations/catalog/export";
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.alert('Resetar Planilha?', 'Isso apagará a planilha atual e baixará tudo do banco de dados novamente. Deseja continuar?', ui.ButtonSet.YES_NO);
  
  if (response == ui.Button.YES) {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast("Baixando dados...", "Aguarde");
      UrlFetchApp.fetch(endpoint, {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true
      });
      SpreadsheetApp.getActiveSpreadsheet().toast("✅ Planilha Resetada com Sucesso!", "Sistema");
    } catch (e) {
      SpreadsheetApp.getActiveSpreadsheet().toast("❌ Erro ao Baixar", "Erro");
    }
  }
}

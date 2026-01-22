// ====== CONFIGURAÇÕES ======
const SHEET_ID = '15DF8LfTpuRw47etH-gZX49zwUebTUPB2FxtHibPtmY4';
const SHEET_HORARIOS = 'Horarios';
const SHEET_AGENDAMENTOS = 'Agendamentos';

// Planilha geral do posto de saúde (onde você realmente atende)
// IMPORTANTE: Configure o ID da sua planilha do posto aqui
const SHEET_POSTO_ID = '1fpwmi85pLQWPQrKJiawZOrSOip8MQlsfmyUpIU1wGlk';

// Identificador da equipe nas abas do posto (ex: "783", "ENF", etc.)
const IDENTIFICADOR_EQUIPE = '783';

// ====== ENDPOINTS (API) ======

/**
 * GET:
 *  - ?action=getSlots  -> retorna lista de horários LIVRES em JSON
 */
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action === 'getSlots') {
    const slots = getAvailableSlots();
    return ContentService
      .createTextOutput(JSON.stringify(slots))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Resposta padrão pra ação inválida
  return ContentService
    .createTextOutput(JSON.stringify({ error: 'Ação inválida' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST:
 *  - corpo JSON com { rowIndex, nome, observacoes }
 *  - grava na planilha e retorna JSON com mensagem
 */
function doPost(e) {
  try {
    let data = null;
    
    // Tenta obter dados do corpo da requisição (POST body)
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseError) {
        // Se não conseguir fazer parse, tenta usar como string
        const contents = e.postData.contents;
        if (contents && contents.trim().startsWith('{')) {
          data = JSON.parse(contents);
        } else {
          throw new Error('Erro ao fazer parse do JSON: ' + parseError.message + '. Conteúdo recebido: ' + contents.substring(0, 200));
        }
      }
    }
    // Se não encontrou no postData, tenta nos parâmetros
    else if (e && e.parameter) {
      // Tenta construir objeto a partir dos parâmetros
      data = {
        rowIndex: e.parameter.rowIndex ? parseInt(e.parameter.rowIndex) : undefined,
        nome: e.parameter.nome || '',
        observacoes: e.parameter.observacoes || ''
      };
    }

    // Log para debug (remova em produção se necessário)
    console.log('doPost recebeu:', {
      hasPostData: !!(e && e.postData),
      hasContents: !!(e && e.postData && e.postData.contents),
      hasParameter: !!(e && e.parameter),
      data: data
    });

    // Valida se os dados foram obtidos
    if (!data || typeof data !== 'object') {
      throw new Error('Nenhum dado válido recebido. Verifique se o frontend está enviando JSON corretamente.');
    }

    // Valida se os dados obrigatórios estão presentes
    if (data.rowIndex === undefined || data.rowIndex === null) {
      throw new Error('Dados inválidos: rowIndex não encontrado ou inválido. Recebido: ' + JSON.stringify(data));
    }

    if (!data.nome) {
      throw new Error('Dados inválidos: nome é obrigatório. Recebido: ' + JSON.stringify(data));
    }

    // Converte rowIndex para número se necessário
    if (typeof data.rowIndex === 'string') {
      data.rowIndex = parseInt(data.rowIndex);
    }

    // Chama a função de agendamento
    const res = bookSlot(data);

    return ContentService
      .createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log do erro completo
    console.error('Erro em doPost:', error);
    
    // Retorna erro em formato JSON
    return ContentService
      .createTextOutput(JSON.stringify({
        sucesso: false,
        mensagem: error.message || 'Erro desconhecido',
        erro: error.toString(),
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ====== LÓGICA DE NEGÓCIO ======

/**
 * Lê a aba Horarios e devolve só horários LIVRES já formatados
 */
function getAvailableSlots() {
  // Força o uso do ID específico, não da planilha vinculada
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Valida se abriu a planilha correta
  const planilhaIdAberta = ss.getId();
  if (planilhaIdAberta !== SHEET_ID) {
    throw new Error('ERRO: Planilha aberta não corresponde ao ID configurado! ' +
      'Esperado: ' + SHEET_ID + ', Mas abriu: ' + planilhaIdAberta);
  }
  
  // Log para debug (pode remover depois)
  console.log('✅ Planilha correta aberta:', {
    idEsperado: SHEET_ID,
    idAberto: planilhaIdAberta,
    nomePlanilha: ss.getName(),
    url: ss.getUrl()
  });
  
  const sheet = ss.getSheetByName(SHEET_HORARIOS);

  if (!sheet) {
    throw new Error('A aba "Horarios" não foi encontrada na planilha.');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  // Linha 2 até a última, colunas A (Data), B (Hora), C (Status), D (Origem)
  const range = sheet.getRange(2, 1, lastRow - 1, 4);
  const values = range.getValues();

  const slots = [];

  values.forEach((row, index) => {
    const dataCell = row[0];
    const horaCell = row[1];
    const status = (row[2] || '').toString().toUpperCase().trim();
    const origem = (row[3] || '').toString().trim(); // Coluna D - Origem

    if (status === 'LIVRE') {
      const rowIndex = index + 2;

      const dataObj = new Date(dataCell);

      const dataStr = Utilities.formatDate(
        dataObj,
        'America/Sao_Paulo',
        'dd/MM/yyyy'
      );

      const horaStr = Utilities.formatDate(
        new Date(horaCell),
        'America/Sao_Paulo',
        'HH:mm'
      );

      const diasSemana = [
        'Domingo',
        'Segunda-feira',
        'Terça-feira',
        'Quarta-feira',
        'Quinta-feira',
        'Sexta-feira',
        'Sábado'
      ];
      const diaSemana = diasSemana[dataObj.getDay()];

      slots.push({
        rowIndex: rowIndex,
        data: dataStr,
        hora: horaStr,
        diaSemana: diaSemana,
        status: status, // Inclui status no retorno
        origem: origem,  // Inclui origem no retorno (O para enfermagem, F para médico)
        // Campos auxiliares para ordenação (não aparecem no frontend)
        _dataObj: dataObj,
        _horaObj: new Date(horaCell)
      });
    }
  });

  // Ordena por data e hora (mais próximos primeiro)
  slots.sort((a, b) => {
    // Primeiro compara a data
    const diffData = a._dataObj.getTime() - b._dataObj.getTime();
    if (diffData !== 0) return diffData;
    
    // Se a data for igual, compara a hora
    return a._horaObj.getTime() - b._horaObj.getTime();
  });

  // Remove os campos auxiliares antes de retornar
  slots.forEach(slot => {
    delete slot._dataObj;
    delete slot._horaObj;
  });

  return slots;
}

/**
 * Marca horário como OCUPADO e registra na aba Agendamentos
 */
function bookSlot(bookingData) {
  // Validação dos dados de entrada
  if (!bookingData || typeof bookingData !== 'object') {
    throw new Error('Dados de agendamento inválidos: bookingData é undefined ou não é um objeto');
  }

  if (!bookingData.rowIndex && bookingData.rowIndex !== 0) {
    throw new Error('Dados de agendamento inválidos: rowIndex não encontrado');
  }

  if (!bookingData.nome) {
    throw new Error('Dados de agendamento inválidos: nome é obrigatório');
  }

  // Força o uso do ID específico, não da planilha vinculada
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Valida se abriu a planilha correta
  const planilhaIdAberta = ss.getId();
  if (planilhaIdAberta !== SHEET_ID) {
    throw new Error('ERRO: Planilha aberta não corresponde ao ID configurado! ' +
      'Esperado: ' + SHEET_ID + ', Mas abriu: ' + planilhaIdAberta);
  }
  
  // Log para debug (pode remover depois)
  console.log('✅ Planilha correta aberta para agendamento:', {
    idEsperado: SHEET_ID,
    idAberto: planilhaIdAberta,
    nomePlanilha: ss.getName()
  });
  
  const sheetHor = ss.getSheetByName(SHEET_HORARIOS);
  const sheetAg = ss.getSheetByName(SHEET_AGENDAMENTOS);

  const rowIndex = bookingData.rowIndex;
  const nome = bookingData.nome;
  const observacoes = bookingData.observacoes || '';

  const row = sheetHor.getRange(rowIndex, 1, 1, 3).getValues()[0];
  const statusAtual = (row[2] || '').toString().toUpperCase().trim();

  if (statusAtual !== 'LIVRE') {
    throw new Error('Esse horário acabou de ser ocupado. Por favor, escolha outro.');
  }

  // Pega os dados ANTES de deletar a linha
  const data = row[0];
  const hora = row[1];

  // Deleta a linha da planilha de horários (em vez de marcar como OCUPADO)
  sheetHor.deleteRow(rowIndex);

  // Formata a hora para HH:mm (sem segundos)
  const horaFormatada = Utilities.formatDate(
    new Date(hora),
    'America/Sao_Paulo',
    'HH:mm'
  );

  // Formata a data para dd/MM/yyyy
  const dataFormatada = Utilities.formatDate(
    new Date(data),
    'America/Sao_Paulo',
    'dd/MM/yyyy'
  );

  // Registra o agendamento na planilha pessoal
  // Ordem: Timestamp, Data, Hora, Nome, Observacoes
  sheetAg.appendRow([
    new Date(), // Timestamp
    dataFormatada,
    horaFormatada,
    nome,
    observacoes
  ]);

  // ====== REGISTRA NA PLANILHA GERAL DO POSTO DE SAÚDE ======
  // Colunas da Enfermagem: M=enf, N=horário, O=nome, P=DN, Q=motivo
  let registrouNoPosto = false;
  let mensagemPosto = '';
  
  try {
    Logger.log('[ENF] ========== INICIANDO REGISTRO NA PLANILHA DO POSTO ==========');
    Logger.log('[ENF] Data: ' + dataFormatada + ', Hora: ' + horaFormatada);
    Logger.log('[ENF] Paciente: ' + nome);
    Logger.log('[ENF] ID da planilha do posto: ' + SHEET_POSTO_ID);
    
    const ssPosto = SpreadsheetApp.openById(SHEET_POSTO_ID);
    Logger.log('[ENF] ✅ Abriu planilha do posto: ' + ssPosto.getName());
    
    // Busca a aba da equipe que contém a data do agendamento
    const sheetPosto = encontrarAbaEquipePorData(ssPosto, dataFormatada);
    
    if (sheetPosto) {
      Logger.log('[ENF] ✅ Aba encontrada: ' + sheetPosto.getName());
      
      // Procura a linha que tem "reserva" na coluna O com a mesma data e horário (coluna N)
      const linhaEncontrada = encontrarLinhaReservaEnfermagem(sheetPosto, dataFormatada, horaFormatada);
      
      if (linhaEncontrada > 0) {
        // Substitui "reserva" pelos dados do paciente nas colunas de enfermagem
        // M (13) = "enf", O (15) = Nome, P (16) = DN (vazio por enquanto), Q (17) = Motivo
        sheetPosto.getRange(linhaEncontrada, 13).setValue('enf');          // Coluna M - Marcado pela enfermagem
        sheetPosto.getRange(linhaEncontrada, 15).setValue(nome);           // Coluna O - Nome (substituindo "reserva")
        // Coluna P (16) - Data de Nascimento - não temos esse dado no formulário atual
        sheetPosto.getRange(linhaEncontrada, 17).setValue(observacoes);    // Coluna Q - Motivo
        Logger.log('[ENF] ✅ Dados preenchidos na linha ' + linhaEncontrada + ' da planilha do posto (colunas M, O, Q)');
        registrouNoPosto = true;
        mensagemPosto = 'Registrado na planilha do posto';
      } else {
        mensagemPosto = 'Linha com "reserva" não encontrada para ' + dataFormatada + ' ' + horaFormatada;
        Logger.log('[ENF] ❌ ' + mensagemPosto);
      }
    } else {
      mensagemPosto = 'Aba da equipe ' + IDENTIFICADOR_EQUIPE + ' não encontrada para a data ' + dataFormatada;
      Logger.log('[ENF] ❌ ' + mensagemPosto);
    }
  } catch (erroPosto) {
    // Se der erro ao registrar no posto, não impede o agendamento principal
    mensagemPosto = 'Erro: ' + erroPosto.message;
    Logger.log('[ENF] ❌ Erro ao registrar na planilha do posto: ' + erroPosto.message);
    Logger.log('[ENF] Stack: ' + erroPosto.stack);
  }
  
  Logger.log('[ENF] ========== FIM DO REGISTRO ==========');

  return {
    sucesso: true,
    mensagem: 'Agendamento realizado com sucesso!',
    data: data,
    hora: hora,
    registrouNoPosto: registrouNoPosto,
    mensagemPosto: mensagemPosto
  };
}

// ====== FUNÇÕES DE INTEGRAÇÃO COM PLANILHA DO POSTO ======

/**
 * Encontra a aba da equipe que contém a data especificada
 * Formato da aba: "783 (08/12 - 12/12) A" onde A=2025, B=2026
 * 
 * SUPER OTIMIZADO: Tenta adivinhar o nome da aba primeiro (instantâneo!)
 * Se não encontrar, faz busca filtrada como fallback
 */
function encontrarAbaEquipePorData(spreadsheet, dataStr) {
  // Converte a data do agendamento para comparação (DD/MM/YYYY)
  const partesData = dataStr.split('/');
  const diaAgendamento = parseInt(partesData[0], 10);
  const mesAgendamento = parseInt(partesData[1], 10);
  const anoAgendamento = parseInt(partesData[2], 10);
  
  // Define o sufixo baseado no ano: A=2025, B=2026
  let sufixoAno = '';
  if (anoAgendamento === 2025) {
    sufixoAno = ' A';
  } else if (anoAgendamento === 2026) {
    sufixoAno = ' B';
  }
  
  // ========== OTIMIZAÇÃO: TENTAR ADIVINHAR O NOME DA ABA ==========
  // Calcula a semana de trabalho (segunda a sexta) que contém a data
  const dataObj = new Date(anoAgendamento, mesAgendamento - 1, diaAgendamento);
  const diaSemana = dataObj.getDay(); // 0=dom, 1=seg, ..., 5=sex, 6=sab
  
  // Encontra a segunda-feira da semana
  let diasAteSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(dataObj);
  segunda.setDate(dataObj.getDate() + diasAteSegunda);
  
  // Encontra a sexta-feira da semana
  const sexta = new Date(segunda);
  sexta.setDate(segunda.getDate() + 4);
  
  const diaIni = segunda.getDate();
  const mesIni = segunda.getMonth() + 1;
  const diaFim = sexta.getDate();
  const mesFim = sexta.getMonth() + 1;
  
  // Formata com zero à esquerda
  const diaIniStr = diaIni < 10 ? '0' + diaIni : '' + diaIni;
  const mesIniStr = mesIni < 10 ? '0' + mesIni : '' + mesIni;
  const diaFimStr = diaFim < 10 ? '0' + diaFim : '' + diaFim;
  const mesFimStr = mesFim < 10 ? '0' + mesFim : '' + mesFim;
  
  // Tenta vários formatos de nome comuns
  const tentativas = [
    IDENTIFICADOR_EQUIPE + ' (' + diaIniStr + '/' + mesIniStr + ' - ' + diaFimStr + '/' + mesFimStr + ')' + sufixoAno,
    ' ' + IDENTIFICADOR_EQUIPE + ' (' + diaIniStr + '/' + mesIniStr + ' - ' + diaFimStr + '/' + mesFimStr + ')' + sufixoAno,
    IDENTIFICADOR_EQUIPE + ' (' + diaIni + '/' + mesIni + ' - ' + diaFim + '/' + mesFim + ')' + sufixoAno,
    IDENTIFICADOR_EQUIPE + '(' + diaIniStr + '/' + mesIniStr + ' - ' + diaFimStr + '/' + mesFimStr + ')' + sufixoAno,
    IDENTIFICADOR_EQUIPE + ' (' + diaIni + '/' + mesIniStr + '-' + diaFim + '/' + mesFimStr + ')' + sufixoAno,
    IDENTIFICADOR_EQUIPE + ' (' + diaIniStr + '/' + mesIniStr + '-' + diaFimStr + '/' + mesFimStr + ')' + sufixoAno,
    IDENTIFICADOR_EQUIPE + ' (' + diaIni + '-' + diaFim + '/' + mesIniStr + ')' + sufixoAno,
    IDENTIFICADOR_EQUIPE + ' (' + diaIniStr + '-' + diaFimStr + '/' + mesIniStr + ')' + sufixoAno,
  ];
  
  Logger.log('[ENF] Buscando aba para ' + dataStr);
  Logger.log('[ENF] Semana calculada: ' + diaIni + '/' + mesIni + ' - ' + diaFim + '/' + mesFim);
  Logger.log('[ENF] Sufixo do ano: "' + sufixoAno + '"');
  Logger.log('');
  Logger.log('[ENF] Tentando encontrar por nome direto:');
  
  // Tenta encontrar por nome direto (MUITO RÁPIDO!)
  for (let i = 0; i < tentativas.length; i++) {
    Logger.log('[ENF]   Tentativa ' + (i+1) + ': "' + tentativas[i] + '"');
    const sheet = spreadsheet.getSheetByName(tentativas[i]);
    if (sheet) {
      Logger.log('[ENF] ✅ ENCONTRADA! Aba: ' + tentativas[i]);
      return sheet;
    }
  }
  
  Logger.log('[ENF] Nome direto não encontrado, fazendo busca filtrada...');
  
  // ========== FALLBACK: BUSCA FILTRADA ==========
  const sheets = spreadsheet.getSheets();
  
  // Filtra primeiro: só abas que contêm "783", não são modelo, e têm o sufixo certo
  for (let i = 0; i < sheets.length; i++) {
    const nomeAba = sheets[i].getName();
    
    // Filtro rápido
    if (nomeAba.indexOf(IDENTIFICADOR_EQUIPE) === -1) continue;
    if (nomeAba.toLowerCase().indexOf('modelo') !== -1) continue;
    
    // Filtro de sufixo
    if (sufixoAno) {
      const nomeAbaTrimmed = nomeAba.trim();
      if (!nomeAbaTrimmed.endsWith(sufixoAno.trim())) continue;
    }
    
    // Verifica se a data está no período
    const match = nomeAba.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/);
    if (match) {
      const diaInicio = parseInt(match[1], 10);
      const mesInicio = parseInt(match[2], 10);
      const diaFimAba = parseInt(match[3], 10);
      const mesFimAba = parseInt(match[4], 10);
      
      if (verificarDataNoPeriodo(diaAgendamento, mesAgendamento, diaInicio, mesInicio, diaFimAba, mesFimAba)) {
        Logger.log('[ENF] ✅ Aba encontrada por busca: ' + nomeAba);
        return sheets[i];
      }
    }
  }
  
  Logger.log('[ENF] ❌ Nenhuma aba encontrada para a data ' + dataStr);
  return null;
}

/**
 * Verifica se uma data está dentro de um período
 */
function verificarDataNoPeriodo(dia, mes, diaInicio, mesInicio, diaFim, mesFim) {
  // Mesmo mês início e fim
  if (mesInicio === mesFim) {
    return mes === mesInicio && dia >= diaInicio && dia <= diaFim;
  }
  
  // Período cruza meses (ex: 30/11 - 04/12)
  if (mes === mesInicio && dia >= diaInicio) {
    return true;
  }
  if (mes === mesFim && dia <= diaFim) {
    return true;
  }
  
  return false;
}

/**
 * Encontra a linha que tem "reserva" na coluna O (enfermagem) com a data e horário correspondentes
 * Colunas de Enfermagem: C = Data (mesclada), N = Horário, O = Nome (onde está "reserva")
 * 
 * IMPORTANTE: Busca flexível - aceita "reserva", "RESERVA", "Reserva", "reservado", etc.
 */
function encontrarLinhaReservaEnfermagem(sheet, dataStr, horaStr) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  
  // Lê colunas A até Q (17 colunas)
  const dados = sheet.getRange(1, 1, lastRow, 17).getDisplayValues();
  
  // Extrai dia e mês da data do agendamento (formato DD/MM/YYYY)
  const partesData = dataStr.split('/');
  const diaAgendamento = partesData[0].replace(/^0/, ''); // Remove zero à esquerda
  const mesAgendamento = partesData[1].replace(/^0/, ''); // Remove zero à esquerda
  
  // Normaliza a hora (remove zero à esquerda se houver)
  const horaAgendamento = horaStr.replace(/^0/, '');
  
  Logger.log('[ENF] Buscando nas colunas de enfermagem: dia=' + diaAgendamento + ', mês=' + mesAgendamento + ', hora=' + horaAgendamento);
  Logger.log('[ENF] Total de linhas na aba: ' + lastRow);
  
  // Guarda a última data encontrada (para lidar com células mescladas)
  let ultimaDataEncontrada = '';
  
  // Lista de termos que indicam que o horário está reservado para enfermagem
  const termosReserva = ['reserva', 'reservado', 'reserv', 'enf', 'enfermagem'];
  
  for (let i = 0; i < dados.length; i++) {
    let dataLinha = (dados[i][2] || '').toString().trim(); // Coluna C (índice 2) - Data
    const horaLinha = (dados[i][13] || '').toString().trim(); // Coluna N (índice 13) - Horário enfermagem
    const nomeLinha = (dados[i][14] || '').toString().trim(); // Coluna O (índice 14) - Nome/reserva
    const nomeLinhaLower = nomeLinha.toLowerCase();
    
    // Se a célula da data está vazia, usa a última data encontrada (célula mesclada)
    if (dataLinha) {
      ultimaDataEncontrada = dataLinha;
    } else {
      dataLinha = ultimaDataEncontrada;
    }
    
    // Verifica se é um termo de reserva na coluna O
    // Aceita: "reserva", "RESERVA", "Reserva", "reservado", "enf", etc.
    const ehReserva = termosReserva.some(termo => nomeLinhaLower === termo || nomeLinhaLower.indexOf(termo) === 0);
    
    if (!ehReserva) {
      continue;
    }
    
    // Compara o horário da coluna N (com e sem zero à esquerda)
    const horaLinhaLimpa = horaLinha.replace(/^0/, '');
    const horaMatch = horaLinha === horaStr || horaLinhaLimpa === horaAgendamento;
    
    if (!horaMatch) {
      Logger.log('[ENF] Linha ' + (i+1) + ': reserva encontrada mas hora não bate (hora planilha="' + horaLinha + '", hora agendamento="' + horaStr + '")');
      continue;
    }
    
    // Compara a data
    // A data na planilha pode estar em vários formatos: "9/12", "09/12", "9/12/2024", etc.
    let dataMatch = false;
    
    // Extrai dia/mês da data da linha
    const matchData = dataLinha.match(/(\d{1,2})\/(\d{1,2})/);
    if (matchData) {
      const diaLinha = matchData[1].replace(/^0/, '');
      const mesLinha = matchData[2].replace(/^0/, '');
      dataMatch = (diaLinha === diaAgendamento && mesLinha === mesAgendamento);
    }
    
    Logger.log('[ENF] Linha ' + (i+1) + ': data="' + dataLinha + '", horaN="' + horaLinha + '", nomeO="' + nomeLinha + '", dataMatch=' + dataMatch + ', horaMatch=' + horaMatch);
    
    if (dataMatch && horaMatch) {
      Logger.log('[ENF] ✅ ENCONTROU na linha ' + (i + 1));
      return i + 1; // Retorna o número da linha (1-indexed)
    }
  }
  
  Logger.log('[ENF] ❌ Não encontrou linha com reserva para ' + dataStr + ' ' + horaStr);
  Logger.log('[ENF] Verifique se existe "reserva" na coluna O com a data e hora correspondentes');
  return -1; // Não encontrou
}

/**
 * Encontra a aba da equipe na planilha do posto (versão simples)
 * Ignora a aba modelo e busca a aba atual
 */
function encontrarAbaEquipe(spreadsheet) {
  const sheets = spreadsheet.getSheets();
  
  for (let i = 0; i < sheets.length; i++) {
    const nomeAba = sheets[i].getName();
    
    // Verifica se contém o identificador da equipe mas NÃO é a aba modelo
    if (nomeAba.indexOf(IDENTIFICADOR_EQUIPE) !== -1 && nomeAba.toLowerCase().indexOf('modelo') === -1) {
      return sheets[i];
    }
  }
  
  return null;
}

/**
 * Função de teste para verificar qual planilha está sendo acessada
 * Execute esta função no editor do Google Apps Script para verificar
 */
function testarPlanilha() {
  try {
    console.log('🔍 Testando acesso à planilha...');
    console.log('📋 ID configurado (SHEET_ID):', SHEET_ID);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const idAberto = ss.getId();
    const nomePlanilha = ss.getName();
    const urlPlanilha = ss.getUrl();
    
    console.log('✅ Planilha aberta com sucesso!');
    console.log('📊 ID da planilha aberta:', idAberto);
    console.log('📝 Nome da planilha:', nomePlanilha);
    console.log('🔗 URL da planilha:', urlPlanilha);
    
    // Verifica se é a planilha correta
    if (idAberto === SHEET_ID) {
      console.log('✅ CORRETO: A planilha aberta corresponde ao ID configurado!');
    } else {
      console.error('❌ ERRO: A planilha aberta NÃO corresponde ao ID configurado!');
      console.error('   Esperado:', SHEET_ID);
      console.error('   Recebido:', idAberto);
    }
    
    // Lista as abas disponíveis
    const abas = ss.getSheets();
    console.log('\n📑 Abas disponíveis na planilha:');
    abas.forEach((aba, index) => {
      console.log(`   ${index + 1}. "${aba.getName()}"`);
    });
    
    // Verifica se as abas esperadas existem
    const sheetHor = ss.getSheetByName(SHEET_HORARIOS);
    const sheetAg = ss.getSheetByName(SHEET_AGENDAMENTOS);
    
    console.log('\n🔍 Verificação de abas:');
    if (sheetHor) {
      console.log(`✅ Aba "${SHEET_HORARIOS}" encontrada!`);
      console.log(`   Linhas: ${sheetHor.getLastRow()}`);
    } else {
      console.error(`❌ Aba "${SHEET_HORARIOS}" NÃO encontrada!`);
    }
    
    if (sheetAg) {
      console.log(`✅ Aba "${SHEET_AGENDAMENTOS}" encontrada!`);
      console.log(`   Linhas: ${sheetAg.getLastRow()}`);
    } else {
      console.error(`❌ Aba "${SHEET_AGENDAMENTOS}" NÃO encontrada!`);
    }
    
    return {
      sucesso: true,
      idConfigurado: SHEET_ID,
      idAberto: idAberto,
      nomePlanilha: nomePlanilha,
      urlPlanilha: urlPlanilha,
      corresponde: idAberto === SHEET_ID,
      abas: abas.map(s => s.getName())
    };
    
  } catch (error) {
    console.error('❌ Erro ao testar planilha:', error);
    return {
      sucesso: false,
      erro: error.toString(),
      mensagem: error.message
    };
  }
}

// ====== FUNÇÃO DE TESTE - BUSCA NA PLANILHA DO POSTO ======
/**
 * Execute esta função para testar se consegue encontrar "reserva" na coluna O (enfermagem)
 */
function testarBuscaReserva() {
  // ALTERE ESTES VALORES PARA TESTAR:
  const dataParaTestar = '20/01/2026';
  const horaParaTestar = '09:00';
  
  Logger.log('========== TESTE DE BUSCA - ENFERMAGEM ==========');
  Logger.log('Data: ' + dataParaTestar);
  Logger.log('Hora (coluna N): ' + horaParaTestar);
  Logger.log('Buscando "reserva" na coluna O');
  Logger.log('Identificador da equipe: ' + IDENTIFICADOR_EQUIPE);
  
  try {
    const ssPosto = SpreadsheetApp.openById(SHEET_POSTO_ID);
    Logger.log('✅ Abriu planilha do posto: ' + ssPosto.getName());
    
    // Lista todas as abas da equipe 783 para visualização
    const todasAbas = ssPosto.getSheets();
    Logger.log('Total de abas na planilha: ' + todasAbas.length);
    Logger.log('');
    Logger.log('Abas da equipe ' + IDENTIFICADOR_EQUIPE + ':');
    todasAbas.forEach(aba => {
      const nome = aba.getName();
      if (nome.indexOf(IDENTIFICADOR_EQUIPE) !== -1 && nome.toLowerCase().indexOf('modelo') === -1) {
        Logger.log('  - ' + nome);
      }
    });
    Logger.log('');
    
    // Busca a aba da equipe (otimizado)
    const sheetPosto = encontrarAbaEquipePorData(ssPosto, dataParaTestar);
    
    if (sheetPosto) {
      Logger.log('✅ Aba encontrada: ' + sheetPosto.getName());
      
      // Busca a linha com "reserva" nas colunas de enfermagem
      const linha = encontrarLinhaReservaEnfermagem(sheetPosto, dataParaTestar, horaParaTestar);
      
      if (linha > 0) {
        Logger.log('✅ Linha com "reserva" encontrada: ' + linha);
        
        // Mostra o conteúdo das colunas de enfermagem (M até Q)
        const dadosLinha = sheetPosto.getRange(linha, 1, 1, 17).getDisplayValues()[0];
        Logger.log('Conteúdo da linha (colunas relevantes):');
        Logger.log('  C (Data): ' + dadosLinha[2]);
        Logger.log('  M (enf): ' + dadosLinha[12]);
        Logger.log('  N (Hora): ' + dadosLinha[13]);
        Logger.log('  O (Nome/reserva): ' + dadosLinha[14]);
        Logger.log('  P (DN): ' + dadosLinha[15]);
        Logger.log('  Q (Motivo): ' + dadosLinha[16]);
      } else {
        Logger.log('❌ Linha com "reserva" na coluna O NÃO encontrada');
        
        // Mostra algumas linhas para debug (colunas de enfermagem)
        Logger.log('Primeiras 30 linhas da aba (colunas C, N, O):');
        const dados = sheetPosto.getRange(1, 1, Math.min(30, sheetPosto.getLastRow()), 17).getDisplayValues();
        dados.forEach((row, i) => {
          Logger.log('Linha ' + (i+1) + ': C="' + row[2] + '" N="' + row[13] + '" O="' + row[14] + '"');
        });
      }
    } else {
      Logger.log('❌ Aba da equipe ' + IDENTIFICADOR_EQUIPE + ' NÃO encontrada para a data ' + dataParaTestar);
    }
  } catch (erro) {
    Logger.log('❌ ERRO: ' + erro.message);
  }
  
  Logger.log('========== FIM DO TESTE ==========');
}

/**
 * DIAGNÓSTICO COMPLETO - Execute para verificar todo o fluxo
 * Agora busca APENAS nas abas que terminam com "B" (ano 2026)
 */
function diagnosticarIntegracaoPosto() {
  Logger.log('========== DIAGNÓSTICO COMPLETO ==========');
  Logger.log('');
  
  // 1. Verificar acesso à planilha do posto
  Logger.log('1. VERIFICANDO ACESSO À PLANILHA DO POSTO');
  Logger.log('   ID configurado: ' + SHEET_POSTO_ID);
  
  try {
    const ssPosto = SpreadsheetApp.openById(SHEET_POSTO_ID);
    Logger.log('   ✅ Acesso OK: ' + ssPosto.getName());
    Logger.log('   URL: ' + ssPosto.getUrl());
    
    // 2. Listar APENAS abas que terminam com "B" (ano 2026)
    Logger.log('');
    Logger.log('2. ABAS DA EQUIPE ' + IDENTIFICADOR_EQUIPE + ' (apenas 2026 - terminam com B):');
    const todasAbas = ssPosto.getSheets();
    let abasEquipe2026 = [];
    todasAbas.forEach(aba => {
      const nome = aba.getName();
      const nomeTrimmed = nome.trim();
      // Só pega abas que contêm 783, não são modelo, E terminam com B
      if (nome.indexOf(IDENTIFICADOR_EQUIPE) !== -1 && 
          nome.toLowerCase().indexOf('modelo') === -1 &&
          nomeTrimmed.endsWith('B')) {
        abasEquipe2026.push(nome);
        Logger.log('   - "' + nome + '"');
      }
    });
    
    if (abasEquipe2026.length === 0) {
      Logger.log('   ❌ NENHUMA ABA ENCONTRADA para equipe ' + IDENTIFICADOR_EQUIPE + ' com sufixo B');
      return;
    }
    
    // 3. Verificar estrutura da PRIMEIRA aba de 2026
    Logger.log('');
    Logger.log('3. VERIFICANDO ESTRUTURA DA ABA: "' + abasEquipe2026[0] + '"');
    const primeiraAba = ssPosto.getSheetByName(abasEquipe2026[0]);
    if (primeiraAba) {
      // Mostra as primeiras 5 linhas para entender a estrutura
      Logger.log('   Primeiras 5 linhas (colunas A-Q):');
      const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
      const dados = primeiraAba.getRange(1, 1, 5, 17).getDisplayValues();
      dados.forEach((row, i) => {
        Logger.log('   Linha ' + (i+1) + ':');
        row.forEach((val, j) => {
          if (val) Logger.log('      ' + letras[j] + ': "' + val + '"');
        });
      });
      
      // 4. Procurar por "reserva" em QUALQUER coluna (para descobrir onde está)
      Logger.log('');
      Logger.log('4. PROCURANDO "reserva" EM QUALQUER COLUNA:');
      const todosDados = primeiraAba.getRange(1, 1, Math.min(100, primeiraAba.getLastRow()), 17).getDisplayValues();
      let encontrouReserva = false;
      todosDados.forEach((row, i) => {
        row.forEach((cell, j) => {
          if (cell && cell.toString().toLowerCase().indexOf('reserva') !== -1) {
            Logger.log('   Linha ' + (i+1) + ', Coluna ' + letras[j] + ' (índice ' + j + '): "' + cell + '"');
            encontrouReserva = true;
          }
        });
      });
      
      if (!encontrouReserva) {
        Logger.log('   ❌ "reserva" NÃO encontrada nas primeiras 100 linhas');
        Logger.log('   IMPORTANTE: Para o sistema funcionar, você precisa escrever "reserva" na coluna O');
        Logger.log('   nos horários que deseja disponibilizar para agendamento de enfermagem.');
      }
    }
    
  } catch (erro) {
    Logger.log('   ❌ ERRO ao acessar planilha: ' + erro.message);
    Logger.log('   Verifique se o SHEET_POSTO_ID está correto e se você tem permissão');
  }
  
  Logger.log('');
  Logger.log('========== FIM DO DIAGNÓSTICO ==========');
}

/**
 * Simula um agendamento para testar a integração com a planilha do posto
 * CUIDADO: Esta função NÃO faz alterações reais, apenas simula para debug
 */
function simularAgendamentoPosto() {
  // ========== CONFIGURE AQUI PARA TESTAR ==========
  const dataSimulada = '20/01/2026';  // Data no formato DD/MM/YYYY
  const horaSimulada = '09:00';       // Hora no formato HH:mm
  const nomeSimulado = 'TESTE - NÃO É REAL';
  // ================================================
  
  Logger.log('========== SIMULAÇÃO DE AGENDAMENTO ==========');
  Logger.log('Data: ' + dataSimulada);
  Logger.log('Hora: ' + horaSimulada);
  Logger.log('Nome: ' + nomeSimulado);
  Logger.log('');
  
  try {
    // 1. Tenta abrir a planilha do posto
    Logger.log('PASSO 1: Abrindo planilha do posto...');
    const ssPosto = SpreadsheetApp.openById(SHEET_POSTO_ID);
    Logger.log('✅ Planilha aberta: ' + ssPosto.getName());
    
    // 2. Tenta encontrar a aba
    Logger.log('');
    Logger.log('PASSO 2: Buscando aba da equipe ' + IDENTIFICADOR_EQUIPE + '...');
    const sheetPosto = encontrarAbaEquipePorData(ssPosto, dataSimulada);
    
    if (!sheetPosto) {
      Logger.log('❌ ABA NÃO ENCONTRADA!');
      Logger.log('');
      Logger.log('Abas disponíveis com ' + IDENTIFICADOR_EQUIPE + ':');
      ssPosto.getSheets().forEach(aba => {
        const nome = aba.getName();
        if (nome.indexOf(IDENTIFICADOR_EQUIPE) !== -1) {
          Logger.log('  - "' + nome + '"');
        }
      });
      return;
    }
    
    Logger.log('✅ Aba encontrada: ' + sheetPosto.getName());
    
    // 3. Tenta encontrar a linha com "reserva"
    Logger.log('');
    Logger.log('PASSO 3: Buscando linha com "reserva" para ' + dataSimulada + ' ' + horaSimulada + '...');
    const linhaEncontrada = encontrarLinhaReservaEnfermagem(sheetPosto, dataSimulada, horaSimulada);
    
    if (linhaEncontrada <= 0) {
      Logger.log('❌ LINHA NÃO ENCONTRADA!');
      Logger.log('');
      Logger.log('Mostrando todas as linhas com "reserva" na coluna O:');
      const dados = sheetPosto.getRange(1, 1, sheetPosto.getLastRow(), 17).getDisplayValues();
      let ultimaData = '';
      dados.forEach((row, i) => {
        if (row[2]) ultimaData = row[2];
        const nomeO = (row[14] || '').toString().toLowerCase().trim();
        if (nomeO.indexOf('reserva') !== -1) {
          Logger.log('  Linha ' + (i+1) + ': Data(C)="' + (row[2] || ultimaData) + '", Hora(N)="' + row[13] + '", Nome(O)="' + row[14] + '"');
        }
      });
      return;
    }
    
    Logger.log('✅ Linha encontrada: ' + linhaEncontrada);
    
    // Mostra o que seria preenchido
    Logger.log('');
    Logger.log('PASSO 4: SIMULAÇÃO - O que seria preenchido:');
    Logger.log('  Coluna M (13): "enf"');
    Logger.log('  Coluna O (15): "' + nomeSimulado + '"');
    Logger.log('  Coluna Q (17): "motivo do teste"');
    Logger.log('');
    Logger.log('⚠️ NENHUMA ALTERAÇÃO FOI FEITA - isto é apenas uma simulação');
    
  } catch (erro) {
    Logger.log('❌ ERRO: ' + erro.message);
    Logger.log('Stack: ' + erro.stack);
  }
  
  Logger.log('');
  Logger.log('========== FIM DA SIMULAÇÃO ==========');
}

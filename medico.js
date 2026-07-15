// ============================================
// CONFIGURAÇÕES
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbzSnLgusejiDF9oCtL-xjY54TybLn91HyX3NTofToGRs9rqREqg136D2czCsSLhNrti/exec';
const WHATSAPP_DESTINO = '5548920039171';

// Estado global
let slotsGlobais = [];

// ============================================
// PROGRESS STEPS
// ============================================
function updateProgressSteps(step) {
  const steps = document.querySelectorAll('.step');
  const lines = document.querySelectorAll('.step-line');

  steps.forEach((stepEl, index) => {
    const stepNum = index + 1;
    stepEl.classList.remove('active', 'completed');
    
    if (stepNum < step) {
      stepEl.classList.add('completed');
    } else if (stepNum === step) {
      stepEl.classList.add('active');
    }
  });

  lines.forEach((line, index) => {
    line.classList.remove('completed');
    if (index < step - 1) {
      line.classList.add('completed');
    }
  });
}

// ============================================
// VALIDAÇÃO INICIAL
// ============================================
(function () {
  console.log('🔧 API_URL configurada:', API_URL);
  if (!API_URL || API_URL.includes('SEU_ID_AQUI') || !API_URL.includes('script.google.com')) {
    console.error('❌ ERRO: API_URL não configurada corretamente!', API_URL);
    alert('ERRO: URL do Google Apps Script não configurada. Verifique o código.');
  }
})();

// ============================================
// CARREGAMENTO DE HORÁRIOS
// ============================================
async function carregarHorarios() {
  const loading = document.getElementById('loading');
  const formContainer = document.getElementById('form-container');
  const select = document.getElementById('slotSelect');

  loading.style.display = 'block';
  formContainer.style.display = 'none';

  try {
    if (!API_URL || API_URL.includes('SEU_ID_AQUI')) {
      throw new Error('URL do Google Apps Script não configurada. Verifique a constante API_URL no código.');
    }

    const url = API_URL + '?action=getSlots';
    console.log('🔍 Fazendo requisição para:', url);

    const resp = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });

    console.log('📡 Status da resposta:', resp.status, resp.statusText);

    if (!resp.ok) {
      if (resp.status === 404) {
        throw new Error('Script não encontrado. Verifique se o Google Apps Script está publicado corretamente.');
      }
      throw new Error('Erro ao carregar horários (HTTP ' + resp.status + ')');
    }

    const slots = await resp.json();
    console.log('Slots recebidos do servidor:', slots);
    
    // Filtra apenas os slots do médico (origem F)
    const slotsMedico = (slots || []).filter(slot => slot.origem === 'F');
    console.log('Slots do médico (origem F):', slotsMedico);
    
    // Ordena os slots por data e hora
    slotsGlobais = slotsMedico.sort((a, b) => {
      // Converte data DD/MM/YYYY para comparação
      const [diaA, mesA, anoA] = a.data.split('/').map(Number);
      const [diaB, mesB, anoB] = b.data.split('/').map(Number);
      
      // Compara por ano, mês, dia
      if (anoA !== anoB) return anoA - anoB;
      if (mesA !== mesB) return mesA - mesB;
      if (diaA !== diaB) return diaA - diaB;
      
      // Se mesma data, compara por hora
      const [horaA, minA] = a.hora.split(':').map(Number);
      const [horaB, minB] = b.hora.split(':').map(Number);
      
      if (horaA !== horaB) return horaA - horaB;
      return minA - minB;
    });

    if (!slotsGlobais.length) {
      loading.innerHTML = `
        <div class="loading-card">
          <div class="loading-icon" style="background: #fef3c7; color: #d97706;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p class="loading-text" style="color: #92400e;">Nenhum horário disponível no momento</p>
        </div>
      `;
      return;
    }

    select.innerHTML = '<option value="">Escolha um horário</option>';
    slotsGlobais.forEach((slot, index) => {
      const option = document.createElement('option');
      option.value = index;

      const diaSemanaLabel = slot.diaSemana
        ? slot.diaSemana.replace('-feira', '')
        : '';

      const dataComDia = diaSemanaLabel
        ? diaSemanaLabel + ', ' + slot.data
        : slot.data;

      option.text = dataComDia + ' às ' + slot.hora;
      select.appendChild(option);
    });

    loading.style.display = 'none';
    formContainer.style.display = 'block';
  } catch (err) {
    console.error(err);
    loading.innerHTML = `
      <div class="loading-card">
        <div class="loading-icon" style="background: #fee2e2; color: #dc2626;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <p class="loading-text" style="color: #991b1b; margin-bottom: 16px;">
          ${err.message || 'Não foi possível carregar os horários'}
        </p>
        <button type="button" class="btn btn-primary" onclick="carregarHorarios()" style="max-width: 200px;">
          Tentar novamente
        </button>
      </div>
    `;
  }
}

// ============================================
// VALIDAÇÕES
// ============================================
function validarDataNascimento(data) {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!regex.test(data)) {
    return { valido: false, mensagem: 'Use o formato DD/MM/AAAA' };
  }

  const partes = data.split('/');
  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const ano = parseInt(partes[2], 10);

  if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 1900 || ano > new Date().getFullYear()) {
    return { valido: false, mensagem: 'Data inválida. Verifique dia, mês e ano.' };
  }

  return { valido: true };
}

// ============================================
// GERENCIAMENTO DE ERROS
// ============================================
function mostrarErroCampo(campoId, mensagem) {
  const campo = document.getElementById(campoId);
  const errorSpan = document.getElementById(campoId + '-error');

  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.classList.add('error');
  }

  if (errorSpan) {
    errorSpan.textContent = mensagem;
  }
}

function limparErroCampo(campoId) {
  const campo = document.getElementById(campoId);
  const errorSpan = document.getElementById(campoId + '-error');

  if (campo) {
    campo.removeAttribute('aria-invalid');
    campo.classList.remove('error');
  }

  if (errorSpan) {
    errorSpan.textContent = '';
  }
}

function limparTodosErros() {
  ['slotSelect', 'nome', 'dataNascimento', 'observacoes'].forEach(limparErroCampo);
}

// ============================================
// VALIDAÇÃO DO FORMULÁRIO
// ============================================
function validarFormulario() {
  limparTodosErros();

  const select = document.getElementById('slotSelect');
  const nome = document.getElementById('nome').value.trim();
  const dataNascimento = document.getElementById('dataNascimento').value.trim();
  const observacoes = document.getElementById('observacoes').value.trim();

  let valido = true;
  let primeiroCampoComErro = null;

  if (!select.value) {
    mostrarErroCampo('slotSelect', 'Selecione um horário');
    valido = false;
    if (!primeiroCampoComErro) primeiroCampoComErro = select;
  }

  if (!nome || nome.length < 3) {
    mostrarErroCampo('nome', 'Informe seu nome completo');
    valido = false;
    if (!primeiroCampoComErro) primeiroCampoComErro = document.getElementById('nome');
  }

  if (!dataNascimento) {
    mostrarErroCampo('dataNascimento', 'Informe sua data de nascimento');
    valido = false;
    if (!primeiroCampoComErro) primeiroCampoComErro = document.getElementById('dataNascimento');
  } else {
    const validacaoData = validarDataNascimento(dataNascimento);
    if (!validacaoData.valido) {
      mostrarErroCampo('dataNascimento', validacaoData.mensagem);
      valido = false;
      if (!primeiroCampoComErro) primeiroCampoComErro = document.getElementById('dataNascimento');
    }
  }

  if (!observacoes || observacoes.length < 5) {
    mostrarErroCampo('observacoes', 'Descreva o motivo da consulta');
    valido = false;
    if (!primeiroCampoComErro) primeiroCampoComErro = document.getElementById('observacoes');
  }

  if (!valido && primeiroCampoComErro) {
    primeiroCampoComErro.focus();
  }

  return valido;
}

// ============================================
// SANITIZAÇÃO DE HTML
// ============================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// CONSTRUÇÃO DO RESUMO
// ============================================
function construirResumoAgendamento(slot, nome, dataNascimento, observacoes) {
  const diaSemana = slot.diaSemana ? slot.diaSemana.replace('-feira', '') : '';
  const dataFormatada = diaSemana ? `${diaSemana}, ${slot.data}` : slot.data;

  // Escape user-provided data to prevent XSS
  const nomeEscaped = escapeHtml(nome);
  const dataNascimentoEscaped = escapeHtml(dataNascimento);
  const observacoesEscaped = escapeHtml(observacoes);

  return `
    <div class="resumo-header">
      <div class="icon-ok" aria-hidden="true">✓</div>
      <div>
        <div class="resumo-titulo">Agendamento realizado!</div>
        <div class="resumo-subtitulo">Confira os dados e confirme no WhatsApp</div>
      </div>
    </div>
    
    <ul class="resumo-lista">
      <li>
        <strong>Data</strong>
        <span>${dataFormatada}</span>
      </li>
      <li>
        <strong>Horário</strong>
        <span class="resumo-chip">🕐 ${slot.hora}</span>
      </li>
      <li>
        <strong>Paciente</strong>
        <span>${nomeEscaped}</span>
      </li>
      <li>
        <strong>Nascimento</strong>
        <span>${dataNascimentoEscaped}</span>
      </li>
      <li>
        <strong>Motivo</strong>
        <span>${observacoesEscaped}</span>
      </li>
    </ul>

    <p class="resumo-footer">
      <strong>Importante:</strong> Para confirmar seu agendamento, clique no botão abaixo 
      e envie a mensagem pelo WhatsApp. Sem essa confirmação, o horário poderá não ser reservado.
    </p>
  `;
}

// ============================================
// CONSTRUÇÃO DA URL DO WHATSAPP
// ============================================
function construirUrlWhatsApp(slot, nome, dataNascimento, observacoes) {
  const diaSemana = slot.diaSemana ? slot.diaSemana.replace('-feira', '') : '';
  const dataFormatada = diaSemana ? `${diaSemana}, ${slot.data}` : slot.data;
  
  // Recupera dados da triagem
  const dadosTriagemStr = localStorage.getItem('dadosTriagem');
  const triagem = dadosTriagemStr ? JSON.parse(dadosTriagemStr) : {};
  
  // Monta a mensagem completa (sem emojis para evitar problemas de encoding)
  let texto = `*SOLICITACAO DE AGENDAMENTO*\n`;
  texto += `*Consulta Medica*\n\n`;
  texto += `Data: ${dataFormatada}\n`;
  texto += `Horario: ${slot.hora}\n\n`;
  
  texto += `*PACIENTE*\n`;
  texto += `Nome: ${nome}\n`;
  texto += `Nascimento: ${dataNascimento}\n`;
  texto += `Motivo: ${observacoes}\n\n`;
  
  // Adiciona informações da triagem
  if (triagem.tipo === 'pre-natal') {
    texto += `*PRE-NATAL*\n`;
    if (triagem.ultimaConsulta === 'primeira') {
      texto += `- Primeira consulta de pre-natal\n`;
    } else {
      texto += `- Ultima consulta: ${triagem.dataUltimaConsulta || 'nao informada'}\n`;
    }
    if (triagem.semanasGestacao === 'semanas') {
      texto += `- Idade gestacional: ${triagem.numeroSemanas} semanas\n`;
    } else {
      texto += `- Idade gestacional: nao lembra\n`;
    }
    texto += `- Ultima consulta foi com: ${triagem.ultimoProfissional === 'medico' ? 'Medico(a)' : 'Enfermeiro(a)'}\n`;
  } else if (triagem.tipo === 'puericultura') {
    texto += `*PUERICULTURA*\n`;
    texto += `- Idade da crianca: ${triagem.mesesCrianca} meses\n`;
    texto += `- Ultima consulta com: ${triagem.ultimaConsultaMeses} meses\n`;
    texto += `- Ultima consulta foi com: ${triagem.ultimoProfissional === 'medico' ? 'Medico(a)' : 'Enfermeiro(a)'}\n`;
  }
  
  texto += `\nAguardo confirmacao!`;

  return `https://wa.me/${WHATSAPP_DESTINO}?text=${encodeURIComponent(texto)}`;
}

// ============================================
// ENVIO DO AGENDAMENTO
// ============================================
async function enviarAgendamento(event) {
  if (event) event.preventDefault();

  if (!validarFormulario()) return;

  const select = document.getElementById('slotSelect');
  const idx = parseInt(select.value, 10);
  const slot = slotsGlobais[idx];

  if (!slot) {
    mostrarErroCampo('slotSelect', 'Horário inválido');
    return;
  }

  const nome = document.getElementById('nome').value.trim();
  const dataNascimento = document.getElementById('dataNascimento').value.trim();
  const observacoes = document.getElementById('observacoes').value.trim();

  const msgDiv = document.getElementById('mensagem');
  const waDiv = document.getElementById('whatsapp-container');
  const waLink = document.getElementById('whatsapp-link');
  const formFields = document.getElementById('form-fields');
  const submitBtn = document.getElementById('submit-btn');

  waDiv.style.display = 'none';

  // Estado de loading
  submitBtn.disabled = true;
  submitBtn.classList.add('btn-loading');

  msgDiv.className = 'msg';
  msgDiv.style.display = 'block';
  msgDiv.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px 0;">
      <div style="width: 24px; height: 24px; border: 2.5px solid #e2e8f0; border-top-color: #9381ff; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <span style="color: #64748b; font-weight: 500;">Processando agendamento...</span>
    </div>
  `;

  // Recupera dados da triagem do localStorage
  const dadosTriagemStr = localStorage.getItem('dadosTriagem');
  const dadosTriagem = dadosTriagemStr ? JSON.parse(dadosTriagemStr) : {};
  console.log('📋 Dados da triagem recuperados:', dadosTriagem);

  // Identifica a vaga pela chave data+hora+origem (o rowIndex muda quando
  // outras pessoas agendam; a chave não)
  const dados = {
    data: slot.data,
    hora: slot.hora,
    origem: ((slot.origem || 'F') + '').toUpperCase(),
    canal: 'app',
    nome: nome,
    dataNascimento: dataNascimento,
    observacoes: observacoes,
    // Dados da triagem
    triagem: dadosTriagem
  };

  console.log('Enviando para API:', dados);

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(dados)
    });

    if (!resp.ok) {
      throw new Error('Erro ao agendar (HTTP ' + resp.status + ')');
    }

    const res = await resp.json();
    console.log('Resposta da API:', res);

    // O servidor só confirma quando o paciente foi registrado na agenda do
    // posto. Qualquer outra resposta é tratada como falha.
    if (!res || res.sucesso !== true) {
      throw new Error((res && res.mensagem) || 'Não foi possível concluir o agendamento. Tente novamente.');
    }

    msgDiv.className = 'msg sucesso';
    msgDiv.innerHTML = construirResumoAgendamento(slot, nome, dataNascimento, observacoes);

    waLink.href = construirUrlWhatsApp(slot, nome, dataNascimento, observacoes);
    waDiv.style.display = 'block';

    if (formFields) {
      formFields.style.display = 'none';
    }

    // Atualizar para step 3 (confirmar)
    updateProgressSteps(3);

    msgDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error(err);

    submitBtn.disabled = false;
    submitBtn.classList.remove('btn-loading');

    msgDiv.className = 'msg erro';
    msgDiv.innerHTML = `
      <div style="text-align: center;">
        <p style="font-weight: 600; margin-bottom: 8px;">Erro ao realizar agendamento</p>
        <p style="font-size: 14px; margin-bottom: 16px;">${err.message || 'Verifique sua conexão e tente novamente.'}</p>
      </div>
    `;

    msgDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ============================================
// MÁSCARAS DE INPUT
// ============================================
function aplicarMascaraData(input) {
  let value = input.value.replace(/\D/g, '');

  if (value.length > 2) {
    value = value.substring(0, 2) + '/' + value.substring(2);
  }
  if (value.length > 5) {
    value = value.substring(0, 5) + '/' + value.substring(5, 9);
  }

  input.value = value;
}

// ============================================
// VALIDAÇÃO EM TEMPO REAL
// ============================================
function configurarValidacaoEmTempoReal() {
  const campos = ['slotSelect', 'nome', 'dataNascimento', 'observacoes'];

  campos.forEach(campoId => {
    const campo = document.getElementById(campoId);
    if (!campo) return;

    campo.addEventListener('input', () => limparErroCampo(campoId));

    campo.addEventListener('blur', function () {
      const valor = campo.value.trim();
      if (!valor) return;

      if (campoId === 'dataNascimento') {
        const validacao = validarDataNascimento(valor);
        if (!validacao.valido) {
          mostrarErroCampo(campoId, validacao.mensagem);
        }
      }
    });

    // Atualizar steps baseado no preenchimento
    campo.addEventListener('change', function () {
      if (campoId === 'slotSelect' && campo.value) {
        updateProgressSteps(2);
      }
    });
  });
}

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function () {
  // Carregar horários
  carregarHorarios();

  // Máscara de data
  const dataNascInput = document.getElementById('dataNascimento');
  if (dataNascInput) {
    dataNascInput.addEventListener('input', (e) => aplicarMascaraData(e.target));
  }

  // Validação em tempo real
  configurarValidacaoEmTempoReal();

  // Submit do formulário
  const form = document.getElementById('agendamento-form');
  if (form) {
    form.addEventListener('submit', enviarAgendamento);
  }
});

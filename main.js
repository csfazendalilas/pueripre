// ============================================
// ENCAMINHAMENTO CONFIGURÁVEL PELO PAINEL
// (admin.html do site principal, seção "Encaminhamento da triagem")
// 'auto' = as regras da triagem decidem; 'enfermagem'/'medico' = destino fixo.
// Nada fica guardado no navegador: as regras vêm da cópia rápida do site
// (config.json, ~100ms) e do servidor (fonte da verdade, ~1s, prevalece).
// ============================================

const API_URL_CONFIG = 'https://script.google.com/macros/s/AKfycbzSnLgusejiDF9oCtL-xjY54TybLn91HyX3NTofToGRs9rqREqg136D2czCsSLhNrti/exec';

let roteamentoTriagem = { prenatal: 'auto', puericultura: 'auto', preventivo: 'auto' };
let roteamentoServidorAplicado = false;

// Limpa a chave do cache antigo (abordagem descartada)
try { localStorage.removeItem('roteamentoTriagem'); } catch (e) {}

// 1) Cópia rápida servida pelo próprio site (mesma origem do GitHub Pages)
fetch('/agendamento/config.json?v=' + Date.now())
  .then(resp => (resp.ok ? resp.json() : null))
  .then(cfg => {
    if (roteamentoServidorAplicado) return;
    if (cfg && cfg.roteamento) {
      roteamentoTriagem = Object.assign(roteamentoTriagem, cfg.roteamento);
      console.log('⚡ Encaminhamento da cópia rápida:', roteamentoTriagem);
    }
  })
  .catch(() => { /* sem cópia rápida: fica o padrão até o servidor responder */ });

// 2) Servidor (fonte da verdade): resolve muito antes de a pessoa terminar
//    o questionário e SEMPRE prevalece sobre a cópia rápida
fetch(API_URL_CONFIG + '?action=getConfig', { cache: 'no-cache' })
  .then(resp => (resp.ok ? resp.json() : null))
  .then(cfg => {
    roteamentoServidorAplicado = true;
    if (cfg && cfg.roteamento) {
      roteamentoTriagem = Object.assign(
        { prenatal: 'auto', puericultura: 'auto', preventivo: 'auto' },
        cfg.roteamento
      );
    }
    console.log('🧭 Encaminhamento confirmado pelo servidor:', roteamentoTriagem);
  })
  .catch(() => { /* sem rede: fica o que já temos */ });

/**
 * Decide a página de destino de um serviço:
 * respeita o que foi escolhido no painel; em 'auto', usa a regra da triagem.
 */
function destinoFinal(servico, destinoAutomatico) {
  const regra = roteamentoTriagem[servico] || 'auto';
  if (regra === 'enfermagem') return 'enfermagem.html';
  if (regra === 'medico') return 'medico.html';
  return destinoAutomatico;
}

// ============================================
// NAVEGAÇÃO ENTRE CARDS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('📋 Script carregado!');
  
  // Limpa dados anteriores ao carregar a página inicial
  localStorage.removeItem('dadosTriagem');
  
  // Elementos dos cards
  const cardSelecao = document.getElementById('card-selecao');
  const cardPrenatal = document.getElementById('card-prenatal');
  const cardPuericultura = document.getElementById('card-puericultura');
  const cardPreventivo = document.getElementById('card-preventivo');
  
  // Botões de seleção
  const btnPrenatal = document.querySelector('[data-tipo="prenatal"]');
  const btnPuericultura = document.querySelector('[data-tipo="puericultura"]');
  const btnPreventivo = document.querySelector('[data-tipo="preventivo"]');
  
  // Botões de voltar
  const btnsVoltar = document.querySelectorAll('[data-action="voltar"]');
  
  // Formulários
  const formPrenatal = document.getElementById('form-prenatal');
  const formPuericultura = document.getElementById('form-puericultura');
  const formPreventivo = document.getElementById('form-preventivo');
  
  // ============================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ============================================
  
  function mostrarCard(cardParaMostrar) {
    // Esconde todos os cards
    cardSelecao.classList.add('hidden');
    cardPrenatal.classList.add('hidden');
    cardPuericultura.classList.add('hidden');
    if (cardPreventivo) cardPreventivo.classList.add('hidden');
    
    // Mostra o card selecionado
    cardParaMostrar.classList.remove('hidden');
    
    // Scroll suave para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  function voltarParaSelecao() {
    mostrarCard(cardSelecao);
    // Reseta os formulários
    if (formPrenatal) formPrenatal.reset();
    if (formPuericultura) formPuericultura.reset();
    if (formPreventivo) formPreventivo.reset();
    // Esconde campos condicionais
    esconderCamposCondicionais();
  }
  
  function esconderCamposCondicionais() {
    const campoData = document.getElementById('campo-data-consulta');
    const campoSemanas = document.getElementById('campo-semanas');
    const campoUltimosPreventivos = document.getElementById('campo-ultimos-preventivos');
    const avisoMenor25 = document.getElementById('aviso-menor-25');
    const avisoIntervalo = document.getElementById('aviso-intervalo');
    const btnPreventivoAvancar = document.getElementById('btn-preventivo-avancar');
    
    if (campoData) campoData.style.display = 'none';
    if (campoSemanas) campoSemanas.style.display = 'none';
    if (campoUltimosPreventivos) campoUltimosPreventivos.style.display = 'none';
    if (avisoMenor25) avisoMenor25.style.display = 'none';
    if (avisoIntervalo) avisoIntervalo.style.display = 'none';
    if (btnPreventivoAvancar) btnPreventivoAvancar.disabled = true;
  }
  
  // ============================================
  // FUNÇÃO PARA SALVAR DADOS NO LOCALSTORAGE
  // ============================================
  
  function salvarDadosTriagem(dados) {
    localStorage.setItem('dadosTriagem', JSON.stringify(dados));
    console.log('💾 Dados da triagem salvos:', dados);
  }
  
  // ============================================
  // EVENT LISTENERS - SELEÇÃO
  // ============================================
  
  if (btnPrenatal) {
    btnPrenatal.addEventListener('click', function() {
      console.log('🤰 Pré-natal selecionado');
      mostrarCard(cardPrenatal);
    });
  }
  
  if (btnPuericultura) {
    btnPuericultura.addEventListener('click', function() {
      console.log('👶 Puericultura selecionado');
      mostrarCard(cardPuericultura);
    });
  }
  
  if (btnPreventivo) {
    btnPreventivo.addEventListener('click', function() {
      console.log('🩺 Preventivo selecionado');
      mostrarCard(cardPreventivo);
    });
  }
  
  // Botões voltar
  btnsVoltar.forEach(btn => {
    btn.addEventListener('click', voltarParaSelecao);
  });
  
  // ============================================
  // FUNÇÕES DE MÁSCARA E VALIDAÇÃO DE DATA
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
  
  function validarData(data) {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!regex.test(data)) {
      return { valido: false, mensagem: 'Use o formato DD/MM/AAAA' };
    }
    
    const partes = data.split('/');
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const ano = parseInt(partes[2], 10);
    
    // Validação básica de ranges
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 1900 || ano > new Date().getFullYear()) {
      return { valido: false, mensagem: 'Data inválida. Verifique dia, mês e ano.' };
    }
    
    // Validação de dias por mês
    const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Verifica ano bissexto
    if (mes === 2 && ((ano % 4 === 0 && ano % 100 !== 0) || (ano % 400 === 0))) {
      if (dia > 29) {
        return { valido: false, mensagem: 'Data inválida. Fevereiro tem no máximo 29 dias em anos bissextos.' };
      }
    } else {
      if (dia > diasPorMes[mes - 1]) {
        return { valido: false, mensagem: `Data inválida. Este mês tem no máximo ${diasPorMes[mes - 1]} dias.` };
      }
    }
    
    // Validação de data não pode ser futura
    const dataDigitada = new Date(ano, mes - 1, dia);
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999); // Fim do dia de hoje
    
    if (dataDigitada > hoje) {
      return { valido: false, mensagem: 'A data não pode ser futura.' };
    }
    
    return { valido: true };
  }
  
  function mostrarErroData(campoId, mensagem) {
    const campo = document.getElementById(campoId);
    if (!campo) return;
    
    campo.setAttribute('aria-invalid', 'true');
    campo.classList.add('error');
    
    // Remove mensagem de erro anterior se existir
    let errorSpan = document.getElementById(campoId + '-error');
    if (!errorSpan) {
      errorSpan = document.createElement('span');
      errorSpan.id = campoId + '-error';
      errorSpan.className = 'error-message';
      errorSpan.setAttribute('role', 'alert');
      errorSpan.style.marginTop = '4px';
      errorSpan.style.display = 'block';
      // Adiciona após o campo, dentro do mesmo container
      campo.parentNode.appendChild(errorSpan);
    }
    errorSpan.textContent = mensagem;
    errorSpan.style.display = 'block';
  }
  
  function limparErroData(campoId) {
    const campo = document.getElementById(campoId);
    if (!campo) return;
    
    campo.removeAttribute('aria-invalid');
    campo.classList.remove('error');
    
    const errorSpan = document.getElementById(campoId + '-error');
    if (errorSpan) {
      errorSpan.textContent = '';
      errorSpan.style.display = 'none';
    }
  }
  
  // ============================================
  // CAMPOS CONDICIONAIS - PRÉ-NATAL
  // ============================================
  
  // Mostrar campo de data quando selecionar "Informar data"
  const radioDataConsulta = document.querySelectorAll('input[name="ultimaConsulta"]');
  const campoDataConsulta = document.getElementById('campo-data-consulta');
  const inputDataUltimaConsulta = document.getElementById('dataUltimaConsulta');
  
  radioDataConsulta.forEach(radio => {
    radio.addEventListener('change', function() {
      console.log('📅 Última consulta:', this.value);
      if (this.value === 'data' && campoDataConsulta) {
        campoDataConsulta.style.display = 'block';
        // Foca no campo quando aparece
        setTimeout(() => {
          if (inputDataUltimaConsulta) inputDataUltimaConsulta.focus();
        }, 100);
      } else if (campoDataConsulta) {
        campoDataConsulta.style.display = 'none';
        // Limpa o campo e erros quando esconde
        if (inputDataUltimaConsulta) {
          inputDataUltimaConsulta.value = '';
          limparErroData('dataUltimaConsulta');
        }
      }
    });
  });
  
  // Aplicar máscara e validação no campo de data da última consulta
  if (inputDataUltimaConsulta) {
    // Limitar tamanho máximo
    inputDataUltimaConsulta.setAttribute('maxlength', '10');
    inputDataUltimaConsulta.setAttribute('placeholder', 'DD/MM/AAAA');
    
    // Aplicar máscara enquanto digita
    inputDataUltimaConsulta.addEventListener('input', function(e) {
      aplicarMascaraData(e.target);
      limparErroData('dataUltimaConsulta');
    });
    
    // Validar quando sair do campo
    inputDataUltimaConsulta.addEventListener('blur', function() {
      const valor = this.value.trim();
      if (!valor) {
        limparErroData('dataUltimaConsulta');
        return;
      }
      
      const validacao = validarData(valor);
      if (!validacao.valido) {
        mostrarErroData('dataUltimaConsulta', validacao.mensagem);
      } else {
        limparErroData('dataUltimaConsulta');
      }
    });
  }
  
  // Mostrar campo de semanas quando selecionar "Sei quantas semanas"
  const radioSemanas = document.querySelectorAll('input[name="semanasGestacao"]');
  const campoSemanas = document.getElementById('campo-semanas');
  
  radioSemanas.forEach(radio => {
    radio.addEventListener('change', function() {
      console.log('📊 Semanas gestacionais:', this.value);
      if (this.value === 'semanas' && campoSemanas) {
        campoSemanas.style.display = 'block';
      } else if (campoSemanas) {
        campoSemanas.style.display = 'none';
      }
    });
  });
  
  // ============================================
  // SUBMIT - PRÉ-NATAL
  // ============================================
  
  if (formPrenatal) {
    formPrenatal.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('📝 Formulário pré-natal submetido');
      
      const ultimaConsulta = document.querySelector('input[name="ultimaConsulta"]:checked');
      const semanasGestacao = document.querySelector('input[name="semanasGestacao"]:checked');
      const ultimoProfissional = document.querySelector('input[name="ultimoProfissional"]:checked');
      const dataUltimaConsulta = document.getElementById('dataUltimaConsulta');
      const numeroSemanas = document.getElementById('numeroSemanas');
      
      // Validação básica
      if (!ultimaConsulta) {
        alert('Por favor, informe quando foi sua última consulta.');
        return;
      }
      
      // Validação da data da última consulta
      if (ultimaConsulta.value === 'data') {
        if (!dataUltimaConsulta || !dataUltimaConsulta.value.trim()) {
          alert('Por favor, informe a data da última consulta.');
          if (dataUltimaConsulta) {
            dataUltimaConsulta.focus();
            mostrarErroData('dataUltimaConsulta', 'Informe a data da última consulta');
          }
          return;
        }
        
        const validacaoData = validarData(dataUltimaConsulta.value.trim());
        if (!validacaoData.valido) {
          alert(validacaoData.mensagem);
          if (dataUltimaConsulta) {
            dataUltimaConsulta.focus();
            mostrarErroData('dataUltimaConsulta', validacaoData.mensagem);
          }
          return;
        }
      }
      
      if (!semanasGestacao) {
        alert('Por favor, informe as semanas de gestação.');
        return;
      }
      
      if (!ultimoProfissional) {
        alert('Por favor, informe com quem foi sua última consulta.');
        return;
      }
      
      // Monta os dados da triagem para salvar
      const dadosTriagem = {
        tipo: 'pre-natal',
        ultimaConsulta: ultimaConsulta.value, // 'data' ou 'primeira'
        dataUltimaConsulta: ultimaConsulta.value === 'data' && dataUltimaConsulta ? dataUltimaConsulta.value : '',
        semanasGestacao: semanasGestacao.value, // 'semanas' ou 'nao_lembro'
        numeroSemanas: semanasGestacao.value === 'semanas' && numeroSemanas ? numeroSemanas.value : '',
        ultimoProfissional: ultimoProfissional.value // 'medico' ou 'enfermeiro'
      };
      
      // Salva no localStorage
      salvarDadosTriagem(dadosTriagem);
      
      // Lógica de redirecionamento para PRÉ-NATAL:
      // 1. Se é PRIMEIRA consulta de pré-natal -> ENFERMAGEM (independente das outras opções)
      // 2. Se NÃO é primeira consulta (alternância):
      //    - Se última foi com ENFERMEIRO -> próxima é MÉDICO
      //    - Se última foi com MÉDICO -> próxima é ENFERMAGEM
      
      if (ultimaConsulta.value === 'primeira') {
        console.log('➡️ Primeira consulta de pré-natal -> ENFERMAGEM');
        window.location.href = destinoFinal('prenatal', 'enfermagem.html');
        return;
      }

      // Alternância: último foi X, próximo é Y
      if (ultimoProfissional.value === 'enfermeiro') {
        console.log('➡️ Último foi enfermeiro -> próximo é MÉDICO');
        window.location.href = destinoFinal('prenatal', 'medico.html');
      } else if (ultimoProfissional.value === 'medico') {
        console.log('➡️ Último foi médico -> próximo é ENFERMAGEM');
        window.location.href = destinoFinal('prenatal', 'enfermagem.html');
      } else {
        console.log('⚠️ Valor inesperado:', ultimoProfissional.value);
        alert('Erro: opção de profissional não reconhecida');
      }
    });
  }
  
  // ============================================
  // SUBMIT - PUERICULTURA
  // ============================================
  
  if (formPuericultura) {
    formPuericultura.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('📝 Formulário puericultura submetido');
      
      const mesesCrianca = document.getElementById('mesesCrianca');
      const ultimaConsultaMeses = document.getElementById('ultimaConsultaMeses');
      const ultimoProfissional = document.querySelector('input[name="ultimoProfissionalPuericultura"]:checked');
      
      // Validação básica
      if (!mesesCrianca || !mesesCrianca.value) {
        alert('Por favor, informe quantos meses a criança tem.');
        if (mesesCrianca) mesesCrianca.focus();
        return;
      }
      
      if (!ultimaConsultaMeses || !ultimaConsultaMeses.value) {
        alert('Por favor, informe com quantos meses foi a última consulta.');
        if (ultimaConsultaMeses) ultimaConsultaMeses.focus();
        return;
      }
      
      if (!ultimoProfissional) {
        alert('Por favor, informe com quem foi a última consulta.');
        return;
      }
      
      // Monta os dados da triagem para salvar
      const dadosTriagem = {
        tipo: 'puericultura',
        mesesCrianca: mesesCrianca.value,
        ultimaConsultaMeses: ultimaConsultaMeses.value,
        ultimoProfissional: ultimoProfissional.value // 'medico' ou 'enfermeiro'
      };
      
      // Salva no localStorage
      salvarDadosTriagem(dadosTriagem);
      
      // Lógica de redirecionamento para PUERICULTURA (alternância):
      // - Se última foi com ENFERMEIRO -> próxima é MÉDICO
      // - Se última foi com MÉDICO -> próxima é ENFERMAGEM
      
      if (ultimoProfissional.value === 'enfermeiro') {
        console.log('➡️ Último foi enfermeiro -> próximo é MÉDICO');
        window.location.href = destinoFinal('puericultura', 'medico.html');
      } else if (ultimoProfissional.value === 'medico') {
        console.log('➡️ Último foi médico -> próximo é ENFERMAGEM');
        window.location.href = destinoFinal('puericultura', 'enfermagem.html');
      } else {
        console.log('⚠️ Valor inesperado:', ultimoProfissional.value);
        alert('Erro: opção de profissional não reconhecida');
      }
    });
  }
  
  // ============================================
  // LÓGICA DO PREVENTIVO
  // ============================================
  
  // Elementos do formulário preventivo
  const radioMaiorQue25 = document.querySelectorAll('input[name="maiorQue25"]');
  const campoUltimosPreventivos = document.getElementById('campo-ultimos-preventivos');
  const avisoMenor25 = document.getElementById('aviso-menor-25');
  const avisoIntervalo = document.getElementById('aviso-intervalo');
  const btnPreventivoAvancar = document.getElementById('btn-preventivo-avancar');
  const checkboxNaoLembro = document.getElementById('naoLembroPreventivos');
  const inputPreventivo1 = document.getElementById('preventivo1');
  const inputPreventivo2 = document.getElementById('preventivo2');
  
  // Função para verificar se deve mostrar aviso de intervalo
  function verificarIntervaloPreventivo() {
    if (!inputPreventivo1 || !inputPreventivo2) return;
    
    const ano1 = parseInt(inputPreventivo1.value, 10);
    const ano2 = parseInt(inputPreventivo2.value, 10);
    const anoAtual = new Date().getFullYear();
    
    // Se tem dois anos preenchidos e o último foi há menos de 3 anos
    if (ano1 && ano2 && (anoAtual - ano2) < 3) {
      if (avisoIntervalo) avisoIntervalo.style.display = 'flex';
    } else {
      if (avisoIntervalo) avisoIntervalo.style.display = 'none';
    }
  }
  
  // Função para atualizar o estado do botão de avançar
  function atualizarBotaoPreventivo() {
    const maiorQue25 = document.querySelector('input[name="maiorQue25"]:checked');
    
    if (!maiorQue25 || maiorQue25.value === 'nao') {
      if (btnPreventivoAvancar) btnPreventivoAvancar.disabled = true;
      return;
    }
    
    // Se maior que 25, habilita o botão
    if (btnPreventivoAvancar) btnPreventivoAvancar.disabled = false;
  }
  
  // Event listeners para pergunta da idade
  radioMaiorQue25.forEach(radio => {
    radio.addEventListener('change', function() {
      console.log('🎂 Maior que 25:', this.value);
      
      if (this.value === 'sim') {
        // Mostra campos de anos e esconde aviso
        if (campoUltimosPreventivos) campoUltimosPreventivos.style.display = 'block';
        if (avisoMenor25) avisoMenor25.style.display = 'none';
        atualizarBotaoPreventivo();
      } else {
        // Esconde campos e mostra aviso de bloqueio
        if (campoUltimosPreventivos) campoUltimosPreventivos.style.display = 'none';
        if (avisoMenor25) avisoMenor25.style.display = 'flex';
        if (avisoIntervalo) avisoIntervalo.style.display = 'none';
        if (btnPreventivoAvancar) btnPreventivoAvancar.disabled = true;
      }
    });
  });
  
  // Event listener para checkbox "não lembro"
  if (checkboxNaoLembro) {
    checkboxNaoLembro.addEventListener('change', function() {
      console.log('📅 Não lembro:', this.checked);
      
      if (this.checked) {
        // Desabilita e limpa os campos de ano
        if (inputPreventivo1) {
          inputPreventivo1.value = '';
          inputPreventivo1.disabled = true;
        }
        if (inputPreventivo2) {
          inputPreventivo2.value = '';
          inputPreventivo2.disabled = true;
        }
        if (avisoIntervalo) avisoIntervalo.style.display = 'none';
      } else {
        // Habilita os campos de ano
        if (inputPreventivo1) inputPreventivo1.disabled = false;
        if (inputPreventivo2) inputPreventivo2.disabled = false;
      }
    });
  }
  
  // Event listeners para os campos de ano
  if (inputPreventivo1) {
    inputPreventivo1.addEventListener('input', verificarIntervaloPreventivo);
  }
  if (inputPreventivo2) {
    inputPreventivo2.addEventListener('input', verificarIntervaloPreventivo);
  }
  
  // ============================================
  // SUBMIT - PREVENTIVO
  // ============================================
  
  if (formPreventivo) {
    formPreventivo.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('📝 Formulário preventivo submetido');
      
      const maiorQue25 = document.querySelector('input[name="maiorQue25"]:checked');
      
      // Validação: deve ter mais de 25 anos
      if (!maiorQue25 || maiorQue25.value !== 'sim') {
        alert('O rastreio preventivo é indicado a partir dos 25 anos.');
        return;
      }
      
      // Coleta dados dos preventivos anteriores
      const naoLembro = checkboxNaoLembro ? checkboxNaoLembro.checked : false;
      const anoPreventivo1 = inputPreventivo1 ? inputPreventivo1.value : '';
      const anoPreventivo2 = inputPreventivo2 ? inputPreventivo2.value : '';
      
      // Monta os dados da triagem para salvar
      const dadosTriagem = {
        tipo: 'preventivo',
        maiorQue25: 'sim',
        naoLembraPreventivos: naoLembro,
        anoPreventivo1: naoLembro ? '' : anoPreventivo1,
        anoPreventivo2: naoLembro ? '' : anoPreventivo2
      };
      
      // Salva no localStorage
      salvarDadosTriagem(dadosTriagem);
      
      // Redireciona para agendamento (enfermagem por padrão)
      console.log('➡️ Preventivo -> ENFERMAGEM');
      window.location.href = destinoFinal('preventivo', 'enfermagem.html');
    });
  }
});

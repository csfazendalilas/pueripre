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
  
  // Botões de seleção
  const btnPrenatal = document.querySelector('[data-tipo="prenatal"]');
  const btnPuericultura = document.querySelector('[data-tipo="puericultura"]');
  
  // Botões de voltar
  const btnsVoltar = document.querySelectorAll('[data-action="voltar"]');
  
  // Formulários
  const formPrenatal = document.getElementById('form-prenatal');
  const formPuericultura = document.getElementById('form-puericultura');
  
  // ============================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ============================================
  
  function mostrarCard(cardParaMostrar) {
    // Esconde todos os cards
    cardSelecao.classList.add('hidden');
    cardPrenatal.classList.add('hidden');
    cardPuericultura.classList.add('hidden');
    
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
    // Esconde campos condicionais
    esconderCamposCondicionais();
  }
  
  function esconderCamposCondicionais() {
    const campoData = document.getElementById('campo-data-consulta');
    const campoSemanas = document.getElementById('campo-semanas');
    if (campoData) campoData.style.display = 'none';
    if (campoSemanas) campoSemanas.style.display = 'none';
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
  
  // Botões voltar
  btnsVoltar.forEach(btn => {
    btn.addEventListener('click', voltarParaSelecao);
  });
  
  // ============================================
  // CAMPOS CONDICIONAIS - PRÉ-NATAL
  // ============================================
  
  // Mostrar campo de data quando selecionar "Informar data"
  const radioDataConsulta = document.querySelectorAll('input[name="ultimaConsulta"]');
  const campoDataConsulta = document.getElementById('campo-data-consulta');
  
  radioDataConsulta.forEach(radio => {
    radio.addEventListener('change', function() {
      console.log('📅 Última consulta:', this.value);
      if (this.value === 'data' && campoDataConsulta) {
        campoDataConsulta.style.display = 'block';
      } else if (campoDataConsulta) {
        campoDataConsulta.style.display = 'none';
      }
    });
  });
  
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
        window.location.href = 'enfermagem.html';
        return;
      }
      
      // Alternância: último foi X, próximo é Y
      if (ultimoProfissional.value === 'enfermeiro') {
        console.log('➡️ Último foi enfermeiro -> próximo é MÉDICO');
        window.location.href = 'medico.html';
      } else if (ultimoProfissional.value === 'medico') {
        console.log('➡️ Último foi médico -> próximo é ENFERMAGEM');
        window.location.href = 'enfermagem.html';
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
        window.location.href = 'medico.html';
      } else if (ultimoProfissional.value === 'medico') {
        console.log('➡️ Último foi médico -> próximo é ENFERMAGEM');
        window.location.href = 'enfermagem.html';
      } else {
        console.log('⚠️ Valor inesperado:', ultimoProfissional.value);
        alert('Erro: opção de profissional não reconhecida');
      }
    });
  }
});

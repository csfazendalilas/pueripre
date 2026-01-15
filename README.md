# Sistema de Agendamento - Pré-natal e Puericultura

Sistema de agendamento mobile-first para consultas de pré-natal e puericultura, integrado com Google Sheets.

## Estrutura do Projeto

```
pueripre/
├── index.html              # Tela inicial de seleção de tipo de atendimento
├── main.js                 # Lógica da tela inicial
├── enfermagem.html         # Tela de agendamento de enfermagem
├── enfermagem.js           # Lógica da tela de enfermagem
├── medico.html             # Tela de agendamento médico
├── medico.js               # Lógica da tela médico
├── styles.css              # Estilos CSS (mobile-first)
├── CodeEnfermagem.gs       # Google Apps Script para enfermagem
├── CodeMedico.gs           # Google Apps Script para médico
└── README.md               # Este arquivo
```

## Configuração

### 1. Configurar Google Apps Script - Enfermagem

1. Acesse [Google Apps Script](https://script.google.com)
2. Crie um novo projeto
3. Cole o conteúdo de `CodeEnfermagem.gs`
4. Atualize as constantes no início do arquivo:
   - `SHEET_ID`: ID da planilha pessoal de horários
   - `SHEET_POSTO_ID`: ID da planilha do posto de saúde
   - `IDENTIFICADOR_EQUIPE`: Número da equipe (ex: "783")
5. Salve o projeto
6. Publique como aplicativo web:
   - Menu: Publicar > Implantar como aplicativo da web
   - Execute como: Eu mesmo
   - Quem tem acesso: Qualquer pessoa, mesmo anônimo
   - Copie a URL gerada

### 2. Configurar Google Apps Script - Médico

1. Repita o processo acima com `CodeMedico.gs`
2. Configure as mesmas constantes (ou diferentes, se necessário)
3. Publique e copie a URL

### 3. Configurar Frontend

#### Enfermagem (`enfermagem.js`)
- Atualize `API_URL` com a URL do Google Apps Script de enfermagem
- Atualize `WHATSAPP_DESTINO` com o número do WhatsApp (formato: 5511999999999)

#### Médico (`medico.js`)
- Atualize `API_URL` com a URL do Google Apps Script de médico
- Atualize `WHATSAPP_DESTINO` com o número do WhatsApp

## Estrutura das Planilhas

### Planilha Pessoal (SHEET_ID)

#### Aba "Horarios"
- Coluna A: Data
- Coluna B: Hora
- Coluna C: Status (LIVRE ou OCUPADO)
- Linha 1: Cabeçalho
- Dados começam na linha 2

#### Aba "Agendamentos"
- Coluna A: Timestamp
- Coluna B: Data da consulta
- Coluna C: Hora
- Coluna D: Nome do paciente
- Coluna E: Data de nascimento
- Coluna F: Observações/Motivo

### Planilha do Posto de Saúde (SHEET_POSTO_ID)

#### Para Enfermagem
- Coluna C: Data do dia
- Coluna M: Marcador "enf" (preenchido automaticamente)
- Coluna N: Horário do atendimento
- Coluna O: Nome do paciente (substitui "reserva")
- Coluna P: Data de nascimento
- Coluna Q: Motivo da consulta

#### Para Médico
- Coluna C: Data do dia
- Coluna D: (não usada)
- Coluna E: Horário do atendimento
- Coluna F: Nome do paciente (substitui "reserva")
- Coluna G: Data de nascimento
- Coluna H: Motivo da consulta

#### Formato das Abas
As abas seguem o formato: `783 (06/01 - 10/01) B`
- `783`: Identificador da equipe
- `06/01 - 10/01`: Período da semana (segunda a sexta)
- `B`: Sufixo do ano (A para 2025, B para 2026)

## Fluxo de Funcionamento

### Tela 1 (index.html)
1. Usuário seleciona tipo de atendimento (pré-natal ou puericultura)
2. Preenche informações específicas do tipo escolhido
3. Sistema determina para qual tela redirecionar:
   - **Pré-natal**: Primeira consulta OU Enfermeiro → Enfermagem | Médico → Médico
   - **Puericultura**: Enfermeiro → Enfermagem | Médico → Médico

### Tela Enfermagem/Médico
1. Carrega horários disponíveis da planilha pessoal
2. Usuário preenche dados do paciente
3. Ao agendar:
   - Marca horário como OCUPADO na planilha pessoal
   - Registra na aba "Agendamentos"
   - Encontra a aba correta na planilha do posto
   - Localiza linha com "reserva" correspondente
   - Preenche dados nas colunas apropriadas
   - Envia confirmação via WhatsApp (se configurado)

## Como Obter IDs das Planilhas

O ID da planilha está na URL do Google Sheets:
```
https://docs.google.com/spreadsheets/d/ID_AQUI/edit
```

Copie o `ID_AQUI` e use nas constantes.

## Deploy

### Hospedagem Local
Simplesmente abra `index.html` em um navegador ou use um servidor local:
```bash
python -m http.server 8000
# ou
npx serve
```

### Hospedagem Web
Faça upload dos arquivos HTML, CSS e JS para qualquer serviço de hospedagem:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting
- etc.

## Notas Importantes

- O sistema é mobile-first, otimizado para celulares
- As planilhas devem ter permissões adequadas para o Google Apps Script
- O sistema busca automaticamente a aba correta baseada na data
- Horários marcados como "reserva" na planilha do posto são substituídos pelos dados reais
- O sistema trata células mescladas na coluna de data

## Suporte

Em caso de problemas:
1. Verifique as configurações no Google Apps Script
2. Confirme que as planilhas têm as abas e colunas corretas
3. Verifique os logs do Google Apps Script (Menu: Executar > Ver logs de execução)
4. Confirme que as URLs do Google Apps Script estão corretas no frontend

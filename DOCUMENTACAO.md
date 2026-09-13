# 📋 Documentação do Projeto: WAnime List

## 1. Identidade e Objetivo do Projeto
- **Nome Oficial:** WAnime List
- **Objetivo:** Aplicativo web responsivo (para celular, tablet e computador) para gerenciamento completo e descomplicado de animes assistidos, temporadas, arcos de episódios, anotações de minutos/onde parou e capas ilustrativas com armazenamento permanente em nuvem e **custo zero (R$ 0,00)**.

---

## 2. Tecnologias Utilizadas (100% Gratuitas)
- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide React (ícones vetoriais).
- **Autenticação:** Firebase Authentication (Login seguro com Conta Google oficial em 1 clique).
- **Banco de Dados em Nuvem:** Google Firebase Cloud Firestore (Plano Spark Gratuito Permanente).
- **API Pública e Gratuita de Animes:** Jikan REST API (dados públicos do MyAnimeList com busca de capas de alta resolução, episódios e sinopses sem necessidade de cadastro ou chaves pagas).
- **Regras de Segurança:** Firestore Rules com validação estrita por `request.auth.uid == resource.data.userId`.

---

## 3. Isolamento Total por Usuário (Multi-tenant Seguro)
- Cada anime criado é registrado com o `userId` exclusivo da conta Google conectada.
- **Privacidade Completa:** Se você passar o link para o seu irmão, amigos ou parentes:
  - Eles entram com a conta Google deles.
  - Eles verão **única e exclusivamente** os animes da própria lista deles.
  - As regras de segurança no servidor do Firestore impedem qualquer leitura, edição ou exclusão de animes entre contas diferentes.

---

## 4. Funcionalidades Entregues

1. **Identidade Visual: WAnime List**
   - Nome atualizado em toda a interface, metadados e tela de login.

2. **Tela Inicial Limpa, Moderna e Despoluída:**
   - Visual organizado com layout responsivo.
   - Divisão em abas por status com contadores numéricos (Todos, Assistindo, Esperando novos eps, Quero assistir, Terminados, Pausados, Abandonados).

3. **Gerenciamento Completo de Temporadas e Arcos:**
   - Permite cadastrar múltiplas temporadas ou arcos com nomes customizados (ex: *"Arco de Alabasta"*, *"Arco de Wano"*, *"Temporada 2 - Distrito do Entretenimento"*).
   - Definição individual de total de episódios por arco.
   - Alternância de arco ativo em tempo real.

4. **Tela / Modal Dedicado de Detalhes para Cada Anime:**
   - Exibe a capa em tamanho expandido.
   - Lista detalhada de todos os arcos/temporadas cadastrados.
   - Painel expandido de progresso com barra de porcentagem.
   - Área rica de anotações "Onde parei" com edição rápida.
   - Sinopse completa.
   - Botão direto de 1 clique para buscar notícias recentes no Google.

5. **Cards na Tela Inicial Otimizados & Práticos:**
   - Miniatura da capa.
   - Título e identificador do arco ativo.
   - **Botões `+1 Ep` e `-1 Ep` diretamente no card** (atualizam no banco em tempo real sem precisar abrir modal).
   - Seletor rápido de status via menu suspenso no selo colorido.
   - Resumo da anotação "Onde parei".
   - Ao clicar no card, abre a tela dedicada de detalhes.

6. **Busca Inteligente & Filtros de Ordenação:**
   - Busca em tempo real por nome do anime, nome original em japonês, nome do arco ou texto da anotação.
   - Filtros de ordenação:
     - *Última atualização* (mais recentes modificados primeiro)
     - *Nome (A - Z)*
     - *Nome (Z - A)*
     - *Mais recentes cadastrados*
     - *Mais antigos cadastrados*
     - *Maior progresso de episódios*

7. **Capas & Miniaturas (Gratuito):**
   - Suporte a URL de imagem direta.
   - **Busca automática gratuita via Jikan API:** digite o nome e clique em "Buscar Capa" para preencher a capa oficial e sinopse em 1 clique.

---

## 5. Análise de Segurança e Testes de Bugs
- **Autenticação:** Validada via `onAuthStateChanged` e `loginWithGoogle` com popup.
- **Banco de Dados:** Regras do Firestore compiladas e publicadas com isolamento estrito de `userId`.
- **Prevenção de bugs de episódios negativos:** `Math.max(0, ...)` protege contra episódios menores que zero.
- **Compatibilidade de dados antigos:** Tratamento retrocompatível caso um anime não tenha array de temporadas.
- **Linter & Compilação:** 100% aprovado sem erros de tipos (`tsc --noEmit`).

---

## 6. Sugestões de Recursos Futuros (Ideias para Análise)
*(Nota: Estas são apenas sugestões para consideração futura; nenhuma foi implementada sem permissão prévia)*

1. **Histórico de Visualização:** Registro de quando você assistiu cada episódio (data/hora).
2. **Exportar / Backup da Lista:** Botão para baixar sua lista completa em formato JSON ou CSV (para guardar no computador).
3. **Modo Compacto / Modo Grade:** Opção de alternar a visualização da tela inicial entre cards médios ou uma lista mais densa/compacta.
4. **Calculadora de Tempo Total Assistido:** Somar os episódios assistidos e exibir quantas horas/dias de anime você já assistiu.
5. **Avaliação por Estrelas ou Nota:** Dar nota pessoal de 1 a 10 para animes terminados.
6. **Lembrete de Lançamento Semanal:** Marcar o dia da semana em que novos episódios saem para animes em exibição.

const docsCopy = {
  en: {
    title: 'Docs',
    subtitle: 'How CS4FUN works — modes, draft, friends, and ranks.',
    back: 'Home',
    play: 'Play now',
    windows: 'Download for Windows',
    toc: 'On this page',
    support: 'Support the project',
    report: 'Submit a report',
    reportMailSubject: 'CS4FUN report',
    reportMailBody: 'Type: bug / suggestion / other\n\nDescribe:\n',
    langAria: 'Language',
    sections: [
      {
        id: 'what',
        title: 'What is CS4FUN?',
        body: [
          'CS4FUN is a Counter-Strike draft arena. You build a dream five from historical lineups, ban and pick maps, then watch a simulated series play out — solo or with friends.',
          'It is a browser game and an optional Windows desktop app. Guests can play immediately; signing in syncs history, badges, and cloud ranks.',
          'Not affiliated with Valve or HLTV. Player names and events are used for fun, nostalgic drafting — not as an official product.',
        ],
      },
      {
        id: 'loop',
        title: 'The core loop',
        body: [
          'Every mode follows the same rhythm:',
        ],
        steps: [
          {
            title: 'Scout & draft',
            text: 'You get a pool of players (or shared rolls with others). Assign five roles into a lineup — IGL, AWPer, entry, support, and so on — under a pick timer in competitive modes.',
          },
          {
            title: 'Map veto',
            text: 'Ban and pick from the Active Duty-style pool until the series maps are set. When the veto ends, only the three series maps remain — banned maps are out.',
          },
          {
            title: 'Live simulation',
            text: 'The engine runs every map in the series with momentum, clutches, ecos, overtime, and an MVP. Control playback speed (1x–3x), pause, or take a tactical timeout to change the IGL call.',
          },
          {
            title: 'Score & climb',
            text: 'Wins feed your score, history, badges, and leaderboards. Daily mode uses one global seed so everyone faces the same challenge. A flawless Major (no losses) gets a special celebration on the results screen.',
          },
        ],
      },
      {
        id: 'modes',
        title: 'Game modes',
        body: [
          'Pick a mode from the hub. Each one changes the stakes and the draft rules.',
        ],
        modes: [
          {
            id: 'major',
            title: 'The Major',
            text: 'The serious campaign: draft a dream five and fight an 8-team MD3 bracket. Full veto, series calls, trophy vibes.',
          },
          {
            id: 'duel',
            title: 'Knife Fight',
            text: 'Shared rolls versus the BOT or a friend — but it is a BO1 ban war. Ban until one map survives, then fight for ego.',
          },
          {
            id: 'party',
            title: 'Power Party',
            text: 'Everyone in the room gets the same scouts. Build the strongest five; highest team power wins. Quick lobbies, no series sim.',
          },
          {
            id: 'box',
            title: 'Box Battle',
            text: 'Queue up to 10 real CS cases (manual or auto), open them on a reel, and race for the highest vault value. Solo vs BOT or invite a friend. Wins and rare pulls unlock Box badges; your career best drop shows on your profile.',
          },
          {
            id: 'daily',
            title: 'Blind Daily',
            text: 'One UTC seed for the world. Ratings stay hidden (always almanac), matches are BO1, and the global board resets each day.',
          },
          {
            id: 'career',
            title: 'Career',
            text: 'Signed-in only. Build an org from historical legends, manage contracts and budget, hit bootcamp, grind league weeks vs bot orgs, then run a Major. Share a season finale card — dynasty vibes.',
          },
        ],
      },
      {
        id: 'friends',
        title: 'Friends & multiplayer',
        body: [
          'Open Friends from the hub to add people by nickname/tag, accept requests, and invite them to a 1v1, party, or Box Battle — no room code required. A private room is created under the hood when you invite.',
          'You can still use the classic code lobby if you prefer sharing a 6-character code.',
          'Each friend shows head-to-head stats: matches played, wins, and losses. After a friend duel or Box Battle finishes, those numbers update automatically.',
          'On each friend card you can also compare Box vaults — your career best drop versus theirs.',
          'Without an account, friends and rooms work locally on the same browser/device. With Supabase sign-in, invites and ranks sync across devices.',
        ],
      },
      {
        id: 'account',
        title: 'Account, ranks & extras',
        body: [
          'Set a tag, avatar, and optional Steam profile link on your profile. Guests play fully offline for drafts and sims; sign in to sync history, badges, and public ranks.',
          'Your profile shows career best Box drop when you have one. Badges cover Majors, duels, dailies, Career org runs, and Box Battle (wins, golds, Coverts, jackpots, and open volume).',
          'Leaderboards cover daily, duel, box, career, and more (auth users). Showcase a badge on your profile once you unlock them.',
          'Optional low-volume match sounds (shots, bomb beeps, radio cues) can be toggled in Account.',
          'Support the project anytime via Buy Me a Coffee — linked from the landing page, game footer, and result screen.',
        ],
      },
      {
        id: 'desktop',
        title: 'Desktop app',
        body: [
          'A Windows installer wraps the same game in a desktop window — taskbar icon and tray shortcut included. You can still play in the browser anytime.',
          'Download the latest Windows setup from the home page (Windows button) or use the link below.',
        ],
        download: true,
      },
      {
        id: 'tips',
        title: 'Quick tips',
        body: [
          'Role fit and map pool matter — a stacked AWPer on the wrong map still loses rounds.',
          'In shared-roll modes, the edge is veto and role assignment, not who got lucky on the scout.',
          'Finish friend duels and Box Battles to grow your H2H record; rematch from the results screen when both players are ready.',
          'Chase Box badges — Extraordinary pulls, Coverts, and a $500+ best drop all count.',
          'Switch language anytime from Profile (EN / PT).',
        ],
      },
    ],
  },
  pt: {
    title: 'Documentação',
    subtitle: 'Como o CS4FUN funciona — modos, draft, amigos e rankings.',
    back: 'Início',
    play: 'Jogar agora',
    windows: 'Baixar para Windows',
    toc: 'Nesta página',
    support: 'Apoiar o projeto',
    report: 'Enviar um relatório',
    reportMailSubject: 'Relatório CS4FUN',
    reportMailBody: 'Tipo: bug / sugestão / outro\n\nDescreva:\n',
    langAria: 'Idioma',
    sections: [
      {
        id: 'what',
        title: 'O que é o CS4FUN?',
        body: [
          'CS4FUN é uma arena de draft de Counter-Strike. Você monta um time dos sonhos com lineups históricas, bane e escolhe mapas, e assiste a uma série simulada — solo ou com amigos.',
          'É um jogo no navegador e, opcionalmente, um app Windows. Convidados jogam na hora; ao entrar na conta, histórico, conquistas e rankings na nuvem sincronizam.',
          'Não afiliado à Valve ou HLTV. Nomes e eventos existem para o draft nostálgico — não é um produto oficial.',
        ],
      },
      {
        id: 'loop',
        title: 'O loop principal',
        body: [
          'Todo modo segue o mesmo ritmo:',
        ],
        steps: [
          {
            title: 'Scout e draft',
            text: 'Você recebe um pool de jogadores (ou revelações iguais com outros). Encaixe cinco funções no time — IGL, AWPer, entry, support, etc. — com cronômetro de pick nos modos competitivos.',
          },
          {
            title: 'Veto de mapas',
            text: 'Bane e escolhe no pool estilo Active Duty até definir os mapas da série. Quando o veto termina, só os três mapas da série ficam — banidos saem da tela.',
          },
          {
            title: 'Simulação ao vivo',
            text: 'O motor roda todos os mapas da série com momentum, clutches, ecos, overtime e MVP. Controle a velocidade (1x–3x), pause ou use timeout tático para mudar a call do IGL.',
          },
          {
            title: 'Pontuação e ranking',
            text: 'Vitórias alimentam pontuação, histórico, conquistas e rankings. O modo diário usa uma seed global para todo mundo enfrentar o mesmo desafio. Um Major perfeito (sem derrotas) ganha uma celebração especial na tela de resultado.',
          },
        ],
      },
      {
        id: 'modes',
        title: 'Modos de jogo',
        body: [
          'Escolha um modo no hub. Cada um muda as regras do draft e o que está em jogo.',
        ],
        modes: [
          {
            id: 'major',
            title: 'O Major',
            text: 'A campanha séria: monte o time dos sonhos e lute num chaveamento MD3 de 8 times. Veto completo, calls de série, vibe de troféu.',
          },
          {
            id: 'duel',
            title: 'Briga de Faca',
            text: 'Revelações iguais contra o BOT ou um amigo — mas é guerra de bans BO1. Bane até sobrar um mapa e lute pelo ego.',
          },
          {
            id: 'party',
            title: 'Power Party',
            text: 'Todo mundo na sala recebe os mesmos scouts. Monte o time mais forte; maior poder vence. Salas rápidas, sem simulação de série.',
          },
          {
            id: 'box',
            title: 'Box Battle',
            text: 'Monte até 10 cases reais do CS (manual ou automático), abra no reel e dispute o maior valor de vault. Solo vs BOT ou convide um amigo. Vitórias e drops raros desbloqueiam conquistas de Box; o melhor drop da carreira aparece no perfil.',
          },
          {
            id: 'daily',
            title: 'Diário Cego',
            text: 'Uma seed UTC para o mundo. Ratings ficam ocultos (sempre almanaque), partidas são BO1, e o ranking global reinicia todo dia.',
          },
          {
            id: 'career',
            title: 'Carreira',
            text: 'Só com conta. Monte uma org com lendas históricas, gerencie contratos e orçamento, faça bootcamp, jogue semanas de liga vs orgs BOT e dispute um Major. Compartilhe o card final da season.',
          },
        ],
      },
      {
        id: 'friends',
        title: 'Amigos e multiplayer',
        body: [
          'Abra Amigos no hub para adicionar por tag, aceitar pedidos e convidar para 1v1, party ou Box Battle — sem código de sala. Uma sala privada é criada automaticamente no convite.',
          'Ainda dá para usar a sala clássica com código de 6 caracteres se preferir.',
          'Cada amigo mostra estatísticas de confronto direto: partidas, vitórias e derrotas. Depois de um duelo ou Box Battle entre amigos, os números atualizam sozinhos.',
          'No card de cada amigo você também compara os vaults de Box — seu melhor drop da carreira contra o deles.',
          'Sem conta, amigos e salas funcionam localmente no mesmo navegador/dispositivo. Com login no Supabase, convites e rankings sincronizam entre aparelhos.',
        ],
      },
      {
        id: 'account',
        title: 'Conta, rankings e extras',
        body: [
          'Defina tag, avatar e um link opcional do perfil Steam. Convidados jogam drafts e sims offline; entre na conta para sincronizar histórico, conquistas e rankings públicos.',
          'O perfil mostra o melhor drop de Box da carreira quando houver um. Conquistas cobrem Majors, duelos, diários, Carreira e Box Battle (vitórias, golds, Coverts, jackpots e volume de opens).',
          'Os rankings incluem tabelas diárias, de duelo, box, carreira e mais (usuários autenticados). Exiba uma conquista no perfil quando desbloquear.',
          'Sons de partida em volume baixo (tiros, beep da bomba, rádio) podem ser ligados em Conta.',
          'Apoie o projeto pelo Buy Me a Coffee — link na landing, no rodapé do jogo e na tela de resultado.',
        ],
      },
      {
        id: 'desktop',
        title: 'App desktop',
        body: [
          'Um instalador Windows abre o mesmo jogo numa janela no desktop — com ícone na barra de tarefas e atalho na bandeja. Dá para continuar jogando no navegador quando quiser.',
          'Baixe o instalador mais recente na página inicial (botão Windows) ou pelo link abaixo.',
        ],
        download: true,
      },
      {
        id: 'tips',
        title: 'Dicas rápidas',
        body: [
          'O encaixe de função e o pool de mapas importam — AWPer monstro no mapa errado ainda perde rounds.',
          'Em modos de revelação compartilhada, a vantagem está no veto e nas funções, não em quem teve sorte no scout.',
          'Termine duelos e Box Battles com amigos para crescer o placar de confronto direto; peça uma revanche na tela de resultado quando os dois estiverem prontos.',
          'Busque conquistas de Box — pulls Extraordinary, Coverts e um melhor drop de $500+ contam.',
          'Troque o idioma a qualquer momento no Perfil (EN / PT).',
        ],
      },
    ],
  },
}

export default docsCopy

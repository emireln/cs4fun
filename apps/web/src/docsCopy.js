const docsCopy = {
  en: {
    title: 'Docs',
    subtitle: 'How cs4fun works — modes, draft, friends, and ranks.',
    back: 'Home',
    play: 'Play now',
    windows: 'Download for Windows',
    toc: 'On this page',
    support: 'Support the project',
    report: 'Submit a report',
    reportMailSubject: 'cs4fun report',
    reportMailBody: 'Type: bug / suggestion / other\n\nDescribe:\n',
    langAria: 'Language',
    sections: [
      {
        id: 'what',
        title: 'What is cs4fun?',
        body: [
          'cs4fun is a Counter-Strike draft arena. You build a dream five from historical lineups, ban and pick maps, then watch a simulated series play out — solo or with friends.',
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
            title: 'Major Run',
            text: 'Draft a dream five and fight through an 8-team MD3 bracket. Best for a full solo campaign — scout carefully, survive the bracket, lift the trophy.',
          },
          {
            id: 'duel',
            title: '1v1 Duel',
            text: 'Shared rolls versus the CPU or a friend in a BO3 showmatch. Same player pool for both sides — skill is in the draft, veto, and reading the series.',
          },
          {
            id: 'party',
            title: 'Party Race',
            text: 'Everyone in the room gets the same scouts. Build the strongest five you can; highest team power wins. Built for quick lobbies with friends.',
          },
          {
            id: 'daily',
            title: 'Daily Challenge',
            text: 'One UTC seed for the whole world. Same rolls, pick timer, global leaderboard. Come back each day to keep your streak.',
          },
          {
            id: 'gauntlet',
            title: 'Gauntlet',
            text: 'Survive escalating BO1 waves. Each win raises the pressure — how far can your lineup go before it breaks?',
          },
        ],
      },
      {
        id: 'friends',
        title: 'Friends & multiplayer',
        body: [
          'Open Friends from the hub to add people by nickname/tag, accept requests, and invite them to a 1v1 or party — no room code required. A private room is created under the hood when you invite.',
          'You can still use the classic code lobby if you prefer sharing a 6-character code.',
          'Each friend shows head-to-head stats: matches played, wins, and losses. After a friend duel finishes, those numbers update automatically.',
          'Without an account, friends and rooms work locally on the same browser/device. With Supabase sign-in, invites and ranks sync across devices.',
        ],
      },
      {
        id: 'account',
        title: 'Account, ranks & extras',
        body: [
          'Set a tag and avatar on your profile. Guests play fully offline for drafts and sims; sign in to sync history, badges, and public ranks.',
          'Leaderboards cover daily and duel boards (auth users). Showcase a badge on your profile once you unlock them.',
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
          'Finish friend duels to grow your H2H record; rematch from the results screen when both players are ready.',
          'Switch language anytime with EN / PT on the hub or this site.',
        ],
      },
    ],
  },
  pt: {
    title: 'Documentação',
    subtitle: 'Como o cs4fun funciona — modos, draft, amigos e rankings.',
    back: 'Início',
    play: 'Jogar agora',
    windows: 'Baixar para Windows',
    toc: 'Nesta página',
    support: 'Apoiar o projeto',
    report: 'Enviar um relatório',
    reportMailSubject: 'Relatório cs4fun',
    reportMailBody: 'Tipo: bug / sugestão / outro\n\nDescreva:\n',
    langAria: 'Idioma',
    sections: [
      {
        id: 'what',
        title: 'O que é o cs4fun?',
        body: [
          'cs4fun é uma arena de draft de Counter-Strike. Você monta um time dos sonhos com lineups históricas, bane e escolhe mapas, e assiste a uma série simulada — solo ou com amigos.',
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
            title: 'Major',
            text: 'Monte o time dos sonhos e lute num chaveamento MD3 de 8 times. Ideal para uma campanha solo completa — scout bem, sobreviva ao chaveamento e levante o troféu.',
          },
          {
            id: 'duel',
            title: 'Duelo 1v1',
            text: 'Revelações iguais contra a CPU ou um amigo num BO3. Mesmo pool para os dois — a habilidade está no draft, no veto e na leitura da série.',
          },
          {
            id: 'party',
            title: 'Party',
            text: 'Todo mundo na sala recebe os mesmos scouts. Monte o time mais forte; maior poder vence. Feito para salas rápidas com amigos.',
          },
          {
            id: 'daily',
            title: 'Desafio Diário',
            text: 'Uma seed UTC para o mundo inteiro. Mesmas revelações, cronômetro de pick, ranking global. Volte todo dia para manter a sequência.',
          },
          {
            id: 'gauntlet',
            title: 'Gauntlet',
            text: 'Sobreviva a ondas BO1 cada vez mais difíceis. Cada vitória sobe a pressão — até onde seu time aguenta?',
          },
        ],
      },
      {
        id: 'friends',
        title: 'Amigos e multiplayer',
        body: [
          'Abra Amigos no hub para adicionar por tag, aceitar pedidos e convidar para 1v1 ou party — sem código de sala. Uma sala privada é criada automaticamente no convite.',
          'Ainda dá para usar a sala clássica com código de 6 caracteres se preferir.',
          'Cada amigo mostra estatísticas de confronto direto: partidas, vitórias e derrotas. Depois de um duelo entre amigos, os números atualizam sozinhos.',
          'Sem conta, amigos e salas funcionam localmente no mesmo navegador/dispositivo. Com login no Supabase, convites e rankings sincronizam entre aparelhos.',
        ],
      },
      {
        id: 'account',
        title: 'Conta, rankings e extras',
        body: [
          'Defina tag e avatar no perfil. Convidados jogam drafts e sims offline; entre na conta para sincronizar histórico, conquistas e rankings públicos.',
          'Os rankings incluem tabelas diárias e de duelo (usuários autenticados). Exiba uma conquista no perfil quando desbloquear.',
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
          'Termine duelos com amigos para crescer o placar de confronto direto; peça uma revanche na tela de resultado quando os dois estiverem prontos.',
          'Troque o idioma a qualquer momento com EN / PT no hub ou neste site.',
        ],
      },
    ],
  },
}

export default docsCopy

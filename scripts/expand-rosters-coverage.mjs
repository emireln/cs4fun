/**
 * Append notable missing CS2/CS:GO rosters into apps/app/src/data/rosters.json
 * Run: node scripts/expand-rosters-coverage.mjs
 */
import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const path = join(dirname(fileURLToPath(import.meta.url)), '../apps/app/src/data/rosters.json')
const existing = JSON.parse(fs.readFileSync(path, 'utf8'))
const have = new Set(existing.map((r) => r.id))

const maps = ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Overpass', 'Vertigo', 'Train']

const extra = [
  {
    id: 'aurora-2025',
    team: 'Aurora Gaming',
    shortName: 'AUR',
    event: 'BLAST Open 2025',
    year: 2025,
    region: 'EU',
    achievement: 'Top Contender',
    mapPoolBias: ['Mirage', 'Ancient', 'Nuke', 'Inferno', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'lack1-2025', name: 'lack1', realName: 'Viktor Boldyrev', role: 'IGL', rating: 1.02, bestMaps: ['Mirage', 'Ancient', 'Nuke'] },
      { id: 'degster-2025', name: 'degster', realName: 'Abdul Gasanov', role: 'AWPer', rating: 1.18, bestMaps: ['Dust2', 'Mirage', 'Nuke'] },
      { id: 'norwi-2025', name: 'Norwi', realName: 'Andrey Yegorov', role: 'Rifler', rating: 1.12, bestMaps: ['Inferno', 'Ancient', 'Anubis'] },
      { id: 'r3salt-2025', name: 'r3salt', realName: 'Vadim Fedorov', role: 'Entry', rating: 1.1, bestMaps: ['Mirage', 'Dust2', 'Overpass'] },
      { id: 'lattykk-2025', name: 'LATTYKK', realName: 'Vladislav Latsis', role: 'Support', rating: 1.05, bestMaps: ['Nuke', 'Inferno', 'Ancient'] },
    ],
  },
  {
    id: 'lynn-vision-2025',
    team: 'Lynn Vision',
    shortName: 'LV',
    event: 'CS Asia Championships 2025',
    year: 2025,
    region: 'AS',
    achievement: 'Asia Contender',
    mapPoolBias: ['Ancient', 'Mirage', 'Inferno', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'westmelon-2025', name: 'westmelon', realName: 'Wenbin Wu', role: 'IGL', rating: 1.04, bestMaps: ['Ancient', 'Mirage', 'Inferno'] },
      { id: 'z4kr-2025', name: 'z4kr', realName: 'Zhang Kai', role: 'AWPer', rating: 1.14, bestMaps: ['Dust2', 'Nuke', 'Mirage'] },
      { id: 'starry-2025', name: 'Starry', realName: 'Ye Lizhi', role: 'Rifler', rating: 1.11, bestMaps: ['Inferno', 'Anubis', 'Overpass'] },
      { id: 'emiliaqaq-2025', name: 'EmiliaQAQ', realName: 'Tang Junjie', role: 'Entry', rating: 1.09, bestMaps: ['Mirage', 'Dust2', 'Ancient'] },
      { id: 'jee-2025', name: 'Jee', realName: 'Ji Dongkai', role: 'Support', rating: 1.06, bestMaps: ['Nuke', 'Inferno', 'Anubis'] },
    ],
  },
  {
    id: 'b8-2025',
    team: 'B8',
    shortName: 'B8',
    event: 'ESL Pro League 2025',
    year: 2025,
    region: 'EU',
    achievement: 'Rising Contender',
    mapPoolBias: ['Mirage', 'Nuke', 'Inferno', 'Ancient', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'npl-2025', name: 'npl', realName: 'Andrij Kukharskyi', role: 'IGL', rating: 1.03, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'alex666-2025', name: 'alex666', realName: 'Alexey Yarmoshchuk', role: 'AWPer', rating: 1.13, bestMaps: ['Dust2', 'Mirage', 'Ancient'] },
      { id: 'headtr1ck-2025', name: 'headtr1ck', realName: 'Danyil Valitov', role: 'Rifler', rating: 1.15, bestMaps: ['Nuke', 'Inferno', 'Anubis'] },
      { id: 'kensizor-2025', name: 'kensizor', realName: 'Nikita Krasnov', role: 'Entry', rating: 1.08, bestMaps: ['Mirage', 'Dust2', 'Overpass'] },
      { id: 'esenthial-2025', name: 'esenthial', realName: 'Daniil Dudinskyi', role: 'Support', rating: 1.05, bestMaps: ['Ancient', 'Nuke', 'Inferno'] },
    ],
  },
  {
    id: 'flyquest-2025',
    team: 'FlyQuest',
    shortName: 'FLY',
    event: 'IEM Melbourne 2025',
    year: 2025,
    region: 'OC',
    achievement: 'Oceania Contender',
    mapPoolBias: ['Mirage', 'Inferno', 'Ancient', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'jks-2025', name: 'jks', realName: 'Justin de Leon', role: 'Rifler', rating: 1.12, bestMaps: ['Mirage', 'Inferno', 'Dust2'] },
      { id: 'vexite-2025', name: 'Vexite', realName: 'Declan Portelli', role: 'Entry', rating: 1.08, bestMaps: ['Ancient', 'Nuke', 'Overpass'] },
      { id: 'dexter-2025', name: 'dexter', realName: 'Christopher Nistad', role: 'IGL', rating: 1.01, bestMaps: ['Inferno', 'Mirage', 'Anubis'] },
      { id: 'ins-2025', name: 'INS', realName: 'Joshua Potter', role: 'Support', rating: 1.06, bestMaps: ['Nuke', 'Ancient', 'Dust2'] },
      { id: 'nettik-2025', name: 'nettik', realName: 'Connor McLeod', role: 'AWPer', rating: 1.1, bestMaps: ['Dust2', 'Mirage', 'Inferno'] },
    ],
  },
  {
    id: 'm80-2025',
    team: 'M80',
    shortName: 'M80',
    event: 'BLAST Rising 2025',
    year: 2025,
    region: 'NA',
    achievement: 'NA Contender',
    mapPoolBias: ['Mirage', 'Ancient', 'Inferno', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'lake-2025', name: 'Lake', realName: 'Shane Thomson', role: 'Rifler', rating: 1.1, bestMaps: ['Mirage', 'Inferno', 'Dust2'] },
      { id: 'swisher-2025', name: 'Swisher', realName: 'Mike Schmid', role: 'Support', rating: 1.04, bestMaps: ['Nuke', 'Ancient', 'Anubis'] },
      { id: 's1n-2025', name: 's1n', realName: 'Alexander Vo', role: 'IGL', rating: 1.02, bestMaps: ['Inferno', 'Mirage', 'Overpass'] },
      { id: 'reck-2025', name: 'reck', realName: 'Ethan Serrano', role: 'Entry', rating: 1.09, bestMaps: ['Ancient', 'Dust2', 'Nuke'] },
      { id: 'malbsmd-2025', name: 'malbsMd', realName: 'Mario Samayoa', role: 'AWPer', rating: 1.16, bestMaps: ['Dust2', 'Mirage', 'Inferno'] },
    ],
  },
  {
    id: 'nemiga-2025',
    team: 'Nemiga',
    shortName: 'NEM',
    event: 'CCT Europe 2025',
    year: 2025,
    region: 'EU',
    achievement: 'Regional Contender',
    mapPoolBias: ['Mirage', 'Nuke', 'Ancient', 'Inferno', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'riskyb0b-2025', name: 'riskyb0b', realName: 'Vladyslav Kvasnikov', role: 'IGL', rating: 1.02, bestMaps: ['Mirage', 'Nuke', 'Inferno'] },
      { id: 'xant3r-2025', name: 'Xant3r', realName: 'Kirill Kononov', role: 'AWPer', rating: 1.12, bestMaps: ['Dust2', 'Mirage', 'Ancient'] },
      { id: 'sowalio-2025', name: 'sowalio', realName: 'Bohdan Chernikov', role: 'Rifler', rating: 1.1, bestMaps: ['Inferno', 'Anubis', 'Overpass'] },
      { id: 'dert0m-2025', name: 'dert0m', realName: 'Dmitry Alyushin', role: 'Entry', rating: 1.07, bestMaps: ['Mirage', 'Dust2', 'Nuke'] },
      { id: 'kl1o-2025', name: 'kL1o', realName: 'Nikita Evdokimov', role: 'Support', rating: 1.04, bestMaps: ['Ancient', 'Inferno', 'Anubis'] },
    ],
  },
  {
    id: 'ecstatic-2025',
    team: 'ECSTATIC',
    shortName: 'ECS',
    event: 'Thunderpick World Championship 2025',
    year: 2025,
    region: 'EU',
    achievement: 'Nordic Contender',
    mapPoolBias: ['Mirage', 'Inferno', 'Ancient', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'anarkez-2025', name: 'anarkez', realName: 'Mathias Hansen', role: 'IGL', rating: 1.01, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'kristou-2025', name: 'Kristou', realName: 'Kristoffer Aamand', role: 'AWPer', rating: 1.11, bestMaps: ['Dust2', 'Ancient', 'Mirage'] },
      { id: 'nutnut-2025', name: 'nut nut', realName: 'Martin Falborg', role: 'Rifler', rating: 1.09, bestMaps: ['Inferno', 'Anubis', 'Overpass'] },
      { id: 'patti-2025', name: 'Patti', realName: 'Patrick Larsen', role: 'Entry', rating: 1.07, bestMaps: ['Mirage', 'Dust2', 'Nuke'] },
      { id: 'sirah-2025', name: 'sirah', realName: 'William Kjærsgaard', role: 'Support', rating: 1.04, bestMaps: ['Ancient', 'Inferno', 'Anubis'] },
    ],
  },
  {
    id: 'passion-ua-2025',
    team: 'Passion UA',
    shortName: 'PUA',
    event: 'ESL Challenger League 2025',
    year: 2025,
    region: 'EU',
    achievement: 'UA Contender',
    mapPoolBias: ['Mirage', 'Nuke', 'Inferno', 'Ancient', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'jackasmo-2025', name: 'jackasmo', realName: 'Mykyta Bass', role: 'IGL', rating: 1.02, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'jambo-2025', name: 'jambo', realName: 'Daniil Yaloyan', role: 'AWPer', rating: 1.12, bestMaps: ['Dust2', 'Mirage', 'Ancient'] },
      { id: 'fear-2025', name: 'fear', realName: 'Rodion Smyk', role: 'Rifler', rating: 1.1, bestMaps: ['Nuke', 'Inferno', 'Anubis'] },
      { id: 'zerrofix-2025', name: 'zeRRoFIX', realName: 'Ivan Petrovskyi', role: 'Entry', rating: 1.08, bestMaps: ['Mirage', 'Dust2', 'Overpass'] },
      { id: 'schilla-2025', name: 's-chilla', realName: 'Ivan Stepanchuk', role: 'Support', rating: 1.04, bestMaps: ['Ancient', 'Nuke', 'Inferno'] },
    ],
  },
  {
    id: 'oddik-2025',
    team: 'ODDIK',
    shortName: 'ODK',
    event: 'CCT South America 2025',
    year: 2025,
    region: 'SA',
    achievement: 'Brazil Contender',
    mapPoolBias: ['Mirage', 'Inferno', 'Ancient', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'naitte-2025', name: 'naitte', realName: 'João Pedro', role: 'IGL', rating: 1.01, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'togs-2025', name: 'togs', realName: 'Victor Rapassi', role: 'AWPer', rating: 1.1, bestMaps: ['Dust2', 'Mirage', 'Ancient'] },
      { id: 'coldzera-oddik-2025', name: 'coldzera', realName: 'Marcelo David', role: 'Rifler', rating: 1.12, bestMaps: ['Inferno', 'Nuke', 'Anubis'] },
      { id: 'k1n-2025', name: 'k1n', realName: 'Matheus Bastos', role: 'Entry', rating: 1.07, bestMaps: ['Mirage', 'Dust2', 'Overpass'] },
      { id: 'ninja3-2025', name: 'ninjaZ', realName: 'Guilherme Nunes', role: 'Support', rating: 1.04, bestMaps: ['Ancient', 'Inferno', 'Nuke'] },
    ],
  },
  {
    id: 'nrg-2024',
    team: 'NRG',
    shortName: 'NRG',
    event: 'BLAST Premier Fall 2024',
    year: 2024,
    region: 'NA',
    achievement: 'NA Contender',
    mapPoolBias: ['Mirage', 'Ancient', 'Inferno', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'osee-2024', name: 'oSee', realName: 'Jesus Sanchez', role: 'AWPer', rating: 1.12, bestMaps: ['Dust2', 'Mirage', 'Nuke'] },
      { id: 'brehze-2024', name: 'Brehze', realName: 'Vincent Cayonte', role: 'Rifler', rating: 1.1, bestMaps: ['Inferno', 'Ancient', 'Anubis'] },
      { id: 'hext-2024', name: 'HexT', realName: 'Jaden Postma', role: 'Support', rating: 1.05, bestMaps: ['Mirage', 'Nuke', 'Overpass'] },
      { id: 'autimatic-2024', name: 'autimatic', realName: 'Timothy Ta', role: 'Entry', rating: 1.07, bestMaps: ['Dust2', 'Inferno', 'Ancient'] },
      { id: 'nitr0-2024', name: 'nitr0', realName: 'Nick Cannella', role: 'IGL', rating: 1.0, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
    ],
  },
  {
    id: 'eg-berlin-2019',
    team: 'Evil Geniuses',
    shortName: 'EG',
    event: 'StarLadder Berlin Major 2019',
    year: 2019,
    region: 'NA',
    achievement: 'Major Champions',
    mapPoolBias: ['Mirage', 'Inferno', 'Nuke', 'Dust2', 'Overpass', 'Train', 'Vertigo'],
    players: [
      { id: 'tarik-2019', name: 'tarik', realName: 'Tarik Celik', role: 'Support', rating: 1.08, bestMaps: ['Mirage', 'Inferno', 'Overpass'] },
      { id: 'stewie2k-2019', name: 'Stewie2K', realName: 'Jake Yip', role: 'Entry', rating: 1.1, bestMaps: ['Inferno', 'Dust2', 'Nuke'] },
      { id: 'brehze-2019', name: 'Brehze', realName: 'Vincent Cayonte', role: 'Rifler', rating: 1.14, bestMaps: ['Mirage', 'Train', 'Overpass'] },
      { id: 'ethan-2019', name: 'Ethan', realName: 'Ethan Arnold', role: 'Lurker', rating: 1.09, bestMaps: ['Nuke', 'Inferno', 'Dust2'] },
      { id: 'ceal-2019', name: 'CeRq', realName: 'Cvetelin Dimitrov', role: 'AWPer', rating: 1.13, bestMaps: ['Dust2', 'Mirage', 'Train'] },
    ],
  },
  {
    id: '100t-2020',
    team: '100 Thieves',
    shortName: '100T',
    event: 'IEM Katowice 2020',
    year: 2020,
    region: 'NA',
    achievement: 'Major Contender',
    mapPoolBias: ['Mirage', 'Inferno', 'Nuke', 'Dust2', 'Overpass', 'Vertigo', 'Train'],
    players: [
      { id: 'asuna-2020', name: 'Asuna', realName: 'Peter Mazuryk', role: 'Entry', rating: 1.08, bestMaps: ['Mirage', 'Dust2', 'Inferno'] },
      { id: 'jdm-2020', name: 'JDM64', realName: 'Josh Marzano', role: 'AWPer', rating: 1.06, bestMaps: ['Nuke', 'Train', 'Overpass'] },
      { id: 'nitr0-2020', name: 'nitr0', realName: 'Nick Cannella', role: 'IGL', rating: 1.02, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'eliqe-2020', name: 'EliGE', realName: 'Jonathan Jablonowski', role: 'Rifler', rating: 1.16, bestMaps: ['Inferno', 'Dust2', 'Overpass'] },
      { id: 'grim-2020', name: 'Grim', realName: 'Michael Wince', role: 'Support', rating: 1.07, bestMaps: ['Nuke', 'Mirage', 'Vertigo'] },
    ],
  },
  {
    id: 'ence-2024',
    team: 'ENCE',
    shortName: 'ENCE',
    event: 'IEM Katowice 2024',
    year: 2024,
    region: 'EU',
    achievement: 'Top Contender',
    mapPoolBias: ['Mirage', 'Ancient', 'Inferno', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'gla1ve-2024', name: 'gla1ve', realName: 'Lukas Rossander', role: 'IGL', rating: 1.0, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'sdy-2024', name: 'sdy', realName: 'Viktor Orudzhev', role: 'Support', rating: 1.06, bestMaps: ['Ancient', 'Anubis', 'Overpass'] },
      { id: 'dycha-2024', name: 'dycha', realName: 'Paweł Dycha', role: 'Rifler', rating: 1.1, bestMaps: ['Inferno', 'Mirage', 'Dust2'] },
      { id: 'myltsi-2024', name: 'myltsi', realName: 'Saku Nevalainen', role: 'Entry', rating: 1.07, bestMaps: ['Nuke', 'Ancient', 'Anubis'] },
      { id: 'podi-2024', name: 'podi', realName: 'Paavo Heiskanen', role: 'AWPer', rating: 1.11, bestMaps: ['Dust2', 'Mirage', 'Inferno'] },
    ],
  },
  {
    id: 'mibr-2024',
    team: 'MIBR',
    shortName: 'MIBR',
    event: 'IEM Rio 2024',
    year: 2024,
    region: 'SA',
    achievement: 'Brazil Contender',
    mapPoolBias: ['Mirage', 'Inferno', 'Ancient', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'exit-2024', name: 'exit', realName: 'Raphael Lacerda', role: 'IGL', rating: 1.02, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'saffee-2024', name: 'saffee', realName: 'Rafael Costa', role: 'AWPer', rating: 1.14, bestMaps: ['Dust2', 'Mirage', 'Ancient'] },
      { id: 'drop-2024', name: 'drop', realName: 'André Abreu', role: 'Support', rating: 1.05, bestMaps: ['Inferno', 'Anubis', 'Overpass'] },
      { id: 'insani-2024', name: 'insani', realName: 'Felipe Yuji', role: 'Rifler', rating: 1.13, bestMaps: ['Mirage', 'Nuke', 'Dust2'] },
      { id: 'brnz4n-2024', name: 'brnz4n', realName: 'Breno Poletto', role: 'Entry', rating: 1.08, bestMaps: ['Ancient', 'Inferno', 'Anubis'] },
    ],
  },
  {
    id: 'pain-2024',
    team: 'paiN Gaming',
    shortName: 'paiN',
    event: 'Perfect World Shanghai Major 2024',
    year: 2024,
    region: 'SA',
    achievement: 'Major Contender',
    mapPoolBias: ['Mirage', 'Inferno', 'Ancient', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'biguzera-2024', name: 'biguzera', realName: 'Rodrigo Bittencourt', role: 'IGL', rating: 1.04, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'nqz-2024', name: 'nqz', realName: 'Lucas Soares', role: 'AWPer', rating: 1.15, bestMaps: ['Dust2', 'Mirage', 'Ancient'] },
      { id: 'kauez-2024', name: 'kauez', realName: 'Kaue Kaselhaufer', role: 'Entry', rating: 1.09, bestMaps: ['Inferno', 'Anubis', 'Overpass'] },
      { id: 'snow-2024', name: 'snow', realName: 'João Vinicius', role: 'Rifler', rating: 1.11, bestMaps: ['Nuke', 'Mirage', 'Dust2'] },
      { id: 'nami-2024', name: 'nami', realName: 'Vinicius Santos', role: 'Support', rating: 1.05, bestMaps: ['Ancient', 'Inferno', 'Anubis'] },
    ],
  },
  {
    id: 'heroic-2024',
    team: 'Heroic',
    shortName: 'HER',
    event: 'BLAST Premier World Final 2024',
    year: 2024,
    region: 'EU',
    achievement: 'Top Contender',
    mapPoolBias: ['Mirage', 'Ancient', 'Inferno', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'kyxsan-2024', name: 'kyxsan', realName: 'Damjan Stoilkovski', role: 'IGL', rating: 1.02, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'sjuush-2024', name: 'sjuush', realName: 'Rasmus Beck', role: 'Support', rating: 1.07, bestMaps: ['Ancient', 'Anubis', 'Overpass'] },
      { id: 'teses-2024', name: 'TeSeS', realName: 'René Madsen', role: 'Rifler', rating: 1.1, bestMaps: ['Inferno', 'Mirage', 'Dust2'] },
      { id: 'nertz-2024', name: 'NertZ', realName: 'Guy Iluz', role: 'Entry', rating: 1.12, bestMaps: ['Nuke', 'Ancient', 'Anubis'] },
      { id: 'xertion-2024', name: 'xertioN', realName: 'Dorian Berman', role: 'AWPer', rating: 1.13, bestMaps: ['Dust2', 'Mirage', 'Inferno'] },
    ],
  },
  {
    id: 'big-2024',
    team: 'BIG',
    shortName: 'BIG',
    event: 'IEM Cologne 2024',
    year: 2024,
    region: 'EU',
    achievement: 'Regional Contender',
    mapPoolBias: ['Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'tabseN-2024', name: 'tabseN', realName: 'Johannes Wodarz', role: 'IGL', rating: 1.05, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'syronee-2024', name: 'syrsoN', realName: 'Florian Rische', role: 'AWPer', rating: 1.1, bestMaps: ['Dust2', 'Mirage', 'Ancient'] },
      { id: 'jdc-2024', name: 'JDC', realName: 'Jon De Castro', role: 'Rifler', rating: 1.08, bestMaps: ['Inferno', 'Anubis', 'Overpass'] },
      { id: 'prosus-2024', name: 'prosus', realName: 'David Hesse', role: 'Entry', rating: 1.06, bestMaps: ['Nuke', 'Dust2', 'Mirage'] },
      { id: 'gr1ks-2024', name: 'gr1ks', realName: 'Gytis Gricius', role: 'Support', rating: 1.03, bestMaps: ['Ancient', 'Inferno', 'Anubis'] },
    ],
  },
  {
    id: 'tyloo-2025',
    team: 'TYLOO',
    shortName: 'TYL',
    event: 'Perfect World Shanghai 2025',
    year: 2025,
    region: 'AS',
    achievement: 'Asia Contender',
    mapPoolBias: ['Mirage', 'Ancient', 'Inferno', 'Nuke', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'jamyoung-2025', name: 'JamYoung', realName: 'Yang Yi', role: 'Rifler', rating: 1.12, bestMaps: ['Mirage', 'Inferno', 'Dust2'] },
      { id: 'mercury-2025', name: 'Mercury', realName: 'Wang Jingxiang', role: 'AWPer', rating: 1.11, bestMaps: ['Dust2', 'Nuke', 'Ancient'] },
      { id: 'moseyuh-2025', name: 'Moseyuh', realName: 'Chen Qianhao', role: 'Entry', rating: 1.09, bestMaps: ['Inferno', 'Anubis', 'Overpass'] },
      { id: 'attacker-2025', name: 'Attacker', realName: 'Wang Jingjie', role: 'Support', rating: 1.05, bestMaps: ['Mirage', 'Nuke', 'Ancient'] },
      { id: 'kaze-2025', name: 'kaze', realName: 'Andrew Li', role: 'IGL', rating: 1.03, bestMaps: ['Ancient', 'Inferno', 'Anubis'] },
    ],
  },
  {
    id: 'hotu-2025',
    team: 'HOTU',
    shortName: 'HOTU',
    event: 'ESL Challenger Katowice 2025',
    year: 2025,
    region: 'AS',
    achievement: 'Rising Contender',
    mapPoolBias: ['Mirage', 'Nuke', 'Inferno', 'Ancient', 'Anubis', 'Dust2', 'Overpass'],
    players: [
      { id: 'mizu-2025', name: 'mizu', realName: 'Daniil Kudryavtsev', role: 'IGL', rating: 1.02, bestMaps: ['Mirage', 'Inferno', 'Nuke'] },
      { id: 'dukefissura-2025', name: 'dukefissura', realName: 'Suleiman Uspanov', role: 'AWPer', rating: 1.1, bestMaps: ['Dust2', 'Mirage', 'Ancient'] },
      { id: 'front-2025', name: 'front', realName: 'Khamidulla Akhmedov', role: 'Rifler', rating: 1.08, bestMaps: ['Inferno', 'Anubis', 'Overpass'] },
      { id: 'anotand-2025', name: 'anotand', realName: 'Artemy Evdokimov', role: 'Entry', rating: 1.07, bestMaps: ['Nuke', 'Dust2', 'Mirage'] },
      { id: 'nice-2025', name: 'nice', realName: 'Yevhenii Shulha', role: 'Support', rating: 1.04, bestMaps: ['Ancient', 'Inferno', 'Anubis'] },
    ],
  },
]

// Normalize NaVi casing in existing data
for (const r of existing) {
  if (r.shortName === 'NaVi') r.shortName = 'NAVI'
}

const added = []
for (const roster of extra) {
  if (have.has(roster.id)) continue
  existing.push(roster)
  have.add(roster.id)
  added.push(roster.id)
}

fs.writeFileSync(path, `${JSON.stringify(existing, null, 2)}\n`)
console.log(`Rosters: ${existing.length} total, +${added.length} new`)
console.log(added.join('\n') || '(none)')

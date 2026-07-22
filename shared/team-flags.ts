interface TeamFlagMeta {
  flagCode: string | null
  flagEmoji: string
  flagUrl: string | null
}

const FIFA_TO_FLAG_CODE: Record<string, string> = {
  ALG: 'dz',
  ARG: 'ar',
  AUS: 'au',
  AUT: 'at',
  BEL: 'be',
  BIH: 'ba',
  BRA: 'br',
  CAN: 'ca',
  CIV: 'ci',
  COD: 'cd',
  COL: 'co',
  CPV: 'cv',
  CRO: 'hr',
  CUW: 'cw',
  CZE: 'cz',
  ECU: 'ec',
  EGY: 'eg',
  ENG: 'gb-eng',
  ESP: 'es',
  FRA: 'fr',
  GER: 'de',
  GHA: 'gh',
  HAI: 'ht',
  IRN: 'ir',
  IRQ: 'iq',
  JOR: 'jo',
  JPN: 'jp',
  KOR: 'kr',
  KSA: 'sa',
  MAR: 'ma',
  MEX: 'mx',
  NED: 'nl',
  NOR: 'no',
  NZL: 'nz',
  PAN: 'pa',
  PAR: 'py',
  POR: 'pt',
  QAT: 'qa',
  RSA: 'za',
  SCO: 'gb-sct',
  SEN: 'sn',
  SUI: 'ch',
  SWE: 'se',
  TUN: 'tn',
  TUR: 'tr',
  URU: 'uy',
  USA: 'us',
  UZB: 'uz'
}

const BLACK_FLAG = '\uD83C\uDFF4'
const FOOTBALL = '\u26BD'
const REGIONAL_INDICATOR_OFFSET = 127397
const TEAM_NAME_TO_FIFA_CODE: Record<string, string> = {
  algeria: 'ALG',
  argentina: 'ARG',
  australia: 'AUS',
  austria: 'AUT',
  belgium: 'BEL',
  'bosnia and herzegovina': 'BIH',
  brazil: 'BRA',
  canada: 'CAN',
  'cabo verde': 'CPV',
  colombia: 'COL',
  'congo dr': 'COD',
  croatia: 'CRO',
  curacao: 'CUW',
  czechia: 'CZE',
  ecuador: 'ECU',
  egypt: 'EGY',
  england: 'ENG',
  france: 'FRA',
  germany: 'GER',
  ghana: 'GHA',
  haiti: 'HAI',
  'ir iran': 'IRN',
  iraq: 'IRQ',
  jordan: 'JOR',
  japan: 'JPN',
  'korea republic': 'KOR',
  morocco: 'MAR',
  mexico: 'MEX',
  netherlands: 'NED',
  norway: 'NOR',
  panama: 'PAN',
  paraguay: 'PAR',
  portugal: 'POR',
  qatar: 'QAT',
  scotland: 'SCO',
  senegal: 'SEN',
  spain: 'ESP',
  switzerland: 'SUI',
  sweden: 'SWE',
  tunisia: 'TUN',
  turkiye: 'TUR',
  turkey: 'TUR',
  uruguay: 'URU',
  'united states': 'USA',
  usa: 'USA',
  uzbekistan: 'UZB',
  'new zealand': 'NZL',
  'saudi arabia': 'KSA',
  'south africa': 'RSA',
  "cote d'ivoire": 'CIV',
  'ivory coast': 'CIV'
}

export function getTeamFlagMeta(fifaCode: string): TeamFlagMeta {
  const code = fifaCode.trim().toUpperCase()
  const flagCode = FIFA_TO_FLAG_CODE[code] ?? null

  return {
    flagCode,
    flagEmoji: flagCode ? flagEmojiForCode(flagCode) : FOOTBALL,
    flagUrl: flagCode ? `https://flagcdn.com/${flagCode}.svg` : null
  }
}

export function getTeamFlagEmoji(fifaCode: string) {
  return getTeamFlagMeta(fifaCode).flagEmoji
}

export function getTeamFlagMetaByName(teamName: string): TeamFlagMeta {
  return getTeamFlagMeta(TEAM_NAME_TO_FIFA_CODE[normalizeTeamName(teamName)] ?? '')
}

function normalizeTeamName(teamName: string) {
  return teamName.trim().toLowerCase()
}

function flagEmojiForCode(flagCode: string) {
  if (flagCode === 'gb-eng' || flagCode === 'gb-sct') {
    return BLACK_FLAG
  }

  if (!/^[a-z]{2}$/.test(flagCode)) {
    return FOOTBALL
  }

  return [...flagCode.toUpperCase()]
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET))
    .join('')
}

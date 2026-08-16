// Search aliases for countries whose official name changed.
const SEARCH_ALIASES: Record<string, string[]> = {
  TR: ['Turkey'],
  CZ: ['Czech Republic'],
  SZ: ['Swaziland'],
  MK: ['Macedonia'],
  CI: ['Ivory Coast'],
};

const regionNames = new Intl.DisplayNames(['en-US'], { type: 'region' });

export interface Country {
  code: string;
  flag: string;
  name: string;
  displayName: string;
}

function flagFor(code: string): string {
  const base = 127397; // regional indicator symbol offset
  return code
    .toUpperCase()
    .split('')
    .map((ch) => String.fromCodePoint(base + ch.charCodeAt(0)))
    .join('');
}

export function makeCountry(code: string): Country {
  const upper = code.toUpperCase();
  let name = upper;
  try {
    name = regionNames.of(upper) ?? upper;
  } catch {
    // invalid region code — fall back to the raw code
  }
  const flag = flagFor(upper);
  return { code: upper, flag, name, displayName: `${flag} ${name}` };
}

export function matchesSearch(country: Country, query: string): boolean {
  const q = query.toLowerCase();
  if (country.name.toLowerCase().includes(q) || country.code.toLowerCase().includes(q)) {
    return true;
  }
  const aliases = SEARCH_ALIASES[country.code];
  return aliases?.some((alias) => alias.toLowerCase().includes(q)) ?? false;
}

// ISO 3166-1 alpha-2, officially assigned codes. Only the codes are listed —
// display names are resolved at runtime via Intl.DisplayNames.
const ISO_ALPHA_2 = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ',
  'DE','DJ','DK','DM','DO','DZ',
  'EC','EE','EG','EH','ER','ES','ET',
  'FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
  'HK','HM','HN','HR','HT','HU',
  'ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT',
  'JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ',
  'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
  'MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
  'NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ',
  'OM',
  'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY',
  'QA',
  'RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ',
  'TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','UM','US','UY','UZ',
  'VA','VC','VE','VG','VI','VN','VU',
  'WF','WS',
  'YE','YT',
  'ZA','ZM','ZW',
];

let cachedAll: Country[] | null = null;

/** All ISO-3166-1 alpha-2 countries, sorted by localized English name. */
export function allCountries(): Country[] {
  if (cachedAll) return cachedAll;

  cachedAll = ISO_ALPHA_2.map(makeCountry)
    .filter((c) => c.name !== '' && c.name !== c.code)
    .sort((a, b) => a.name.localeCompare(b.name));

  return cachedAll;
}

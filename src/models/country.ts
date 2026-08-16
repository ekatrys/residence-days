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

let cachedAll: Country[] | null = null;

/** All ISO-3166-1 alpha-2 countries, sorted by localized English name. */
export function allCountries(): Country[] {
  if (cachedAll) return cachedAll;

  // Enumerate valid region codes at runtime instead of maintaining a static list.
  const regions =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('region') : [];

  cachedAll = regions
    .filter((code) => code.length === 2)
    .map(makeCountry)
    .filter((c) => c.name !== '' && c.name !== c.code)
    .sort((a, b) => a.name.localeCompare(b.name));

  return cachedAll;
}

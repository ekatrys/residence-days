import { useEffect, useState } from 'react';

const CONSERVATIVE_KEY = 'conservativeDayCounting';

/** Persists the day-counting preference in localStorage. Defaults to conservative. */
export function useSettings() {
  const [conservativeCounting, setConservativeCounting] = useState<boolean>(() => {
    const stored = localStorage.getItem(CONSERVATIVE_KEY);
    if (stored === null) {
      localStorage.setItem(CONSERVATIVE_KEY, 'true');
      return true;
    }
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(CONSERVATIVE_KEY, String(conservativeCounting));
  }, [conservativeCounting]);

  return { conservativeCounting, setConservativeCounting };
}

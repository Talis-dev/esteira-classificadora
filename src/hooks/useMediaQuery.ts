import { useState, useEffect } from "react";

/**
 * Hook para detectar media queries
 * Exemplo: const isMobile = useMediaQuery('(max-width: 640px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Verifica se está no browser
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);

    // Define valor inicial
    setMatches(media.matches);

    // Listener para mudanças
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Adiciona listener (API moderna)
    media.addEventListener("change", listener);

    // Cleanup
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

// Hooks pré-configurados para breakpoints do Tailwind
export function useIsMobile() {
  return useMediaQuery("(max-width: 639px)"); // < sm (640px)
}

export function useIsTablet() {
  return useMediaQuery("(min-width: 640px) and (max-width: 1023px)"); // sm até md
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)"); // >= lg
}

export function useIsSmallScreen() {
  return useMediaQuery("(max-width: 640px)"); // < sm
}

export function useIsMediumScreen() {
  return useMediaQuery("(min-width: 641px) and (max-width: 1024px)"); // sm até lg
}

export function useIsLargeScreen() {
  return useMediaQuery("(min-width: 1025px)"); // >= lg
}

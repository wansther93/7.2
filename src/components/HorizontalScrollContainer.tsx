import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Função utilitária global para centralizar qualquer elemento com rolagem suave.
 * Usada como referência idêntica à navegação por abas do Perfil.
 */
export const scrollElementToCenter = (target: HTMLElement) => {
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
};

interface HorizontalScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollStep?: number;
  id?: string;
  autoCenterOnClick?: boolean;
}

export const HorizontalScrollContainer: React.FC<HorizontalScrollContainerProps> = ({
  children,
  className = '',
  scrollStep = 160,
  id,
  autoCenterOnClick = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth + 4;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(hasOverflow && scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();

    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(el);

    window.addEventListener('resize', checkScroll);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, children]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = containerRef.current;
    if (!el) return;
    const delta = direction === 'right' ? scrollStep : -scrollStep;
    el.scrollBy({ left: delta, behavior: 'smooth' });
    setTimeout(checkScroll, 320);
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!autoCenterOnClick) return;
    // Localiza o botão ou elemento clicável clicado
    const target = e.target as HTMLElement;
    const clickable = target.closest('button, [role="button"], a, [data-scroll-center="true"]') as HTMLElement | null;
    if (clickable && containerRef.current && containerRef.current.contains(clickable)) {
      scrollElementToCenter(clickable);
    }
  };

  return (
    <div id={id} className="relative flex-1 min-w-0 flex items-center group/hscroll">
      {/* Left Scroll Indicator (Discreet Green Chevron on smooth gradient fade) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleScroll('left');
          }}
          className="absolute left-0 top-0 bottom-0 z-20 w-7 bg-gradient-to-r from-black/90 to-transparent flex items-center justify-start pl-0.5 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer select-none"
          title="Rolar para esquerda"
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft className="w-4 h-4 text-emerald-400 animate-pulse drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        </button>
      )}

      {/* Scrollable Container with Hidden Scrollbar */}
      <div
        ref={containerRef}
        onScroll={checkScroll}
        onClickCapture={handleClickCapture}
        className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 scroll-smooth touch-pan-x ${className}`}
      >
        {children}
      </div>

      {/* Right Scroll Indicator (Discreet Green Chevron on smooth gradient fade) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleScroll('right');
          }}
          className="absolute right-0 top-0 bottom-0 z-20 w-7 bg-gradient-to-l from-black/90 to-transparent flex items-center justify-end pr-0.5 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer select-none"
          title="Rolar para direita"
          aria-label="Rolar para direita"
        >
          <ChevronRight className="w-4 h-4 text-emerald-400 animate-pulse drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        </button>
      )}
    </div>
  );
};

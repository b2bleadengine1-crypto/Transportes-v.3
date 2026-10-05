import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  detectTopNavOverflow,
  forceHorizontalScrollState,
  isMobileDevice,
} from '../utils/overflowDetector';

interface ResponsiveOverflowContainerProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  scrollStep?: number;
  showArrows?: boolean;
  dragToScroll?: boolean;
  showIndicator?: boolean;
  forceScrollBelowWidth?: number; // e.g., force scrollable container styles if window width is below a threshold
  onOverflowChange?: (hasOverflow: boolean, exceedsViewport: boolean) => void;
  ariaLabel?: string;
}

/**
 * ResponsiveOverflowContainer
 *
 * Actively monitors browser viewport/window width changes and container dimensions.
 * When content exceeds the viewport width or container boundary:
 * 1. Forcefully applies scrollable container styles (overflow-x-auto, touch momentum, containment).
 * 2. Prevents flex items from wrapping or getting truncated offscreen.
 * 3. Shows smooth interactive slider arrows and gradient affordances.
 * 4. Enables mouse drag-to-scroll on desktop and smooth touch swipe on mobile.
 */
export const ResponsiveOverflowContainer: React.FC<ResponsiveOverflowContainerProps> = ({
  children,
  className = '',
  contentClassName = '',
  scrollStep = 200,
  showArrows = true,
  dragToScroll = true,
  showIndicator = false,
  forceScrollBelowWidth,
  onOverflowChange,
  ariaLabel = 'Conteúdo com deslocamento horizontal adaptativo',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [exceedsViewport, setExceedsViewport] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined'
      ? window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 1024
      : 1024
  );

  // Mouse drag-to-scroll state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  // Core detection algorithm: measures container, child widths, and window viewport bounds
  const checkDimensionsAndOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const currentViewportW =
      window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 1024;
    setViewportWidth(currentViewportW);

    const { scrollLeft, scrollWidth, clientWidth } = el;

    // Check if content exceeds either its container clientWidth OR the overall window viewport width
    const contentExceedsContainer = scrollWidth > clientWidth + 2;
    const contentExceedsViewport = scrollWidth > currentViewportW;
    const forcedByBreakpoint = forceScrollBelowWidth ? currentViewportW < forceScrollBelowWidth : false;

    const shouldForceScroll = contentExceedsContainer || contentExceedsViewport || forcedByBreakpoint;

    const canLeft = scrollLeft > 4;
    const canRight = scrollLeft < scrollWidth - clientWidth - 4;

    setHasOverflow(shouldForceScroll);
    setExceedsViewport(contentExceedsViewport || forcedByBreakpoint);
    setCanScrollLeft(canLeft);
    setCanScrollRight(canRight);

    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    setScrollProgress(Math.min(1, Math.max(0, scrollLeft / maxScroll)));

    if (onOverflowChange) {
      onOverflowChange(shouldForceScroll, contentExceedsViewport);
    }
  }, [forceScrollBelowWidth, onOverflowChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial check
    checkDimensionsAndOverflow();

    // 1. Observe container and content resizing
    const resizeObserver = new ResizeObserver(() => {
      checkDimensionsAndOverflow();
    });

    resizeObserver.observe(el);
    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    // 2. Observe window and visualViewport width changes
    const handleViewportChange = () => {
      // Use requestAnimationFrame to avoid layout thrashing during continuous resize
      window.requestAnimationFrame(() => {
        checkDimensionsAndOverflow();
      });
    };

    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange, { passive: true });
    }

    // 3. Observe horizontal scrolling to update left/right arrow indicators
    el.addEventListener('scroll', checkDimensionsAndOverflow, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
      el.removeEventListener('scroll', checkDimensionsAndOverflow);
    };
  }, [checkDimensionsAndOverflow]);

  const slideLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
    }
  };

  const slideRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragToScroll || !hasOverflow) return;
    const el = containerRef.current;
    if (!el) return;

    const target = e.target as HTMLElement;
    if (target.closest('input, select, textarea, button, [data-no-drag]')) {
      return;
    }

    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.4;
    if (Math.abs(walk) > 3) {
      hasDraggedRef.current = true;
    }
    containerRef.current.scrollLeft = startScrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
    }
  };

  // Computed classes and inline styles to forcefully apply scrollable behavior
  const forcedScrollClasses = hasOverflow
    ? 'cm-forced-scroll-container is-overflowing overflow-x-auto touch-pan-x'
    : 'overflow-x-hidden sm:overflow-x-visible';

  return (
    <div
      className={`relative group/overflow-wrapper flex items-center min-w-0 max-w-full ${className}`}
      data-has-overflow={hasOverflow ? 'true' : 'false'}
      data-exceeds-viewport={exceedsViewport ? 'true' : 'false'}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Left Fade & Slide Button */}
      {hasOverflow && canScrollLeft && showArrows && (
        <div className="absolute left-0 top-0 bottom-0 z-30 flex items-center pr-3 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent pointer-events-none">
          <button
            type="button"
            onClick={slideLeft}
            title="Deslizar para a esquerda"
            aria-label="Deslizar para a esquerda"
            className="pointer-events-auto p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-white border border-slate-700 shadow-md shadow-black/50 transition-all cursor-pointer active:scale-95 ml-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scrollable Content Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        style={
          hasOverflow
            ? {
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorX: 'contain',
                touchAction: 'pan-x',
              }
            : undefined
        }
        className={`cm-slider-track w-full ${forcedScrollClasses} scrollbar-none select-none ${
          dragToScroll && hasOverflow ? 'cursor-grab active:cursor-grabbing' : ''
        } ${contentClassName}`}
      >
        {children}
      </div>

      {/* Right Fade & Slide Button */}
      {hasOverflow && canScrollRight && showArrows && (
        <div className="absolute right-0 top-0 bottom-0 z-30 flex items-center pl-3 bg-gradient-to-l from-slate-950 via-slate-900/90 to-transparent pointer-events-none">
          <button
            type="button"
            onClick={slideRight}
            title="Deslizar para a direita"
            aria-label="Deslizar para a direita"
            className="pointer-events-auto p-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-400 hover:text-white border border-slate-700 shadow-md shadow-black/50 transition-all cursor-pointer active:scale-95 mr-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Indicator bar when overflow or viewport exceeding is active */}
      {showIndicator && hasOverflow && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-slate-800/60 rounded-full overflow-hidden pointer-events-none">
          <div
            className="h-full bg-amber-400/80 rounded-full transition-all duration-75"
            style={{
              width: '28%',
              transform: `translateX(${scrollProgress * 250}%)`,
            }}
          />
        </div>
      )}
    </div>
  );
};

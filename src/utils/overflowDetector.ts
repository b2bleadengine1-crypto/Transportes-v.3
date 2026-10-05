/**
 * TopNav & Mobile Viewport Overflow Detection Utility
 *
 * Provides dedicated detection and enforcement of horizontal scrolling states
 * for navigation bars, headers, and toolbars when content exceeds viewport bounds
 * on mobile devices, small screens, or compact viewports.
 */

export interface TopNavOverflowStatus {
  isMobile: boolean;
  isOverflowing: boolean;
  exceedsViewport: boolean;
  scrollWidth: number;
  viewportWidth: number;
  clientWidth: number;
}

export interface TopNavMobileScrollOptions {
  mobileBreakpoint?: number; // default: 768px
  forceOnTouchDevices?: boolean; // default: true
  autoEnforceStyles?: boolean; // default: true
  onChange?: (status: TopNavOverflowStatus) => void;
}

/**
 * Checks whether the current environment is running on a mobile device
 * or within a mobile-dimensioned viewport.
 */
export function isMobileDevice(mobileBreakpoint = 768): boolean {
  if (typeof window === 'undefined') return false;

  const currentWidth =
    window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 1024;
  const isSmallWidth = currentWidth <= mobileBreakpoint;

  const hasTouchScreen =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    Boolean((navigator as any).msMaxTouchPoints && (navigator as any).msMaxTouchPoints > 0);

  const isMobileUserAgent =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(
      navigator.userAgent
    );

  return isSmallWidth || (hasTouchScreen && isMobileUserAgent);
}

/**
 * Accurately measures the container and its content against the viewport width.
 */
export function detectTopNavOverflow(
  container: HTMLElement | null,
  mobileBreakpoint = 768
): TopNavOverflowStatus {
  if (!container || typeof window === 'undefined') {
    return {
      isMobile: false,
      isOverflowing: false,
      exceedsViewport: false,
      scrollWidth: 0,
      viewportWidth: 1024,
      clientWidth: 1024,
    };
  }

  const viewportWidth =
    window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 1024;
  const { scrollWidth, clientWidth } = container;
  const isMobile = isMobileDevice(mobileBreakpoint);

  // Check if content exceeds container boundary or actual viewport width
  const contentExceedsContainer = scrollWidth > clientWidth + 2;
  const exceedsViewport = scrollWidth > viewportWidth || (isMobile && scrollWidth >= viewportWidth - 8);
  const isOverflowing = contentExceedsContainer || exceedsViewport || (isMobile && currentHasTightFit(container, viewportWidth));

  return {
    isMobile,
    isOverflowing,
    exceedsViewport,
    scrollWidth,
    viewportWidth,
    clientWidth,
  };
}

function currentHasTightFit(container: HTMLElement, viewportWidth: number): boolean {
  const children = Array.from(container.children) as HTMLElement[];
  if (children.length === 0) return false;

  let totalChildrenWidth = 0;
  children.forEach((child) => {
    totalChildrenWidth += child.offsetWidth || child.getBoundingClientRect().width;
  });

  return totalChildrenWidth >= viewportWidth - 16;
}

/**
 * Automatically applies or removes forced horizontal scrolling styles on the TopNav container
 * and its individual header items to guarantee zero clipping on mobile screens.
 */
export function forceHorizontalScrollState(
  container: HTMLElement | null,
  force = true
): boolean {
  if (!container) return false;

  if (force) {
    container.classList.add('cm-forced-scroll-container', 'overflow-x-auto', 'touch-pan-x', 'is-overflowing');
    container.classList.remove('overflow-x-hidden');

    container.style.overflowX = 'auto';
    container.style.overflowY = 'hidden';
    (container.style as any).webkitOverflowScrolling = 'touch';
    container.style.overscrollBehaviorX = 'contain';
    container.style.touchAction = 'pan-x';
    container.style.maxWidth = '100vw';

    container.setAttribute('data-mobile-forced-scroll', 'true');
    container.setAttribute('data-has-overflow', 'true');

    // Ensure all immediate child elements (Zone 1, Zone 2, Zone 3) do not shrink or wrap
    const children = Array.from(container.children) as HTMLElement[];
    children.forEach((child) => {
      child.style.flexShrink = '0';
      child.style.whiteSpace = 'nowrap';
    });

    return true;
  } else {
    container.classList.remove('is-overflowing', 'cm-forced-scroll-container');
    container.setAttribute('data-mobile-forced-scroll', 'false');
    container.setAttribute('data-has-overflow', 'false');
    return false;
  }
}

/**
 * Reactively monitors browser width changes, orientation switches, and DOM resizing,
 * automatically applying the forced horizontal scrolling state whenever TopNav content
 * overflows or approaches viewport boundaries on mobile devices.
 *
 * @returns A cleanup function to disconnect observers and event listeners.
 */
export function autoEnforceTopNavMobileScroll(
  container: HTMLElement | null,
  options: TopNavMobileScrollOptions = {}
): () => void {
  if (!container || typeof window === 'undefined') {
    return () => {};
  }

  const {
    mobileBreakpoint = 768,
    autoEnforceStyles = true,
    onChange,
  } = options;

  let isDisposed = false;

  const evaluateAndApply = () => {
    if (isDisposed || !container) return;

    const status = detectTopNavOverflow(container, mobileBreakpoint);

    if (autoEnforceStyles) {
      forceHorizontalScrollState(container, status.isOverflowing || status.isMobile);
    }

    if (onChange) {
      onChange(status);
    }
  };

  // Immediate initial check
  evaluateAndApply();

  // 1. Observe container and content size changes
  const resizeObserver = new ResizeObserver(() => {
    window.requestAnimationFrame(evaluateAndApply);
  });

  resizeObserver.observe(container);
  Array.from(container.children).forEach((child) => {
    resizeObserver.observe(child);
  });

  // 2. Observe viewport resize, pinch-zoom, and orientation changes
  const handleViewportChange = () => {
    window.requestAnimationFrame(evaluateAndApply);
  };

  window.addEventListener('resize', handleViewportChange, { passive: true });
  window.addEventListener('orientationchange', handleViewportChange, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportChange, { passive: true });
  }

  // Return cleanup teardown function
  return () => {
    isDisposed = true;
    resizeObserver.disconnect();
    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('orientationchange', handleViewportChange);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleViewportChange);
    }
  };
}

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';

export type ViewportKind = 'phone' | 'tablet' | 'desktop';
export type UiMode = 'app' | 'web';

interface DisplayModeState {
  viewport: ViewportKind;
  uiMode: UiMode;
  isNativeApp: boolean;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const PHONE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1023;

const getViewport = (width: number): ViewportKind => {
  if (width <= PHONE_MAX_WIDTH) return 'phone';
  if (width <= TABLET_MAX_WIDTH) return 'tablet';
  return 'desktop';
};

const getInitialWidth = () => {
  if (typeof window === 'undefined') return 1280;
  return window.innerWidth;
};

const getNativeState = () => {
  try {
    return Capacitor.getPlatform() !== 'web';
  } catch {
    return false;
  }
};

const resolveDisplayMode = (width: number, isNativeApp: boolean): DisplayModeState => {
  const viewport = getViewport(width);

  // Device-first rule: phone gets app shell, tablet/desktop get web shell.
  const uiMode: UiMode = viewport === 'phone' ? 'app' : 'web';

  return {
    viewport,
    uiMode,
    isNativeApp,
    isPhone: viewport === 'phone',
    isTablet: viewport === 'tablet',
    isDesktop: viewport === 'desktop',
  };
};

const DisplayModeContext = createContext<DisplayModeState | null>(null);

interface DisplayModeProviderProps {
  children: React.ReactNode;
}

export function DisplayModeProvider({ children }: DisplayModeProviderProps) {
  const [state, setState] = useState<DisplayModeState>(() => {
    const width = getInitialWidth();
    const nativeApp = getNativeState();
    return resolveDisplayMode(width, nativeApp);
  });

  useEffect(() => {
    const handleResize = () => {
      setState((previous) => {
        const next = resolveDisplayMode(window.innerWidth, previous.isNativeApp);
        if (next.viewport === previous.viewport && next.uiMode === previous.uiMode) {
          return previous;
        }
        return next;
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.uiMode = state.uiMode;
    document.documentElement.dataset.viewport = state.viewport;
  }, [state.uiMode, state.viewport]);

  const value = useMemo(() => state, [state]);

  return <DisplayModeContext.Provider value={value}>{children}</DisplayModeContext.Provider>;
}

export function useDisplayMode() {
  const context = useContext(DisplayModeContext);

  if (!context) {
    throw new Error('useDisplayMode must be used within DisplayModeProvider');
  }

  return context;
}

export {};

declare global {
  interface DesktopWindowState {
    readonly isFullScreen: boolean;
    readonly isMaximized: boolean;
    readonly isMinimized: boolean;
    readonly isFocused: boolean;
    readonly isVisible: boolean;
    readonly width: number;
    readonly height: number;
  }

  interface DesktopWindowControls {
    getState(): Promise<DesktopWindowState>;
    setFullscreen(enabled: boolean): Promise<boolean>;
    toggleFullscreen(): Promise<boolean>;
    setWindowSize(width: 1280 | 1600 | 1920, height: 720 | 900 | 1080): Promise<DesktopWindowState>;
    quit(): Promise<void>;
    onFullscreenChanged(listener: (enabled: boolean) => void): () => void;
  }

  interface DesktopRuntime {
    readonly isDesktop: true;
    readonly platform: string;
    readonly versions: {
      readonly chrome: string;
      readonly electron: string;
    };
    readonly window: DesktopWindowControls;
  }

  interface Window {
    readonly desktopRuntime?: DesktopRuntime;
  }
}

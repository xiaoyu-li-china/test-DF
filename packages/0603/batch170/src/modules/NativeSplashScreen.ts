import {NativeModules, NativeEventEmitter} from 'react-native';

export interface NativeSplashScreenModule {
  show: () => void;
  hide: () => void;
  hideWithDelay: (delayMs: number) => void;
  isVisible: (callback: (visible: boolean) => void) => void;
}

const {SplashScreen} = NativeModules as {
  SplashScreen: NativeSplashScreenModule;
};

let eventEmitter: NativeEventEmitter | null = null;

if (SplashScreen) {
  eventEmitter = new NativeEventEmitter(SplashScreen);
}

type SplashEventListener = () => void;

export const addSplashHiddenListener = (
  listener: SplashEventListener
): {remove: () => void} | null => {
  if (!eventEmitter) return null;
  const subscription = eventEmitter.addListener('SplashScreenHidden', listener);
  return {
    remove: () => subscription.remove(),
  };
};

export const showSplash = () => {
  if (SplashScreen) {
    SplashScreen.show();
  }
};

export const hideSplash = () => {
  if (SplashScreen) {
    SplashScreen.hide();
  }
};

export const hideSplashWithDelay = (delayMs: number) => {
  if (SplashScreen) {
    SplashScreen.hideWithDelay(delayMs);
  }
};

export const isSplashVisible = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (SplashScreen) {
      SplashScreen.isVisible((visible: boolean) => resolve(visible));
    } else {
      resolve(false);
    }
  });
};

export default SplashScreen;

const REMOTE_CONFIG_URL_KEY = 'REMOTE_CONFIG_URL';

declare const global: {
  __REMOTE_CONFIG_URL__?: string;
  HermesInternal?: any;
};

export const getRemoteConfigUrl = (): string | undefined => {
  if (global.__REMOTE_CONFIG_URL__) {
    return global.__REMOTE_CONFIG_URL__;
  }

  if (typeof process !== 'undefined' && process.env && process.env[REMOTE_CONFIG_URL_KEY]) {
    return process.env[REMOTE_CONFIG_URL_KEY];
  }

  return undefined;
};

export const setRemoteConfigUrl = (url: string | undefined) => {
  global.__REMOTE_CONFIG_URL__ = url;
};

export const parseLaunchArguments = (args: string[] = []) => {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--remote-config' && i + 1 < args.length) {
      setRemoteConfigUrl(args[i + 1]);
      return;
    }
    if (arg.startsWith('--remote-config=')) {
      const url = arg.split('=')[1];
      if (url) {
        setRemoteConfigUrl(url);
        return;
      }
    }
  }
};

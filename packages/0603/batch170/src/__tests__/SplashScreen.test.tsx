import React from 'react';
import {render, waitFor, act} from '@testing-library/react-native';
import SplashScreen, {fetchRemoteConfig} from '../screens/SplashScreen';

jest.useFakeTimers();

jest.mock('Animated', () => {
  const ActualAnimated = jest.requireActual('Animated');
  return {
    ...ActualAnimated,
    timing: (value: any, config: any) => ({
      start: (callback?: () => void) => {
        if (config.toValue === 1 && config.duration > 500) {
          setTimeout(() => {
            callback && callback();
          }, config.duration);
        } else {
          callback && callback();
        }
      },
    }),
    Value: jest.fn(() => ({
      interpolate: jest.fn(() => '0%'),
    })),
  };
});

jest.mock('../screens/SplashScreen', () => {
  const original = jest.requireActual('../screens/SplashScreen');
  return {
    ...original,
    fetchRemoteConfig: jest.fn(),
  };
});

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('should display splash screen initially', () => {
    const onFinish = jest.fn();
    const {getByTestId, toJSON} = render(<SplashScreen onFinish={onFinish} />);

    const tree = toJSON();
    expect(tree).toBeTruthy();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('should call onFinish after 2 seconds without remote config', async () => {
    const onFinish = jest.fn();
    render(<SplashScreen onFinish={onFinish} />);

    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1900);
    });
    expect(onFinish).not.toHaveBeenCalled();

    await waitFor(() => {
      act(() => {
        jest.advanceTimersByTime(200);
      });
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(undefined);
  });

  it('should wait for both progress and remote config before finishing', async () => {
    const onFinish = jest.fn();
    let resolveConfig: (value: any) => void;
    const configPromise = new Promise<any>((resolve) => {
      resolveConfig = resolve;
    });

    (fetchRemoteConfig as jest.Mock).mockReturnValue(configPromise);

    render(
      <SplashScreen
        onFinish={onFinish}
        remoteConfigUrl="https://example.com/config.json"
      />
    );

    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onFinish).not.toHaveBeenCalled();

    await act(async () => {
      resolveConfig!({featureFlags: {showBanner: true}, version: '1.0.0'});
      await configPromise;
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({
      featureFlags: {showBanner: true},
      version: '1.0.0',
    });
  });

  it('should wait for progress if remote config resolves first', async () => {
    const onFinish = jest.fn();

    (fetchRemoteConfig as jest.Mock).mockResolvedValue({
      apiBaseUrl: 'https://api.example.com',
    });

    render(
      <SplashScreen
        onFinish={onFinish}
        remoteConfigUrl="https://example.com/config.json"
      />
    );

    await waitFor(() => {
      expect(fetchRemoteConfig).toHaveBeenCalledWith(
        'https://example.com/config.json'
      );
    });

    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    expect(onFinish).toHaveBeenCalledWith({
      apiBaseUrl: 'https://api.example.com',
    });
  });
});

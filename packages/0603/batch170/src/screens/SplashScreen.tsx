import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';

export interface SplashScreenProps {
  onFinish: (config?: RemoteConfig) => void;
  remoteConfigUrl?: string;
}

export interface RemoteConfig {
  featureFlags?: Record<string, boolean>;
  apiBaseUrl?: string;
  version?: string;
}

const SPLASH_DURATION = 2000;

export const fetchRemoteConfig = async (url: string): Promise<RemoteConfig> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as RemoteConfig;
  } catch (err) {
    return {};
  }
};

const SplashScreen: React.FC<SplashScreenProps> = ({onFinish, remoteConfigUrl}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressCompleteRef = useRef(false);
  const configFetchedRef = useRef(false);
  const configRef = useRef<RemoteConfig | undefined>(undefined);
  const finishedRef = useRef(false);

  const tryFinish = useCallback(() => {
    if (finishedRef.current) return;
    if (progressCompleteRef.current && (!remoteConfigUrl || configFetchedRef.current)) {
      finishedRef.current = true;
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onFinish(configRef.current));
    }
  }, [remoteConfigUrl, onFinish, fadeAnim]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SPLASH_DURATION,
      useNativeDriver: false,
      easing: (t) => t,
    }).start(() => {
      progressCompleteRef.current = true;
      tryFinish();
    });

    if (remoteConfigUrl) {
      fetchRemoteConfig(remoteConfigUrl).then((fetched) => {
        configRef.current = fetched;
        configFetchedRef.current = true;
        tryFinish();
      });
    }

    return () => {
      finishedRef.current = true;
    };
  }, [remoteConfigUrl, tryFinish, fadeAnim, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableWithoutFeedback onPress={() => {}} accessible={false}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
          <Image
            source={require('../assets/splash_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[styles.progressBarFill, {width: progressWidth}]}
            />
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  progressBarContainer: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
});

export default SplashScreen;

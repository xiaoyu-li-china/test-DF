import React, {useState, useCallback} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import SplashScreen, {RemoteConfig} from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import {getRemoteConfigUrl} from './src/config/launchConfig';

type RootStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | undefined>(undefined);

  const remoteConfigUrl = getRemoteConfigUrl();

  const handleSplashFinish = useCallback((config?: RemoteConfig) => {
    setRemoteConfig(config);
    setShowSplash(false);
  }, []);

  return (
    <NavigationContainer>
      {showSplash ? (
        <SplashScreen
          onFinish={handleSplashFinish}
          remoteConfigUrl={remoteConfigUrl}
        />
      ) : (
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default App;

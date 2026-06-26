import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {parseLaunchArguments} from './src/config/launchConfig';

if (typeof process !== 'undefined' && process.argv) {
  parseLaunchArguments(process.argv.slice(2));
}

AppRegistry.registerComponent(appName, () => App);

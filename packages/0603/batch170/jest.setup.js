import '@testing-library/jest-native/extend-expect';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('../src/assets/splash_logo.png', () => 1);

global.fetch = jest.fn();

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokebuild.app',
  appName: 'PokéBuild',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;

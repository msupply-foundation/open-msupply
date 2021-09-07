export * from './routes';

interface EnvironmentConfig {
  API_URL: string;
}

declare global {
  interface Window {
    env: EnvironmentConfig;
  }
}

export const Environment: EnvironmentConfig = window.env;

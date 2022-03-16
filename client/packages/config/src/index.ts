export * from './routes';

interface EnvironmentConfig {
  API_URL: string;
  FILE_URL: string;
}

declare global {
  interface Window {
    env: EnvironmentConfig;
  }
}

const { API_URL = 'http://localhost:4000' } = window.env;

export const Environment: EnvironmentConfig = {
  API_URL,
  FILE_URL: `${API_URL.replace('graphql', 'files')}?id=`,
};

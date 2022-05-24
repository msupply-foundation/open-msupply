export * from './routes';
import config from './config';

interface EnvironmentConfig {
  API_HOST: string;
  FILE_URL: string;
  GRAPHQL_URL: string;
}

declare global {
  interface Window {
    env: EnvironmentConfig;
  }
}

const { API_HOST } = config;

export const Environment: EnvironmentConfig = {
  API_HOST,
  FILE_URL: `${API_HOST}/files?id=`,
  GRAPHQL_URL: `${API_HOST}/graphql`,
};

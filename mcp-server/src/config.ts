export interface Config {
  url: string;
  username: string;
  password: string;
  storeId?: string;
}

export function loadConfig(): Config {
  const url = process.env.OMSUPPLY_URL;
  const username = process.env.OMSUPPLY_USERNAME;
  const password = process.env.OMSUPPLY_PASSWORD;
  const storeId = process.env.OMSUPPLY_STORE_ID;

  if (!url) {
    throw new Error(
      'OMSUPPLY_URL environment variable is required (e.g. http://localhost:8000)'
    );
  }
  if (!username) {
    throw new Error('OMSUPPLY_USERNAME environment variable is required');
  }
  if (!password) {
    throw new Error('OMSUPPLY_PASSWORD environment variable is required');
  }

  return { url: url.replace(/\/$/, ''), username, password, storeId };
}

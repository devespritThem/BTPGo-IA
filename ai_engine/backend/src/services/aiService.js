import axios from 'axios';

let client;

export function getClient() {
  const baseURL = process.env.AI_URL_FLY;
  if (!baseURL) {
    throw new Error('Environment variable AI_URL_FLY is not set');
  }

  if (!client || client.defaults.baseURL !== baseURL) {
    client = axios.create({
      baseURL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return client;
}

export async function health() {
  const { data } = await getClient().get('/health');
  return data;
}

export async function infer(payload, config = {}) {
  const { data } = await getClient().post('/infer', payload, config);
  return data;
}

export async function chat(payload, config = {}) {
  const { data } = await getClient().post('/chat', payload, config);
  return data;
}

export async function request(method, path, data, config = {}) {
  const { data: res } = await getClient().request({ method, url: path, data, ...config });
  return res;
}

export default health;

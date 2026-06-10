import http from 'k6/http';
import { check } from 'k6';
export const options = { scenarios: { load: { executor: 'constant-vus', vus: 50, duration: '15s' } } };
const URL = __ENV.URL;
export default function () {
  const res = http.post(URL, JSON.stringify({ query: '{__typename}' }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status 200': (r) => r.status === 200, 'no errors': (r) => !r.body.includes('"errors"') });
}

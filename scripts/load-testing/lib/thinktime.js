import { sleep } from 'k6';

// Jittered think-time between user actions. The closed-model (ramping-vus) executor relies on this
// so a fixed VU population behaves like real users — without it, N VUs hammer far harder than N humans.
export function sleepThink(minMs, maxMs) {
  const ms = minMs + Math.random() * Math.max(0, maxMs - minMs);
  sleep(ms / 1000);
}

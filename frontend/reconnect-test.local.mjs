// Local-only check for seat tracking and seat reclaim (run against a local API, never production).
import * as signalR from '@microsoft/signalr';

const API = 'http://localhost:5294/api';
const HUB = 'http://localhost:5294/gamehub';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  if (!ok) failures++;
};

async function post(path, body, token) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
async function get(path, token) {
  const res = await fetch(API + path, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  return { status: res.status, data: await res.json().catch(() => null) };
}
const payload = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());

async function connectPlayer(token, sessionId) {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(HUB, { accessTokenFactory: () => token })
    .configureLogging(signalR.LogLevel.None)
    .build();
  await conn.start();
  await conn.invoke('JoinGameGroup', sessionId);
  return conn;
}
async function participant(sessionId, hostToken, nickname) {
  const r = await get(`/gamesessions/${sessionId}/participants`, hostToken);
  return (r.data || []).find((p) => (p.nickname ?? p.Nickname) === nickname);
}
const isConn = (p) => p?.isConnected ?? p?.IsConnected;

// Host setup
const email = `host${Date.now()}@test.local`;
const reg = await post('/auth/register', { email, password: 'Test12345!', fullName: 'Host' });
check('host register', reg.status === 200, String(reg.status));
const hostToken = reg.data.token;
const quiz = await post('/quizzes', { title: 'Reconnect test', language: 'tr' }, hostToken);
check('quiz create', quiz.status === 200 || quiz.status === 201, String(quiz.status));
const quizId = quiz.data.id;
const q = await post(`/quizzes/${quizId}/questions`, {
  type: 'MultipleChoice', questionText: 'Test?',
  options: [{ optionText: 'A', isCorrect: true }, { optionText: 'B', isCorrect: false }]
}, hostToken);
check('question create', q.status === 200 || q.status === 201, String(q.status));
const start = await post('/gamesessions/start', quizId, hostToken);
check('session start', start.status === 200, `${start.status} ${start.data?.message ?? ''}`);
const { id: sessionId, gameCode } = start.data;

// 1. Player joins and connects: server marks the seat connected
const j1 = await post('/auth/join-game', { gameCode, nickname: 'Ali' });
check('Ali joins', j1.status === 200);
const exp = payload(j1.data.token).exp - Math.floor(Date.now() / 1000);
check('player token lasts ~12 h', exp > 11 * 3600, `${Math.round(exp / 3600)} h`);
let conn1 = await connectPlayer(j1.data.token, sessionId);
await sleep(300);
check('Ali shown connected', isConn(await participant(sessionId, hostToken, 'Ali')) === true);

// 2. Someone else (no session token) tries the same name while Ali is connected
const steal = await post('/auth/join-game', { gameCode, nickname: 'Ali' });
check('name blocked while connected', steal.status === 400, steal.data?.message);

// 3. Same browser (has session token) can always come back
const resume = await post('/auth/join-game', { gameCode, nickname: 'Ali', sessionToken: j1.data.sessionToken });
check('resume with session token', resume.status === 200);

// 4. Ali drops: server marks the seat offline
await conn1.stop();
await sleep(500);
check('Ali shown disconnected', isConn(await participant(sessionId, hostToken, 'Ali')) === false);

// 5. Immediately after dropping, a token-less join is still blocked (grace period)
const early = await post('/auth/join-game', { gameCode, nickname: 'Ali' });
check('blocked during 20 s grace', early.status === 400);

// 6. After the grace period, a new browser can take the seat back with the same score/ID
console.log('...waiting 21 s for grace period');
await sleep(21000);
const reclaim = await post('/auth/join-game', { gameCode, nickname: 'Ali' });
check('reclaim after grace', reclaim.status === 200, String(reclaim.status));
check('same participant kept', reclaim.data.participantId === j1.data.participantId);
check('new session token issued', reclaim.data.sessionToken !== j1.data.sessionToken);
const oldDevice = await post('/auth/join-game', { gameCode, nickname: 'Ali', sessionToken: j1.data.sessionToken });
check('old device token rejected after reclaim', oldDevice.status === 400, String(oldDevice.status));

// 7. An older tab closing must not mark a newer live tab offline
const tabA = await connectPlayer(reclaim.data.token, sessionId);
const tabB = await connectPlayer(reclaim.data.token, sessionId);
await tabA.stop();
await sleep(500);
check('older tab closing keeps newer tab online', isConn(await participant(sessionId, hostToken, 'Ali')) === true);
await tabB.stop();

// 8. Burst: 40 players join at once
const t0 = Date.now();
const burst = await Promise.all(
  Array.from({ length: 40 }, (_, i) => post('/auth/join-game', { gameCode, nickname: `Bot${i}` }))
);
const ok = burst.filter((r) => r.status === 200).length;
check('40 simultaneous joins', ok === 40, `${ok}/40 in ${Date.now() - t0} ms`);

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);

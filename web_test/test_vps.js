const BASE = process.env.API_URL || 'https://cardapyia.com/api';
async function main() {
  const email = `user_${Math.floor(Math.random()*1e6)}@test.local`;
  const registerBody = { email, password: 'Test1234!', name: 'Teste', role: 'provider' };
  const regRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(registerBody)
  });
  const reg = await regRes.json().catch(()=>({}));
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Test1234!' })
  });
  const login = await loginRes.json().catch(()=>({}));
  console.log('email', email);
  console.log('register status', regRes.status);
  console.log('login status', loginRes.status);
  console.log('token', login.token ? (login.token.slice(0,24) + '...') : null);
  const svcRes = await fetch(`${BASE}/services/available`, {
    headers: { Authorization: login.token ? `Bearer ${login.token}` : '' }
  });
  const svc = await svcRes.json().catch(()=>({}));
  console.log('services status', svcRes.status);
  console.log(JSON.stringify(svc));
}
main().catch(err => { console.error(err); process.exit(1); });
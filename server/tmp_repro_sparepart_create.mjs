const loginBody = JSON.stringify({ email: 'admin@cptech.com', password: 'Admin@1234' });
const loginRes = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: loginBody,
});
const loginText = await loginRes.text();
console.log('LOGIN', loginRes.status, loginText);
if (loginRes.status !== 200) process.exit(1);
const { token } = JSON.parse(loginText);
const createBody = JSON.stringify({ name: 'Test Part', category: '000000000000000000000000', quantity: 10, status: 'active' });
const createRes = await fetch('http://localhost:5000/api/spare-parts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: createBody,
});
const createText = await createRes.text();
console.log('CREATE', createRes.status, createText);

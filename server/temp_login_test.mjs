const url = 'http://localhost:5000/api/auth/login';
const body = JSON.stringify({ email: 'admin@cptech.com', password: 'Admin@1234' });

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  console.log('STATUS', res.status);
  console.log(await res.text());
} catch (error) {
  console.error('ERROR', error);
}

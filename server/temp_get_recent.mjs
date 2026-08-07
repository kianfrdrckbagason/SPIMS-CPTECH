const fetch = globalThis.fetch;
(async()=>{
  const loginRes = await fetch('http://localhost:5000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@cptech.com',password:'Admin@1234'})});
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.token || loginJson?.token || (loginJson.data && loginJson.data.token);
  console.log('token', !!token);
  const r = await fetch('http://localhost:5000/api/dashboard/recent-activity?limit=10',{headers:{Authorization:`Bearer ${token}`}});
  const j = await r.json();
  console.log(JSON.stringify(j,null,2));
})();
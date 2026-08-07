const fetch = globalThis.fetch;

(async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cptech.com', password: 'Admin@1234' }),
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN_RESPONSE:', JSON.stringify(loginJson));

    const token = loginJson?.data?.token || loginJson?.token || (loginJson.data && loginJson.data.token);
    if (!token) {
      console.error('No token received');
      process.exit(1);
    }

    const raRes = await fetch('http://localhost:5000/api/dashboard/recent-activity?limit=10', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raJson = await raRes.json();
    console.log('RECENT_ACTIVITY:', JSON.stringify(raJson, null, 2));
      const statsRes = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsJson = await statsRes.json();
      console.log('STATS:', JSON.stringify(statsJson, null, 2));

      const partsRes = await fetch('http://localhost:5000/api/spare-parts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const partsJson = await partsRes.json();
      console.log('SPAREPARTS_LIST_COUNT:', partsJson.total || partsJson.count || 0);

      // create a test spare part to see if recent activity populates
      const catsRes = await fetch('http://localhost:5000/api/categories', { headers: { Authorization: `Bearer ${token}` } });
      const catsJson = await catsRes.json();
      const catId = catsJson && catsJson.data && catsJson.data[0] && catsJson.data[0]._id;
      if (catId) {
        const createRes = await fetch('http://localhost:5000/api/spare-parts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'IKT Test Part', sku: `IKT-${Date.now()}`, category: catId, quantity: 1 }),
        });
        const createJson = await createRes.json();
        console.log('CREATE_SPAREPART:', JSON.stringify(createJson, null, 2));

        const raRes2 = await fetch('http://localhost:5000/api/dashboard/recent-activity?limit=10', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raJson2 = await raRes2.json();
        console.log('RECENT_ACTIVITY_AFTER_CREATE:', JSON.stringify(raJson2, null, 2));
          const notRes = await fetch('http://localhost:5000/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
          const notJson = await notRes.json();
          console.log('NOTIFICATIONS_LIST:', JSON.stringify(notJson, null, 2));
      }
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
})();

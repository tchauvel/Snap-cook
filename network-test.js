
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Network connectivity test successful!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Network test server running at http://0.0.0.0:${port}`);
  console.log('If you can access this from your device, your network is properly configured');
});


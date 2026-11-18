require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');
const connectDB = require('./src/config/db');

['MONGO_URI', 'JWT_SECRET'].forEach((k) => {
  if (!process.env[k]) { console.error(`Missing env var ${k}`); process.exit(1); }
});

(async () => {
  await connectDB();
  const port = process.env.PORT || 5000;
  const server = app.listen(port, () => console.log(`API running on http://localhost:${port}`));

  const shutdown = async () => {
    server.close(async () => { await mongoose.connection.close(); process.exit(0); });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });

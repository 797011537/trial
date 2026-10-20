import { createApp } from './app.js';

const origins = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && origins.length === 0) {
  throw new Error('Set CORS_ORIGINS to your Static Web App HTTPS origin before starting in production.');
}
for (const origin of origins) {
  if (new URL(origin).origin !== origin) throw new Error(`CORS_ORIGINS must contain exact origins without paths or trailing slashes: ${origin}`);
}
const app = createApp(origins.length ? { allowedOrigins: origins } : undefined);
const server = app.listen(process.env.PORT || 3001, '0.0.0.0', () => {
  console.log(`Thread & Form API listening on port ${server.address().port}`);
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}

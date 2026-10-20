import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { products, shipping } from './catalog.js';

export function createApp({ allowedOrigins = ['http://localhost:5173', 'http://localhost:4173'] } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error('This browser origin is not allowed. Check CORS_ORIGINS.');
      error.status = 403;
      callback(error);
    },
    methods: ['GET', 'POST', 'OPTIONS']
  }));
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'thread-and-form-api', version: '1.0.0' }));

  app.get('/api/products', (_req, res) => {
    res.json({ products, categories: [...new Set(products.map(product => product.category))], shipping });
  });

  app.get('/api/products/:id', (req, res) => {
    const product = products.find(item => item.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  });

  // Stateless demo: no payment, customer information, or order storage.
  app.post('/api/orders', (req, res) => {
    const requested = req.body?.items;
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > 50) {
      return res.status(400).json({ error: 'Send between 1 and 50 items.' });
    }
    const keys = new Set();
    const items = [];
    for (const item of requested) {
      const product = products.find(product => product.id === item?.productId);
      if (!product || !product.sizes.includes(item?.size) || !Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > 10) {
        return res.status(400).json({ error: 'Each item needs a valid productId, available size, and integer quantity from 1 to 10.' });
      }
      const key = `${product.id}:${item.size}`;
      if (keys.has(key)) return res.status(400).json({ error: 'Combine duplicate product and size entries into one item.' });
      keys.add(key);
      items.push({ productId: product.id, name: product.name, size: item.size, quantity: item.quantity, unitPrice: product.price, lineTotal: product.price * item.quantity });
    }
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const delivery = subtotal >= shipping.freeAbove ? 0 : shipping.standard;
    res.status(201).json({
      id: `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'demo-confirmed',
      message: 'Demo checkout complete. No payment was taken and this order is not stored.',
      items, subtotal, shipping: delivery, total: subtotal + delivery, currency: shipping.currency
    });
  });

  app.use((_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((error, _req, res, _next) => {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) console.error(error);
    const message = error.type === 'entity.parse.failed' ? 'Request body must be valid JSON.' : error.type === 'entity.too.large' ? 'Request body is too large.' : status >= 500 ? 'Something went wrong.' : error.message;
    res.status(status).json({ error: message });
  });
  return app;
}

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let base;
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
const order = items => fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });

test('health and catalog return deployment-ready data', async () => {
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const { products, shipping } = await (await fetch(`${base}/api/products`)).json();
  assert.equal(products.length, 8);
  assert.equal(shipping.currency, 'INR');
  assert.ok(products.every(item => Number.isInteger(item.price) && item.sizes.length));
});

test('checkout ignores submitted prices and calculates delivery on the server', async () => {
  const response = await order([{ productId: 'everyday-tee', size: 'M', quantity: 2, price: 1 }]);
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.subtotal, 159800);
  assert.equal(result.shipping, 9900);
  assert.equal(result.total, 169700);
  assert.equal(result.status, 'demo-confirmed');
  assert.match(result.id, /^DEMO-/);
});

test('delivery is free above the threshold', async () => {
  const response = await order([{ productId: 'linen-shirt', size: 'S', quantity: 2 }]);
  const result = await response.json();
  assert.equal(result.shipping, 0);
  assert.equal(result.total, 379800);
});

test('checkout rejects invalid quantities, sizes, products, empty bags and duplicates', async () => {
  for (const items of [[], [null], [{ productId: 'missing', size: 'M', quantity: 1 }], [{ productId: 'linen-shirt', size: 'XXL', quantity: 1 }], ...[0, -1, 1.5, '2', 11].map(quantity => [{ productId: 'linen-shirt', size: 'M', quantity }]), [{ productId: 'linen-shirt', size: 'M', quantity: 1 }, { productId: 'linen-shirt', size: 'M', quantity: 2 }]]) {
    assert.equal((await order(items)).status, 400, JSON.stringify(items));
  }
});

test('CORS allows the frontend and rejects unrelated browser origins', async () => {
  const good = await fetch(`${base}/api/products`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(good.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const bad = await fetch(`${base}/api/products`, { headers: { Origin: 'https://unrelated.example' } });
  assert.equal(bad.status, 403);
  const options = await fetch(`${base}/api/orders`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(options.status, 204);
});

test('unknown resources and malformed JSON return JSON errors', async () => {
  for (const path of ['/api/products/missing', '/missing']) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 404);
    assert.ok((await response.json()).error);
  }
  const invalid = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, 'Request body must be valid JSON.');
});

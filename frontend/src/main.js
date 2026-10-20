import './style.css';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value / 100);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let products = [];
let shipping = { freeAbove: 300000, standard: 9900 };
let activeCategory = 'All';
let cart = [];
let ordering = false;
let toastTimer;

function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function art(product) {
  return `<svg class="garment" viewBox="0 0 320 400" role="img" aria-label="Illustration of ${escape(product.name)} in ${escape(product.colorName)}" style="color:${escape(product.color)}"><use href="/images/garments.svg#${escape(product.garment)}"/></svg>`;
}

function restoreCart() {
  try {
    const saved = JSON.parse(localStorage.getItem('thread-form-bag') || '[]');
    const seen = new Set();
    cart = Array.isArray(saved) ? saved.slice(0, 50).filter(item => {
      const product = products.find(product => product.id === item?.productId);
      const key = `${item?.productId}:${item?.size}`;
      if (!product || !product.sizes.includes(item?.size) || !Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > 10 || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(({ productId, size, quantity }) => ({ productId, size, quantity })) : [];
  } catch { cart = []; }
  updateCart();
}

function updateCart() {
  try { localStorage.setItem('thread-form-bag', JSON.stringify(cart)); } catch { /* Bag still works when browser storage is unavailable. */ }
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  $('#bag-count').textContent = count;
  $('#open-bag').setAttribute('aria-label', `Open shopping bag, ${count} items`);
  renderBag();
}

function renderProducts() {
  const query = $('#search').value.trim().toLowerCase();
  let visible = products.filter(product => (activeCategory === 'All' || product.category === activeCategory) && `${product.name} ${product.category} ${product.colorName} ${product.description}`.toLowerCase().includes(query));
  const sort = $('#sort').value;
  if (sort === 'price-asc') visible.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') visible.sort((a, b) => b.price - a.price);
  if (sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name));
  $('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'piece' : 'pieces'} to make your own`;
  $('#products').innerHTML = visible.map((product, index) => `<article class="product-card">
    <div class="product-image tone-${index % 4}">${product.badge ? `<span class="product-badge">${escape(product.badge)}</span>` : ''}${art(product)}<span class="image-caption">THREAD & FORM / ${escape(product.category).toUpperCase()}</span></div>
    <div class="product-info"><div class="product-title"><h3>${escape(product.name)}</h3><span>${money(product.price)}</span></div><p>${escape(product.description)}</p><div class="product-colour"><span class="swatch" style="background:${escape(product.color)}"></span>${escape(product.colorName)}</div>
    <div class="product-actions"><label class="sr-only" for="size-${escape(product.id)}">Size for ${escape(product.name)}</label><select id="size-${escape(product.id)}">${product.sizes.map(size => `<option value="${escape(size)}" ${size === 'M' ? 'selected' : ''}>${escape(size)}</option>`).join('')}</select><button type="button" data-add="${escape(product.id)}" aria-label="Add ${escape(product.name)} to bag">Add to bag <span aria-hidden="true">+</span></button></div></div>
  </article>`).join('');
  $('#catalog-message').hidden = visible.length > 0;
  $('#catalog-message-text').textContent = 'No pieces found. Try another search or category.';
  $('#retry').hidden = true;
}

async function loadProducts() {
  $('#products').setAttribute('aria-busy', 'true');
  $('#catalog-message').hidden = true;
  $('#result-count').textContent = 'Loading the collection…';
  try {
    const result = await api('/api/products');
    products = result.products;
    shipping = result.shipping;
    $('#categories').innerHTML = ['All', ...result.categories].map(category => `<button type="button" data-category="${escape(category)}" class="${category === activeCategory ? 'active' : ''}" aria-pressed="${category === activeCategory}">${category === 'All' ? 'All pieces' : escape(category)}</button>`).join('');
    restoreCart();
    renderProducts();
  } catch {
    $('#result-count').textContent = 'Collection unavailable';
    $('#catalog-message-text').textContent = 'We couldn’t reach the store API. Check that the backend is running and the API URL is configured, then try again.';
    $('#catalog-message').hidden = false;
    $('#retry').hidden = false;
  } finally {
    $('#products').setAttribute('aria-busy', 'false');
  }
}

function renderBag() {
  if (!cart.length) {
    $('#bag-content').innerHTML = '<div class="empty-bag"><span aria-hidden="true">✳</span><h3>A little room for something good.</h3><p>Your bag is empty. Find a piece that feels like you.</p><button type="button" class="button dark" data-continue>Explore the collection ↗</button></div>';
    return;
  }
  const subtotal = cart.reduce((sum, item) => sum + products.find(product => product.id === item.productId).price * item.quantity, 0);
  const delivery = subtotal >= shipping.freeAbove ? 0 : shipping.standard;
  $('#bag-content').innerHTML = `<fieldset class="bag-controls" ${ordering ? 'disabled' : ''}><legend class="sr-only">Shopping bag items</legend><div class="bag-items">${cart.map((item, index) => {
    const product = products.find(product => product.id === item.productId);
    return `<div class="bag-item"><div class="bag-art">${art(product)}</div><div class="bag-item-info"><h3>${escape(product.name)}</h3><p>${escape(product.colorName)} / Size ${escape(item.size)}</p><div class="quantity"><button type="button" data-change="${index}" data-delta="-1" aria-label="Decrease quantity for ${escape(product.name)}, size ${escape(item.size)}">−</button><span>${item.quantity}</span><button type="button" data-change="${index}" data-delta="1" ${item.quantity >= 10 ? 'disabled' : ''} aria-label="Increase quantity for ${escape(product.name)}, size ${escape(item.size)}">+</button></div></div><div class="bag-item-price"><span>${money(product.price * item.quantity)}</span><button type="button" data-remove="${index}" aria-label="Remove ${escape(product.name)}, size ${escape(item.size)}">Remove</button></div></div>`;
  }).join('')}</div><div class="bag-totals"><p><span>Subtotal</span><span>${money(subtotal)}</span></p><p><span>Delivery</span><span>${delivery ? money(delivery) : 'Complimentary'}</span></p><p class="total"><span>Total</span><span>${money(subtotal + delivery)}</span></p></div><p class="shipping-note">${delivery ? `Add ${money(shipping.freeAbove - subtotal)} for complimentary delivery.` : 'Your order qualifies for complimentary delivery.'}</p><button id="checkout" type="button" class="button dark checkout">${ordering ? 'Confirming…' : 'Try demo checkout ↗'}</button></fieldset><p id="checkout-error" class="checkout-error" role="alert"></p><p class="demo-note">Practice checkout only. No payment, account, or delivery details required. Orders are not stored or fulfilled.</p>`;
}

$('#products').addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (!button || ordering) return;
  const productId = button.dataset.add;
  const size = $(`#size-${productId}`).value;
  const existing = cart.find(item => item.productId === productId && item.size === size);
  if (existing?.quantity >= 10) return notify('You can add up to 10 of each piece and size.');
  if (!existing && cart.length >= 50) return notify('Your bag is full. Remove a piece to add another.');
  if (existing) existing.quantity += 1;
  else cart.push({ productId, size, quantity: 1 });
  updateCart();
  notify(`${products.find(product => product.id === productId).name} (${size}) added to your bag.`);
});

$('#categories').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(item => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  if (products.length) renderProducts();
});
$('#search').addEventListener('input', () => { if (products.length) renderProducts(); });
$('#sort').addEventListener('change', () => { if (products.length) renderProducts(); });
$('#retry').addEventListener('click', loadProducts);
$('#open-bag').addEventListener('click', () => { renderBag(); $('#bag-dialog').showModal(); });
$('#close-bag').addEventListener('click', () => $('#bag-dialog').close());
$('#close-confirmation').addEventListener('click', () => $('#confirmation').close());
$('#bag-content').addEventListener('click', async event => {
  const target = event.target.closest('button');
  if (!target || ordering) return;
  if (target.hasAttribute('data-continue')) {
    $('#bag-dialog').close();
    $('#collection').scrollIntoView({ behavior: 'smooth' });
  } else if (target.hasAttribute('data-remove')) {
    cart.splice(Number(target.dataset.remove), 1);
    updateCart();
    $('#bag-content button')?.focus();
  } else if (target.hasAttribute('data-change')) {
    const index = Number(target.dataset.change);
    cart[index].quantity += Number(target.dataset.delta);
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    updateCart();
    // Restore focus after replacing the bag markup.
    $(`[data-change="${index}"][data-delta="${target.dataset.delta}"]:not(:disabled)`)?.focus();
  } else if (target.id === 'checkout') {
    ordering = true;
    renderBag();
    try {
      const result = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart }) });
      cart = [];
      updateCart();
      $('#bag-dialog').close();
      $('#confirmation-details').textContent = `${result.id} · ${money(result.total)} · Demo checkout confirmed.`;
      $('#confirmation').showModal();
    } catch (error) {
      renderBag();
      $('#checkout-error').textContent = error.name === 'TimeoutError' || error instanceof TypeError ? 'The API could not be reached. Your bag is saved; please try again.' : error.message;
    } finally {
      ordering = false;
      const controls = $('.bag-controls');
      if (controls) controls.disabled = false;
      if ($('#checkout')) $('#checkout').textContent = 'Try demo checkout ↗';
    }
  }
});
$('#year').textContent = new Date().getFullYear();
loadProducts();

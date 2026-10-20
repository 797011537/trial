// Prices are integer paise. The API always calculates totals from this catalog.
export const products = [
  { id: 'linen-shirt', name: 'The Linen Shirt', category: 'Shirts', description: 'An easy, airy layer in soft washed linen.', price: 189900, color: '#c8b896', colorName: 'Natural', garment: 'shirt', sizes: ['S', 'M', 'L', 'XL'], badge: 'Bestseller' },
  { id: 'everyday-tee', name: 'The Everyday Tee', category: 'T-shirts', description: 'A relaxed essential in substantial cotton jersey.', price: 79900, color: '#66745d', colorName: 'Moss', garment: 'tee', sizes: ['XS', 'S', 'M', 'L', 'XL'], badge: 'Everyday essential' },
  { id: 'wide-leg-trouser', name: 'The Wide Leg Trouser', category: 'Trousers', description: 'A softly tailored shape with room to move.', price: 229900, color: '#9d7556', colorName: 'Clay', garment: 'trousers', sizes: ['S', 'M', 'L', 'XL'], badge: '' },
  { id: 'weekend-overshirt', name: 'The Weekend Overshirt', category: 'Layers', description: 'An effortless extra layer for slower days.', price: 279900, color: '#48574e', colorName: 'Forest', garment: 'shirt', sizes: ['S', 'M', 'L', 'XL'], badge: 'New arrival' },
  { id: 'rib-knit', name: 'The Soft Rib Knit', category: 'Layers', description: 'A textured knit for cool mornings and late evenings.', price: 249900, color: '#d2bea7', colorName: 'Oat', garment: 'knit', sizes: ['XS', 'S', 'M', 'L'], badge: '' },
  { id: 'day-dress', name: 'The Day Dress', category: 'Dresses', description: 'A simple, flowing silhouette with a gathered waist.', price: 299900, color: '#a8654e', colorName: 'Terracotta', garment: 'dress', sizes: ['XS', 'S', 'M', 'L', 'XL'], badge: 'New arrival' },
  { id: 'classic-tee', name: 'The Classic Tee', category: 'T-shirts', description: 'A clean crew neck that goes with everything.', price: 89900, color: '#c4bcae', colorName: 'Stone', garment: 'tee', sizes: ['S', 'M', 'L', 'XL'], badge: '' },
  { id: 'relaxed-trouser', name: 'The Relaxed Trouser', category: 'Trousers', description: 'Comfortable cotton twill with an easy straight leg.', price: 199900, color: '#4c5358', colorName: 'Charcoal', garment: 'trousers', sizes: ['S', 'M', 'L', 'XL'], badge: 'Bestseller' }
];

export const shipping = { freeAbove: 300000, standard: 9900, currency: 'INR' };

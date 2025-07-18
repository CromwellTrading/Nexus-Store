require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 6000;

// Configuración de CORS solo para desarrollo
const corsOptions = {
  origin: 'http://localhost:5500',  // Solo para desarrollo local
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID']
};

// Usar CORS solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use(cors(corsOptions));
  console.log("⚠️  CORS habilitado para desarrollo");
}

app.use(express.json());

// SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Base de datos simple (archivos JSON)
const DB_PATH = path.join(__dirname, 'data');
const DB = {
  products: loadJSON('products.json'),
  categories: loadJSON('categories.json'),
  carts: loadJSON('carts.json'),
  orders: loadJSON('orders.json'),
  users: loadJSON('users.json'),
  
  save: (file, data) => {
    const filePath = path.join(DB_PATH, file);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
};

// Funciones de ayuda para cargar archivos JSON
function loadJSON(file) {
  const filePath = path.join(DB_PATH, file);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error cargando ${file}:`, err.message);
    // Si el archivo no existe, devolver estructura por defecto
    if (file === 'products.json') return { fisico: {}, digital: {} };
    if (file === 'categories.json') return { fisico: [], digital: [] };
    if (file === 'carts.json') return [];
    if (file === 'orders.json') return [];
    if (file === 'users.json') return [];
    return {};
  }
}

// Middleware de autenticación para administradores
const isAdmin = (req, res, next) => {
  const telegramId = req.headers['telegram-id'];
  const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [5376388604, 718827739];
  
  if (!telegramId || !adminIds.includes(Number(telegramId))) {
    return res.status(403).json({ error: 'Acceso no autorizado. Solo administradores.' });
  }
  next();
};

// RUTAS PRINCIPALES - SERVIR FRONTEND
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Ruta adicional para manejar posibles rutas del frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// API ROUTES - BACKEND
app.get('/api/products/:type', (req, res) => {
  const { type } = req.params;
  const products = DB.products[type] || {};
  res.json(products);
});

app.get('/api/products/search/:query', (req, res) => {
  const { query } = req.params;
  const { type } = req.query;
  const results = {};
  
  const searchInCategory = (categoryProducts) => {
    return categoryProducts.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) || 
      product.description.toLowerCase().includes(query.toLowerCase())
    );
  };

  if (type) {
    if (DB.products[type]) {
      for (const category in DB.products[type]) {
        const found = searchInCategory(DB.products[type][category]);
        if (found.length > 0) {
          results[category] = found;
        }
      }
    }
  } else {
    for (const productType in DB.products) {
      for (const category in DB.products[productType]) {
        const found = searchInCategory(DB.products[productType][category]);
        if (found.length > 0) {
          if (!results[productType]) results[productType] = {};
          results[productType][category] = found;
        }
      }
    }
  }
  
  res.json(results);
});

app.get('/api/cart/:userId', (req, res) => {
  const { userId } = req.params;
  const cart = DB.carts.find(cart => cart.userId == userId);
  res.json(cart || { userId, items: [] });
});

app.post('/api/cart/add', (req, res) => {
  const { userId, productId, tabType } = req.body;
  
  let cart = DB.carts.find(cart => cart.userId == userId);
  if (!cart) {
    cart = { userId, items: [] };
    DB.carts.push(cart);
  }
  
  const existingItem = cart.items.find(item => 
    item.productId == productId && item.tabType === tabType
  );
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.items.push({ 
      productId, 
      tabType, 
      quantity: 1,
      addedAt: new Date().toISOString()
    });
  }
  
  DB.save('carts.json', DB.carts);
  res.json(cart);
});

app.post('/api/cart/remove', (req, res) => {
  const { userId, productId, tabType } = req.body;
  
  const cart = DB.carts.find(cart => cart.userId == userId);
  if (!cart) {
    return res.status(404).json({ error: 'Carrito no encontrado' });
  }
  
  const itemIndex = cart.items.findIndex(item => 
    item.productId == productId && item.tabType === tabType
  );
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
  }
  
  cart.items.splice(itemIndex, 1);
  DB.save('carts.json', DB.carts);
  res.json(cart);
});

app.post('/api/checkout', (req, res) => {
  const { userId, paymentMethod, transferData, recipientData } = req.body;
  
  const cart = DB.carts.find(cart => cart.userId == userId);
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ error: 'Carrito vacío' });
  }
  
  const total = cart.items.reduce((sum, item) => {
    return sum + (item.quantity * 10);
  }, 0);
  
  const order = {
    id: `ORD-${Date.now()}`,
    userId,
    items: [...cart.items],
    payment: {
      method: paymentMethod,
      ...transferData
    },
    recipient: recipientData,
    total,
    status: 'Pendiente',
    createdAt: new Date().toISOString()
  };
  
  DB.orders.push(order);
  DB.save('orders.json', DB.orders);
  
  cart.items = [];
  DB.save('carts.json', DB.carts);
  
  res.json({ 
    success: true, 
    orderId: order.id,
    message: 'Compra realizada con éxito' 
  });
});

// ADMIN ROUTES
app.get('/api/admin/orders', isAdmin, (req, res) => {
  res.json(DB.orders);
});

app.put('/api/admin/orders/:orderId', isAdmin, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  const order = DB.orders.find(order => order.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Orden no encontrada' });
  }
  
  order.status = status;
  order.updatedAt = new Date().toISOString();
  DB.save('orders.json', DB.orders);
  
  res.json(order);
});

app.post('/api/admin/products', isAdmin, (req, res) => {
  const { type, category, product } = req.body;
  
  if (!DB.products[type]) {
    DB.products[type] = {};
  }
  
  if (!DB.products[type][category]) {
    DB.products[type][category] = [];
  }
  
  product.id = Date.now();
  product.createdAt = new Date().toISOString();
  DB.products[type][category].push(product);
  
  DB.save('products.json', DB.products);
  res.json(product);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
  console.log(`📂 Ruta del frontend: ${frontendPath}`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV === 'production' ? 'Producción' : 'Desarrollo'}`);
  console.log(`✅ Frontend disponible en: http://localhost:${PORT}`);
});

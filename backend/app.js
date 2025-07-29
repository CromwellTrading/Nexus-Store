import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

console.log(`🚀 Iniciando servidor en el puerto ${PORT}`);
console.log(`👑 Admin IDs: ${process.env.ADMIN_IDS}`);
console.log(`🤖 Token de bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'Configurado' : 'FALTANTE'}`);
console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

// Configuración de la base de datos
const DB_PATH = path.join(__dirname, 'data', 'store.db');
console.log(`📂 Ruta de la base de datos: ${DB_PATH}`);

// Asegurar que exista la carpeta data
try {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log("✅ Carpeta 'data' creada exitosamente");
  }
} catch (err) {
  console.error(`❌ Error creando carpeta 'data': ${err.message}`);
}

// Inicializar base de datos
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Mejorar rendimiento

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    UNIQUE(type, name)
  );
  
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    details TEXT,
    prices TEXT, -- JSON string
    images TEXT, -- JSON string
    hasColorVariant BOOLEAN DEFAULT 0,
    colors TEXT, -- JSON string
    requiredFields TEXT, -- JSON string
    dateCreated TEXT DEFAULT (datetime('now'))
  );
  
  CREATE TABLE IF NOT EXISTS carts (
    userId TEXT PRIMARY KEY,
    items TEXT -- JSON string
  );
  
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    items TEXT, -- JSON string
    payment TEXT, -- JSON string
    recipient TEXT, -- JSON string
    requiredFields TEXT, -- JSON string
    total REAL,
    status TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT
  );
  
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    data TEXT -- JSON string
  );
`);
console.log('✅ Base de datos inicializada');

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID', '*']
}));
app.use(express.json());

const isAdmin = (req, res, next) => {
  console.log("🔐 Verificando acceso de administrador...");
  const telegramId = req.headers['telegram-id'];
  console.log(`📱 Telegram ID recibido: ${telegramId}`);
  
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  console.log(`👑 IDs de administrador: ${adminIds.join(', ')}`);
  
  if (!telegramId || !adminIds.includes(telegramId.toString())) {
    console.log("⛔ Acceso no autorizado. Solo administradores pueden acceder.");
    return res.status(403).json({ error: 'Acceso no autorizado. Solo administradores pueden acceder.' });
  }
  
  console.log("✅ Acceso de administrador autorizado");
  next();
};

// Rutas básicas
app.get('/', (req, res) => {
  res.send('Backend Nexus Store funcionando correctamente');
});

app.get('/api/admin/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/admin/ids', (req, res) => {
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  res.json(adminIds);
});

// Productos
app.get('/api/products/:type', (req, res) => {
  const { type } = req.params;
  try {
    const stmt = db.prepare(`
      SELECT * FROM products WHERE type = ?
    `);
    const products = stmt.all(type);
    
    // Organizar por categoría
    const result = {};
    products.forEach(product => {
      if (!result[product.category]) {
        result[product.category] = [];
      }
      
      // Parsear campos JSON
      const parsedProduct = {
        ...product,
        prices: JSON.parse(product.prices),
        images: product.images ? JSON.parse(product.images) : [],
        colors: product.colors ? JSON.parse(product.colors) : [],
        requiredFields: product.requiredFields ? JSON.parse(product.requiredFields) : []
      };
      
      result[product.category].push(parsedProduct);
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/products/:type/:id', (req, res) => {
  const { type, id } = req.params;
  try {
    const stmt = db.prepare(`
      SELECT * FROM products 
      WHERE type = ? AND id = ?
    `);
    const product = stmt.get(type, id);
    
    if (product) {
      // Parsear campos JSON
      const parsedProduct = {
        ...product,
        prices: JSON.parse(product.prices),
        images: product.images ? JSON.parse(product.images) : [],
        colors: product.colors ? JSON.parse(product.colors) : [],
        requiredFields: product.requiredFields ? JSON.parse(product.requiredFields) : []
      };
      res.json(parsedProduct);
    } else {
      res.status(404).json({ error: 'Producto no encontrado' });
    }
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Carrito
app.get('/api/cart/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const stmt = db.prepare(`
      SELECT * FROM carts WHERE userId = ?
    `);
    const cart = stmt.get(userId);
    
    if (cart) {
      res.json({
        userId: cart.userId,
        items: JSON.parse(cart.items)
      });
    } else {
      // Crear carrito vacío si no existe
      res.json({ userId, items: [] });
    }
  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/add', (req, res) => {
  const { userId, productId, tabType } = req.body;
  try {
    // Obtener carrito existente
    let stmt = db.prepare(`
      SELECT * FROM carts WHERE userId = ?
    `);
    let cart = stmt.get(userId);
    
    let items = [];
    if (cart) {
      items = JSON.parse(cart.items);
    }
    
    // Buscar si el producto ya está en el carrito
    const existingItemIndex = items.findIndex(item => 
      item.productId == productId && item.tabType === tabType
    );
    
    if (existingItemIndex !== -1) {
      items[existingItemIndex].quantity += 1;
    } else {
      items.push({ 
        productId, 
        tabType, 
        quantity: 1,
        addedAt: new Date().toISOString()
      });
    }
    
    if (cart) {
      // Actualizar carrito existente
      stmt = db.prepare(`
        UPDATE carts SET items = ? WHERE userId = ?
      `);
      stmt.run(JSON.stringify(items), userId);
    } else {
      // Crear nuevo carrito
      stmt = db.prepare(`
        INSERT INTO carts (userId, items) VALUES (?, ?)
      `);
      stmt.run(userId, JSON.stringify(items));
    }
    
    res.json({ userId, items });
  } catch (error) {
    console.error('Error añadiendo al carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/remove', (req, res) => {
  const { userId, productId, tabType } = req.body;
  try {
    // Obtener carrito
    let stmt = db.prepare(`
      SELECT * FROM carts WHERE userId = ?
    `);
    const cart = stmt.get(userId);
    
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }
    
    let items = JSON.parse(cart.items);
    const initialLength = items.length;
    
    items = items.filter(item => 
      !(item.productId == productId && item.tabType === tabType)
    );
    
    if (items.length === initialLength) {
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    // Actualizar carrito
    stmt = db.prepare(`
      UPDATE carts SET items = ? WHERE userId = ?
    `);
    stmt.run(JSON.stringify(items), userId);
    
    res.json({ userId, items });
  } catch (error) {
    console.error('Error removiendo del carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/update', (req, res) => {
  const { userId, productId, tabType, quantity } = req.body;
  
  if (quantity < 1) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }
  
  try {
    // Obtener carrito
    let stmt = db.prepare(`
      SELECT * FROM carts WHERE userId = ?
    `);
    const cart = stmt.get(userId);
    
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }
    
    let items = JSON.parse(cart.items);
    const itemIndex = items.findIndex(item => 
      item.productId == productId && item.tabType === tabType
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    items[itemIndex].quantity = quantity;
    
    // Actualizar carrito
    stmt = db.prepare(`
      UPDATE carts SET items = ? WHERE userId = ?
    `);
    stmt.run(JSON.stringify(items), userId);
    
    res.json({ userId, items });
  } catch (error) {
    console.error('Error actualizando carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/clear/:userId', (req, res) => {
  const { userId } = req.params;
  
  try {
    const stmt = db.prepare(`
      DELETE FROM carts WHERE userId = ?
    `);
    const result = stmt.run(userId);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Carrito no encontrado' });
    }
  } catch (error) {
    console.error('Error vaciando carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Checkout
app.post('/api/checkout', (req, res) => {
  const { userId, paymentMethod, transferData, recipientData, requiredFields } = req.body;
  
  try {
    // Obtener carrito
    let stmt = db.prepare(`
      SELECT * FROM carts WHERE userId = ?
    `);
    const cart = stmt.get(userId);
    
    if (!cart || !cart.items) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }
    
    const items = JSON.parse(cart.items);
    let total = 0;
    const itemsWithDetails = [];
    
    // Obtener detalles de los productos
    for (const item of items) {
      stmt = db.prepare(`
        SELECT * FROM products 
        WHERE type = ? AND id = ?
      `);
      const product = stmt.get(item.tabType, item.productId);
      
      if (product) {
        const prices = JSON.parse(product.prices);
        const price = prices[paymentMethod] || Object.values(prices)[0] || 0;
        total += price * item.quantity;
        
        itemsWithDetails.push({
          ...item,
          name: product.name,
          price: price,
          imageUrl: product.images ? JSON.parse(product.images)[0] : null
        });
      }
    }
    
    // Crear orden
    const orderId = `ORD-${Date.now()}`;
    const order = {
      id: orderId,
      userId,
      items: itemsWithDetails,
      payment: {
        method: paymentMethod,
        ...transferData
      },
      recipient: recipientData,
      requiredFields,
      total,
      status: 'Pendiente',
      createdAt: new Date().toISOString()
    };
    
    // Guardar orden
    stmt = db.prepare(`
      INSERT INTO orders (id, userId, items, payment, recipient, requiredFields, total, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      order.id,
      order.userId,
      JSON.stringify(order.items),
      JSON.stringify(order.payment),
      JSON.stringify(order.recipient),
      JSON.stringify(order.requiredFields),
      order.total,
      order.status,
      order.createdAt
    );
    
    // Vaciar carrito
    stmt = db.prepare(`
      DELETE FROM carts WHERE userId = ?
    `);
    stmt.run(userId);
    
    res.json({ 
      success: true, 
      orderId: order.id,
      message: 'Compra realizada con éxito' 
    });
  } catch (error) {
    console.error('Error en checkout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Administración
app.get('/api/admin/orders', isAdmin, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM orders
    `);
    const orders = stmt.all();
    
    // Parsear campos JSON
    const parsedOrders = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items),
      payment: JSON.parse(order.payment),
      recipient: JSON.parse(order.recipient),
      requiredFields: JSON.parse(order.requiredFields)
    }));
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/admin/orders/:orderId', isAdmin, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  try {
    const stmt = db.prepare(`
      UPDATE orders SET 
        status = ?, 
        updatedAt = ?
      WHERE id = ?
    `);
    const result = stmt.run(status, new Date().toISOString(), orderId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando orden:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/admin/products', isAdmin, (req, res) => {
  const { type, category, product } = req.body;
  
  try {
    // Preparar el producto para la base de datos
    const productData = {
      type,
      category,
      name: product.name,
      description: product.description,
      details: product.details || null,
      prices: JSON.stringify(product.prices),
      images: product.images ? JSON.stringify(product.images) : null,
      hasColorVariant: product.hasColorVariant ? 1 : 0,
      colors: product.colors ? JSON.stringify(product.colors) : null,
      requiredFields: product.requiredFields ? JSON.stringify(product.requiredFields) : null,
      dateCreated: product.dateCreated || new Date().toISOString()
    };
    
    const stmt = db.prepare(`
      INSERT INTO products (
        type, category, name, description, details, prices, 
        images, hasColorVariant, colors, requiredFields, dateCreated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      productData.type,
      productData.category,
      productData.name,
      productData.description,
      productData.details,
      productData.prices,
      productData.images,
      productData.hasColorVariant,
      productData.colors,
      productData.requiredFields,
      productData.dateCreated
    );
    
    // Obtener el producto recién creado
    const newProduct = {
      id: result.lastInsertRowid,
      ...product
    };
    
    res.json(newProduct);
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/admin/products/:id', isAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    const stmt = db.prepare(`
      DELETE FROM products WHERE id = ?
    `);
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/admin/categories', isAdmin, (req, res) => {
  const { type, name } = req.body;
  
  if (!type || !name) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  
  try {
    const stmt = db.prepare(`
      INSERT INTO categories (type, name) VALUES (?, ?)
    `);
    stmt.run(type, name);
    
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'La categoría ya existe' });
    }
    console.error('Error creando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.delete('/api/admin/categories/:id', isAdmin, (req, res) => {
  const { id } = req.params;
  
  try {
    const stmt = db.prepare(`
      DELETE FROM categories WHERE id = ?
    `);
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/categories/:type', (req, res) => {
  const { type } = req.params;
  
  try {
    const stmt = db.prepare(`
      SELECT name FROM categories WHERE type = ?
    `);
    const categories = stmt.all(type);
    
    res.json(categories.map(c => c.name));
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Usuarios
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM users WHERE id = ?
    `);
    const user = stmt.get(userId);
    
    if (user) {
      // Parsear los datos del usuario
      const userData = {
        ...user,
        data: JSON.parse(user.data)
      };
      res.json(userData);
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  const userData = req.body;
  
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (id, data) 
      VALUES (?, ?)
    `);
    stmt.run(userId, JSON.stringify(userData));
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Órdenes de usuario
app.get('/api/orders/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM orders WHERE userId = ?
    `);
    const orders = stmt.all(userId);
    
    // Parsear campos JSON
    const parsedOrders = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items),
      payment: JSON.parse(order.payment),
      recipient: JSON.parse(order.recipient),
      requiredFields: JSON.parse(order.requiredFields)
    }));
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Bot de Telegram
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('🤖 Bot de Telegram iniciado correctamente');
    
    const ADMIN_IDS = process.env.ADMIN_IDS 
      ? process.env.ADMIN_IDS.split(',').map(Number) 
      : [];
    
    const getFrontendUrl = () => {
      return process.env.FRONTEND_URL || 'https://tu-frontend-en-render.onrender.com';
    };
    
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      const webAppUrl = `${getFrontendUrl()}/?tgid=${userId}`;
      
      const promoMessage = `🌟 <b>¡BIENVENIDO A NEXUS STORE!</b> 🌟
🔥 <b>VENTA DE PRODUCTOS DIGITALES Y FÍSICOS</b> 🔥
👇 <b>¡Todo está aquí!</b> 👇`;
      
      const keyboard = {
        inline_keyboard: [[{
          text: "🚀 ABRIR TIENDA AHORA",
          web_app: { url: webAppUrl }
        }]]
      };
      
      bot.sendMessage(chatId, promoMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    });
    
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text || '';
      
      if (ADMIN_IDS.includes(userId)) {
        if (text === '/admin') {
          const webAppUrl = `${getFrontendUrl()}/?tgid=${userId}`;
          
          const adminMessage = `👑 <b>ACCESO DE ADMINISTRADOR HABILITADO</b> 👑`;
      
          bot.sendMessage(chatId, adminMessage, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[{
                text: "⚙️ ABRIR PANEL ADMIN",
                web_app: { url: webAppUrl }
              }]]
            }
          });
        }
      } else if (text === '/admin') {
        bot.sendMessage(chatId, '❌ <b>No tienes permisos de administrador</b>', {
          parse_mode: 'HTML'
        });
      }
    });
    
    bot.on('web_app_data', (msg) => {
      const chatId = msg.chat.id;
      const data = msg.web_app_data ? JSON.parse(msg.web_app_data.data) : null;
      
      if (data && data.command === 'new_order') {
        const orderMessage = `🎉 <b>¡PEDIDO CONFIRMADO!</b> 🎉`;
        bot.sendMessage(chatId, orderMessage, { parse_mode: 'HTML' });
      }
    });
  } else {
    console.log('⚠️ TELEGRAM_BOT_TOKEN no definido. Bot no iniciado');
  }
});

import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

console.log(`🚀 Iniciando servidor en el puerto ${PORT}`);
console.log(`👑 Admin IDs: ${process.env.ADMIN_IDS}`);
console.log(`🤖 Token de bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'Configurado' : 'FALTANTE'}`);
console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID', '*']
}));
app.use(express.json());

const DB_PATH = path.join(__dirname, 'data');
console.log(`📂 Ruta de la base de datos: ${DB_PATH}`);

if (!fs.existsSync(DB_PATH)) {
  try {
    fs.mkdirSync(DB_PATH);
    console.log("✅ Carpeta 'data' creada exitosamente");
  } catch (err) {
    console.error(`❌ Error creando carpeta 'data': ${err.message}`);
  }
}

function loadJSON(file) {
  const filePath = path.join(DB_PATH, file);
  console.log(`🔍 Cargando archivo: ${filePath}`);
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error cargando ${file}: ${err.message}`);
    
    if (err.code === 'ENOENT') {
      console.log(`Creando ${file} con estructura inicial...`);
      let initialData = {};
      
      if (file === 'products.json') initialData = { fisico: {}, digital: {} };
      else if (file === 'categories.json') initialData = { fisico: [], digital: [] };
      else if (file === 'carts.json') initialData = [];
      else if (file === 'orders.json') initialData = [];
      else if (file === 'users.json') initialData = {};
      
      fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    
    return {};
  }
}

console.log("📊 Inicializando base de datos...");
const DB = {
  products: loadJSON('products.json'),
  categories: loadJSON('categories.json'),
  carts: loadJSON('carts.json'),
  orders: loadJSON('orders.json'),
  users: loadJSON('users.json'),
  
  save: (file, data) => {
    const filePath = path.join(DB_PATH, file);
    console.log(`💾 Guardando datos en ${filePath}`);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Datos guardados exitosamente en ${file}`);
    } catch (err) {
      console.error(`❌ Error guardando ${filePath}: ${err.message}`);
    }
  }
};

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

app.get('/', (req, res) => {
  console.log("🌐 Recibida solicitud en la raíz");
  res.send('Backend Nexus Store funcionando correctamente');
});

app.get('/api/admin/health', (req, res) => {
  console.log("🩺 Verificación de salud solicitada");
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/admin/ids', (req, res) => {
  console.log("👑 Solicitud de IDs de administrador recibida");
  
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  console.log(`📋 IDs de administrador configurados: ${adminIds.join(', ')}`);
  console.log('📝 Headers recibidos:', req.headers);
  
  res.json(adminIds);
});

app.get('/api/products/:type', (req, res) => {
  const { type } = req.params;
  console.log(`🛒 Solicitud de productos tipo: ${type}`);
  
  const products = DB.products[type] || {};
  console.log(`📦 Productos encontrados: ${Object.keys(products).length} categorías`);
  
  res.json(products);
});

app.get('/api/products/:type/:id', (req, res) => {
  const { type, id } = req.params;
  console.log(`🔍 Buscando producto ${id} de tipo ${type}`);
  
  const products = DB.products[type] || {};
  
  let foundProduct = null;
  
  for (const category in products) {
    foundProduct = products[category].find(p => p.id == id);
    if (foundProduct) break;
  }
  
  if (foundProduct) {
    console.log("✅ Producto encontrado");
    res.json(foundProduct);
  } else {
    console.log("❌ Producto no encontrado");
    res.status(404).json({ error: 'Producto no encontrado' });
  }
});

app.get('/api/products/search/:query', (req, res) => {
  const { query } = req.params;
  const { type } = req.query;
  console.log(`🔍 Búsqueda de productos: "${query}" en tipo ${type || 'todos'}`);
  
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
  
  console.log(`🔍 Resultados encontrados: ${Object.keys(results).length} categorías`);
  res.json(results);
});

app.get('/api/cart/:userId', (req, res) => {
  const { userId } = req.params;
  console.log(`🛒 Solicitud de carrito para usuario: ${userId}`);
  
  const cart = DB.carts.find(cart => cart.userId == userId);
  
  if (cart) {
    console.log(`🛒 Carrito encontrado con ${cart.items.length} items`);
    res.json(cart);
  } else {
    console.log("🛒 Carrito no encontrado, creando uno nuevo");
    const newCart = { userId, items: [] };
    res.json(newCart);
  }
});

app.post('/api/cart/add', (req, res) => {
  const { userId, productId, tabType } = req.body;
  console.log(`➕ Añadiendo producto al carrito: Usuario ${userId}, Producto ${productId}, Tipo ${tabType}`);
  
  let cart = DB.carts.find(cart => cart.userId == userId);
  if (!cart) {
    console.log("🛒 Carrito no existente, creando uno nuevo");
    cart = { userId, items: [] };
    DB.carts.push(cart);
  }
  
  const existingItem = cart.items.find(item => 
    item.productId == productId && item.tabType === tabType
  );
  
  if (existingItem) {
    console.log("🛒 Producto existente, incrementando cantidad");
    existingItem.quantity += 1;
  } else {
    console.log("🛒 Nuevo producto añadido al carrito");
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
  console.log(`➖ Eliminando producto del carrito: Usuario ${userId}, Producto ${productId}, Tipo ${tabType}`);
  
  const cart = DB.carts.find(cart => cart.userId == userId);
  if (!cart) {
    console.log("❌ Carrito no encontrado");
    return res.status(404).json({ error: 'Carrito no encontrado' });
  }
  
  const itemIndex = cart.items.findIndex(item => 
    item.productId == productId && item.tabType === tabType
  );
  
  if (itemIndex === -极速赛车开奖直播官网1) {
    console.log("❌ Producto no encontrado en el carrito");
    return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
  }
  
  console.log("✅ Producto eliminado del carrito");
  cart.items.splice(itemIndex, 1);
  DB.save('carts.json', DB.carts);
  res.json(cart);
});

app.post('/api/checkout', (req, res) => {
  const { userId, paymentMethod, transferData, recipientData } = req.body;
  console.log(`💳 Procesando pago para usuario: ${userId}`);
  
  const cart = DB.carts.find(cart => cart.userId == userId);
  if (!cart || cart.items.length === 0) {
    console.log("❌ Carrito vacío, no se puede procesar pago");
    return res.status(400).json({ error: 'Carrito vacío' });
  }
  
  let total = 0;
  const itemsWithDetails = [];
  
  cart.items.forEach(item => {
    let product = null;
    for (const category in DB.products[item.tabType]) {
      const found = DB.products[item.tabType][category].find(p => p.id == item.productId);
      if (found) {
        product = found;
        break;
      }
    }
    
    if (product) {
      const price = product.prices[paymentMethod] || Object.values(product.prices)[0] || 0;
      total += price * item.quantity;
      itemsWithDetails.push({
        ...item,
        name: product.name,
        price: price
      });
    }
  });
  
  const order = {
    id: `ORD-${Date.now()}`,
    userId,
    items: itemsWithDetails,
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
  
  console.log(`✅ Pedido #${order.id} creado exitosamente`);
  res.json({ 
    success: true, 
    orderId: order.id,
    message: 'Compra realizada con éxito' 
  });
});

app.get('/api/admin/orders', isAdmin, (req, res) => {
  console.log("📋 Solicitud de pedidos de administrador");
  res.json(DB.orders);
});

app.put('/api/admin/orders/:orderId', isAdmin, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  console.log(`🔄 Actualizando estado del pedido ${orderId} a ${status}`);
  
  const order = DB.orders.find(order => order.id === orderId);
  if (!order) {
    console.log("❌ Pedido no encontrado");
    return res.status(404).json({ error: 'Orden no encontrada' });
  }
  
  order.status = status;
  order.updatedAt = new Date().toISOString();
  DB.save('orders.json', DB.orders);
  
  console.log("✅ Estado del pedido actualizado");
  res.json(order);
});

app.post('/api/admin/products', isAdmin, (req, res) => {
  const { type, category, product } = req.body;
  console.log(`🛍️ Creando nuevo producto en ${type}/${category}`);
  
  if (!DB.products[type]) {
    DB.products[type] = {};
  }
  
  if (!DB.products[type][category]) {
    DB.products[type][category] = [];
  }
  
  // Asegurar que el producto tenga un ID único
  product.id = product.id || Date.now();
  product.dateCreated = product.dateCreated || new Date().toISOString();
  
  DB.products[type][category].push(product);
  DB.save('products.json', DB.products);
  
  console.log(`✅ Producto ${product.name} creado exitosamente`);
  res.json(product);
});

app.post('/api/admin/categories', isAdmin, (req, res) => {
  const { type, category } = req.body;
  console.log(`📂 Creando nueva categoría: ${category} en ${type}`);
  
  if (!type || !category) {
    console.log("❌ Faltan datos para crear categoría");
    return res.status(400).json({ error: 'Faltan datos' });
  }
  
  if (!DB.categories[type]) {
    console.log("❌ Tipo de producto no válido");
    return res.status(400).json({ error: 'Tipo de producto no válido' });
  }
  
  if (!DB.categories[type].includes(category)) {
    DB.categories[type].push(category);
    DB.save('categories.json', DB.categories);
    console.log(`✅ Categoría ${category} añadida exitosamente`);
  } else {
    console.log("ℹ️ Categoría ya existe, no se añade duplicado");
  }
  
  res.json({ success: true, categories: DB.categories[type] });
});

app.get('/api/categories/:type', (req, res) => {
  const { type } = req.params;
  console.log(`📂 Solicitud de categorías para tipo: ${type}`);
  
  const categories = DB.categories[type] || [];
  console.log(`📂 Categorías encontradas: ${categories.length}`);
  
  res.json(categories);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('🤖 Bot de Telegram iniciado correctamente');
    
    const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [];
    console.log(`👑 IDs de administrador para Telegram: ${ADMIN_IDS.join(', ')}`);
    
    const getFrontendUrl = () => {
      return process.env.FRONTEND_URL || 'https://tu-frontend-en-render.onrender.com';
    };
    
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      const webAppUrl = `${getFrontendUrl()}/?tgid=${userId}`;
      console.log(`🔗 URL generada para Telegram: ${webAppUrl}`);
      
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
          console.log(`👑 URL de admin generada para Telegram: ${webAppUrl}`);
          
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
        console.log(`📦 Nueva orden recibida desde Telegram: ${data.orderId}`);
        const orderMessage = `🎉 <b>¡PEDIDO CONFIRMADO!</b> 🎉`;
      
        bot.sendMessage(chatId, orderMessage, {
          parse_mode: 'HTML'
        });
      }
    });
  } else {
    console.log('⚠️ TELEGRAM_BOT_TOKEN no definido. Bot no iniciado');
  }
});

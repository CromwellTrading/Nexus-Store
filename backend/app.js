import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';

// Configuración para obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

console.log(`🚀 Iniciando servidor en el puerto ${PORT}`);
console.log(`👑 Admin IDs: ${process.env.ADMIN_IDS}`);
console.log(`🤖 Token de bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'Configurado' : 'FALTANTE'}`);
console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
console.log(`🖼️ ImageBin Token: ${process.env.IMAGEBIN_API_TOKEN ? 'Configurado' : 'FALTANTE'}`);

// Configuración de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID']
}));
app.use(express.json());

// Base de datos simple (archivos JSON)
const DB_PATH = path.join(__dirname, 'data');
console.log(`📂 Ruta de la base de datos: ${DB_PATH}`);

// Crear carpeta de datos si no existe
if (!fs.existsSync(DB_PATH)) {
  try {
    fs.mkdirSync(DB_PATH);
    console.log("✅ Carpeta 'data' creada exitosamente");
  } catch (err) {
    console.error(`❌ Error creando carpeta 'data': ${err.message}`);
  }
}

// Funciones de ayuda para cargar archivos JSON
function loadJSON(file) {
  const filePath = path.join(DB_PATH, file);
  console.log(`🔍 Cargando archivo: ${filePath}`);
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error cargando ${file}: ${err.message}`);
    
    // Crear archivo vacío si hay error
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

// Middleware de autenticación para administradores
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

// Ruta para subir imágenes al backend
app.post('/api/upload-image', isAdmin, async (req, res) => {
  console.log("🖼️ Recibida solicitud para subir imagen");
  
  try {
    const { image } = req.body;
    if (!image) {
      console.log("❌ Imagen no proporcionada");
      return res.status(400).json({ error: 'Imagen no proporcionada' });
    }

    console.log("🔧 Procesando imagen base64...");
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const formData = new FormData();
    const blob = new Blob([buffer]);
    formData.append('file', blob, 'image.png');

    console.log("⬆️ Subiendo imagen a ImageBin...");
    const response = await fetch('https://imagebin.ca/upload.php', {
      method: 'POST',
      body: formData,
      headers: {
        'token': process.env.IMAGEBIN_API_TOKEN || ''
      }
    });

    const data = await response.json();
    console.log("📬 Respuesta de ImageBin:", data);
    
    if (data.success) {
      console.log("✅ Imagen subida exitosamente");
      res.json({ url: data.url });
    } else {
      console.error('❌ Error subiendo imagen:', data);
      res.status(500).json({ error: 'Error subiendo imagen: ' + (data.message || 'Error desconocido') });
    }
  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta de prueba para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  console.log("🌐 Recibida solicitud en la raíz");
  res.send('Backend Nexus Store funcionando correctamente');
});

// Ruta de verificación de salud
app.get('/api/admin/health', (req, res) => {
  console.log("🩺 Verificación de salud solicitada");
  res.json({ status: 'ok', timestamp: new Date() });
});

// Ruta para obtener IDs de administradores
app.get('/api/admin/ids', (req, res) => {
  console.log("👑 Solicitud de IDs de administrador recibida");
  
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  console.log(`📋 IDs de administrador enviados: ${adminIds.join(', ')}`);
  res.json(adminIds);
});

// API ROUTES - BACKEND
app.get('/api/products/:type', (req, res) => {
  const { type } = req.params;
  console.log(`🛒 Solicitud de productos tipo: ${type}`);
  
  const products = DB.products[type] || {};
  console.log(`📦 Productos encontrados: ${Object.keys(products).length} categorías`);
  
  res.json(products);
});

// Nueva ruta para obtener producto individual
app.get('/api/products/:type/:id', (req, res) => {
  const { type, id } = req.params;
  console.log(`🔍 Buscando producto ${id} de tipo ${type}`);
  
  const products = DB.products[type] || {};
  
  let foundProduct = null;
  
  // Buscar producto en todas las categorías
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
  
  if (itemIndex === -1) {
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
  
  // Calcular total real basado en precios de productos
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
  
  // Vaciar carrito
  cart.items = [];
  DB.save('carts.json', DB.carts);
  
  console.log(`✅ Pedido #${order.id} creado exitosamente`);
  res.json({ 
    success: true, 
    orderId: order.id,
    message: 'Compra realizada con éxito' 
  });
});

// ADMIN ROUTES
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
  
  product.id = Date.now();
  product.createdAt = new Date().toISOString();
  DB.products[type][category].push(product);
  
  DB.save('products.json', DB.products);
  
  console.log(`✅ Producto ${product.name} creado exitosamente`);
  res.json(product);
});

// Nueva ruta para crear categorías
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
  
  // Evitar duplicados
  if (!DB.categories[type].includes(category)) {
    DB.categories[type].push(category);
    DB.save('categories.json', DB.categories);
    console.log(`✅ Categoría ${category} añadida exitosamente`);
  } else {
    console.log("ℹ️ Categoría ya existe, no se añade duplicado");
  }
  
  res.json({ success: true, categories: DB.categories[type] });
});

// Ruta para obtener categorías
app.get('/api/categories/:type', (req, res) => {
  const { type } = req.params;
  console.log(`📂 Solicitud de categorías para tipo: ${type}`);
  
  const categories = DB.categories[type] || [];
  console.log(`📂 Categorías encontradas: ${categories.length}`);
  
  res.json(categories);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
  
  // Solo si el token está configurado, iniciar el bot
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('🤖 Bot de Telegram iniciado correctamente');
    
    // IDs de administradores
    const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [];
    console.log(`👑 IDs de administrador para Telegram: ${ADMIN_IDS.join(', ')}`);
    
    // Función para obtener URL base
    const getFrontendUrl = () => {
      return process.env.FRONTEND_URL || 'https://tu-frontend-en-render.onrender.com';
    };
    
    // Manejar el comando /start
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
    
    // Manejar mensajes de administradores
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
    
    // Manejar eventos de Web App
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

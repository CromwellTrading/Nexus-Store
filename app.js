import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';

// Configuración para obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6000;

// Configuración de CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID']
};

app.use(cors(corsOptions));
app.use(express.json());

// SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND
const frontendPath = path.join(__dirname, 'frontend');

// Verificar si la carpeta frontend existe
try {
  const files = fs.readdirSync(frontendPath);
  console.log(`✅ Carpeta frontend encontrada. Contiene ${files.length} archivos`);
} catch (err) {
  console.error(`❌ Error accediendo a la carpeta frontend: ${err.message}`);
  console.log("Intentando crear carpeta frontend...");
  
  try {
    fs.mkdirSync(frontendPath);
    console.log("✅ Carpeta frontend creada exitosamente");
  } catch (mkdirErr) {
    console.error(`❌ Error creando carpeta frontend: ${mkdirErr.message}`);
  }
}

app.use(express.static(frontendPath));

// Base de datos simple (archivos JSON)
const DB_PATH = path.join(__dirname, 'data');

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
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error cargando ${file}:`, err.message);
    
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

const DB = {
  products: loadJSON('products.json'),
  categories: loadJSON('categories.json'),
  carts: loadJSON('carts.json'),
  orders: loadJSON('orders.json'),
  users: loadJSON('users.json'),
  
  save: (file, data) => {
    const filePath = path.join(DB_PATH, file);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`Error guardando ${filePath}:`, err.message);
    }
  }
};

// Middleware de autenticación para administradores
const isAdmin = (req, res, next) => {
  const telegramId = req.headers['telegram-id'];
  const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [5376388604, 718827739];
  
  if (!telegramId || !adminIds.includes(Number(telegramId))) {
    return res.status(403).json({ error: 'Acceso no autorizado. Solo administradores.' });
  }
  next();
};

// RUTAS PRINCIPALES
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Nueva ruta para obtener IDs de administradores
app.get('/api/admin/ids', (req, res) => {
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(Number) 
    : [];
    
  console.log('Solicitud de admin IDs recibida. Enviando:', adminIds);
  res.json(adminIds);
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
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
  console.log(`📂 Ruta del frontend: ${frontendPath}`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'Desarrollo'}`);
  console.log(`👑 Admin IDs: ${process.env.ADMIN_IDS}`);
  console.log(`✅ Frontend disponible en: http://localhost:${PORT}`);
  
  // Diagnóstico adicional
  try {
    const frontendFiles = fs.readdirSync(frontendPath);
    console.log(`📄 Archivos en frontend (${frontendFiles.length}):`, frontendFiles);
  } catch (err) {
    console.error('❌ Error leyendo archivos frontend:', err);
  }
  
  try {
    const dataFiles = fs.readdirSync(DB_PATH);
    console.log(`📄 Archivos en data (${dataFiles.length}):`, dataFiles);
  } catch (err) {
    console.error('❌ Error leyendo archivos de datos:', err);
  }
});

// Iniciar el bot de Telegram
const token = process.env.TELEGRAM_BOT_TOKEN;
if (token) {
  const bot = new TelegramBot(token, { polling: true });
  
  // IDs de administradores
  const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(Number) : [];
  
  // Función para obtener URL base sin protocolo duplicado
  const getBaseUrl = () => {
    if (process.env.RENDER_EXTERNAL_URL) {
      // Eliminar cualquier protocolo existente
      return process.env.RENDER_EXTERNAL_URL.replace(/^https?:\/\//, '');
    }
    return `localhost:${PORT}`;
  };
  
  // Manejar el comando /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const baseUrl = getBaseUrl();
    const webAppUrl = `https://${baseUrl}/?tgid=${userId}`;
    console.log(`🔗 URL generada para Telegram: ${webAppUrl}`);
    
    // Mensaje promocional mejorado con emojis y formato
    const promoMessage = `🌟 <b>¡BIENVENIDO A NEXUS STORE!</b> 🌟

🔥 <b>VENTA DE PRODUCTOS DIGITALES Y FÍSICOS</b> 🔥

🛒 <b>Productos Físicos:</b>
- Camisas 👕
- Ventiladores 💨
- Electrónicos 📱
- ¡Y mucho más! 📦

💎 <b>Recargas Digitales:</b>
- Diamantes de Free Fire 💎
- Créditos de Mobile Legends 🎮
- Puntos de Call of Duty 🔫
- Recargas para todos tus juegos 🕹️

💰 <b>PRECIOS MÁS BAJOS DE CUBA</b> 💰
💯 La mejor forma de recargarte y obtener tus productos
⚡️ Entrega inmediata y segura

👇 <b>¡Todo está aquí!</b> 👇`;
    
    const keyboard = {
      inline_keyboard: [[{
        text: "🚀 ABRIR TIENDA AHORA",
        web_app: { url: webAppUrl }
      }]]
    };
    
    // Enviar mensaje con botón integrado
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
        const baseUrl = getBaseUrl();
        const webAppUrl = `https://${baseUrl}/?tgid=${userId}`;
        console.log(`👑 URL de admin generada para Telegram: ${webAppUrl}`);
        
        const adminMessage = `👑 <b>ACCESO DE ADMINISTRADOR HABILITADO</b> 👑

¡Hola admin! Puedes acceder al panel de control para:
- Gestionar productos 🛒
- Ver pedidos 📋
- Actualizar métodos de pago 💳
- Y mucho más...`;
    
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
      const orderMessage = `🎉 <b>¡PEDIDO CONFIRMADO!</b> 🎉
      
✅ Tu pedido #${data.orderId} ha sido recibido
🛒 Productos: ${data.itemsCount || 1}
💰 Total: $${data.total || '0.00'}
📦 Estaremos procesando tu pedido inmediatamente`;
    
      bot.sendMessage(chatId, orderMessage, {
        parse_mode: 'HTML'
      });
    }
  });
  
  console.log('🤖 Bot de Telegram iniciado correctamente');
} else {
  console.log('⚠️ TELEGRAM_BOT_TOKEN no definido. Bot no iniciado');
}

// Función para diagnóstico de rutas
app.get('/debug/paths', (req, res) => {
  const response = {
    __dirname,
    frontendPath,
    DB_PATH,
    exists: {
      frontend: fs.existsSync(frontendPath),
      data: fs.existsSync(DB_PATH)
    },
    files: {}
  };

  if (response.exists.frontend) {
    try {
      response.files.frontend = fs.readdirSync(frontendPath);
    } catch (err) {
      response.files.frontend = `Error leyendo: ${err.message}`;
    }
  } else {
    response.files.frontend = 'Carpeta no existe';
  }

  if (response.exists.data) {
    try {
      response.files.data = fs.readdirSync(DB_PATH);
    } catch (err) {
      response.files.data = `Error leyendo: ${err.message}`;
    }
  } else {
    response.files.data = 'Carpeta no existe';
  }

  res.json(response);
});

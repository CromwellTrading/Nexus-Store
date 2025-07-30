import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import TelegramBot from 'node-telegram-bot-api';

// =====================================================================
// Configuración inicial y verificación de variables de entorno
// =====================================================================
console.log('🚀 ===== INICIANDO BACKEND NEXUS STORE =====');
console.log('🔍 Verificando variables de entorno:');

// Mostrar estado de todas las variables críticas sin exponer valores sensibles
const envVars = [
  'PORT', 'ADMIN_IDS', 'TELEGRAM_BOT_TOKEN', 'FRONTEND_URL',
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_DB_URL'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`   ${varName}: ${value ? '✅ Configurado' : '❌ FALTANTE'}`);
  
  if (!value && varName !== 'TELEGRAM_BOT_TOKEN') {
    console.error(`   ⚠️ ADVERTENCIA: ${varName} no está definido en .env`);
  }
});

console.log('===========================================');

const app = express();
const PORT = process.env.PORT || 10000;

// =====================================================================
// Configuración de Supabase
// =====================================================================
console.log('\n🔧 Configurando Supabase...');
console.log(`   URL: ${process.env.SUPABASE_URL}`);
console.log(`   ANON KEY: ${process.env.SUPABASE_ANON_KEY ? 'Presente' : 'Faltante'}`);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configuración de PostgreSQL directa
console.log('\n🔧 Configurando conexión directa a PostgreSQL...');
console.log(`   DB URL: ${process.env.SUPABASE_DB_URL ? 'Presente' : 'Faltante'}`);

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

// =====================================================================
// Verificación de conexión a Supabase
// =====================================================================
console.log('\n🔍 Probando conexión a Supabase...');
(async () => {
  try {
    console.log('   Probando consulta a tabla "products"...');
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('   ❌ Error en consulta Supabase:', error);
      throw error;
    }
    
    console.log(`   ✅ Conexión a Supabase verificada. Productos encontrados: ${data.length}`);
  } catch (error) {
    console.error('   ❌ Error crítico verificando conexión a Supabase:', error.message);
    console.error('   ⚠️ El sistema puede no funcionar correctamente sin conexión a Supabase');
  }
})();

// =====================================================================
// Middlewares
// =====================================================================
console.log('\n🔧 Configurando middlewares...');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID', '*']
}));
app.use(express.json());

// Middleware de administrador con logs detallados
const isAdmin = (req, res, next) => {
  console.log('\n🔐 MIDDLEWARE ADMIN - Verificando acceso de administrador...');
  const telegramId = req.headers['telegram-id'];
  console.log(`   📱 Telegram ID recibido: ${telegramId}`);
  
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  console.log(`   👑 IDs de administrador: ${adminIds.join(', ')}`);
  
  if (!telegramId) {
    console.log('   ❌ Acceso denegado: No se recibió Telegram-ID en headers');
    return res.status(401).json({ error: 'Se requiere Telegram-ID' });
  }
  
  if (!adminIds.includes(telegramId.toString())) {
    console.log('   ❌ Acceso denegado: ID no está en lista de administradores');
    return res.status(403).json({ error: 'Acceso no autorizado. Solo administradores pueden acceder.' });
  }
  
  console.log('   ✅ Acceso de administrador autorizado');
  next();
};

// =====================================================================
// Rutas básicas
// =====================================================================
console.log('\n🔧 Configurando rutas básicas...');
app.get('/', (req, res) => {
  console.log('🌐 Solicitud GET a /');
  res.send('Backend Nexus Store funcionando correctamente');
});

app.get('/api/admin/health', (req, res) => {
  console.log('🩺 Solicitud GET a /api/admin/health');
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    supabaseConnected: !!process.env.SUPABASE_URL
  });
});

app.get('/api/admin/ids', (req, res) => {
  console.log('🆔 Solicitud GET a /api/admin/ids');
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  res.json(adminIds);
});

// =====================================================================
// Rutas de productos
// =====================================================================
console.log('\n🔧 Configurando rutas de productos...');
app.get('/api/products/:type', async (req, res) => {
  const { type } = req.params;
  console.log(`📦 GET /api/products/${type}`);
  
  try {
    console.log(`   Buscando productos de tipo: ${type}`);
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, 
        type, 
        name, 
        description, 
        details, 
        prices, 
        images, 
        has_color_variant, 
        colors, 
        required_fields,
        date_created,
        categories!inner(name)
      `)
      .eq('type', type);
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    console.log(`   ✅ Encontrados ${products.length} productos`);

    // Organizar por categoría
    const result = {};
    products.forEach(product => {
      const categoryName = product.categories.name;
      
      if (!result[categoryName]) {
        result[categoryName] = [];
      }
      
      result[categoryName].push({
        ...product,
        category: categoryName
      });
    });
    
    res.json(result);
  } catch (error) {
    console.error(`   ❌ Error obteniendo productos: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/products/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  console.log(`📦 GET /api/products/${type}/${id}`);
  
  try {
    console.log(`   Buscando producto ID: ${id}, Tipo: ${type}`);
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        categories!inner(name)
      `)
      .eq('type', type)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    if (product) {
      console.log('   ✅ Producto encontrado');
      const parsedProduct = {
        ...product,
        category: product.categories.name
      };
      res.json(parsedProduct);
    } else {
      console.log('   ❌ Producto no encontrado');
      res.status(404).json({ error: 'Producto no encontrado' });
    }
  } catch (error) {
    console.error(`   ❌ Error obteniendo producto: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// =====================================================================
// Rutas de carrito
// =====================================================================
console.log('\n🔧 Configurando rutas de carrito...');
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`🛒 GET /api/cart/${userId}`);
  
  try {
    console.log(`   Obteniendo carrito para usuario: ${userId}`);
    const { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    console.log(`   Carrito encontrado: ${cart ? 'Sí' : 'No'}`);
    res.json({
      userId,
      items: cart?.items || []
    });
  } catch (error) {
    console.error(`   ❌ Error obteniendo carrito: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ... (las demás rutas de carrito con logs similares)

// =====================================================================
// Rutas de administración
// =====================================================================
console.log('\n🔧 Configurando rutas de administración...');

// Obtener todas las categorías
app.get('/api/admin/categories', isAdmin, async (req, res) => {
  console.log('📁 GET /api/admin/categories');
  
  try {
    console.log('   Obteniendo todas las categorías...');
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*');
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    console.log(`   ✅ Encontradas ${categories.length} categorías`);
    res.json(categories);
  } catch (error) {
    console.error(`   ❌ Error obteniendo categorías: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nueva categoría (con máxima depuración)
app.post('/api/admin/categories', isAdmin, async (req, res) => {
  console.log('\n📁 POST /api/admin/categories');
  console.log('   Headers:', JSON.stringify(req.headers, null, 2));
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  
  const { type, name } = req.body;
  
  if (!type || !name) {
    console.log('   ❌ Faltan parámetros: type o name');
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  try {
    console.log(`   Creando categoría: ${name} (${type})`);
    
    const { data, error } = await supabase
      .from('categories')
      .insert([{ type, name }]);
    
    if (error) {
      console.error('   ❌ Error en Supabase:', error);
      console.error('   Código de error:', error.code);
      console.error('   Detalles:', error.details);
      console.error('   Mensaje:', error.message);
      
      if (error.code === '23505') {
        console.error('   ❌ Violación de unicidad: La categoría ya existe');
        return res.status(400).json({ error: 'La categoría ya existe' });
      }
      
      throw error;
    }
    
    console.log('   ✅ Categoría creada exitosamente:', data[0]);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('   ❌ Error interno al crear categoría:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Eliminar categoría
app.delete('/api/admin/categories/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  console.log(`\n🗑️ DELETE /api/admin/categories/${id}`);
  
  try {
    console.log(`   Eliminando categoría ID: ${id}`);
    const { error, count } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    if (count === 0) {
      console.log(`   ❌ Categoría no encontrada: ${id}`);
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    console.log(`   ✅ Categoría eliminada: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error(`   ❌ Error eliminando categoría: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear nuevo producto
app.post('/api/admin/products', isAdmin, async (req, res) => {
  console.log('\n📦 POST /api/admin/products');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  
  const { type, categoryId, product } = req.body;
  
  if (!type || !categoryId || !product) {
    console.log('   ❌ Faltan parámetros requeridos');
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  try {
    console.log(`   Verificando categoría ID: ${categoryId}`);
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();
    
    if (categoryError || !category) {
      console.log(`   ❌ Categoría inválida: ${categoryId}`);
      return res.status(400).json({ error: 'Categoría inválida' });
    }
    
    console.log('   Creando producto:', product.name);
    const { data, error } = await supabase
      .from('products')
      .insert([{
        type,
        category_id: categoryId,
        name: product.name,
        description: product.description,
        details: product.details,
        prices: product.prices,
        images: product.images,
        has_color_variant: product.hasColorVariant,
        colors: product.colors,
        required_fields: product.requiredFields,
        date_created: new Date().toISOString()
      }]);
    
    if (error) {
      console.error('   ❌ Error Supabase:', error);
      throw error;
    }
    
    console.log(`   ✅ Producto creado ID: ${data[0].id}`);
    res.json({
      id: data[0].id,
      ...product
    });
  } catch (error) {
    console.error('   ❌ Error creando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener categorías por tipo
app.get('/api/categories/:type', async (req, res) => {
  const { type } = req.params;
  console.log(`\n📁 GET /api/categories/${type}`);
  
  try {
    console.log(`   Obteniendo categorías para tipo: ${type}`);
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', type);
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    console.log(`   ✅ Encontradas ${categories.length} categorías`);
    res.json(categories);
  } catch (error) {
    console.error(`   ❌ Error obteniendo categorías: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ... (resto de rutas de administración con logs similares)

// =====================================================================
// Bot de Telegram
// =====================================================================
console.log('\n🤖 Configurando bot de Telegram...');
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor backend corriendo en: http://localhost:${PORT}`);
  console.log('===========================================');
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log('🤖 Iniciando bot de Telegram...');
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('   ✅ Bot de Telegram iniciado correctamente');
    
    const ADMIN_IDS = process.env.ADMIN_IDS 
      ? process.env.ADMIN_IDS.split(',').map(Number) 
      : [];
    
    console.log(`   👑 IDs de administrador: ${ADMIN_IDS.join(', ') || 'Ninguno'}`);
    
    const getFrontendUrl = () => {
      return process.env.FRONTEND_URL || 'https://tu-frontend-en-render.onrender.com';
    };
    
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      console.log(`   💬 Comando /start de usuario: ${userId}`);
      
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
      
      console.log(`   💬 Mensaje recibido de ${userId}: ${text}`);
      
      if (ADMIN_IDS.includes(userId)) {
        if (text === '/admin') {
          console.log(`   👑 Usuario admin ${userId} solicitó panel`);
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
        console.log(`   ⛔ Usuario no admin ${userId} intentó acceder a /admin`);
        bot.sendMessage(chatId, '❌ <b>No tienes permisos de administrador</b>', {
          parse_mode: 'HTML'
        });
      }
    });
    
    bot.on('web_app_data', (msg) => {
      const chatId = msg.chat.id;
      const data = msg.web_app_data ? JSON.parse(msg.web_app_data.data) : null;
      console.log('   📲 Datos de Web App recibidos:', data);
      
      if (data && data.command === 'new_order') {
        console.log('   🛍️ Nuevo pedido confirmado desde Web App');
        const orderMessage = `🎉 <b>¡PEDIDO CONFIRMADO!</b> 🎉`;
        bot.sendMessage(chatId, orderMessage, { parse_mode: 'HTML' });
      }
    });
  } else {
    console.log('   ⚠️ TELEGRAM_BOT_TOKEN no definido. Bot no iniciado');
  }
});

console.log('===========================================');
console.log('🚀 Sistema completamente inicializado 🚀');
console.log('===========================================');

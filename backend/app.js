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
  console.log("\n🔐 MIDDLEWARE ADMIN - Verificando acceso de administrador...");
  
  // 1. Intentar obtener de headers
  let telegramId = req.headers['telegram-id'];
  console.log(`   📱 Telegram ID de headers: ${telegramId}`);
  
  // 2. Si no está en headers, intentar de query params
  if (!telegramId && req.query.tgid) {
    telegramId = req.query.tgid;
    console.log(`   🔍 Telegram ID de query params: ${telegramId}`);
  }
  
  // 3. Si aún no, intentar de body (para solicitudes POST)
  if (!telegramId && req.body.telegramId) {
    telegramId = req.body.telegramId;
    console.log(`   📦 Telegram ID de body: ${telegramId}`);
  }
  
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  console.log(`   👑 IDs de administrador: ${adminIds.join(', ')}`);
  
  if (!telegramId) {
    console.log('   ❌ Acceso denegado: No se encontró Telegram-ID');
    return res.status(401).json({ 
      error: 'Se requiere Telegram-ID',
      instructions: 'Agregue el parámetro ?tgid=SU_ID en la URL o envíe en headers'
    });
  }
  
  if (!adminIds.includes(telegramId.toString())) {
    console.log('   ❌ Acceso denegado: ID no autorizado');
    return res.status(403).json({ 
      error: 'Acceso no autorizado',
      yourId: telegramId,
      adminIds: adminIds
    });
  }
  
  console.log('   ✅ Acceso de administrador autorizado');
  // Adjuntar el ID a la solicitud para uso posterior
  req.telegramId = telegramId;
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

app.post('/api/cart/add', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  console.log(`🛒 POST /api/cart/add para usuario: ${userId}`);
  console.log(`   Producto: ${productId}, Tipo de pestaña: ${tabType}`);
  
  try {
    // Obtener carrito existente
    console.log('   Buscando carrito existente...');
    let { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    let items = [];
    if (cart) {
      items = cart.items;
    }
    
    // Buscar si el producto ya está en el carrito
    const existingItemIndex = items.findIndex(item => 
      item.productId == productId && item.tabType === tabType
    );
    
    if (existingItemIndex !== -1) {
      console.log('   Producto ya en carrito, incrementando cantidad');
      items[existingItemIndex].quantity += 1;
    } else {
      console.log('   Añadiendo nuevo producto al carrito');
      items.push({ 
        productId, 
        tabType, 
        quantity: 1,
        addedAt: new Date().toISOString()
      });
    }
    
    if (cart) {
      // Actualizar carrito existente
      console.log('   Actualizando carrito existente');
      const { error } = await supabase
        .from('carts')
        .update({ items })
        .eq('user_id', userId);
      
      if (error) {
        console.error(`   ❌ Error actualizando carrito: ${error.message}`);
        throw error;
      }
    } else {
      // Crear nuevo carrito
      console.log('   Creando nuevo carrito');
      const { error } = await supabase
        .from('carts')
        .insert([{ user_id: userId, items }]);
      
      if (error) {
        console.error(`   ❌ Error creando carrito: ${error.message}`);
        throw error;
      }
    }
    
    console.log('   ✅ Carrito actualizado correctamente');
    res.json({ userId, items });
  } catch (error) {
    console.error(`   ❌ Error añadiendo al carrito: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/remove', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  console.log(`🛒 POST /api/cart/remove para usuario: ${userId}`);
  console.log(`   Producto: ${productId}, Tipo de pestaña: ${tabType}`);
  
  try {
    // Obtener carrito
    console.log('   Buscando carrito...');
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') {
        console.log('   ❌ Carrito no encontrado');
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      console.error(`   ❌ Error Supabase: ${cartError.message}`);
      throw cartError;
    }
    
    let items = cart.items;
    const initialLength = items.length;
    
    items = items.filter(item => 
      !(item.productId == productId && item.tabType === tabType)
    );
    
    if (items.length === initialLength) {
      console.log('   ❌ Producto no encontrado en el carrito');
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    // Actualizar carrito
    console.log('   Actualizando carrito');
    const { error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId);
    
    if (error) {
      console.error(`   ❌ Error actualizando carrito: ${error.message}`);
      throw error;
    }
    
    console.log('   ✅ Producto removido correctamente');
    res.json({ userId, items });
  } catch (error) {
    console.error(`   ❌ Error removiendo del carrito: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/update', async (req, res) => {
  const { userId, productId, tabType, quantity } = req.body;
  console.log(`🛒 POST /api/cart/update para usuario: ${userId}`);
  console.log(`   Producto: ${productId}, Tipo de pestaña: ${tabType}, Cantidad: ${quantity}`);
  
  if (quantity < 1) {
    console.log('   ❌ Cantidad inválida');
    return res.status(400).json({ error: 'Cantidad inválida' });
  }
  
  try {
    // Obtener carrito
    console.log('   Buscando carrito...');
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') {
        console.log('   ❌ Carrito no encontrado');
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      console.error(`   ❌ Error Supabase: ${cartError.message}`);
      throw cartError;
    }
    
    let items = cart.items;
    const itemIndex = items.findIndex(item => 
      item.productId == productId && item.tabType === tabType
    );
    
    if (itemIndex === -1) {
      console.log('   ❌ Producto no encontrado en el carrito');
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    items[itemIndex].quantity = quantity;
    
    // Actualizar carrito
    console.log('   Actualizando carrito');
    const { error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId);
    
    if (error) {
      console.error(`   ❌ Error actualizando carrito: ${error.message}`);
      throw error;
    }
    
    console.log('   ✅ Cantidad actualizada correctamente');
    res.json({ userId, items });
  } catch (error) {
    console.error(`   ❌ Error actualizando carrito: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/clear/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`🛒 POST /api/cart/clear/${userId}`);
  
  try {
    console.log('   Eliminando carrito...');
    const { error, count } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    if (count > 0) {
      console.log('   ✅ Carrito eliminado');
      res.json({ success: true });
    } else {
      console.log('   ❌ Carrito no encontrado');
      res.status(404).json({ error: 'Carrito no encontrado' });
    }
  } catch (error) {
    console.error(`   ❌ Error vaciando carrito: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// =====================================================================
// Checkout
// =====================================================================
console.log('\n🔧 Configurando ruta de checkout...');
app.post('/api/checkout', async (req, res) => {
  const { userId, paymentMethod, transferData, recipientData, requiredFields } = req.body;
  console.log(`💳 POST /api/checkout para usuario: ${userId}`);
  console.log(`   Método de pago: ${paymentMethod}`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('   Transacción iniciada');
    
    // 1. Obtener carrito
    console.log('   Obteniendo carrito...');
    const cartRes = await client.query(
      'SELECT items FROM carts WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    if (!cartRes.rows.length || !cartRes.rows[0].items) {
      console.log('   ❌ Carrito vacío');
      return res.status(400).json({ error: 'Carrito vacío' });
    }
    
    const items = cartRes.rows[0].items;
    let total = 0;
    const orderItems = [];
    
    console.log(`   Procesando ${items.length} items del carrito`);
    
    // 2. Procesar cada item
    for (const item of items) {
      console.log(`     Producto: ${item.productId}, Tipo: ${item.tabType}, Cantidad: ${item.quantity}`);
      const productRes = await client.query(
        `SELECT id, name, prices->>$1 AS price, images->0 AS image
         FROM products WHERE id = $2`,
        [paymentMethod, item.productId]
      );
      
      if (productRes.rows.length) {
        const product = productRes.rows[0];
        const price = parseFloat(product.price) || 0;
        const itemTotal = price * item.quantity;
        total += itemTotal;
        
        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          price: price,
          image_url: product.image,
          tab_type: item.tabType
        });
      }
    }
    
    // 3. Crear orden
    const orderId = `ORD-${Date.now()}`;
    console.log(`   Creando orden: ${orderId}, Total: ${total}`);
    await client.query(
      `INSERT INTO orders (id, user_id, total, status)
       VALUES ($1, $2, $3, 'Pendiente')`,
      [orderId, userId, total]
    );
    
    // 4. Añadir items a la orden
    console.log(`   Añadiendo ${orderItems.length} items a la orden`);
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items 
         (order_id, product_id, product_name, quantity, price, image_url, tab_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.price,
          item.image_url,
          item.tab_type
        ]
      );
    }
    
    // 5. Guardar detalles adicionales
    console.log('   Guardando detalles de la orden');
    await client.query(
      `INSERT INTO order_details 
       (order_id, payment_method, transfer_data, recipient_data, required_fields)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        paymentMethod,
        JSON.stringify(transferData),
        JSON.stringify(recipientData),
        JSON.stringify(requiredFields)
      ]
    );
    
    // 6. Vaciar carrito
    console.log('   Vaciando carrito');
    await client.query(
      'DELETE FROM carts WHERE user_id = $1',
      [userId]
    );
    
    await client.query('COMMIT');
    console.log('   Transacción completada');
    
    res.json({ 
      success: true, 
      orderId,
      total,
      message: 'Compra realizada con éxito' 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('   ❌ Error en checkout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

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

// Crear nueva categoría
app.post('/api/admin/categories', isAdmin, async (req, res) => {
  console.log('\n📁 POST /api/admin/categories');
  console.log('   Telegram ID:', req.telegramId);
  console.log('   Body:', req.body);
  
  const { type, name } = req.body;
  
  if (!type || !name) {
    console.log('   ❌ Faltan parámetros: type o name');
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  try {
    console.log(`   Verificando si la categoría ya existe: ${name} (${type})`);
    // Verificar primero si ya existe
    const { data: existingCategory, error: existError } = await supabase
      .from('categories')
      .select('id')
      .eq('type', type)
      .eq('name', name);
    
    if (existError) {
      console.error(`   ❌ Error Supabase: ${existError.message}`);
      throw existError;
    }
    
    if (existingCategory.length > 0) {
      console.log('   ❌ La categoría ya existe');
      return res.status(400).json({ 
        error: 'La categoría ya existe',
        existingId: existingCategory[0].id
      });
    }
    
    console.log(`   Creando categoría: ${name} (${type})`);
    // Crear si no existe
    const { data, error } = await supabase
      .from('categories')
      .insert([{ type, name }]);
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
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
  console.log('   Telegram ID:', req.telegramId);
  
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
  console.log('   Telegram ID:', req.telegramId);
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
      console.error(`   ❌ Error Supabase: ${error.message}`);
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

// Obtener pedidos de usuario
app.get('/api/orders/user/:userId', async (req, res) => {
  const { userId } = req.params;
  console.log(`\n📋 GET /api/orders/user/${userId}`);
  
  try {
    console.log(`   Obteniendo pedidos para usuario: ${userId}`);
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        status,
        created_at,
        updated_at,
        order_details!inner(payment_method, transfer_data, recipient_data, required_fields),
        order_items!inner(product_name, quantity, price, image_url, tab_type)
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    console.log(`   ✅ Encontrados ${orders.length} pedidos`);
    
    const parsedOrders = orders.map(order => ({
      id: order.id,
      userId,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      payment: {
        method: order.order_details.payment_method,
        ...order.order_details.transfer_data
      },
      recipient: order.order_details.recipient_data,
      requiredFields: order.order_details.required_fields,
      items: order.order_items
    }));
    
    res.json(parsedOrders);
  } catch (error) {
    console.error(`   ❌ Error obteniendo pedidos: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar estado de pedido
app.put('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  console.log(`\n📋 PUT /api/admin/orders/${orderId}`);
  console.log('   Telegram ID:', req.telegramId);
  console.log('   Nuevo estado:', status);
  
  try {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId);
    
    if (error) {
      console.error(`   ❌ Error Supabase: ${error.message}`);
      throw error;
    }
    
    console.log('   ✅ Estado de pedido actualizado');
    res.json({ success: true });
  } catch (error) {
    console.error(`   ❌ Error actualizando orden: ${error.message}`);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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

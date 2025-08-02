import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import TelegramBot from 'node-telegram-bot-api';
import pg from 'pg';

// =====================================================================
// Configuración inicial
// =====================================================================
console.log('🚀 ===== INICIANDO BACKEND NEXUS STORE =====');

const app = express();
const PORT = process.env.PORT || 10000;

// Configurar pool de PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// =====================================================================
// Configuración de Supabase
// =====================================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// =====================================================================
// Middlewares
// =====================================================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID']
}));
app.use(express.json());

// Middleware para extraer Telegram-ID y verificar admin
app.use((req, res, next) => {
  // Obtener Telegram-ID de donde sea que venga
  req.telegramId = req.headers['telegram-id'] || 
                   req.query.tgid || 
                   req.body.telegramId;
  
  // Verificar si es admin
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  req.isAdmin = req.telegramId && adminIds.includes(req.telegramId.toString());
  
  next();
});

// Middleware de administrador
const isAdmin = (req, res, next) => {
  if (!req.telegramId) {
    return res.status(401).json({ error: 'Se requiere Telegram-ID' });
  }
  
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }
  
  next();
};

// =====================================================================
// Rutas básicas
// =====================================================================
app.get('/', (req, res) => {
  res.send('Backend Nexus Store funcionando correctamente');
});

app.get('/api/admin/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    supabaseConnected: !!process.env.SUPABASE_URL
  });
});

app.get('/api/admin/ids', (req, res) => {
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  res.json(adminIds);
});

// =====================================================================
// Rutas de productos
// =====================================================================
app.get('/api/products/:type', async (req, res) => {
  const { type } = req.params;
  
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, type, name, description, details, prices, images, 
        has_color_variant, colors, required_fields, date_created,
        categories!inner(name)
      `)
      .eq('type', type);
    
    if (error) throw error;

    const result = {};
    products.forEach(product => {
      const categoryName = product.categories.name;
      if (!result[categoryName]) result[categoryName] = [];
      result[categoryName].push({
        ...product,
        category: categoryName
      });
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

app.get('/api/products/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories!inner(name)')
      .eq('type', type)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (product) {
      res.json({
        ...product,
        category: product.categories.name
      });
    } else {
      res.status(404).json({ error: 'Producto no encontrado' });
    }
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

// =====================================================================
// Rutas de carrito
// =====================================================================
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  
  // Verificar que el usuario accede a su propio carrito
  if (req.telegramId !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  try {
    const { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    res.json({
      userId,
      items: cart?.items || []
    });
  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({ error: 'Error obteniendo carrito' });
  }
});

app.post('/api/cart/add', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  
  // Verificar que el usuario modifica su propio carrito
  if (req.telegramId !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  try {
    let { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    let items = cart?.items || [];
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
      const { data: updatedCart, error } = await supabase
        .from('carts')
        .update({ items })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ userId, items: updatedCart.items });
    } else {
      const { data: newCart, error } = await supabase
        .from('carts')
        .insert([{ user_id: userId, items }])
        .select()
        .single();
      
      if (error) throw error;
      res.json({ userId, items: newCart.items });
    }
  } catch (error) {
    console.error('Error añadiendo al carrito:', error);
    res.status(500).json({ error: 'Error añadiendo al carrito' });
  }
});

app.post('/api/cart/remove', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  
  // Verificar que el usuario modifica su propio carrito
  if (req.telegramId !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  try {
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      throw cartError;
    }
    
    let items = cart.items;
    const initialLength = items.length;
    items = items.filter(item => 
      !(item.productId == productId && item.tabType === tabType)
    );
    
    if (items.length === initialLength) {
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    const { data: updatedCart, error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ userId, items: updatedCart.items });
  } catch (error) {
    console.error('Error removiendo del carrito:', error);
    res.status(500).json({ error: 'Error removiendo del carrito' });
  }
});

app.post('/api/cart/update', async (req, res) => {
  const { userId, productId, tabType, quantity } = req.body;
  
  // Verificar que el usuario modifica su propio carrito
  if (req.telegramId !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  if (quantity < 1) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }
  
  try {
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      throw cartError;
    }
    
    let items = cart.items;
    const itemIndex = items.findIndex(item => 
      item.productId == productId && item.tabType === tabType
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    items[itemIndex].quantity = quantity;
    
    const { data: updatedCart, error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ userId, items: updatedCart.items });
  } catch (error) {
    console.error('Error actualizando carrito:', error);
    res.status(500).json({ error: 'Error actualizando carrito' });
  }
});

app.post('/api/cart/clear/:userId', async (req, res) => {
  const { userId } = req.params;
  
  // Verificar que el usuario modifica su propio carrito
  if (req.telegramId !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  try {
    const { error, count } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    
    if (count > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Carrito no encontrado' });
    }
  } catch (error) {
    console.error('Error vaciando carrito:', error);
    res.status(500).json({ error: 'Error vaciando carrito' });
  }
});

// =====================================================================
// Checkout
// =====================================================================
app.post('/api/checkout', async (req, res) => {
  const { userId, paymentMethod, transferData, recipient, requiredFields } = req.body;
  
  // Verificar que el usuario está haciendo checkout de su propio carrito
  if (req.telegramId !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Obtener carrito
    const cartRes = await client.query(
      'SELECT items FROM carts WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    if (!cartRes.rows.length || !cartRes.rows[0].items) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }
    
    const items = cartRes.rows[0].items;
    let total = 0;
    const orderItems = [];
    
    // 2. Procesar cada item
    for (const item of items) {
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
    const orderRes = await client.query(
      `INSERT INTO orders (id, user_id, total, status)
       VALUES ($1, $2, $3, 'Pendiente')
       RETURNING *`,
      [orderId, userId, total]
    );
    const order = orderRes.rows[0];
    
    // 4. Añadir items a la orden
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
    await client.query(
      `INSERT INTO order_details 
       (order_id, payment_method, transfer_data, recipient_data, required_fields)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        paymentMethod,
        JSON.stringify(transferData),
        JSON.stringify(recipient),
        JSON.stringify(requiredFields)
      ]
    );
    
    // 6. Vaciar carrito
    await client.query(
      'DELETE FROM carts WHERE user_id = $1',
      [userId]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      orderId,
      total,
      order
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en checkout:', error);
    res.status(500).json({ error: 'Error en checkout: ' + error.message });
  } finally {
    client.release();
  }
});

// =====================================================================
// Rutas de administración
// =====================================================================

// Obtener todas las categorías
app.get('/api/admin/categories', isAdmin, async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*');
    
    if (error) throw error;
    res.json(categories);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
});

// Crear nueva categoría
app.post('/api/admin/categories', isAdmin, async (req, res) => {
  const { type, name } = req.body;
  
  if (!type || !name) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  try {
    const { data: existingCategory, error: existError } = await supabase
      .from('categories')
      .select('id')
      .eq('type', type)
      .eq('name', name);
    
    if (existError) throw existError;
    
    if (existingCategory && existingCategory.length > 0) {
      return res.status(400).json({ 
        error: 'La categoría ya existe',
        existingId: existingCategory[0].id
      });
    }
    
    const { data, error } = await supabase
      .from('categories')
      .insert([{ type, name }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// Eliminar categoría
app.delete('/api/admin/categories/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { error, count } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    if (count === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({ error: 'Error eliminando categoría' });
  }
});

// Crear nuevo producto
app.post('/api/admin/products', isAdmin, async (req, res) => {
  const { type, categoryId, product } = req.body;
  
  if (!type || !categoryId || !product) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  try {
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();
    
    if (categoryError || !category) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }
    
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
      }])
      .select()
      .single();
    
    if (error) throw error;
    res.json({
      id: data.id,
      ...product
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

// Obtener todos los productos (para admin)
app.get('/api/admin/products', isAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (id, name)
      `);
    
    if (error) throw error;
    
    const formattedProducts = products.map(product => ({
      ...product,
      category: product.categories ? product.categories.name : 'Sin categoría'
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

// Eliminar producto
app.delete('/api/admin/products/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { error, count } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    if (count === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

// Obtener categorías por tipo
app.get('/api/categories/:type', async (req, res) => {
  const { type } = req.params;
  
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', type);
    
    if (error) throw error;
    res.json(categories);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
});

// Obtener pedidos de usuario
app.get('/api/orders/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  // Verificar que el usuario accede a sus propios pedidos
  if (req.telegramId !== userId) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        status,
        created_at,
        updated_at,
        order_details (payment_method, transfer_data, recipient_data, required_fields),
        order_items (product_name, quantity, price, image_url, tab_type)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const parsedOrders = orders.map(order => ({
      id: order.id,
      userId,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      payment: {
        method: order.order_details[0]?.payment_method,
        ...order.order_details[0]?.transfer_data
      },
      recipient: order.order_details[0]?.recipient_data,
      requiredFields: order.order_details[0]?.required_fields,
      items: order.order_items
    }));
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error obteniendo pedidos' });
  }
});

// Obtener todos los pedidos (para admin)
app.get('/api/admin/orders', isAdmin, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total,
        status,
        created_at,
        updated_at,
        order_details (payment_method, transfer_data, recipient_data, required_fields),
        order_items (product_name, quantity, price, image_url, tab_type)
      `);
    
    if (error) throw error;
    
    const parsedOrders = orders.map(order => ({
      id: order.id,
      userId: order.user_id,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      payment: {
        method: order.order_details[0]?.payment_method,
        ...order.order_details[0]?.transfer_data
      },
      recipient: order.order_details[0]?.recipient_data,
      requiredFields: order.order_details[0]?.required_fields,
      items: order.order_items
    }));
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('Error obteniendo pedidos para admin:', error);
    res.status(500).json({ error: 'Error obteniendo pedidos' });
  }
});

// Actualizar estado de pedido
app.put('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  try {
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) throw error;
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error actualizando orden:', error);
    res.status(500).json({ error: 'Error actualizando orden' });
  }
});

// =====================================================================
// Bot de Telegram
// =====================================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en: http://localhost:${PORT}`);
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('🤖 Bot de Telegram iniciado');
    
    const ADMIN_IDS = process.env.ADMIN_IDS 
      ? process.env.ADMIN_IDS.split(',').map(Number) 
      : [];
    
    const getFrontendUrl = () => {
      return process.env.FRONTEND_URL || 'https://tu-frontend.onrender.com';
    };
    
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const webAppUrl = `${getFrontendUrl()}/?tgid=${userId}`;
      
      const promoMessage = `🌟 <b>¡BIENVENIDO A NEXUS STORE!</b> 🌟`;
      
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
      
      if (ADMIN_IDS.includes(userId) && text === '/admin') {
        const webAppUrl = `${getFrontendUrl()}/?tgid=${userId}`;
        bot.sendMessage(chatId, '👑 <b>ACCESO DE ADMINISTRADOR HABILITADO</b> 👑', {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{
              text: "⚙️ ABRIR PANEL ADMIN",
              web_app: { url: webAppUrl }
            }]]
          }
        });
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
        bot.sendMessage(chatId, '🎉 <b>¡PEDIDO CONFIRMADO!</b> 🎉', { parse_mode: 'HTML' });
      }
    });
  }
});

console.log('===========================================');
console.log('🚀 Sistema completamente inicializado 🚀');
console.log('===========================================');

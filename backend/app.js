import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import TelegramBot from 'node-telegram-bot-api';

const app = express();
const PORT = process.env.PORT || 10000;

console.log(`🚀 Iniciando servidor en el puerto ${PORT}`);
console.log(`👑 Admin IDs: ${process.env.ADMIN_IDS}`);
console.log(`🤖 Token de bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'Configurado' : 'FALTANTE'}`);
console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

// Configuración de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configuración de PostgreSQL directa
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

// Verificar conexión a Supabase
(async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Conexión a Supabase verificada correctamente');
  } catch (error) {
    console.error('❌ Error verificando conexión a Supabase:', error.message);
  }
})();

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
app.get('/api/products/:type', async (req, res) => {
  const { type } = req.params;
  try {
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
    
    if (error) throw error;
    
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
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/products/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        categories!inner(name)
      `)
      .eq('type', type)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (product) {
      const parsedProduct = {
        ...product,
        category: product.categories.name
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
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/add', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  try {
    // Obtener carrito existente
    let { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    let items = [];
    if (cart) {
      items = cart.items;
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
      const { error } = await supabase
        .from('carts')
        .update({ items })
        .eq('user_id', userId);
      
      if (error) throw error;
      res.json({ userId, items });
    } else {
      // Crear nuevo carrito
      const { error } = await supabase
        .from('carts')
        .insert([{ user_id: userId, items }]);
      
      if (error) throw error;
      res.json({ userId, items });
    }
  } catch (error) {
    console.error('Error añadiendo al carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/remove', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  try {
    // Obtener carrito
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
    
    // Actualizar carrito
    const { error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId);
    
    if (error) throw error;
    res.json({ userId, items });
  } catch (error) {
    console.error('Error removiendo del carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/update', async (req, res) => {
  const { userId, productId, tabType, quantity } = req.body;
  
  if (quantity < 1) {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }
  
  try {
    // Obtener carrito
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
    
    // Actualizar carrito
    const { error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId);
    
    if (error) throw error;
    res.json({ userId, items });
  } catch (error) {
    console.error('Error actualizando carrito:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/cart/clear/:userId', async (req, res) => {
  const { userId } = req.params;
  
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Checkout
app.post('/api/checkout', async (req, res) => {
  const { userId, paymentMethod, transferData, recipientData, requiredFields } = req.body;
  
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
    await client.query(
      `INSERT INTO orders (id, user_id, total, status)
       VALUES ($1, $2, $3, 'Pendiente')`,
      [orderId, userId, total]
    );
    
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
        JSON.stringify(recipientData),
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
      message: 'Compra realizada con éxito' 
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en checkout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// Administración
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
        order_details!inner(payment_method, transfer_data, recipient_data, required_fields),
        order_items!inner(product_name, quantity, price, image_url, tab_type)
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
        method: order.order_details.payment_method,
        ...order.order_details.transfer_data
      },
      recipient: order.order_details.recipient_data,
      requiredFields: order.order_details.required_fields,
      items: order.order_items
    }));
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  try {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando orden:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CORRECCIÓN: Manejo de categorías
app.get('/api/admin/categories', isAdmin, async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*');
    
    if (error) throw error;
    
    res.json(categories);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/admin/products', isAdmin, async (req, res) => {
  const { type, categoryId, product } = req.body;
  
  try {
    // Verificar que la categoría existe
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();
    
    if (categoryError || !category) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }
    
    // Crear producto
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
    
    if (error) throw error;
    
    res.json({
      id: data[0].id,
      ...product
    });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CORRECCIÓN: Manejo de categorías
app.post('/api/admin/categories', isAdmin, async (req, res) => {
  const { type, name } = req.body;
  
  if (!type || !name) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ type, name }]);
    
    if (error) {
      if (error.code === '23505') { // Violación de unique constraint
        return res.status(400).json({ error: 'La categoría ya existe' });
      }
      throw error;
    }
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Usuarios
app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (user) {
      res.json({
        ...user,
        data: user.profile_data
      });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.put('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const userData = req.body;
  
  try {
    const { error } = await supabase
      .from('users')
      .upsert({ 
        id: userId, 
        profile_data: userData 
      });
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Órdenes de usuario
app.get('/api/orders/user/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
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
    
    if (error) throw error;
    
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

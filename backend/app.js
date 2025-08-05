import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import TelegramBot from 'node-telegram-bot-api';
import fileUpload from 'express-fileupload';
import ImageKit from 'imagekit';

// Configuración inicial
console.log('🚀 ===== INICIANDO BACKEND NEXUS STORE =====');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuración de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configuración de ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID']
}));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  abortOnLimit: true
}));

app.use((req, res, next) => {
  req.telegramId = req.headers['telegram-id'] || 
                   req.query.tgid || 
                   req.body.telegramId;
  next();
});

// Middleware de administrador
const isAdmin = (req, res, next) => {
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  if (!req.telegramId) return res.status(401).json({ error: 'Se requiere Telegram-ID' });
  if (!adminIds.includes(req.telegramId.toString())) return res.status(403).json({ error: 'Acceso no autorizado' });
  next();
};

// Rutas básicas
app.get('/', (req, res) => res.send('Backend Nexus Store funcionando'));
app.get('/api/admin/health', (req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date(),
  supabaseConnected: !!process.env.SUPABASE_URL
}));
app.get('/api/admin/ids', (req, res) => {
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  res.json(adminIds);
});

// Ruta para subir imágenes
app.post('/api/upload-image', isAdmin, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    const imageFile = req.files.image;
    
    // Validar tipo y tamaño de imagen
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ error: 'Formato inválido. Use JPG, PNG o WEBP' });
    }
    
    if (imageFile.size > maxSize) {
      return res.status(400).json({ 
        error: `Imagen demasiado grande (${(imageFile.size/1024/1024).toFixed(1)}MB). Máx: 5MB` 
      });
    }

    // Subir a ImageKit
    const uploadResponse = await imagekit.upload({
      file: imageFile.data,
      fileName: imageFile.name,
      useUniqueFileName: true
    });

    res.json({ url: uploadResponse.url });
  } catch (error) {
    console.error('Error subiendo imagen:', error);
    res.status(500).json({ error: 'Error subiendo imagen' });
  }
});

// Checkout actualizado para manejar FormData
app.post('/api/checkout', async (req, res) => {
  console.log('[CHECKOUT] Iniciando proceso de checkout');
  
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No se subió el comprobante de pago' });
    }

    const imageFile = req.files.image;
    const { 
      userId, 
      paymentMethod, 
      fullName,
      ci,
      phone,
      address,
      province,
      recipientName,
      recipientCi,
      recipientPhone,
      requiredFields,
      total // Total calculado desde el frontend
    } = req.body;

    if (!userId || !paymentMethod || !total) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    // 1. Subir comprobante de pago
    console.log('[CHECKOUT] Subiendo comprobante de pago...');
    const uploadResponse = await imagekit.upload({
      file: imageFile.data,
      fileName: `comprobante_${Date.now()}_${imageFile.name}`,
      useUniqueFileName: true
    });
    const transferProofUrl = uploadResponse.url;

    // 2. Preparar datos del pedido
    const transferData = { 
      transferProof: transferProofUrl, 
      transferId: `TRF-${Date.now()}` 
    };

    const recipientData = {};
    if (recipientName && recipientCi && recipientPhone) {
      recipientData.fullName = recipientName;
      recipientData.ci = recipientCi;
      recipientData.phone = recipientPhone;
    }

    const userData = { fullName, ci, phone, address, province };
    
    // Procesar campos requeridos
    const parsedRequiredFields = {};
    if (requiredFields) {
      try {
        const fields = JSON.parse(requiredFields);
        Object.entries(fields).forEach(([key, value]) => {
          parsedRequiredFields[key] = value;
        });
      } catch (e) {
        console.error('Error parsing required fields', e);
      }
    }

    // 3. Obtener carrito
    console.log('[CHECKOUT] Obteniendo carrito...');
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError || !cart) {
      console.error('[CHECKOUT] Error obteniendo carrito:', cartError);
      return res.status(400).json({ error: 'Carrito no encontrado' });
    }
    
    const items = cart.items;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }

    // 4. Obtener productos
    console.log('[CHECKOUT] Obteniendo productos...');
    const productIds = items.map(item => item.productId);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, prices, images, tab_type')
      .in('id', productIds);
    
    if (productsError) {
      console.error('[CHECKOUT] Error obteniendo productos:', productsError);
      return res.status(400).json({ error: 'Error obteniendo productos' });
    }
    
    if (!products || products.length === 0) {
      return res.status(400).json({ error: 'No se encontraron productos' });
    }

    // 5. Preparar items del pedido con precios correctos
    console.log('[CHECKOUT] Preparando items del pedido...');
    const orderItems = [];
    const productMap = {};
    products.forEach(product => productMap[product.id] = product);
    
    items.forEach(item => {
      const product = productMap[item.productId];
      if (product) {
        // Usar el precio correspondiente al método de pago
        let price = 0;
        if (paymentMethod === 'BPA' || paymentMethod === 'BANDEC') {
          price = product.prices['CUP'] || 0;
        } else if (paymentMethod === 'MLC') {
          price = product.prices['MLC'] || 0;
        } else if (paymentMethod === 'Saldo Móvil') {
          price = product.prices['Saldo Móvil'] || 0;
        }
        
        orderItems.push({
          product_id: item.productId,
          product_name: product.name,
          quantity: item.quantity,
          price: price,
          tab_type: product.tab_type,
          image_url: product.images?.[0] || null
        });
      }
    });

    // 6. Crear orden con el total real
    console.log('[CHECKOUT] Creando orden...');
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const orderData = {
      id: orderId,
      user_id: userId,
      total: parseFloat(total), // Usamos el total real
      status: 'Pendiente',
      user_data: userData
    };
    
    await supabase.from('orders').insert([orderData]);

    // 7. Guardar detalles
    console.log('[CHECKOUT] Guardando detalles...');
    await supabase.from('order_details').insert([{
      order_id: orderId,
      payment_method: paymentMethod,
      transfer_data: transferData,
      recipient_data: recipientData,
      required_fields: parsedRequiredFields
    }]);

    // 8. Guardar items
    console.log('[CHECKOUT] Guardando items...');
    await supabase.from('order_items').insert(
      orderItems.map(item => ({ ...item, order_id: orderId }))
    );

    // 9. Vaciar carrito
    console.log('[CHECKOUT] Vaciando carrito...');
    await supabase.from('carts').delete().eq('user_id', userId);

    console.log(`[CHECKOUT] Orden ${orderId} creada exitosamente`);
    res.json({ success: true, orderId, total });
    
  } catch (error) {
    console.error('[CHECKOUT] Error crítico:', error);
    res.status(500).json({ 
      error: 'Error en checkout', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Rutas de productos
app.get('/api/products/:type', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, type, name, description, details, prices, images, 
        has_color_variant, colors, required_fields, date_created,
        categories!inner(name)
      `)
      .eq('type', req.params.type);
    
    if (error) throw error;

    const result = {};
    products.forEach(product => {
      const categoryName = product.categories.name;
      if (!result[categoryName]) result[categoryName] = [];
      result[categoryName].push({ ...product, category: categoryName });
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

app.get('/api/products/:type/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories!inner(name)')
      .eq('type', req.params.type)
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json({ ...product, category: product.categories.name });
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

// Rutas de carrito
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', req.params.userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ userId: req.params.userId, items: cart?.items || [] });
  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({ error: 'Error obteniendo carrito' });
  }
});

app.post('/api/cart/add', async (req, res) => {
  try {
    const { userId, productId, tabType } = req.body;
    let { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    let items = cart?.items || [];
    const existingItemIndex = items.findIndex(item => item.productId == productId && item.tabType === tabType);
    
    if (existingItemIndex !== -1) items[existingItemIndex].quantity += 1;
    else items.push({ productId, tabType, quantity: 1, addedAt: new Date().toISOString() });
    
    const { data: updatedCart, error: upsertError } = await supabase
      .from('carts')
      .upsert({ user_id: userId, items, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (upsertError) throw upsertError;
    res.json({ userId, items: updatedCart.items });
  } catch (error) {
    console.error('Error añadiendo al carrito:', error);
    res.status(500).json({ error: 'Error añadiendo al carrito' });
  }
});

app.post('/api/cart/remove', async (req, res) => {
  try {
    const { userId, productId, tabType } = req.body;
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') return res.status(404).json({ error: 'Carrito no encontrado' });
      throw cartError;
    }
    
    let items = cart.items;
    const initialLength = items.length;
    items = items.filter(item => !(item.productId == productId && item.tabType === tabType));
    
    if (items.length === initialLength) return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    
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
  try {
    const { userId, productId, tabType, quantity } = req.body;
    if (quantity < 1) return res.status(400).json({ error: 'Cantidad inválida' });
    
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') return res.status(404).json({ error: 'Carrito no encontrado' });
      throw cartError;
    }
    
    let items = cart.items;
    const itemIndex = items.findIndex(item => item.productId == productId && item.tabType === tabType);
    
    if (itemIndex === -1) return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    
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
  try {
    const { error, count } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', req.params.userId);
    
    if (error) throw error;
    if (count > 0) res.json({ success: true });
    else res.status(404).json({ error: 'Carrito no encontrado' });
  } catch (error) {
    console.error('Error vaciando carrito:', error);
    res.status(500).json({ error: 'Error vaciando carrito' });
  }
});

// Rutas de administración
app.get('/api/admin/categories', isAdmin, async (req, res) => {
  try {
    const { data: categories, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    res.json(categories);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
});

app.post('/api/admin/categories', isAdmin, async (req, res) => {
  try {
    const { type, name } = req.body;
    if (!type || !name) return res.status(400).json({ error: 'Faltan datos requeridos' });
    
    const { data: existingCategory, error: existError } = await supabase
      .from('categories')
      .select('id')
      .eq('type', type)
      .eq('name', name);
    
    if (existError) throw existError;
    if (existingCategory && existingCategory.length > 0) return res.status(400).json({ error: 'La categoría ya existe' });
    
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

app.delete('/api/admin/categories/:id', isAdmin, async (req, res) => {
  try {
    const { error, count } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    if (count === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({ error: 'Error eliminando categoría' });
  }
});

app.post('/api/admin/products', isAdmin, async (req, res) => {
  try {
    const { type, categoryId, product } = req.body;
    if (!type || !categoryId || !product) return res.status(400).json({ error: 'Faltan datos requeridos' });
    
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();
    
    if (categoryError || !category) return res.status(400).json({ error: 'Categoría inválida' });
    
    // Generar ID único para el producto
    const productId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Preparar datos para Supabase - incluyendo tab_type
    const productData = {
      id: productId,
      type,
      category_id: categoryId,
      name: product.name,
      description: product.description,
      details: product.details || null,
      prices: product.prices,
      images: product.images || [],
      has_color_variant: product.has_color_variant || false,
      colors: product.colors || null,
      required_fields: product.required_fields || null,
      date_created: new Date().toISOString(),
      tab_type: type  // Añadimos el campo tab_type
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) {
      console.error('Error Supabase:', error);
      throw error;
    }
    
    res.status(201).json({ id: data.id, ...product });
  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({ 
      error: 'Error creando producto',
      message: error.message,
      details: error.details || null
    });
  }
});

app.get('/api/admin/products', isAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories (id, name)');
    
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

app.delete('/api/admin/products/:id', isAdmin, async (req, res) => {
  try {
    const { error, count } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    if (count === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

app.get('/api/categories/:type', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', req.params.type);
    
    if (error) throw error;
    res.json(categories);
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
});

// Rutas de pedidos
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        status,
        created_at,
        updated_at,
        user_data,
        order_details:order_details!inner (payment_method, transfer_data, recipient_data, required_fields),
        order_items:order_items!inner (product_name, quantity, price, image_url, tab_type)
      `)
      .eq('user_id', req.params.userId);
    
    if (error) throw error;
    
    const parsedOrders = orders.map(order => ({
      id: order.id,
      userId: req.params.userId,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      userData: order.user_data,
      payment: {
        method: order.order_details[0].payment_method,
        ...order.order_details[0].transfer_data
      },
      recipient: order.order_details[0].recipient_data,
      requiredFields: order.order_details[0].required_fields,
      items: order.order_items
    }));
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error obteniendo pedidos', details: error.message });
  }
});

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
        user_data,
        order_details:order_details!inner (payment_method, transfer_data, recipient_data, required_fields),
        order_items:order_items!inner (product_name, quantity, price, image_url, tab_type)
      `);
    
    if (error) throw error;
    
    const parsedOrders = orders.map(order => ({
      id: order.id,
      userId: order.user_id,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      userData: order.user_data,
      payment: {
        method: order.order_details[0].payment_method,
        ...order.order_details[0].transfer_data
      },
      recipient: order.order_details[0].recipient_data,
      requiredFields: order.order_details[0].required_fields,
      items: order.order_items
    }));
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('Error obteniendo pedidos para admin:', error);
    res.status(500).json({ error: 'Error obteniendo pedidos', details: error.message });
  }
});

app.get('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        total,
        status,
        created_at,
        updated_at,
        user_data,
        order_details:order_details!inner (payment_method, transfer_data, recipient_data, required_fields),
        order_items:order_items!inner (product_name, quantity, price, image_url, tab_type)
      `)
      .eq('id', req.params.orderId)
      .single();
    
    if (error) throw error;
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    
    const parsedOrder = {
      id: order.id,
      userId: order.user_id,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      userData: order.user_data,
      payment: {
        method: order.order_details[0].payment_method,
        ...order.order_details[0].transfer_data
      },
      recipient: order.order_details[0].recipient_data,
      requiredFields: order.order_details[0].required_fields,
      items: order.order_items
    };
    
    res.json(parsedOrder);
  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({ error: 'Error obteniendo pedido', details: error.message });
  }
});

app.put('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  try {
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ 
        status: req.body.status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', req.params.orderId)
      .select()
      .single();
    
    if (error) throw error;
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error actualizando orden:', error);
    res.status(500).json({ error: 'Error actualizando orden' });
  }
});

// ===== Keep-Alive: Ping automático cada 5 minutos (solo si hay token de Telegram) =====
if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

  // Ping automático para mantener activo el bot y el servidor
  setInterval(() => {
    const date = new Date();
    console.log(`[Keep-Alive] Ping realizado a las ${date.toLocaleTimeString()}`);
    
    // Opcional: Enviar un mensaje a un chat de admin (para verificar que el bot sigue vivo)
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Añade esta variable a tu .env si quieres notificaciones
    if (ADMIN_CHAT_ID) {
      bot.sendMessage(ADMIN_CHAT_ID, `🔄 Bot activo (${date.toLocaleTimeString()})`).catch(console.error);
    }
  }, 5 * 60 * 1000); // 5 minutos

  console.log('⏳ Keep-Alive configurado para el bot de Telegram');
}

// Bot de Telegram
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en: http://localhost:${PORT}`);
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('🤖 Bot de Telegram iniciado');
    
    const ADMIN_IDS = process.env.ADMIN_IDS 
      ? process.env.ADMIN_IDS.split(',').map(Number) 
      : [];
    
    const getFrontendUrl = () => process.env.FRONTEND_URL || 'https://tu-frontend.onrender.com';
    
    bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const webAppUrl = `${getFrontendUrl()}/?tgid=${userId}`;
      
      const promoMessage = `🌟 <b>¡BIENVENIDO A NEXUS STORE!</b> 🌟`;
      
      const keyboard = {
        inline_keyboard: [[{ text: "🚀 ABRIR TIENDA AHORA", web_app: { url: webAppUrl } }]]
      };
      
      bot.sendMessage(chatId, promoMessage, { parse_mode: 'HTML', reply_markup: keyboard });
    });
    
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text || '';
      
      if (ADMIN_IDS.includes(userId) && text === '/admin') {
        const webAppUrl = `${getFrontendUrl()}/?tgid=${userId}`;
        bot.sendMessage(chatId, '👑 <b>ACCESO DE ADMINISTRADOR HABILITADO</b> 👑', {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: "⚙️ ABRIR PANEL ADMIN", web_app: { url: webAppUrl } }]] }
        });
      } else if (text === '/admin') {
        bot.sendMessage(chatId, '❌ <b>No tienes permisos de administrador</b>', { parse_mode: 'HTML' });
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

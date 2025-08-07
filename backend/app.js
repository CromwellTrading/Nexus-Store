import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import TelegramBot from 'node-telegram-bot-api';
import fileUpload from 'express-fileupload';
import ImageKit from 'imagekit';

console.log('🚀 ===== INICIANDO BACKEND NEXUS STORE =====');
console.log('🕒 Hora de inicio:', new Date().toISOString());
console.log('🔌 Conectando a Supabase...');

const app = express();
const PORT = process.env.PORT || 10000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
console.log('✅ Supabase conectado');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});
console.log('🖼️ ImageKit configurado');

console.log('🛠️ Configurando middlewares...');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true
}));

app.use((req, res, next) => {
  req.telegramId = req.headers['telegram-id'] || 
                   req.query.tgid || 
                   req.body.telegramId;
  console.log(`📩 Petición recibida: ${req.method} ${req.path} | Usuario: ${req.telegramId || 'No identificado'}`);
  next();
});

const isAdmin = (req, res, next) => {
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  if (!req.telegramId) {
    console.log('🔒 Intento de acceso sin Telegram-ID');
    return res.status(401).json({ error: 'Se requiere Telegram-ID' });
  }
  
  if (!adminIds.includes(req.telegramId.toString())) {
    console.log(`⛔ Acceso no autorizado desde ID: ${req.telegramId}`);
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }
  
  console.log(`👑 Acceso admin autorizado para ID: ${req.telegramId}`);
  next();
};

app.get('/', (req, res) => {
  console.log('🏠 Petición a endpoint raíz');
  res.send('Backend Nexus Store funcionando');
});

app.get('/api/admin/health', (req, res) => {
  console.log('🩺 Verificación de salud del servidor');
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    supabaseConnected: !!process.env.SUPABASE_URL,
    imagekitConfigured: !!process.env.IMAGEKIT_PUBLIC_KEY
  });
});

app.get('/api/admin/ids', (req, res) => {
  console.log('🆔 IDs de admin solicitadas');
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  res.json(adminIds);
});

app.get('/api/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`👤 GET perfil solicitado para usuario: ${userId}`);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('profile_data, admin_phone, admin_cards')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`❌ Error obteniendo perfil: ${error.message}`);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const profileData = {
      ...(data.profile_data || {}),
      adminPhone: data.admin_phone || null,
      adminCards: data.admin_cards || {
        bpa: "",
        bandec: "",
        mlc: ""
      }
    };

    console.log(`✅ Perfil obtenido para ${userId}`);
    res.json(profileData);
  } catch (error) {
    console.error('💥 Error en GET /api/users/:userId:', {
      error: error.message,
      userId
    });
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

app.put('/api/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  const profileData = req.body;
  console.log(`✏️ PUT perfil solicitado para usuario: ${userId}`, profileData);

  try {
    const adminPhone = profileData.adminPhone || null;
    const adminCards = profileData.adminCards || {
      bpa: "",
      bandec: "",
      mlc: ""
    };

    const cleanProfileData = { ...profileData };
    delete cleanProfileData.adminPhone;
    delete cleanProfileData.adminCards;

    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        profile_data: cleanProfileData,
        admin_phone: adminPhone,
        admin_cards: adminCards,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    
    const responseData = {
      ...(data.profile_data || {}),
      adminPhone: data.admin_phone,
      adminCards: data.admin_cards
    };

    console.log(`✅ Perfil guardado para ${userId}`);
    res.json(responseData);
  } catch (error) {
    console.error('💥 Error en PUT /api/users/:userId:', {
      error: error.message,
      userId,
      profileData
    });
    res.status(500).json({ 
      error: 'Error guardando perfil',
      details: error.message 
    });
  }
});

app.post('/api/upload-image', isAdmin, async (req, res) => {
  console.log('🖼️ Solicitud de subida de imagen recibida');
  
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    const imageFile = req.files.image;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    
    if (!validTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ error: 'Formato inválido. Use JPG, PNG o WEBP' });
    }
    
    if (imageFile.size > maxSize) {
      return res.status(400).json({ 
        error: `Imagen demasiado grande (${(imageFile.size/1024/1024).toFixed(1)}MB). Máx: 5MB` 
      });
    }

    const uploadResponse = await imagekit.upload({
      file: imageFile.data,
      fileName: imageFile.name,
      useUniqueFileName: true
    });

    res.json({ url: uploadResponse.url });
  } catch (error) {
    console.error('💥 Error subiendo imagen:', error);
    res.status(500).json({ error: 'Error subiendo imagen' });
  }
});

app.get('/api/cart/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`🛒 GET carrito para usuario: ${userId}`);
  
  try {
    const { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    const items = cart?.items || [];
    res.json({ userId, items });
  } catch (error) {
    console.error('💥 Error en GET /api/cart/:userId:', error);
    res.status(500).json({ error: 'Error obteniendo carrito' });
  }
});

app.post('/api/cart/add', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  
  try {
    let { data: cart } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
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
    
    const { data: updatedCart, error } = await supabase
      .from('carts')
      .upsert({ user_id: userId, items }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) throw error;
    res.json({ userId, items: updatedCart.items });
  } catch (error) {
    console.error('💥 Error en POST /api/cart/add:', error);
    res.status(500).json({ error: 'Error añadiendo al carrito' });
  }
});

app.post('/api/cart/remove', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  
  try {
    const { data: cart } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' });
    
    let items = cart.items;
    items = items.filter(item => 
      !(item.productId == productId && item.tabType === tabType)
    );
    
    const { data: updatedCart, error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    res.json({ userId, items: updatedCart.items });
  } catch (error) {
    console.error('💥 Error en POST /api/cart/remove:', error);
    res.status(500).json({ error: 'Error removiendo del carrito' });
  }
});

app.post('/api/cart/update', async (req, res) => {
  const { userId, productId, tabType, quantity } = req.body;
  
  try {
    const { data: cart } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (!cart) return res.status(404).json({ error: 'Carrito no encontrado' });
    
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
    console.error('💥 Error en POST /api/cart/update:', error);
    res.status(500).json({ error: 'Error actualizando carrito' });
  }
});

app.post('/api/cart/clear/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('💥 Error en POST /api/cart/clear/:userId:', error);
    res.status(500).json({ error: 'Error vaciando carrito' });
  }
});

app.get('/api/products/:type', async (req, res) => {
  const type = req.params.type;
  
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, type, name, description, details, prices, images, 
        has_color_variant, colors, required_fields, date_created,
        categories:category_id!inner(name)
      `)
      .eq('type', type);
    
    if (error) throw error;

    const result = {};
    products.forEach(product => {
      const categoryName = product.categories.name;
      if (!result[categoryName]) result[categoryName] = [];
      result[categoryName].push({ ...product, category: categoryName });
    });
    
    res.json(result);
  } catch (error) {
    console.error('💥 Error en GET /api/products/:type:', error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

app.get('/api/products/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories:category_id!inner(name)')
      .eq('type', type)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      throw error;
    }

    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ...product, category: product.categories.name });
  } catch (error) {
    console.error('💥 Error en GET /api/products/:type/:id:', error);
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

app.get('/api/admin/categories', isAdmin, async (req, res) => {
  try {
    const { data: categories, error } = await supabase.from('categories').select('*');
    if (error) throw error;
    res.json(categories);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/categories:', error);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
});

app.post('/api/admin/categories', isAdmin, async (req, res) => {
  const { type, name } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ type, name }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('💥 Error en POST /api/admin/categories:', error);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

app.delete('/api/admin/categories/:id', isAdmin, async (req, res) => {
  const categoryId = req.params.id;
  
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('💥 Error en DELETE /api/admin/categories/:id:', error);
    res.status(500).json({ error: 'Error eliminando categoría' });
  }
});

app.post('/api/admin/products', isAdmin, async (req, res) => {
  const { type, categoryId, product } = req.body;

  if (!type || !categoryId || !product) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  
  try {
    const productId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
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
      date_created: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json({ id: data.id, ...product });
  } catch (error) {
    console.error('💥 Error en POST /api/admin/products:', error);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

app.get('/api/admin/products/:id', isAdmin, async (req, res) => {
  const productId = req.params.id;
  
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories:category_id (id, name)')
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      throw error;
    }

    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    
    const formattedProduct = {
      ...product,
      category: product.categories ? product.categories.name : 'Sin categoría'
    };
    
    res.json(formattedProduct);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/products/:id:', error);
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

app.put('/api/admin/products/:id', isAdmin, async (req, res) => {
  const productId = req.params.id;
  const { type, categoryId, product } = req.body;

  try {
    const { data, error } = await supabase
      .from('products')
      .update({
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
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('💥 Error en PUT /api/admin/products/:id:', error);
    res.status(500).json({ error: 'Error actualizando producto' });
  }
});

app.get('/api/admin/products', isAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories:category_id (id, name)');
    
    if (error) throw error;
    
    const formattedProducts = products.map(product => ({
      ...product,
      category: product.categories ? product.categories.name : 'Sin categoría'
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/products:', error);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

app.delete('/api/admin/products/:id', isAdmin, async (req, res) => {
  const productId = req.params.id;
  
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('💥 Error en DELETE /api/admin/products/:id:', error);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

app.get('/api/categories/:type', async (req, res) => {
  const type = req.params.type;
  
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', type);
    
    if (error) throw error;
    res.json(categories);
  } catch (error) {
    console.error('💥 Error en GET /api/categories/:type:', error);
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
});

// ==================================================
// Rutas de pedidos (CORREGIDAS)
// ==================================================

app.get('/api/orders/user/:userId', async (req, res) => {
  const userId = req.params.userId;
  
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
        order_details:order_details (payment_method, transfer_data, recipient_data, required_fields),
        order_items:order_items (product_name, quantity, price, image_url, tab_type)
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const parsedOrders = orders.map(order => {
      const orderDetail = order.order_details && order.order_details.length > 0 
        ? order.order_details[0] 
        : null;
      
      return {
        id: order.id,
        userId,
        total: order.total,
        status: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        userData: order.user_data,
        payment: orderDetail ? {
          method: orderDetail.payment_method,
          ...(orderDetail.transfer_data || {})
        } : null,
        recipient: orderDetail ? orderDetail.recipient_data : null,
        requiredFields: orderDetail ? orderDetail.required_fields : null,
        items: order.order_items || []
      };
    });
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('💥 Error en GET /api/orders/user/:userId:', error);
    res.status(500).json({ error: 'Error obteniendo pedidos' });
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
        order_details:order_details (payment_method, transfer_data, recipient_data, required_fields),
        order_items:order_items (product_name, quantity, price, image_url, tab_type)
      `);
    
    if (error) throw error;
    
    const parsedOrders = orders.map(order => {
      const orderDetail = order.order_details && order.order_details.length > 0 
        ? order.order_details[0] 
        : null;
      
      return {
        id: order.id,
        userId: order.user_id,
        total: order.total,
        status: order.status,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        userData: order.user_data,
        payment: orderDetail ? {
          method: orderDetail.payment_method,
          ...(orderDetail.transfer_data || {})
        } : null,
        recipient: orderDetail ? orderDetail.recipient_data : null,
        requiredFields: orderDetail ? orderDetail.required_fields : null,
        items: order.order_items || []
      };
    });
    
    res.json(parsedOrders);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/orders:', error);
    res.status(500).json({ error: 'Error obteniendo pedidos' });
  }
});

app.get('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  const orderId = req.params.orderId;
  
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
        order_details:order_details (payment_method, transfer_data, recipient_data, required_fields),
        order_items:order_items (product_name, quantity, price, image_url, tab_type)
      `)
      .eq('id', orderId)
      .single();
    
    if (error) throw error;
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    
    const orderDetail = order.order_details && order.order_details.length > 0 
      ? order.order_details[0] 
      : null;
    
    const parsedOrder = {
      id: order.id,
      userId: order.user_id,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      userData: order.user_data,
      payment: orderDetail ? {
        method: orderDetail.payment_method,
        ...(orderDetail.transfer_data || {})
      } : null,
      recipient: orderDetail ? orderDetail.recipient_data : null,
      requiredFields: orderDetail ? orderDetail.required_fields : null,
      items: order.order_items || []
    };
    
    res.json(parsedOrder);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/orders/:orderId:', error);
    res.status(500).json({ error: 'Error obteniendo pedido' });
  }
});

app.put('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  const orderId = req.params.orderId;
  const { status } = req.body;
  
  try {
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) throw error;
    res.json(updatedOrder);
  } catch (error) {
    console.error('💥 Error en PUT /api/admin/orders/:orderId:', error);
    res.status(500).json({ error: 'Error actualizando orden' });
  }
});

app.post('/api/checkout', async (req, res) => {
  console.log('🛒 Procesando pedido...');
  
  try {
    const userId = req.headers['telegram-id'];
    if (!userId) {
      return res.status(401).json({ error: 'No se pudo identificar el usuario' });
    }

    const formData = req.body;
    const imageFile = req.files?.image;
    
    if (!formData.paymentMethod || !formData.total) {
      return res.status(400).json({ error: 'Faltan datos esenciales' });
    }

    if (formData.paymentMethod !== 'Saldo Móvil' && !imageFile) {
      return res.status(400).json({ error: 'Se requiere comprobante de transferencia' });
    }

    let proofUrl = '';
    if (imageFile) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024;
      
      if (!validTypes.includes(imageFile.mimetype)) {
        return res.status(400).json({ error: 'Formato de imagen inválido' });
      }
      
      if (imageFile.size > maxSize) {
        return res.status(400).json({ 
          error: `Imagen demasiado grande (${(imageFile.size/1024/1024).toFixed(1)}MB)` 
        });
      }

      const uploadResponse = await imagekit.upload({
        file: imageFile.data,
        fileName: `transfer_${Date.now()}.${imageFile.name.split('.').pop()}`,
        useUniqueFileName: true
      });
      proofUrl = uploadResponse.url;
    }

    const orderId = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const orderData = {
      id: orderId,
      user_id: userId,
      total: parseFloat(formData.total),
      status: 'Pendiente',
      user_data: {
        fullName: formData.fullName,
        ci: formData.ci,
        phone: formData.phone,
        address: formData.address,
        province: formData.province
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
    
    if (orderError) throw orderError;

    const paymentDetails = {
      order_id: orderId,
      payment_method: formData.paymentMethod,
      transfer_data: {
        proof_url: proofUrl
      },
      recipient_data: formData.recipientName ? {
        name: formData.recipientName,
        ci: formData.recipientCi,
        phone: formData.recipientPhone
      } : null,
      required_fields: formData.requiredFields ? JSON.parse(formData.requiredFields) : {}
    };

    const { error: detailsError } = await supabase
      .from('order_details')
      .insert([paymentDetails]);
    
    if (detailsError) throw detailsError;

    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) throw cartError;

    const orderItems = [];
    for (const item of cart.items) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, prices, images')
        .eq('id', item.productId)
        .single();
      
      if (productError) throw productError;

      let price;
      if (formData.paymentMethod === 'MLC') {
        price = product.prices.MLC || 0;
      } else if (formData.paymentMethod === 'Saldo Móvil') {
        price = product.prices['Saldo Móvil'] || 0;
      } else {
        price = product.prices.CUP || 0;
      }

      orderItems.push({
        order_id: orderId,
        product_id: item.productId,
        product_name: product.name,
        quantity: item.quantity,
        price: price,
        image_url: product.images[0] || '',
        tab_type: item.tabType
      });
    }

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;

    await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);

    console.log(`✅ Pedido ${orderId} creado exitosamente`);
    res.json({ orderId, status: 'Pendiente', total: formData.total, proofUrl });
    
  } catch (error) {
    console.error('💥 Error en POST /api/checkout:', error);
    res.status(500).json({ error: 'Error procesando pedido', details: error.message });
  }
});

if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('⏳ Configurando Keep-Alive...');

  setInterval(() => {
    const date = new Date();
    console.log(`🔄 Keep-Alive ping a las ${date.toLocaleTimeString()}`);
    
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
    if (ADMIN_CHAT_ID) {
      bot.sendMessage(ADMIN_CHAT_ID, `🔄 Bot activo (${date.toLocaleTimeString()})`)
        .catch(err => console.error('❌ Error enviando Keep-Alive:', err));
    }
  }, 5 * 60 * 1000);
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en: http://localhost:${PORT}`);
  console.log('🛜 Endpoints disponibles:');
  console.log(`- GET /api/products/:type`);
  console.log(`- GET /api/products/:type/:id`);
  console.log(`- PUT /api/admin/products/:id`);
  console.log(`- GET /api/admin/products/:id`);
  console.log(`- POST /api/checkout`);
  console.log(`- GET /api/orders/user/:userId`);
  
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
      
      const promoMessage = `🌟 <b>💎𝘽𝙄𝙀𝙉𝙑𝙀𝙉𝙄𝘿𝙊𝙎 𝘼 𝙉𝙀𝙓𝙐𝙎 𝙎𝙃𝙊𝙋💎</b> 🌟`;
      
      const keyboard = {
        inline_keyboard: [[{ text: "🚀 ABRIR TIENDA AHORA", web_app: { url: webAppUrl } }]]
      };
      
      bot.sendMessage(chatId, promoMessage, { parse_mode: 'HTML', reply_markup: keyboard });
    });
  }
});

console.log('===========================================');
console.log('🚀 Sistema completamente inicializado 🚀');
console.log('===========================================');
console.log('🕒 Hora actual:', new Date().toISOString());

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
console.log('🕒 Hora de inicio:', new Date().toISOString());
console.log('🔌 Conectando a Supabase...');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuración de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
console.log('✅ Supabase conectado');

// Configuración de ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});
console.log('🖼️ ImageKit configurado');

// Middlewares
console.log('🛠️ Configurando middlewares...');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-ID']
}));
app.use(express.json());
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

// Middleware de administrador
const isAdmin = (req, res, next) => {
  const adminIds = process.env.ADMIN_IDS 
    ? process.env.ADMIN_IDS.split(',').map(id => id.trim())
    : [];
  
  if (req.path.startsWith('/api/users/')) {
    console.log('🔓 Ruta pública de usuario, acceso permitido');
    return next();
  }

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

// Rutas básicas
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

// ==================================================
// Rutas de perfil de usuario (MODIFICADAS PARA SOPORTAR ADMINCARDS)
// ==================================================

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

    // Combinar los campos en un solo objeto de perfil
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
    // Extraer campos específicos para almacenamiento separado
    const adminPhone = profileData.adminPhone || null;
    const adminCards = profileData.adminCards || {
      bpa: "",
      bandec: "",
      mlc: ""
    };

    // Eliminar campos específicos para evitar duplicación
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

    if (error) {
      console.error(`❌ Error guardando perfil: ${error.message}`);
      throw error;
    }
    
    // Construir respuesta combinando todos los campos
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

// Ruta para subir imágenes
app.post('/api/upload-image', isAdmin, async (req, res) => {
  console.log('🖼️ Solicitud de subida de imagen recibida');
  
  try {
    if (!req.files || !req.files.image) {
      console.log('⚠️ No se recibió archivo de imagen');
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    const imageFile = req.files.image;
    console.log(`📄 Archivo recibido: ${imageFile.name} (${imageFile.size} bytes)`);
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    
    if (!validTypes.includes(imageFile.mimetype)) {
      console.log(`⚠️ Formato inválido: ${imageFile.mimetype}`);
      return res.status(400).json({ error: 'Formato inválido. Use JPG, PNG o WEBP' });
    }
    
    if (imageFile.size > maxSize) {
      console.log(`⚠️ Archivo demasiado grande: ${(imageFile.size/1024/1024).toFixed(1)}MB`);
      return res.status(400).json({ 
        error: `Imagen demasiado grande (${(imageFile.size/1024/1024).toFixed(1)}MB). Máx: 5MB` 
      });
    }

    console.log('☁️ Subiendo a ImageKit...');
    const uploadResponse = await imagekit.upload({
      file: imageFile.data,
      fileName: imageFile.name,
      useUniqueFileName: true
    });

    console.log('✅ Imagen subida correctamente:', uploadResponse.url);
    res.json({ url: uploadResponse.url });
  } catch (error) {
    console.error('💥 Error subiendo imagen:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Error subiendo imagen' });
  }
});

// ==================================================
// Rutas de carrito con logs detallados
// ==================================================

app.get('/api/cart/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`🛒 GET carrito solicitado para usuario: ${userId}`);
  
  try {
    console.log(`🔍 Buscando carrito en Supabase para usuario ${userId}...`);
    const { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error(`❌ Error Supabase al obtener carrito: ${error.message}`);
      throw error;
    }
    
    const items = cart?.items || [];
    console.log(`📦 Carrito obtenido con ${items.length} items`);
    
    res.json({ userId, items });
  } catch (error) {
    console.error('💥 Error en GET /api/cart/:userId:', {
      error: error.message,
      stack: error.stack,
      userId
    });
    res.status(500).json({ 
      error: 'Error obteniendo carrito',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/cart/add', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  console.log(`➕ ADD al carrito - Usuario: ${userId}, Producto: ${productId}, Tab: ${tabType}`);
  
  try {
    console.log('🔍 Verificando carrito existente...');
    let { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error al obtener carrito existente:', error);
      throw error;
    }
    
    let items = cart?.items || [];
    const existingItemIndex = items.findIndex(item => 
      item.productId == productId && item.tabType === tabType
    );
    
    if (existingItemIndex !== -1) {
      items[existingItemIndex].quantity += 1;
      console.log(`🔄 Producto existente, nueva cantidad: ${items[existingItemIndex].quantity}`);
    } else {
      items.push({ 
        productId, 
        tabType, 
        quantity: 1, 
        addedAt: new Date().toISOString() 
      });
      console.log('🆕 Nuevo producto añadido al carrito');
    }
    
    console.log('💾 Guardando carrito actualizado...');
    const { data: updatedCart, error: upsertError } = await supabase
      .from('carts')
      .upsert({ 
        user_id: userId, 
        items, 
        updated_at: new Date().toISOString() 
      }, { 
        onConflict: 'user_id' 
      })
      .select()
      .single();
    
    if (upsertError) {
      console.error('❌ Error al guardar carrito:', upsertError);
      throw upsertError;
    }
    
    console.log('✅ Carrito actualizado con éxito');
    res.json({ 
      userId, 
      items: updatedCart.items 
    });
  } catch (error) {
    console.error('💥 Error en POST /api/cart/add:', {
      error: error.message,
      userId,
      productId,
      tabType
    });
    res.status(500).json({ 
      error: 'Error añadiendo al carrito',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/cart/remove', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  console.log(`➖ REMOVE del carrito - Usuario: ${userId}, Producto: ${productId}, Tab: ${tabType}`);
  
  try {
    console.log('🔍 Obteniendo carrito actual...');
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') {
        console.log('⚠️ Carrito no encontrado');
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      console.error('❌ Error al obtener carrito:', cartError);
      throw cartError;
    }
    
    let items = cart.items;
    const initialLength = items.length;
    items = items.filter(item => 
      !(item.productId == productId && item.tabType === tabType)
    );
    
    if (items.length === initialLength) {
      console.log('⚠️ Producto no encontrado en el carrito');
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    console.log('💾 Actualizando carrito...');
    const { data: updatedCart, error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error al actualizar carrito:', error);
      throw error;
    }
    
    console.log('✅ Producto eliminado del carrito');
    res.json({ 
      userId, 
      items: updatedCart.items 
    });
  } catch (error) {
    console.error('💥 Error en POST /api/cart/remove:', {
      error: error.message,
      userId,
      productId,
      tabType
    });
    res.status(500).json({ 
      error: 'Error removiendo del carrito',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/cart/update', async (req, res) => {
  const { userId, productId, tabType, quantity } = req.body;
  console.log(`🔄 UPDATE cantidad - Usuario: ${userId}, Producto: ${productId}, Cantidad: ${quantity}`);
  
  try {
    if (quantity < 1) {
      console.log('⚠️ Cantidad inválida recibida');
      return res.status(400).json({ error: 'Cantidad inválida' });
    }
    
    console.log('🔍 Obteniendo carrito actual...');
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') {
        console.log('⚠️ Carrito no encontrado');
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      console.error('❌ Error al obtener carrito:', cartError);
      throw cartError;
    }
    
    let items = cart.items;
    const itemIndex = items.findIndex(item => 
      item.productId == productId && item.tabType === tabType
    );
    
    if (itemIndex === -1) {
      console.log('⚠️ Producto no encontrado en el carrito');
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    console.log(`🔄 Actualizando cantidad de ${items[itemIndex].quantity} a ${quantity}`);
    items[itemIndex].quantity = quantity;
    
    console.log('💾 Guardando cambios...');
    const { data: updatedCart, error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error al actualizar carrito:', error);
      throw error;
    }
    
    console.log('✅ Cantidad actualizada con éxito');
    res.json({ 
      userId, 
      items: updatedCart.items 
    });
  } catch (error) {
    console.error('💥 Error en POST /api/cart/update:', {
      error: error.message,
      userId,
      productId,
      tabType,
      quantity
    });
    res.status(500).json({ 
      error: 'Error actualizando carrito',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/cart/clear/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`🧹 CLEAR carrito solicitado para usuario: ${userId}`);
  
  try {
    console.log('🗑️ Eliminando carrito...');
    const { error, count } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Error al vaciar carrito:', error);
      throw error;
    }
    
    if (count > 0) {
      console.log('✅ Carrito vaciado con éxito');
    } else {
      console.log('⚠️ Carrito no encontrado');
    }
    res.json({ success: true });
  } catch (error) {
    console.error('💥 Error en POST /api/cart/clear/:userId:', {
      error: error.message,
      userId
    });
    res.status(500).json({ 
      error: 'Error vaciando carrito',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================================================
// Rutas de productos
// ==================================================

app.get('/api/products/:type', async (req, res) => {
  const type = req.params.type;
  console.log(`📦 GET productos solicitados - Tipo: ${type}`);
  
  try {
    console.log(`🔍 Buscando productos de tipo ${type} en Supabase...`);
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id, type, name, description, details, prices, images, 
        has_color_variant, colors, required_fields, date_created,
        categories!inner(name)
      `)
      .eq('type', type);
    
    if (error) {
      console.error('❌ Error al obtener productos:', error);
      throw error;
    }

    const result = {};
    products.forEach(product => {
      const categoryName = product.categories.name;
      if (!result[categoryName]) result[categoryName] = [];
      result[categoryName].push({ ...product, category: categoryName });
    });
    
    console.log(`✅ Encontrados ${products.length} productos en ${Object.keys(result).length} categorías`);
    res.json(result);
  } catch (error) {
    console.error('💥 Error en GET /api/products/:type:', {
      error: error.message,
      type
    });
    res.status(500).json({ 
      error: 'Error obteniendo productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/products/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  console.log(`🔍 GET producto detallado - Tipo: ${type}, ID: ${id}`);
  
  try {
    console.log('Buscando producto en Supabase...');
    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories!inner(name)')
      .eq('type', type)
      .eq('id', id)
      .single();
    
    if (error) {
      // Manejar específicamente el caso de "0 filas"
      if (error.code === 'PGRST116') {
        console.log(`⚠️ Producto no encontrado: ${type}/${id}`);
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      console.error('❌ Error al obtener producto:', error);
      throw error;
    }

    if (!product) {
      console.log('⚠️ Producto no encontrado');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    console.log('✅ Producto encontrado');
    res.json({ ...product, category: product.categories.name });
  } catch (error) {
    console.error('💥 Error en GET /api/products/:type/:id:', {
      error: error.message,
      type,
      id
    });
    res.status(500).json({ 
      error: 'Error obteniendo producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================================================
// Rutas de administración
// ==================================================

app.get('/api/admin/categories', isAdmin, async (req, res) => {
  console.log('📚 GET categorías solicitadas (admin)');
  
  try {
    console.log('🔍 Obteniendo categorías de Supabase...');
    const { data: categories, error } = await supabase.from('categories').select('*');
    
    if (error) {
      console.error('❌ Error al obtener categorías:', error);
      throw error;
    }
    
    console.log(`✅ ${categories.length} categorías encontradas`);
    res.json(categories);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/categories:', error);
    res.status(500).json({ 
      error: 'Error obteniendo categorías',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/admin/categories', isAdmin, async (req, res) => {
  const { type, name } = req.body;
  console.log(`➕ POST nueva categoría - Tipo: ${type}, Nombre: ${name}`);
  
  try {
    if (!type || !name) {
      console.log('⚠️ Faltan parámetros requeridos');
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    console.log('🔍 Verificando si la categoría ya existe...');
    const { data: existingCategory, error: existError } = await supabase
      .from('categories')
      .select('id')
      .eq('type', type)
      .eq('name', name);
    
    if (existError) {
      console.error('❌ Error al verificar categoría existente:', existError);
      throw existError;
    }
    
    if (existingCategory && existingCategory.length > 0) {
      console.log('⚠️ La categoría ya existe');
      return res.status(400).json({ error: 'La categoría ya existe' });
    }
    
    console.log('➕ Creando nueva categoría...');
    const { data, error } = await supabase
      .from('categories')
      .insert([{ type, name }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error al crear categoría:', error);
      throw error;
    }
    
    console.log('✅ Categoría creada con éxito');
    res.status(201).json(data);
  } catch (error) {
    console.error('💥 Error en POST /api/admin/categories:', {
      error: error.message,
      type,
      name
    });
    res.status(500).json({ 
      error: 'Error al crear categoría',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.delete('/api/admin/categories/:id', isAdmin, async (req, res) => {
  const categoryId = req.params.id;
  console.log(`🗑️ DELETE categoría solicitada - ID: ${categoryId}`);
  
  try {
    console.log('Eliminando categoría...');
    const { error, count } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);
    
    if (error) {
      console.error('❌ Error al eliminar categoría:', error);
      throw error;
    }
    
    if (count === 0) {
      console.log('⚠️ Categoría no encontrada');
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    console.log('✅ Categoría eliminada con éxito');
    res.json({ success: true });
  } catch (error) {
    console.error('💥 Error en DELETE /api/admin/categories/:id:', {
      error: error.message,
      categoryId
    });
    res.status(500).json({ 
      error: 'Error eliminando categoría',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/admin/products', isAdmin, async (req, res) => {
  const { type, categoryId, product } = req.body;
  console.log(`➕ POST nuevo producto - Tipo: ${type}, Categoría: ${categoryId}`);
  
  try {
    if (!type || !categoryId || !product) {
      console.log('⚠️ Faltan parámetros requeridos');
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    console.log('🔍 Verificando categoría...');
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();
    
    if (categoryError || !category) {
      console.error('❌ Categoría inválida:', categoryError);
      return res.status(400).json({ error: 'Categoría inválida' });
    }
    
    const productId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    console.log(`🆕 ID de producto generado: ${productId}`);
    
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
      tab_type: type
    };

    console.log('💾 Guardando producto en Supabase...');
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error Supabase:', error);
      throw error;
    }
    
    console.log('✅ Producto creado con éxito');
    res.status(201).json({ id: data.id, ...product });
  } catch (error) {
    console.error('💥 Error en POST /api/admin/products:', {
      error: error.message,
      type,
      categoryId,
      product
    });
    res.status(500).json({ 
      error: 'Error creando producto',
      message: error.message,
      details: error.details || null
    });
  }
});

// Ruta para actualizar productos (EDITAR)
app.put('/api/admin/products/:id', isAdmin, async (req, res) => {
  const productId = req.params.id;
  const { type, categoryId, product } = req.body;
  console.log(`✏️ PUT actualizar producto - ID: ${productId}, Tipo: ${type}`);

  try {
    // Verificar que la categoría existe
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .single();
    
    if (categoryError || !category) {
      console.error('❌ Categoría inválida:', categoryError);
      return res.status(400).json({ error: 'Categoría inválida' });
    }

    // Actualizar el producto
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

    if (error) {
      console.error('❌ Error al actualizar producto:', error);
      throw error;
    }
    
    console.log('✅ Producto actualizado con éxito');
    res.json(data);
  } catch (error) {
    console.error('💥 Error en PUT /api/admin/products/:id:', {
      error: error.message,
      productId,
      product
    });
    res.status(500).json({ 
      error: 'Error actualizando producto',
      details: error.message 
    });
  }
});

app.get('/api/admin/products', isAdmin, async (req, res) => {
  console.log('📦 GET todos los productos (admin)');
  
  try {
    console.log('🔍 Obteniendo productos de Supabase...');
    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories (id, name)');
    
    if (error) {
      console.error('❌ Error al obtener productos:', error);
      throw error;
    }
    
    const formattedProducts = products.map(product => ({
      ...product,
      category: product.categories ? product.categories.name : 'Sin categoría'
    }));
    
    console.log(`✅ ${formattedProducts.length} productos encontrados`);
    res.json(formattedProducts);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/products:', error);
    res.status(500).json({ 
      error: 'Error obteniendo productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.delete('/api/admin/products/:id', isAdmin, async (req, res) => {
  const productId = req.params.id;
  console.log(`🗑️ DELETE producto solicitado - ID: ${productId}`);
  
  try {
    console.log('Eliminando producto...');
    const { error, count } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      console.error('❌ Error al eliminar producto:', error);
      throw error;
    }
    
    if (count === 0) {
      console.log('⚠️ Producto no encontrado');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    console.log('✅ Producto eliminado con éxito');
    res.json({ success: true });
  } catch (error) {
    console.error('💥 Error en DELETE /api/admin/products/:id:', {
      error: error.message,
      productId
    });
    res.status(500).json({ 
      error: 'Error eliminando producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/categories/:type', async (req, res) => {
  const type = req.params.type;
  console.log(`📚 GET categorías por tipo - Tipo: ${type}`);
  
  try {
    console.log('🔍 Obteniendo categorías de Supabase...');
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('type', type);
    
    if (error) {
      console.error('❌ Error al obtener categorías:', error);
      throw error;
    }
    
    console.log(`✅ ${categories.length} categorías encontradas para tipo ${type}`);
    res.json(categories);
  } catch (error) {
    console.error('💥 Error en GET /api/categories/:type:', {
      error: error.message,
      type
    });
    res.status(500).json({ 
      error: 'Error obteniendo categorías',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================================================
// Rutas de pedidos
// ==================================================

app.get('/api/orders/user/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`📦 GET pedidos solicitados para usuario: ${userId}`);
  
  try {
    console.log('🔍 Buscando pedidos en Supabase...');
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
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Error al obtener pedidos:', error);
      throw error;
    }
    
    const parsedOrders = orders.map(order => ({
      id: order.id,
      userId,
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
    
    console.log(`✅ ${parsedOrders.length} pedidos encontrados`);
    res.json(parsedOrders);
  } catch (error) {
    console.error('💥 Error en GET /api/orders/user/:userId:', {
      error: error.message,
      userId
    });
    res.status(500).json({ 
      error: 'Error obteniendo pedidos', 
      details: error.message 
    });
  }
});

app.get('/api/admin/orders', isAdmin, async (req, res) => {
  console.log('📦 GET todos los pedidos (admin)');
  
  try {
    console.log('🔍 Buscando pedidos en Supabase...');
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
    
    if (error) {
      console.error('❌ Error al obtener pedidos:', error);
      throw error;
    }
    
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
    
    console.log(`✅ ${parsedOrders.length} pedidos encontrados`);
    res.json(parsedOrders);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/orders:', error);
    res.status(500).json({ 
      error: 'Error obteniendo pedidos', 
      details: error.message 
    });
  }
});

app.get('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  const orderId = req.params.orderId;
  console.log(`🔍 GET pedido detallado - ID: ${orderId}`);
  
  try {
    console.log('Buscando pedido en Supabase...');
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
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('❌ Error al obtener pedido:', error);
      throw error;
    }

    if (!order) {
      console.log('⚠️ Pedido no encontrado');
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
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
    
    console.log('✅ Pedido encontrado');
    res.json(parsedOrder);
  } catch (error) {
    console.error('💥 Error en GET /api/admin/orders/:orderId:', {
      error: error.message,
      orderId
    });
    res.status(500).json({ 
      error: 'Error obteniendo pedido', 
      details: error.message 
    });
  }
});

app.put('/api/admin/orders/:orderId', isAdmin, async (req, res) => {
  const orderId = req.params.orderId;
  const { status } = req.body;
  console.log(`✏️ PUT actualizar pedido - ID: ${orderId}, Nuevo estado: ${status}`);
  
  try {
    console.log('Actualizando estado del pedido...');
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ 
        status: status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error al actualizar pedido:', error);
      throw error;
    }
    
    console.log('✅ Estado del pedido actualizado');
    res.json(updatedOrder);
  } catch (error) {
    console.error('💥 Error en PUT /api/admin/orders/:orderId:', {
      error: error.message,
      orderId,
      status
    });
    res.status(500).json({ 
      error: 'Error actualizando orden',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================================================
// Keep-Alive: Ping automático cada 5 minutos
// ==================================================

if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('⏳ Configurando Keep-Alive para el bot de Telegram...');

  setInterval(() => {
    const date = new Date();
    console.log(`🔄 Keep-Alive ping a las ${date.toLocaleTimeString()}`);
    
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
    if (ADMIN_CHAT_ID) {
      bot.sendMessage(ADMIN_CHAT_ID, `🔄 Bot activo (${date.toLocaleTimeString()})`)
        .then(() => console.log('📩 Notificación de Keep-Alive enviada'))
        .catch(err => console.error('❌ Error enviando Keep-Alive:', err));
    }
  }, 5 * 60 * 1000);

  console.log('✅ Keep-Alive configurado');
}

// ==================================================
// Inicio del servidor
// ==================================================

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en: http://localhost:${PORT}`);
  console.log('🛜 Endpoints disponibles:');
  console.log(`- GET /api/cart/:userId`);
  console.log(`- POST /api/cart/add`);
  console.log(`- POST /api/cart/remove`);
  console.log(`- POST /api/cart/update`);
  console.log(`- POST /api/cart/clear/:userId`);
  console.log(`- POST /api/checkout`);
  console.log(`- GET /api/products/:type`);
  console.log(`- GET /api/products/:type/:id`);
  console.log(`- GET /api/orders/user/:userId`);
  console.log(`- GET /api/admin/orders`);
  console.log(`- GET /api/admin/orders/:orderId`);
  console.log(`- PUT /api/admin/orders/:orderId`);
  console.log(`- PUT /api/admin/products/:id`); // Nuevo endpoint para editar productos
  
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
      
      console.log(`👋 Comando /start recibido de usuario ${userId}`);
      
      const promoMessage = `🌟 <b>💎𝘽𝙄𝙀𝙉𝙑𝙀𝙉𝙄𝘿𝙊𝙎 𝘼 𝙉𝙀𝙓𝙐𝙎 𝙎𝙃𝙊𝙋💎

👾 𝐇𝐨𝐥𝐚, 𝐪𝐮𝐞𝐫𝐢𝐝𝐨 𝐣𝐮𝐠𝐚𝐝𝐨𝐫! 🎮  
¿𝐐𝐮𝐢𝐞𝐫𝐞𝐬 𝐫𝐞𝐜𝐚𝐫𝐠𝐚𝐫 𝐭𝐮 𝐣𝐮𝐞𝐠𝐨 𝐟𝐚𝐯𝐨𝐫𝐢𝐭𝐨? 🤔  
¡𝐄𝐧 𝐍𝐞𝐱𝐮𝐬 𝐒𝐡𝐨𝐩 𝐭𝐞 𝐟𝐚𝐜𝐢𝐥𝐢𝐭𝐚𝐦𝐨𝐬 𝐭𝐮𝐬 𝐜𝐨𝐦𝐩𝐫𝐚𝐬 𝐚𝐥 𝐚𝐥𝐜𝐚𝐧𝐜𝐞 𝐝𝐞 𝐮𝐧 𝐜𝐥𝐢𝐜! 🖱️✨

💰 𝐎𝐟𝐫𝐞𝐜𝐞𝐦𝐨𝐬:  
✅ 𝐋𝐨𝐬 𝐦𝐞𝐣𝐨𝐫𝐞𝐬 𝐩𝐫𝐞𝐜𝐢𝐨𝐬 💵  
✅ 𝐒𝐞𝐠𝐮𝐫𝐢𝐝𝐚𝐝 𝐞𝐧 𝐜𝐚𝐝𝐚 𝐜𝐨𝐦𝐩𝐫𝐚 🔒  
✅ 𝐑𝐚𝐩𝐢𝐝𝐞𝐳 𝐞𝐧 𝐞𝐥 𝐬𝐞𝐫𝐯𝐢𝐜𝐢𝐨 ⚡

¿𝐐𝐮é 𝐞𝐬𝐩𝐞𝐫𝐚𝐬? 🚀  
¡Ú𝐧𝐞𝐭𝐞 𝐚 𝐧𝐮𝐞𝐬𝐭𝐫𝐨 𝐠𝐫𝐮𝐩𝐨 𝐝𝐞 𝐯𝐞𝐧𝐭𝐚𝐬 𝐲 𝐧𝐨 𝐝𝐮𝐝𝐞𝐬 𝐞𝐧 𝐜𝐨𝐧𝐬𝐮𝐥𝐭𝐚𝐫 𝐧𝐮𝐞𝐬𝐭𝐫𝐨 𝐜𝐚𝐭á𝐥𝐨𝐠𝐨! 📚🛒

𝐍𝐨 𝐨𝐥𝐯𝐢𝐝𝐞𝐬 𝐠𝐮𝐚𝐫𝐝𝐚𝐫 𝐩𝐚𝐫𝐭𝐢𝐝𝐚 😉</b> 🌟`;
      
      const keyboard = {
        inline_keyboard: [[{ text: "🚀 ABRIR TIENDA AHORA", web_app: { url: webAppUrl } }]]
      };
      
      bot.sendMessage(chatId, promoMessage, { parse_mode: 'HTML', reply_markup: keyboard })
        .then(() => console.log(`📩 Mensaje de bienvenida enviado a ${userId}`))
        .catch(err => console.error('❌ Error al enviar mensaje:', err));
    });
    
    bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = msg.text || '';
      
      if (ADMIN_IDS.includes(userId) && text === '/admin') {
        console.log(`👑 Acceso admin solicitado por ${userId}`);
        const webAppUrl = `${getFrontendUrl()}/?tgid=${userId}`;
        bot.sendMessage(chatId, '👑 <b>ACCESO DE ADMINISTRADOR HABILITADO</b> 👑', {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [[{ text: "⚙️ ABRIR PANEL ADMIN", web_app: { url: webAppUrl } }]] }
        });
      } else if (text === '/admin') {
        console.log(`⛔ Intento de acceso admin no autorizado por ${userId}`);
        bot.sendMessage(chatId, '❌ <b>No tienes permisos de administrador</b>', { parse_mode: 'HTML' });
      }
    });
    
    bot.on('web_app_data', (msg) => {
      console.log('📲 Datos de WebApp recibidos');
      const chatId = msg.chat.id;
      const data = msg.web_app_data ? JSON.parse(msg.web_app_data.data) : null;
      if (data && data.command === 'new_order') {
        console.log(`🛍️ Nueva orden confirmada por usuario ${msg.from.id}`);
        bot.sendMessage(chatId, '🎉 <b>¡PEDIDO CONFIRMADO!</b> 🎉', { parse_mode: 'HTML' });
      }
    });
  }
});

console.log('===========================================');
console.log('🚀 Sistema completamente inicializado 🚀');
console.log('===========================================');
console.log('🕒 Hora actual:', new Date().toISOString());

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
  
  // Permitir acceso a rutas públicas (perfiles)
  if (req.path.startsWith('/api/users/')) {
    return next();
  }

  if (!req.telegramId) {
    console.log('[Admin] Intento de acceso sin Telegram-ID');
    return res.status(401).json({ error: 'Se requiere Telegram-ID' });
  }
  
  if (!adminIds.includes(req.telegramId.toString())) {
    console.log(`[Admin] Intento de acceso no autorizado desde ID: ${req.telegramId}`);
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }
  
  console.log(`[Admin] Acceso autorizado para admin ID: ${req.telegramId}`);
  next();
};

// Rutas básicas
app.get('/', (req, res) => {
  console.log('[Root] Solicitud recibida en endpoint raíz');
  res.send('Backend Nexus Store funcionando');
});

app.get('/api/admin/health', (req, res) => {
  console.log('[Health] Verificación de estado del servidor');
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    supabaseConnected: !!process.env.SUPABASE_URL
  });
});

// ==================================================
// Rutas de carrito con logs añadidos
// ==================================================

app.get('/api/cart/:userId', async (req, res) => {
  console.log(`[Cart] GET carrito para usuario: ${req.params.userId}`);
  
  try {
    const { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', req.params.userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error(`[Cart] Error al obtener carrito: ${error.message}`);
      throw error;
    }
    
    const items = cart?.items || [];
    console.log(`[Cart] Carrito obtenido con ${items.length} items`);
    
    res.json({ userId: req.params.userId, items });
  } catch (error) {
    console.error('[Cart] Error obteniendo carrito:', error);
    res.status(500).json({ error: 'Error obteniendo carrito' });
  }
});

app.post('/api/cart/add', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  console.log(`[Cart] ADD producto al carrito - Usuario: ${userId}, Producto: ${productId}, Tab: ${tabType}`);
  
  try {
    let { data: cart, error } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error(`[Cart] Error al obtener carrito: ${error.message}`);
      throw error;
    }
    
    let items = cart?.items || [];
    const existingItemIndex = items.findIndex(item => item.productId == productId && item.tabType === tabType);
    
    if (existingItemIndex !== -1) {
      items[existingItemIndex].quantity += 1;
      console.log(`[Cart] Incrementando cantidad del producto existente (ahora: ${items[existingItemIndex].quantity})`);
    } else {
      items.push({ productId, tabType, quantity: 1, addedAt: new Date().toISOString() });
      console.log('[Cart] Añadiendo nuevo producto al carrito');
    }
    
    const { data: updatedCart, error: upsertError } = await supabase
      .from('carts')
      .upsert({ user_id: userId, items, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (upsertError) {
      console.error(`[Cart] Error al actualizar carrito: ${upsertError.message}`);
      throw upsertError;
    }
    
    console.log(`[Cart] Carrito actualizado con éxito. Total items: ${updatedCart.items.length}`);
    res.json({ userId, items: updatedCart.items });
  } catch (error) {
    console.error('[Cart] Error añadiendo al carrito:', error);
    res.status(500).json({ error: 'Error añadiendo al carrito' });
  }
});

app.post('/api/cart/remove', async (req, res) => {
  const { userId, productId, tabType } = req.body;
  console.log(`[Cart] REMOVE producto del carrito - Usuario: ${userId}, Producto: ${productId}, Tab: ${tabType}`);
  
  try {
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') {
        console.log('[Cart] Carrito no encontrado para eliminar producto');
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      console.error(`[Cart] Error al obtener carrito: ${cartError.message}`);
      throw cartError;
    }
    
    let items = cart.items;
    const initialLength = items.length;
    items = items.filter(item => !(item.productId == productId && item.tabType === tabType));
    
    if (items.length === initialLength) {
      console.log('[Cart] Producto no encontrado en el carrito');
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    const { data: updatedCart, error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`[Cart] Error al actualizar carrito: ${error.message}`);
      throw error;
    }
    
    console.log(`[Cart] Producto eliminado. Items restantes: ${updatedCart.items.length}`);
    res.json({ userId, items: updatedCart.items });
  } catch (error) {
    console.error('[Cart] Error removiendo del carrito:', error);
    res.status(500).json({ error: 'Error removiendo del carrito' });
  }
});

app.post('/api/cart/update', async (req, res) => {
  const { userId, productId, tabType, quantity } = req.body;
  console.log(`[Cart] UPDATE cantidad producto - Usuario: ${userId}, Producto: ${productId}, Nueva cantidad: ${quantity}`);
  
  try {
    if (quantity < 1) {
      console.log('[Cart] Cantidad inválida recibida');
      return res.status(400).json({ error: 'Cantidad inválida' });
    }
    
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('items')
      .eq('user_id', userId)
      .single();
    
    if (cartError) {
      if (cartError.code === 'PGRST116') {
        console.log('[Cart] Carrito no encontrado para actualizar');
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      console.error(`[Cart] Error al obtener carrito: ${cartError.message}`);
      throw cartError;
    }
    
    let items = cart.items;
    const itemIndex = items.findIndex(item => item.productId == productId && item.tabType === tabType);
    
    if (itemIndex === -1) {
      console.log('[Cart] Producto no encontrado en el carrito para actualizar');
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }
    
    items[itemIndex].quantity = quantity;
    console.log(`[Cart] Actualizando cantidad del producto a ${quantity}`);
    
    const { data: updatedCart, error } = await supabase
      .from('carts')
      .update({ items })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error(`[Cart] Error al actualizar carrito: ${error.message}`);
      throw error;
    }
    
    console.log('[Cart] Cantidad actualizada con éxito');
    res.json({ userId, items: updatedCart.items });
  } catch (error) {
    console.error('[Cart] Error actualizando carrito:', error);
    res.status(500).json({ error: 'Error actualizando carrito' });
  }
});

app.post('/api/cart/clear/:userId', async (req, res) => {
  console.log(`[Cart] CLEAR carrito para usuario: ${req.params.userId}`);
  
  try {
    const { error, count } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', req.params.userId);
    
    if (error) {
      console.error(`[Cart] Error al vaciar carrito: ${error.message}`);
      throw error;
    }
    
    if (count > 0) {
      console.log('[Cart] Carrito vaciado con éxito');
      res.json({ success: true });
    } else {
      console.log('[Cart] Carrito no encontrado para vaciar');
      res.status(404).json({ error: 'Carrito no encontrado' });
    }
  } catch (error) {
    console.error('[Cart] Error vaciando carrito:', error);
    res.status(500).json({ error: 'Error vaciando carrito' });
  }
});

// ... (resto del código del app.js se mantiene igual)

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

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en: http://localhost:${PORT}`);
  
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('🤖 Bot de Telegram iniciado');
    
    // ... (resto del código de Telegram se mantiene igual)
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

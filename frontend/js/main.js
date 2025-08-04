document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.groupCollapsed('[MAIN] Iniciando inicialización controlada');
    
    // Lista de módulos esenciales
    const essentialModules = [
      'UserProfile', 'OrdersSystem', 'AdminSystem', 'Notifications', 
      'Themes', 'Tabs', 'ProductView', 'ProductModal', 
      'CartSystem', 'SearchFilter', 'CheckoutSystem'
    ];
    
    // Verificación detallada de módulos
    console.log('[MAIN] Verificación de módulos disponibles:');
    essentialModules.forEach(module => {
      const isAvailable = typeof window[module] !== 'undefined';
      console.log(`- ${module}:`, isAvailable ? '✅ Disponible' : '❌ No disponible');
      
      if (!isAvailable && module !== 'AdminSystem') {
        console.error(`CRÍTICO: ${module} no está disponible pero es requerido`);
      }
    });

    // 1. Inicialización de UserProfile
    try {
      console.group('[MAIN] Inicializando UserProfile...');
      if (typeof UserProfile !== 'undefined') {
        await UserProfile.init();
        console.log('✅ UserProfile inicializado correctamente');
      } else {
        throw new Error('UserProfile no está definido');
      }
    } catch (error) {
      console.error('❌ Fallo crítico en UserProfile:', error);
      throw error;
    } finally {
      console.groupEnd();
    }

    // 2. Inicialización de AdminSystem (opcional)
    try {
      console.group('[MAIN] Inicializando AdminSystem...');
      if (typeof AdminSystem !== 'undefined') {
        await AdminSystem.init();
        console.log('✅ AdminSystem inicializado correctamente');
      } else {
        console.warn('⚠️ AdminSystem no está disponible (normal para usuarios regulares)');
      }
    } catch (error) {
      console.error('⚠️ Error en AdminSystem (no crítico):', error);
    } finally {
      console.groupEnd();
    }

    // 3. Inicializar otros módulos esenciales
    const moduleInitializers = [
      { name: 'Notifications', method: 'init' },
      { name: 'Themes', method: 'init' },
      { name: 'Tabs', method: 'init' },
      { name: 'ProductView', method: 'init' },
      { name: 'ProductModal', method: 'init' },
      { name: 'CartSystem', method: 'init' },
      { name: 'SearchFilter', method: 'init' },
      { name: 'CheckoutSystem', method: 'init' }
    ];

    for (const module of moduleInitializers) {
      try {
        console.group(`[MAIN] Inicializando ${module.name}...`);
        
        if (typeof window[module.name] === 'undefined') {
          throw new Error(`Módulo no definido`);
        }
        
        if (typeof window[module.name][module.method] === 'function') {
          window[module.name][module.method]();
          console.log(`✅ ${module.name} inicializado correctamente`);
        } else {
          throw new Error(`Falta método ${module.method}()`);
        }
      } catch (error) {
        console.error(`❌ Error en ${module.name}:`, error);
      } finally {
        console.groupEnd();
      }
    }

    // 4. Inicializar OrdersSystem (depende de UserProfile)
    try {
      console.group('[MAIN] Inicializando OrdersSystem...');
      if (typeof OrdersSystem !== 'undefined') {
        await OrdersSystem.init();
        console.log('✅ OrdersSystem inicializado correctamente');
      } else {
        throw new Error('OrdersSystem no está definido');
      }
    } catch (error) {
      console.error('❌ Fallo crítico en OrdersSystem:', error);
      throw error;
    } finally {
      console.groupEnd();
    }

    // Configurar eventos
    console.group('[MAIN] Configurando event listeners...');
    setupEventListeners();
    console.log('✅ Event listeners configurados');
    console.groupEnd();

    console.log('🎉 Todos los módulos inicializados correctamente');
    console.groupEnd();
  } catch (error) {
    console.error('[MAIN] Error fatal durante inicialización:', error);
    console.groupEnd();
    
    // Mostrar notificación de error al usuario
    const errorMessage = `Error inicializando app: ${error.message}`;
    
    if (typeof Notifications !== 'undefined') {
      Notifications.showNotification('Error Fatal', errorMessage);
    } else {
      // Fallback básico
      alert(`ERROR CRÍTICO:\n${errorMessage}\n\nRecarga la página por favor.`);
      
      // Intentar reportar el error
      try {
        fetch(`${window.API_BASE_URL}/api/log-error`, {
          method: 'POST',
          body: JSON.stringify({
            error: error.message,
            stack: error.stack,
            location: window.location.href,
            modules: essentialModules.map(m => ({
              name: m,
              available: typeof window[m] !== 'undefined'
            }))
          })
        });
      } catch (err) {
        console.error('Error reportando error:', err);
      }
    }
  }
});

function setupEventListeners() {
  // Botón de perfil
  const profileButton = document.getElementById('profile-button');
  if (profileButton) {
    profileButton.addEventListener('click', function() {
      try {
        console.log("[CLICK] Botón perfil pulsado");
        
        if (typeof UserProfile !== 'undefined' && typeof UserProfile.openProfileModal === 'function') {
          UserProfile.openProfileModal();
        } else {
          console.error("UserProfile no está definido o no tiene openProfileModal");
          if (typeof Notifications !== 'undefined') {
            Notifications.showNotification('Error', 'No se pudo abrir el perfil');
          } else {
            alert('No se pudo abrir el perfil');
          }
        }
      } catch (error) {
        console.error("Error crítico en perfil:", error);
        alert(`Error abriendo perfil: ${error.message}`);
      }
    });
  } else {
    console.error("ERROR: No se encontró el botón de perfil");
  }
  
  // Botón de pedidos
  const ordersButton = document.getElementById('orders-button');
  if (ordersButton) {
    ordersButton.addEventListener('click', async function() {
      try {
        console.log("[CLICK] Botón pedidos pulsado");
        
        if (typeof OrdersSystem !== 'undefined' && typeof OrdersSystem.openOrdersModal === 'function') {
          await OrdersSystem.openOrdersModal();
          if (typeof Notifications !== 'undefined') {
            Notifications.notifications.forEach(n => n.read = true);
            Notifications.saveNotifications();
            Notifications.renderNotificationCount();
          }
        } else {
          console.error("OrdersSystem no está definido o no tiene openOrdersModal");
          if (typeof Notifications !== 'undefined') {
            Notifications.showNotification('Error', 'No se pudieron cargar los pedidos');
          } else {
            alert('No se pudieron cargar los pedidos');
          }
        }
      } catch (error) {
        console.error("Error crítico en pedidos:", error);
        alert(`Error abriendo pedidos: ${error.message}`);
      }
    });
  } else {
    console.error("ERROR: No se encontró el botón de pedidos");
  }
  
  // Botón de carrito
  const cartButton = document.getElementById('cart-button');
  if (cartButton) {
    cartButton.addEventListener('click', function() {
      try {
        console.log("[CLICK] Botón carrito pulsado");
        if (typeof CartSystem !== 'undefined' && typeof CartSystem.openCartModal === 'function') {
          CartSystem.openCartModal();
        } else {
          console.error("CartSystem no está definido o no tiene openCartModal");
          if (typeof Notifications !== 'undefined') {
            Notifications.showNotification('Error', 'No se pudo abrir el carrito');
          } else {
            alert('No se pudo abrir el carrito');
          }
        }
      } catch (error) {
        console.error("Error al abrir carrito:", error);
        alert(`Error abriendo carrito: ${error.message}`);
      }
    });
  } else {
    console.error("ERROR: No se encontró el botón de carrito");
  }
  
  // Cerrar modal al hacer clic fuera
  document.addEventListener('click', function(e) {
    const modal = document.getElementById('product-modal');
    if (e.target === modal) {
      modal.style.display = 'none';
      if (typeof CartSystem !== 'undefined') {
        CartSystem.isCartModalOpen = false;
      }
    }
  });
}

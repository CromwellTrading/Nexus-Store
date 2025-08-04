document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.groupCollapsed('[MAIN] Iniciando inicialización controlada');
    
    // 1. Verificación detallada de módulos
    console.log('[MAIN] Verificación de módulos disponibles:');
    const modules = [
      'UserProfile', 'OrdersSystem', 'AdminSystem', 'Notifications', 
      'Themes', 'Tabs', 'ProductView', 'ProductModal', 
      'CartSystem', 'SearchFilter', 'CheckoutSystem'
    ];
    
    modules.forEach(module => {
      console.log(`- ${module}:`, typeof window[module] !== 'undefined' ? '✅ Disponible' : '❌ No disponible');
    });

    // 2. Inicialización secuencial con logging detallado
    console.group('[MAIN] Inicializando UserProfile...');
    if (typeof UserProfile !== 'undefined') {
      await UserProfile.init();
      console.log('✅ UserProfile inicializado correctamente');
    } else {
      console.error('❌ ERROR: UserProfile no está definido');
      throw new Error('UserProfile no está definido');
    }
    console.groupEnd();

    console.group('[MAIN] Inicializando AdminSystem...');
    if (typeof AdminSystem !== 'undefined') {
      await AdminSystem.init();
      console.log('✅ AdminSystem inicializado correctamente');
    } else {
      console.warn('⚠️ AdminSystem no está definido (esto puede ser normal para usuarios no admin)');
    }
    console.groupEnd();

    // Inicializar otros módulos esenciales
    const essentialModules = [
      { name: 'Notifications', init: 'init' },
      { name: 'Themes', init: 'init' },
      { name: 'Tabs', init: 'init' },
      { name: 'ProductView', init: 'init' },
      { name: 'ProductModal', init: 'init' },
      { name: 'CartSystem', init: 'init' },
      { name: 'SearchFilter', init: 'init' },
      { name: 'CheckoutSystem', init: 'init' }
    ];

    for (const module of essentialModules) {
      console.group(`[MAIN] Inicializando ${module.name}...`);
      if (typeof window[module.name] !== 'undefined') {
        if (typeof window[module.name][module.init] === 'function') {
          window[module.name][module.init]();
          console.log(`✅ ${module.name} inicializado correctamente`);
        } else {
          console.error(`❌ ${module.name} no tiene método ${module.init}()`);
        }
      } else {
        console.error(`❌ ERROR: ${module.name} no está definido`);
      }
      console.groupEnd();
    }

    // Inicializar OrdersSystem después de UserProfile
    console.group('[MAIN] Inicializando OrdersSystem...');
    if (typeof OrdersSystem !== 'undefined') {
      await OrdersSystem.init();
      console.log('✅ OrdersSystem inicializado correctamente');
    } else {
      console.error('❌ ERROR: OrdersSystem no está definido');
    }
    console.groupEnd();

    // Configurar eventos
    console.group('[MAIN] Configurando event listeners...');
    setupEventListeners();
    console.log('✅ Event listeners configurados');
    console.groupEnd();

    console.log('🎉 Todos los módulos inicializados correctamente');
    console.groupEnd();
  } catch (error) {
    console.error('[MAIN] Error durante la inicialización:', error);
    
    // Mostrar notificación de error al usuario
    if (typeof Notifications !== 'undefined') {
      Notifications.showNotification('Error', 'Hubo un problema al cargar la aplicación');
    } else {
      alert('Error al cargar la aplicación: ' + error.message);
    }
  }
});

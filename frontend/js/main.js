document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.log("===== INICIO DE INICIALIZACIÓN CONTROLADA =====");
    
    // Lista de módulos esperados (solo para verificación en consola)
    const expectedModules = [
      'UserProfile', 'OrdersSystem', 'AdminSystem', 'Notifications',
      'Themes', 'Tabs', 'ProductView', 'ProductModal',
      'CartSystem', 'SearchFilter', 'CheckoutSystem'
    ];
    
    // Verificación silenciosa de módulos (solo log en consola)
    console.log("[DEBUG] Estado de módulos:");
    expectedModules.forEach(module => {
      console.log(`- ${module}: ${typeof window[module] !== 'undefined' ? '✅' : '❌'}`);
    });
    
    // 1. Inicializar UserProfile PRIMERO
    if (typeof UserProfile !== 'undefined') {
      console.log("Inicializando UserProfile...");
      try {
        await UserProfile.init();
        console.log("UserProfile inicializado correctamente");
      } catch (error) {
        console.error("ERROR en UserProfile.init():", error);
      }
    } else {
      console.error("ERROR: UserProfile no está definido");
    }
    
    // 2. Inicializar AdminSystem (requiere UserProfile)
    if (typeof AdminSystem !== 'undefined') {
      console.log("Inicializando AdminSystem...");
      try {
        await AdminSystem.init();
        console.log("AdminSystem inicializado correctamente");
      } catch (error) {
        console.error("ERROR en AdminSystem.init():", error);
      }
    } else {
      console.error("ERROR: AdminSystem no está definido");
    }
    
    // 3. Inicializar el resto de componentes
    if (typeof Notifications !== 'undefined') {
      console.log("Inicializando Notifications...");
      try {
        Notifications.init();
        console.log("Notifications inicializado correctamente");
      } catch (error) {
        console.error("ERROR en Notifications.init():", error);
      }
    } else {
      console.error("ERROR: Notifications no está definido");
    }
    
    if (typeof Themes !== 'undefined') {
      console.log("Inicializando Themes...");
      try {
        Themes.init();
        console.log("Themes inicializado correctamente");
      } catch (error) {
        console.error("ERROR en Themes.init():", error);
      }
    } else {
      console.error("ERROR: Themes no está definido");
    }
    
    if (typeof Tabs !== 'undefined') {
      console.log("Inicializando Tabs...");
      try {
        Tabs.init();
        console.log("Tabs inicializado correctamente");
      } catch (error) {
        console.error("ERROR en Tabs.init():", error);
      }
    } else {
      console.error("ERROR: Tabs no está definido");
    }
    
    if (typeof ProductView !== 'undefined') {
      console.log("Inicializando ProductView...");
      try {
        ProductView.init();
        ProductView.loadProducts(Tabs.currentTab);
        console.log("ProductView inicializado correctamente");
      } catch (error) {
        console.error("ERROR en ProductView.init():", error);
      }
    } else {
      console.error("ERROR: ProductView no está definido");
    }
    
    if (typeof ProductModal !== 'undefined') {
      console.log("Inicializando ProductModal...");
      try {
        ProductModal.init();
        console.log("ProductModal inicializado correctamente");
      } catch (error) {
        console.error("ERROR en ProductModal.init():", error);
      }
    } else {
      console.error("ERROR: ProductModal no está definido");
    }
    
    if (typeof CartSystem !== 'undefined') {
      console.log("Inicializando CartSystem...");
      try {
        CartSystem.init();
        console.log("CartSystem inicializado correctamente");
      } catch (error) {
        console.error("ERROR en CartSystem.init():", error);
      }
    } else {
      console.error("ERROR: CartSystem no está definido");
    }
    
    if (typeof SearchFilter !== 'undefined') {
      console.log("Inicializando SearchFilter...");
      try {
        SearchFilter.init();
        console.log("SearchFilter inicializado correctamente");
      } catch (error) {
        console.error("ERROR en SearchFilter.init():", error);
      }
    } else {
      console.error("ERROR: SearchFilter no está definido");
    }
    
    // 4. Inicializar OrdersSystem (requiere UserProfile ya inicializado)
    if (typeof OrdersSystem !== 'undefined') {
      console.log("Inicializando OrdersSystem...");
      try {
        await OrdersSystem.init();
        console.log("OrdersSystem inicializado correctamente");
      } catch (error) {
        console.error("ERROR en OrdersSystem.init():", error);
      }
    } else {
      console.error("ERROR: OrdersSystem no está definido");
    }
    
    if (typeof CheckoutSystem !== 'undefined') {
      console.log("Inicializando CheckoutSystem...");
      try {
        CheckoutSystem.init();
        console.log("CheckoutSystem inicializado correctamente");
      } catch (error) {
        console.error("ERROR en CheckoutSystem.init():", error);
      }
    } else {
      console.error("ERROR: CheckoutSystem no está definido");
    }
    
    // 5. Configurar eventos
    console.log("Configurando event listeners...");
    setupEventListeners();
    
    console.log("===== INICIALIZACIÓN COMPLETADA =====");
  } catch (error) {
    console.error("ERROR DURANTE LA INICIALIZACIÓN:", error);
    // Esta notificación se mantiene porque es un error crítico real
    if (typeof Notifications !== 'undefined') {
      Notifications.showNotification('Error Crítico', 'Falló la inicialización de la aplicación');
    }
  }
});

function setupEventListeners() {
  console.log("[SETUP] Configurando event listeners...");
  
  // Botón de perfil
  const profileButton = document.getElementById('profile-button');
  if (profileButton) {
    console.log("[SETUP] Botón de perfil encontrado");
    profileButton.addEventListener('click', function() {
      try {
        console.log("[CLICK] Botón perfil pulsado");
        
        if (typeof UserProfile !== 'undefined' && typeof UserProfile.openProfileModal === 'function') {
          UserProfile.openProfileModal();
        } else {
          console.error("ERROR: UserProfile no está definido o no tiene openProfileModal");
          alert('No se pudo abrir el perfil');
        }
      } catch (error) {
        console.error("ERROR CRÍTICO en perfil:", error);
        alert(`Error abriendo perfil: ${error.message}`);
      }
    });
  } else {
    console.error("ERROR: No se encontró el botón de perfil");
  }
  
  // Botón de pedidos
  const ordersButton = document.getElementById('orders-button');
  if (ordersButton) {
    console.log("[SETUP] Botón de pedidos encontrado");
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
          console.error("ERROR: OrdersSystem no está definido o no tiene openOrdersModal");
          alert('No se pudieron cargar los pedidos');
        }
      } catch (error) {
        console.error("ERROR CRÍTICO en pedidos:", error);
        alert(`Error abriendo pedidos: ${error.message}`);
      }
    });
  } else {
    console.error("ERROR: No se encontró el botón de pedidos");
  }
  
  // Botón de carrito
  const cartButton = document.getElementById('cart-button');
  if (cartButton) {
    console.log("[SETUP] Botón de carrito encontrado");
    cartButton.addEventListener('click', function() {
      try {
        console.log("[CLICK] Botón carrito pulsado");
        if (typeof CartSystem !== 'undefined' && typeof CartSystem.openCartModal === 'function') {
          CartSystem.openCartModal();
        } else {
          console.error("ERROR: CartSystem no está definido o no tiene openCartModal");
          alert('No se pudo abrir el carrito');
        }
      } catch (error) {
        console.error("ERROR al abrir carrito:", error);
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

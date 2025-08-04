document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.log("Iniciando inicialización controlada...");
    
    // 1. Inicializar AdminSystem PRIMERO (contiene verificación de admin)
    if (typeof AdminSystem !== 'undefined') {
      console.log("Inicializando AdminSystem...");
      await AdminSystem.init();
      console.log("AdminSystem inicializado");
    }
    
    // 2. Inicializar UserProfile (requiere AdminSystem ya inicializado)
    if (typeof UserProfile !== 'undefined') {
      console.log("Inicializando UserProfile...");
      await UserProfile.init();
      console.log("UserProfile inicializado");
    }
    
    // 3. Inicializar el resto de componentes
    if (typeof Notifications !== 'undefined') {
      Notifications.init();
      console.log("Notifications inicializado");
    }
    
    if (typeof Themes !== 'undefined') {
      Themes.init();
      console.log("Themes inicializado");
    }
    
    if (typeof Tabs !== 'undefined') {
      Tabs.init();
      console.log("Tabs inicializado");
    }
    
    if (typeof ProductView !== 'undefined') {
      ProductView.init();
      ProductView.loadProducts(Tabs.currentTab);
      console.log("ProductView inicializado");
    }
    
    if (typeof ProductModal !== 'undefined') {
      ProductModal.init();
      console.log("ProductModal inicializado");
    }
    
    if (typeof CartSystem !== 'undefined') {
      CartSystem.init();
      console.log("CartSystem inicializado");
    }
    
    if (typeof SearchFilter !== 'undefined') {
      SearchFilter.init();
      console.log("SearchFilter inicializado");
    }
    
    // 4. Inicializar OrdersSystem (requiere UserProfile ya inicializado)
    if (typeof OrdersSystem !== 'undefined') {
      await OrdersSystem.init();
      console.log("OrdersSystem inicializado");
    }
    
    if (typeof CheckoutSystem !== 'undefined') {
      CheckoutSystem.init();
      console.log("CheckoutSystem inicializado");
    }
    
    // 5. Configurar eventos
    setupEventListeners();
    
    console.log("Todos los módulos inicializados correctamente");
  } catch (error) {
    console.error("Error durante la inicialización:", error);
  }
});

function setupEventListeners() {
  // Botón de perfil
  document.getElementById('profile-button')?.addEventListener('click', function() {
    try {
      if (typeof UserProfile !== 'undefined' && typeof UserProfile.openProfileModal === 'function') {
        UserProfile.openProfileModal();
      } else {
        console.error("UserProfile no está definido o no tiene openProfileModal");
        Notifications.showNotification('Error', 'No se pudo abrir el perfil');
      }
    } catch (error) {
      console.error("Error al abrir perfil:", error);
      Notifications.showNotification('Error', 'Error al abrir el perfil');
    }
  });
  
  // Botón de pedidos
  document.getElementById('orders-button')?.addEventListener('click', async function() {
    try {
      if (typeof OrdersSystem !== 'undefined' && typeof OrdersSystem.openOrdersModal === 'function') {
        await OrdersSystem.openOrdersModal();
        if (typeof Notifications !== 'undefined') {
          Notifications.notifications.forEach(n => n.read = true);
          Notifications.saveNotifications();
          Notifications.renderNotificationCount();
        }
      } else {
        console.error("OrdersSystem no está definido o no tiene openOrdersModal");
        Notifications.showNotification('Error', 'No se pudieron cargar los pedidos');
      }
    } catch (error) {
      console.error("Error al abrir pedidos:", error);
      Notifications.showNotification('Error', 'Error al cargar pedidos');
    }
  });
  
  // Botón de carrito
  document.getElementById('cart-button')?.addEventListener('click', function() {
    try {
      if (typeof CartSystem !== 'undefined' && typeof CartSystem.openCartModal === 'function') {
        CartSystem.openCartModal();
      } else {
        console.error("CartSystem no está definido o no tiene openCartModal");
        Notifications.showNotification('Error', 'No se pudo abrir el carrito');
      }
    } catch (error) {
      console.error("Error al abrir carrito:", error);
      Notifications.showNotification('Error', 'Error al abrir el carrito');
    }
  });
  
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

document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.log("Iniciando inicialización controlada...");
    
    // Verificación detallada de módulos
    console.log("[DEBUG] Módulos disponibles:");
    console.log("- UserProfile:", typeof UserProfile !== 'undefined' ? "Sí" : "No");
    console.log("- OrdersSystem:", typeof OrdersSystem !== 'undefined' ? "Sí" : "No");
    console.log("- AdminSystem:", typeof AdminSystem !== 'undefined' ? "Sí" : "No");
    console.log("- Notifications:", typeof Notifications !== 'undefined' ? "Sí" : "No");
    console.log("- Themes:", typeof Themes !== 'undefined' ? "Sí" : "No");
    console.log("- Tabs:", typeof Tabs !== 'undefined' ? "Sí" : "No");
    console.log("- ProductView:", typeof ProductView !== 'undefined' ? "Sí" : "No");
    console.log("- ProductModal:", typeof ProductModal !== 'undefined' ? "Sí" : "No");
    console.log("- CartSystem:", typeof CartSystem !== 'undefined' ? "Sí" : "No");
    console.log("- SearchFilter:", typeof SearchFilter !== 'undefined' ? "Sí" : "No");
    console.log("- CheckoutSystem:", typeof CheckoutSystem !== 'undefined' ? "Sí" : "No");
    
    // 1. Inicializar UserProfile PRIMERO
    if (typeof UserProfile !== 'undefined') {
      console.log("Inicializando UserProfile...");
      await UserProfile.init();
      console.log("UserProfile inicializado");
    } else {
      console.error("ERROR: UserProfile no está definido");
    }
    
    // 2. Inicializar AdminSystem (requiere UserProfile)
    if (typeof AdminSystem !== 'undefined') {
      console.log("Inicializando AdminSystem...");
      await AdminSystem.init();
      console.log("AdminSystem inicializado");
    } else {
      console.error("ERROR: AdminSystem no está definido");
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
      console.log("Inicializando OrdersSystem...");
      await OrdersSystem.init();
      console.log("OrdersSystem inicializado");
    } else {
      console.error("ERROR: OrdersSystem no está definido");
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

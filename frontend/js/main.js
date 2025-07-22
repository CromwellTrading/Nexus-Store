document.addEventListener('DOMContentLoaded', async function() {
  try {
      console.log("Iniciando inicialización controlada...");
      
      // 1. Inicializar UserProfile (solo perfil)
      if (typeof UserProfile !== 'undefined') {
          console.log("Inicializando UserProfile...");
          UserProfile.init();
          console.log("UserProfile inicializado");
      }
      
      // 2. Inicializar AdminSystem (contiene verificación de admin)
      if (typeof AdminSystem !== 'undefined') {
          console.log("Inicializando AdminSystem...");
          await AdminSystem.init();
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
      
      if (typeof CheckoutSystem !== 'undefined') {
          CheckoutSystem.init();
          console.log("CheckoutSystem inicializado");
      }
      
      // 4. Configurar eventos
      setupEventListeners();
      
      console.log("Todos los módulos inicializados correctamente");
  } catch (error) {
      console.error("Error durante la inicialización:", error);
  }
});

function setupEventListeners() {
  document.getElementById('profile-button')?.addEventListener('click', function() {
      if (typeof UserProfile !== 'undefined' && typeof UserProfile.openProfileModal === 'function') {
          UserProfile.openProfileModal();
      } else {
          console.error("UserProfile no está definido o no tiene openProfileModal");
      }
  });
  
  // Nota: El botón de admin ahora es controlado por AdminSystem
  // El evento se registra en AdminSystem.initializeAdmin() si es admin
  
  document.getElementById('orders-button')?.addEventListener('click', function() {
      if (typeof OrdersSystem !== 'undefined' && typeof OrdersSystem.openOrdersModal === 'function') {
          OrdersSystem.openOrdersModal();
          if (typeof Notifications !== 'undefined') {
              Notifications.notifications.forEach(n => n.read = true);
              Notifications.saveNotifications();
              Notifications.renderNotificationCount();
          }
      } else {
          console.error("OrdersSystem no está definido o no tiene openOrdersModal");
      }
  });
  
  document.getElementById('cart-button')?.addEventListener('click', function() {
      if (typeof CartSystem !== 'undefined' && typeof CartSystem.openCartModal === 'function') {
          CartSystem.openCartModal();
      } else {
          console.error("CartSystem no está definido o no tiene openCartModal");
      }
  });
  
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

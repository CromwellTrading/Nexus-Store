document.addEventListener('DOMContentLoaded', function() {
  try {
      // Configurar la URL de la API
      window.API_URL = window.location.hostname === 'localhost' 
          ? 'http://localhost:6000' 
          : 'https://tu-backend-en-render.com';
      
      Notifications.init();
      
      Themes.init();
      UserProfile.init();
      AdminSystem.init();
      
      // Cargar productos desde el backend
      ProductView.loadProducts(Tabs.currentTab);
      
      Tabs.init();
      
      ProductModal.init();
      CartSystem.init();
      SearchFilter.init();
      OrdersSystem.init();
      CheckoutSystem.init();
      
      setupEventListeners();
      
      console.log("Todos los módulos inicializados correctamente");
  } catch (error) {
      console.error("Error durante la inicialización:", error);
  }
});

function setupEventListeners() {
  document.getElementById('profile-button').addEventListener('click', function() {
      UserProfile.openProfileModal();
  });
  
  document.getElementById('admin-button').addEventListener('click', function() {
      AdminSystem.openAdminPanel();
  });
  
  document.getElementById('orders-button').addEventListener('click', function() {
      OrdersSystem.openOrdersModal();
      Notifications.notifications.forEach(n => n.read = true);
      Notifications.saveNotifications();
      Notifications.renderNotificationCount();
  });
  
  document.getElementById('cart-button').addEventListener('click', function() {
      CartSystem.openCartModal();
  });
  
  document.addEventListener('click', function(e) {
      const modal = document.getElementById('product-modal');
      if (e.target === modal) {
          modal.style.display = 'none';
          CartSystem.isCartModalOpen = false;
      }
  });
}

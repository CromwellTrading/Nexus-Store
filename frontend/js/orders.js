const OrdersSystem = {
  orders: [],
  isLoading: false,
  
  init: async function() {
    try {
      console.group('[OrdersSystem] Iniciando inicialización...');
      this.setupEventListeners();
      console.log('✅ OrdersSystem inicializado correctamente');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('[OrdersSystem] Error en init:', error);
      console.groupEnd();
      throw error;
    }
  },
  
  loadOrders: async function() {
    try {
      console.group('[OrdersSystem] Cargando pedidos...');
      
      if (this.isLoading) {
        console.log('⏳ Ya se está cargando, omitiendo...');
        console.groupEnd();
        return;
      }
      
      this.isLoading = true;
      console.log('🔍 Verificando UserProfile...');
      
      if (typeof UserProfile === 'undefined') {
        throw new Error("UserProfile no está disponible");
      }
      
      const userId = UserProfile.getTelegramUserId();
      console.log('🔍 ID de usuario obtenido:', userId);
      
      if (!userId) {
        throw new Error("No se pudo obtener el ID de usuario");
      }
      
      console.log('🌐 Haciendo request a la API...');
      const response = await fetch(`${window.API_BASE_URL}/api/orders/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const orders = await response.json();
      console.log(`📦 ${orders.length} pedidos recibidos`);
      
      this.orders = orders.map(order => ({
        ...order,
        createdAt: new Date(order.createdAt).toLocaleDateString(),
        updatedAt: order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : null,
        isNew: true
      }));
      
      this.isLoading = false;
      console.log('✅ Pedidos cargados correctamente');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('[OrdersSystem] Error en loadOrders:', error);
      this.isLoading = false;
      
      if (typeof Notifications !== 'undefined') {
        Notifications.showNotification('Error', 'No se pudieron cargar los pedidos');
      }
      
      console.groupEnd();
      return false;
    }
  },
  
  openOrdersModal: async function() {
    try {
      console.group('[OrdersSystem] Abriendo modal de pedidos');
      
      const modal = document.getElementById('product-modal');
      console.log('🖥️ Modal encontrado:', !!modal);
      
      modal.innerHTML = '<div class="loading">Cargando pedidos...</div>';
      modal.style.display = 'flex';
      
      console.log('⏳ Cargando pedidos...');
      const loaded = await this.loadOrders();
      
      if (!loaded) {
        console.log('❌ No se pudieron cargar los pedidos');
        console.groupEnd();
        return;
      }
      
      if (this.orders.length === 0) {
        console.log('📭 No hay pedidos para mostrar');
        modal.innerHTML = `
          <!-- Código del modal cuando no hay pedidos -->
        `;
        
        document.getElementById('retry-load-orders')?.addEventListener('click', async () => {
          await this.loadOrders();
          this.openOrdersModal();
        });
      } else {
        console.log(`📋 Mostrando ${this.orders.length} pedidos`);
        modal.innerHTML = `
          <!-- Código del modal con pedidos -->
        `;
        
        this.setupOrdersModalEvents();
      }
      
      console.log('✅ Modal de pedidos mostrado correctamente');
      console.groupEnd();
    } catch (error) {
      console.error('[OrdersSystem] Error en openOrdersModal:', error);
      
      if (typeof Notifications !== 'undefined') {
        Notifications.showNotification('Error', 'Error al mostrar pedidos');
      }
      
      console.groupEnd();
    }
  },
  
  // ... (resto de los métodos con logging similar)
};

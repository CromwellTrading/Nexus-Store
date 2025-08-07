const OrdersSystem = {
  orders: [],
  isLoading: false,
  
  init: async function() {
    try {
      console.log("[OrdersSystem] Iniciando inicialización...");
      this.setupEventListeners();
      await this.loadOrders();
      console.log("[OrdersSystem] Inicializado correctamente");
      return true;
    } catch (error) {
      console.error("[OrdersSystem] Error en init:", error);
      return false;
    }
  },
  
  setupEventListeners: function() {
    console.log("[OrdersSystem] Configurando event listeners...");
    // Eventos para botones de detalles de pedidos
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-view-order')) {
        const orderId = e.target.dataset.id;
        const order = this.orders.find(o => o.id === orderId);
        if (order) this.showOrderDetails(order);
      }
    });
  },
  
  loadOrders: async function() {
    try {
      console.log("[OrdersSystem] Cargando pedidos...");
      
      if (this.isLoading) {
        console.log("[OrdersSystem] Ya se está cargando, omitiendo...");
        return;
      }
      
      this.isLoading = true;
      const userId = UserProfile.getTelegramUserId();
      
      if (!userId) {
        console.error("[OrdersSystem] No hay ID de usuario");
        this.isLoading = false;
        return;
      }

      const response = await fetch(`${window.API_BASE_URL}/api/orders/user/${userId}`);
      const orders = await response.json();
      
      // Verificar que orders es un array
      if (!Array.isArray(orders)) {
        console.error("[OrdersSystem] La respuesta de pedidos no es un array:", orders);
        this.orders = [];
      } else {
        this.orders = orders;
      }
      
      this.renderOrders();
      this.isLoading = false;
    } catch (error) {
      console.error("[OrdersSystem] Error cargando pedidos:", error);
      Notifications.showNotification("Error", "No se pudieron cargar los pedidos");
      this.isLoading = false;
    }
  },
  
  renderOrders: function() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    if (!this.orders || this.orders.length === 0) {
      container.innerHTML = '<p class="no-orders">No tienes pedidos registrados</p>';
      return;
    }
    
    container.innerHTML = this.orders.map(order => {
      return `
        <div class="order-card">
          <div class="order-header">
            <span class="order-id">Pedido #${order.id}</span>
            <span class="order-status ${order.status.toLowerCase()}">${order.status}</span>
          </div>
          
          <div class="order-date">
            ${new Date(order.createdAt).toLocaleDateString()}
          </div>
          
          <div class="order-total">
            Total: $${order.total.toFixed(2)}
          </div>
          
          <div class="order-items-preview">
            ${(order.items || []).slice(0, 3).map(item => `
              <div class="order-item-preview">
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.product_name}">` : ''}
                <span>${item.product_name} x${item.quantity}</span>
              </div>
            `).join('')}
          </div>
          
          <button class="btn-view-order" data-id="${order.id}">
            Ver detalles
          </button>
        </div>
      `;
    }).join('');
  },
  
  showOrderDetails: function(order) {
    const modal = document.getElementById('product-modal');
    
    // Construir HTML de detalles del pedido
    let itemsHTML = '';
    (order.items || []).forEach(item => {
      itemsHTML += `
        <div class="order-item-detail">
          <div class="product-image">
            ${item.image_url ? `<img src="${item.image_url}" alt="${item.product_name}">` : ''}
          </div>
          <div class="product-info">
            <div class="product-name">${item.product_name}</div>
            <div class="product-quantity">Cantidad: ${item.quantity}</div>
            <div class="product-price">Precio: $${item.price.toFixed(2)}</div>
          </div>
        </div>
      `;
    });
    
    // Mostrar datos de pago si existen
    let paymentHTML = '';
    if (order.payment && order.payment.method) {
      paymentHTML = `
        <div class="payment-info">
          <h3>💳 Información de Pago</h3>
          <p><strong>Método:</strong> ${order.payment.method}</p>
          ${order.payment.proof_url ? `<p><strong>Comprobante:</strong> <a href="${order.payment.proof_url}" target="_blank">Ver imagen</a></p>` : ''}
        </div>
      `;
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>📋 Detalles del Pedido #${order.id}</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="order-details-content">
          <div class="order-info">
            <p><strong>📅 Fecha:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            <p><strong>🔄 Estado:</strong> <span class="status-${order.status.toLowerCase()}">${order.status}</span></p>
            <p><strong>💰 Total:</strong> $${order.total.toFixed(2)}</p>
          </div>
          
          <div class="customer-info">
            <h3>👤 Información del Cliente</h3>
            <p><strong>Nombre:</strong> ${order.userData?.fullName || 'No especificado'}</p>
            <p><strong>CI:</strong> ${order.userData?.ci || 'No especificado'}</p>
            <p><strong>Teléfono:</strong> ${order.userData?.phone || 'No especificado'}</p>
            <p><strong>Dirección:</strong> ${order.userData?.address || 'No especificado'}, ${order.userData?.province || ''}</p>
          </div>
          
          ${paymentHTML}
          
          <div class="order-items">
            <h3>🛒 Productos</h3>
            <div class="items-list">
              ${itemsHTML}
            </div>
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    // Evento para cerrar modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
};

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
  OrdersSystem.init();
});

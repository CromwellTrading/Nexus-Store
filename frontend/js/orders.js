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
      Notifications.showNotification("Error", "Error al inicializar el sistema de pedidos");
      return false;
    }
  },
  
  setupEventListeners: function() {
    console.log("[OrdersSystem] Configurando event listeners...");
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
      console.log("[OrdersSystem] User ID obtenido:", userId);
      
      if (!userId) {
        console.error("[OrdersSystem] No hay ID de usuario");
        Notifications.showNotification("Error", "Debes iniciar sesión para ver tus pedidos");
        this.isLoading = false;
        return;
      }

      const apiUrl = `${window.API_BASE_URL}/api/orders/user/${userId}`;
      console.log("[OrdersSystem] Realizando petición a:", apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Telegram-ID': userId,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("[OrdersSystem] Respuesta recibida, status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[OrdersSystem] Error en la respuesta:", {
          status: response.status,
          errorText
        });
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      let orders = await response.json();
      console.log("[OrdersSystem] Datos crudos recibidos:", orders);
      
      // Normalizar estructura de datos
      orders = orders.map(order => ({
        ...order,
        id: order.id,
        total: parseFloat(order.total) || 0,
        status: order.status || 'Desconocido',
        createdAt: order.created_at || order.createdAt,
        updatedAt: order.updated_at || order.updatedAt,
        userData: order.user_data || order.userData || {},
        payment: order.payment || {
          method: 'No especificado',
          proof_url: ''
        },
        items: order.items || [],
        requiredFields: order.required_fields || order.requiredFields || {}
      }));
      
      console.log("[OrdersSystem] Pedidos normalizados:", orders);
      
      // Validación final
      if (!Array.isArray(orders)) {
        console.error("[OrdersSystem] La respuesta no es un array válido:", orders);
        this.orders = [];
      } else {
        this.orders = orders;
      }
      
      this.renderOrders();
    } catch (error) {
      console.error("[OrdersSystem] Error completo al cargar pedidos:", {
        error: error.message,
        stack: error.stack
      });
      Notifications.showNotification("Error", "No se pudieron cargar los pedidos. Intenta nuevamente.");
    } finally {
      this.isLoading = false;
      console.log("[OrdersSystem] Estado de carga finalizado");
    }
  },
  
  renderOrders: function() {
    const container = document.getElementById('orders-container');
    if (!container) {
      console.error("[OrdersSystem] Contenedor de pedidos no encontrado");
      return;
    }
    
    console.log("[OrdersSystem] Renderizando pedidos...");
    
    if (!this.orders || this.orders.length === 0) {
      container.innerHTML = `
        <div class="no-orders">
          <img src="/assets/images/empty-orders.png" alt="No hay pedidos">
          <h3>No tienes pedidos registrados</h3>
          <p>Cuando realices un pedido, aparecerá aquí</p>
        </div>
      `;
      return;
    }
    
    // Ordenar pedidos por fecha (más recientes primero)
    const sortedOrders = [...this.orders].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    container.innerHTML = sortedOrders.map(order => {
      // Asegurar que los items existen y son un array
      const orderItems = Array.isArray(order.items) ? order.items : [];
      
      // Crear vista previa de items (máximo 3)
      const itemsPreview = orderItems.slice(0, 3).map(item => {
        return `
          <div class="order-item-preview">
            ${item.image_url ? `<img src="${item.image_url}" alt="${item.product_name}" loading="lazy">` : ''}
            <span>${item.product_name || 'Producto'} x${item.quantity || 1}</span>
          </div>
        `;
      }).join('');
      
      // Formatear fecha
      const orderDate = order.createdAt 
        ? new Date(order.createdAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        : 'Fecha no disponible';
      
      // Determinar clase de estado
      const statusClass = order.status 
        ? order.status.toLowerCase().replace(/\s+/g, '-')
        : 'desconocido';
      
      return `
        <div class="order-card" data-order-id="${order.id}">
          <div class="order-header">
            <span class="order-id">Pedido #${order.id || 'N/A'}</span>
            <span class="order-status ${statusClass}">
              ${order.status || 'Desconocido'}
            </span>
          </div>
          
          <div class="order-date">
            <i class="fas fa-calendar-alt"></i>
            ${orderDate}
          </div>
          
          <div class="order-total">
            <i class="fas fa-receipt"></i>
            Total: $${order.total?.toFixed(2) || '0.00'}
          </div>
          
          ${orderItems.length > 0 ? `
            <div class="order-items-preview">
              ${itemsPreview}
              ${orderItems.length > 3 ? 
                `<div class="more-items">+${orderItems.length - 3} más</div>` : ''}
            </div>
          ` : ''}
          
          <button class="btn-view-order" data-id="${order.id}">
            <i class="fas fa-eye"></i> Ver detalles
          </button>
        </div>
      `;
    }).join('');
    
    console.log("[OrdersSystem] Pedidos renderizados correctamente");
  },
  
  showOrderDetails: function(order) {
    console.log("[OrdersSystem] Mostrando detalles del pedido:", order.id);
    const modal = document.getElementById('product-modal');
    
    if (!modal) {
      console.error("[OrdersSystem] Modal no encontrado");
      return;
    }
    
    // Formatear fecha completa
    const formattedDate = order.createdAt
      ? new Date(order.createdAt).toLocaleString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Fecha no disponible';
    
    // Generar HTML para items
    let itemsHTML = '';
    const orderItems = Array.isArray(order.items) ? order.items : [];
    
    orderItems.forEach(item => {
      itemsHTML += `
        <div class="order-item-detail">
          <div class="product-image">
            ${item.image_url ? 
              `<img src="${item.image_url}" alt="${item.product_name}" loading="lazy">` : 
              '<div class="no-image"><i class="fas fa-box-open"></i></div>'}
          </div>
          <div class="product-info">
            <div class="product-name">${item.product_name || 'Producto'}</div>
            <div class="product-meta">
              <span class="product-quantity">Cantidad: ${item.quantity || 1}</span>
              <span class="product-price">$${(item.price || 0).toFixed(2)} c/u</span>
            </div>
            ${item.tab_type ? `<div class="product-type">${item.tab_type}</div>` : ''}
          </div>
        </div>
      `;
    });
    
    // Generar HTML para información de pago
    let paymentHTML = '';
    if (order.payment) {
      paymentHTML = `
        <div class="payment-info">
          <h3><i class="fas fa-credit-card"></i> Información de Pago</h3>
          <div class="payment-details">
            <p><strong>Método:</strong> ${order.payment.method || 'No especificado'}</p>
            ${order.payment.proof_url ? `
              <p class="proof-link">
                <strong>Comprobante:</strong> 
                <a href="${order.payment.proof_url}" target="_blank" rel="noopener noreferrer">
                  Ver imagen <i class="fas fa-external-link-alt"></i>
                </a>
              </p>
            ` : ''}
          </div>
        </div>
      `;
    }

    // Generar HTML para campos requeridos
    let requiredFieldsHTML = '';
    if (order.requiredFields && Object.keys(order.requiredFields).length > 0) {
      requiredFieldsHTML = `
        <div class="required-fields-info">
          <h4><i class="fas fa-tasks"></i> Campos Requeridos</h4>
          <div class="fields-grid">
            ${Object.entries(order.requiredFields).map(([key, value]) => `
              <div class="field-row">
                <strong>${key}:</strong> 
                <span>${value || 'No proporcionado'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Construir el modal completo
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2><i class="fas fa-receipt"></i> Detalles del Pedido #${order.id || 'N/A'}</h2>
          <button class="close-modal">&times;</button>
        </div>
        
        <div class="order-details-content">
          <div class="order-info-section">
            <div class="order-info">
              <p><i class="fas fa-calendar"></i> <strong>Fecha:</strong> ${formattedDate}</p>
              <p><i class="fas fa-tag"></i> <strong>Estado:</strong> 
                <span class="status-badge ${order.status?.toLowerCase() || 'desconocido'}">
                  ${order.status || 'Desconocido'}
                </span>
              </p>
              <p><i class="fas fa-money-bill-wave"></i> <strong>Total:</strong> $${order.total?.toFixed(2) || '0.00'}</p>
            </div>
            
            <div class="customer-info">
              <h3><i class="fas fa-user"></i> Información del Cliente</h3>
              <div class="customer-details">
                <p><strong>Nombre:</strong> ${order.userData?.fullName || 'No especificado'}</p>
                <p><strong>CI:</strong> ${order.userData?.ci || 'No especificado'}</p>
                <p><strong>Teléfono:</strong> ${order.userData?.phone || 'No especificado'}</p>
                <p><strong>Dirección:</strong> ${order.userData?.address || 'No especificado'}${order.userData?.province ? `, ${order.userData.province}` : ''}</p>
              </div>
            </div>
          </div>
          
          ${paymentHTML}
          
          ${requiredFieldsHTML}
          
          <div class="order-items-section">
            <h3><i class="fas fa-boxes"></i> Productos (${orderItems.length})</h3>
            <div class="items-list">
              ${itemsHTML || '<p>No hay información de productos</p>'}
            </div>
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Configurar evento para cerrar modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    });
    
    console.log("[OrdersSystem] Modal de detalles mostrado correctamente");
  }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log("[OrdersSystem] DOM cargado, iniciando sistema...");
  OrdersSystem.init();
});

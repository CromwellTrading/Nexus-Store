const OrdersSystem = {
  orders: [],
  
  init: function() {
    this.loadOrders();
  },
  
  loadOrders: function() {
    const userId = UserProfile.getTelegramUserId();
    if (!userId) {
      console.error("No se pudo obtener el ID de usuario");
      return;
    }
    
    console.log(`Cargando pedidos para usuario: ${userId}`); // Para depuración
    
    fetch(`${window.API_BASE_URL}/api/orders/user/${userId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(orders => {
        console.log("Pedidos recibidos:", orders); // Para depuración
        
        this.orders = orders.map(order => ({
          ...order,
          // Convertir fechas a formato legible
          createdAt: new Date(order.createdAt).toLocaleDateString(),
          updatedAt: order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : null,
          
          // Agregar marca de nuevo pedido (primera vez que se ve)
          isNew: true
        }));
        
        console.log("Pedidos procesados:", this.orders); // Para depuración
      })
      .catch(error => {
        console.error('Error cargando pedidos:', error);
        Notifications.showNotification('❌ Error', 'No se pudieron cargar los pedidos');
      });
  },
  
  openOrdersModal: function() {
    const modal = document.getElementById('product-modal');
    
    // Verificar si hay pedidos cargados
    if (this.orders.length === 0) {
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>📋 Mis Pedidos</h2>
            <button class="close-modal">&times;</button>
          </div>
          <div class="orders-container">
            <p>Cargando pedidos...</p>
            <button id="retry-load-orders">🔄 Reintentar</button>
          </div>
        </div>
      `;
      
      modal.querySelector('#retry-load-orders').addEventListener('click', () => {
        this.loadOrders();
        setTimeout(() => this.openOrdersModal(), 500);
      });
    } else {
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>📋 Mis Pedidos</h2>
            <button class="close-modal">&times;</button>
          </div>
          ${this.getFilterControls()}
          <div class="orders-container" id="orders-container">
            ${this.getOrdersHTML()}
          </div>
        </div>
      `;
      
      // Configurar eventos de filtro
      document.getElementById('client-status-filter').addEventListener('change', (e) => {
        this.renderOrdersForClient(e.target.value);
      });
      
      document.getElementById('client-sort-by').addEventListener('change', () => {
        this.renderOrdersForClient(document.getElementById('client-status-filter').value);
      });
    }
    
    modal.style.display = 'flex';
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    this.attachThumbnailEvents();
    this.attachViewDetailsEvents();
  },
  
  getFilterControls: function() {
    return `
      <div class="order-controls">
        <div class="order-filter">
          <label>Filtrar por estado:</label>
          <select id="client-status-filter" class="modern-select">
            <option value="all">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En proceso">En proceso</option>
            <option value="Enviado">Enviado</option>
            <option value="Completado">Completado</option>
          </select>
        </div>
        <div class="order-sort">
          <label>Ordenar por:</label>
          <select id="client-sort-by" class="modern-select">
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
            <option value="status">Estado</option>
          </select>
        </div>
      </div>
    `;
  },
  
  getOrdersHTML: function(orders = this.orders) {
    if (!orders || orders.length === 0) {
      return '<p>No tienes pedidos registrados</p>';
    }
    
    return orders.map(order => {
      // Verificar si el pedido fue actualizado recientemente
      const isUpdated = order.updatedAt && 
        (new Date() - new Date(order.updatedAt)) < (24 * 60 * 60 * 1000);
      
      return `
        <div class="order-item ${order.isNew ? 'new-order' : ''}">
          <h3>📦 Pedido #${order.id} 
            ${order.isNew ? '<span class="new-badge">NUEVO</span>' : ''}
            ${isUpdated ? '<span class="updated-badge">ACTUALIZADO</span>' : ''}
          </h3>
          <p>📅 Fecha: ${order.createdAt}</p>
          <p>💰 Total: $${order.total.toFixed(2)}</p>
          <p class="order-status">🔄 Estado: 
            <span class="status-${order.status.toLowerCase().replace(/\s+/g, '-')}">
              ${order.status}
            </span>
          </p>
          
          <div class="order-thumbnails">
            ${order.items.slice(0, 5).map(item => `
              <img src="${item.image_url || 'placeholder.jpg'}" 
                   alt="${item.product_name}" 
                   class="order-thumb"
                   data-src="${item.image_url || 'placeholder.jpg'}">
            `).join('')}
          </div>
          
          <button class="view-order-details" data-id="${order.id}">
            👁️ Ver detalles
          </button>
        </div>
      `;
    }).join('');
  },
  
  renderOrdersForClient: function(statusFilter = 'all') {
    const sortBy = document.getElementById('client-sort-by').value;
    let orders = [...this.orders];
    
    // Filtrar por estado
    if (statusFilter !== 'all') {
      orders = orders.filter(order => order.status === statusFilter);
    }
    
    // Ordenar
    if (sortBy === 'newest') {
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'status') {
      const statusOrder = {
        'Pendiente': 1,
        'En proceso': 2,
        'Enviado': 3,
        'Completado': 4
      };
      orders.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }
    
    const ordersContainer = document.getElementById('orders-container');
    ordersContainer.innerHTML = this.getOrdersHTML(orders);
    
    this.attachThumbnailEvents();
    this.attachViewDetailsEvents();
  },
  
  attachThumbnailEvents: function() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    
    modal.querySelectorAll('.order-thumb').forEach(thumb => {
      thumb.addEventListener('click', function(e) {
        const src = this.getAttribute('data-src');
        const modalImg = document.createElement('div');
        modalImg.className = 'image-modal';
        modalImg.innerHTML = `
          <div class="image-modal-content">
            <img src="${src}" alt="Imagen del producto">
          </div>
        `;
        document.body.appendChild(modalImg);
        
        modalImg.addEventListener('click', function() {
          document.body.removeChild(modalImg);
        });
      });
    });
  },
  
  attachViewDetailsEvents: function() {
    document.querySelectorAll('.view-order-details').forEach(button => {
      button.addEventListener('click', (e) => {
        const orderId = e.target.getAttribute('data-id');
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
          order.isNew = false; // Marcar como visto
          this.viewOrderDetails(order);
        }
      });
    });
  },
  
  viewOrderDetails: function(order) {
    const modal = document.getElementById('product-modal');
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>📋 Detalles del Pedido #${order.id}</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="order-details-full">
          <div class="order-info">
            <div><strong>📅 Fecha:</strong> ${order.createdAt}</div>
            <div><strong>🔄 Estado:</strong> ${order.status}</div>
            <div><strong>💰 Total:</strong> $${order.total.toFixed(2)}</div>
          </div>
          
          <h3>👤 Tus Datos</h3>
          <div class="customer-info">
            <div><strong>Nombre:</strong> ${order.userData?.fullName || 'No especificado'}</div>
            <div><strong>🆔 CI:</strong> ${order.userData?.ci || 'No especificado'}</div>
            <div><strong>📱 Teléfono:</strong> ${order.userData?.phone || 'No especificado'}</div>
            <div><strong>📍 Dirección:</strong> ${order.userData?.address || 'No especificado'}, ${order.userData?.province || ''}</div>
          </div>
          
          <h3>💳 Información de Pago</h3>
          <div class="payment-info">
            <div><strong>Método:</strong> ${order.payment?.method || 'No especificado'}</div>
            <div><strong>🔑 ID Transferencia:</strong> ${order.payment?.transferId || 'N/A'}</div>
            ${order.payment?.transferProof ? `
              <div><strong>📸 Comprobante:</strong> 
                <a href="${order.payment.transferProof}" target="_blank">Ver imagen</a>
              </div>
            ` : ''}
          </div>
          
          ${order.recipient && Object.keys(order.recipient).length > 0 ? `
            <h3>📦 Datos del Receptor</h3>
            <div class="recipient-info">
              <div><strong>Nombre:</strong> ${order.recipient.fullName || 'N/A'}</div>
              <div><strong>CI:</strong> ${order.recipient.ci || 'N/A'}</div>
              <div><strong>Teléfono:</strong> ${order.recipient.phone || 'N/A'}</div>
            </div>
          ` : ''}
          
          ${order.requiredFields && Object.keys(order.requiredFields).length > 0 ? `
            <h3>📝 Campos Requeridos</h3>
            <div class="required-fields-info">
              ${Object.entries(order.requiredFields).map(([key, value]) => `
                <div><strong>${key}:</strong> ${value}</div>
              `).join('')}
            </div>
          ` : ''}
          
          <h3>🛒 Productos</h3>
          <div class="order-products">
            ${order.items.map(item => `
              <div class="order-product-item">
                <div class="product-image">
                  ${item.image_url ? `
                    <img src="${item.image_url}" 
                         alt="${item.product_name}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                  ` : ''}
                </div>
                <div class="product-details">
                  <div><strong>${item.product_name}</strong></div>
                  <div>${item.quantity} × $${item.price.toFixed(2)}</div>
                  <div>Total: $${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      this.openOrdersModal();
    });
  }
};

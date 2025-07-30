const OrdersSystem = {
  orders: [],
  
  init: function() {
    this.loadOrders();
  },
  
  loadOrders: function() {
    const userId = UserProfile.getTelegramUserId();
    if (!userId) return;
    
    fetch(`${window.API_BASE_URL}/api/orders/user/${userId}`)
      .then(response => response.json())
      .then(orders => {
        this.orders = orders.map(order => ({
          ...order,
          date: new Date(order.created_at).toLocaleDateString(),
          data: {
            items: order.items, // Ya es un array (JSONB)
            payment: order.payment, // Objeto directo
            recipient: order.recipient, // Objeto directo
            total: order.total
          }
        }));
      })
      .catch(error => {
        console.error('Error cargando pedidos:', error);
      });
  },
  
  openOrdersModal: function() {
    const modal = document.getElementById('product-modal');
    
    const filterControls = `
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
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>📋 Mis Pedidos</h2>
          <button class="close-modal">&times;</button>
        </div>
        ${filterControls}
        <div class="orders-container" id="orders-container">
          ${this.getOrdersHTML()}
        </div>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    document.getElementById('client-status-filter').addEventListener('change', (e) => {
      this.renderOrdersForClient(e.target.value);
    });
    
    document.getElementById('client-sort-by').addEventListener('change', () => {
      this.renderOrdersForClient(document.getElementById('client-status-filter').value);
    });
    
    this.attachThumbnailEvents();
    this.attachViewDetailsEvents();
  },
  
  getOrdersHTML: function(orders = this.orders) {
    if (orders.length === 0) {
      return '<p>No tienes pedidos</p>';
    }
    
    return orders.map(order => {
      const isUpdated = order.updated_at && (new Date() - new Date(order.updated_at)) < (24 * 60 * 60 * 1000);
      return `
        <div class="order-item ${order.isNew ? 'new-order' : ''}">
          <h3>📦 Pedido #${order.id} 
            ${order.isNew ? '<span class="new-badge">NUEVO</span>' : ''}
            ${isUpdated ? '<span class="updated-badge">ACTUALIZADO</span>' : ''}
          </h3>
          <p>📅 Fecha: ${order.date}</p>
          <p>💰 Total: $${order.data.total.toFixed(2)}</p>
          <p class="order-status">🔄 Estado: <span class="status-${order.status.toLowerCase().replace(/\s+/g, '-')}">${order.status}</span></p>
          
          <div class="order-thumbnails">
            ${order.data.items.map(item => `
              <img src="${item.image_url || 'placeholder.jpg'}" 
                   alt="${item.product_name}" 
                   class="order-thumb"
                   data-src="${item.image_url || 'placeholder.jpg'}">
            `).join('')}
          </div>
          
          <button class="view-order-details" data-id="${order.id}">👁️ Ver detalles</button>
        </div>
      `;
    }).join('');
  },
  
  renderOrdersForClient: function(statusFilter = 'all') {
    const sortBy = document.getElementById('client-sort-by').value;
    let orders = [...this.orders];
    
    if (statusFilter !== 'all') {
      orders = orders.filter(order => order.status === statusFilter);
    }
    
    if (sortBy === 'newest') {
      orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'status') {
      const statusOrder = {
        'Pendiente': 1,
        'En proceso': 2,
        'Enviado': 3,
        'Completado': 4
      };
      orders.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }
    
    const ordersContainer = document.querySelector('.orders-container');
    ordersContainer.innerHTML = this.getOrdersHTML(orders);
    
    this.attachThumbnailEvents();
    this.attachViewDetailsEvents();
  },
  
  attachThumbnailEvents: function() {
    const modal = document.getElementById('product-modal');
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
          order.isNew = false;
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
            <div><strong>📅 Fecha:</strong> ${order.date}</div>
            <div><strong>🔄 Estado:</strong> ${order.status}</div>
            <div><strong>💰 Total:</strong> $${order.data.total.toFixed(2)}</div>
          </div>
          
          <h3>👤 Datos del Cliente</h3>
          <div class="customer-info">
            <div><strong>Nombre:</strong> ${order.data.recipient.fullName || 'No especificado'}</div>
            <div><strong>🆔 CI:</strong> ${order.data.recipient.ci || 'No especificado'}</div>
            <div><strong>📱 Teléfono:</strong> ${order.data.recipient.phone || 'No especificado'}</div>
            <div><strong>📍 Provincia:</strong> ${order.data.recipient.province || 'No especificado'}</div>
          </div>
          
          <h3>💳 Información de Pago</h3>
          <div class="payment-info">
            <div><strong>Método:</strong> ${order.data.payment.method}</div>
            <div><strong>🔑 ID Transferencia:</strong> ${order.data.payment.transferId || 'N/A'}</div>
            ${order.data.payment.transferProof ? `
              <div><strong>📸 Comprobante:</strong> <a href="${order.data.payment.transferProof}" target="_blank">Ver imagen</a></div>
            ` : ''}
          </div>
          
          <h3>🛒 Productos</h3>
          <div class="order-products">
            ${order.data.items.map(item => `
              <div class="order-product-item">
                <div class="product-details">
                  <div>${item.product_name}</div>
                  <div>${item.quantity} x $${item.price.toFixed(2)}</div>
                  <div>$${(item.price * item.quantity).toFixed(2)}</div>
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

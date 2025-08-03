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
          date: new Date(order.createdAt).toLocaleDateString(),
          // Aquí estaba el error principal: no necesitamos anidar en "data"
          // Los campos ya vienen directamente en el objeto order
        }));
        // Si estamos en la modal de pedidos, actualizamos
        if (document.getElementById('orders-container')) {
          this.renderOrdersForClient('all');
        }
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
      const isUpdated = order.updatedAt && (new Date() - new Date(order.updatedAt)) < (24 * 60 * 60 * 1000);
      return `
        <div class="order-item ${order.isNew ? 'new-order' : ''}">
          <h3>📦 Pedido #${order.id} 
            ${order.isNew ? '<span class="new-badge">NUEVO</span>' : ''}
            ${isUpdated ? '<span class="updated-badge">ACTUALIZADO</span>' : ''}
          </h3>
          <p>📅 Fecha: ${order.date}</p>
          <p>💰 Total: $${order.total.toFixed(2)}</p>
          <p class="order-status">🔄 Estado: <span class="status-${order.status.toLowerCase().replace(/\s+/g, '-')}">${order.status}</span></p>
          
          <div class="order-thumbnails">
            ${order.items.map(item => `
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
              <div><strong>📸 Comprobante:</strong> <a href="${order.payment.transferProof}" target="_blank">Ver imagen</a></div>
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
          
          <h3>🛒 Productos</h3>
          <div class="order-products">
            ${order.items.map(item => `
              <div class="order-product-item">
                <div class="product-image">
                  ${item.image_url ? `<img src="${item.image_url}" alt="${item.product_name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : ''}
                </div>
                <div class="product-details">
                  <div><strong>${item.product_name}</strong></div>
                  <div>${item.quantity} x $${item.price.toFixed(2)}</div>
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

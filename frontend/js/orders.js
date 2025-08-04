const OrdersSystem = {
  orders: [],
  isLoading: false,
  
  init: async function() {
    try {
      console.groupCollapsed('[OrdersSystem] Iniciando');
      this.setupEventListeners();
      console.log('✅ OrdersSystem listo');
      return true;
    } catch (error) {
      console.error('[OrdersSystem] ❌ Init failed:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  },
  
  setupEventListeners: function() {
    console.log('[OrdersSystem] Configurando event listeners');
    // Eventos adicionales si son necesarios
  },
  
  loadOrders: async function() {
    try {
      console.groupCollapsed('[OrdersSystem] Cargando pedidos');
      
      if (this.isLoading) {
        console.log('⏳ Ya se está cargando, omitiendo...');
        return false;
      }
      
      this.isLoading = true;
      
      // Verificar dependencia crítica
      if (typeof UserProfile === 'undefined') {
        throw new Error("UserProfile no disponible");
      }
      
      const userId = UserProfile.getTelegramUserId();
      console.log(`🔍 User ID: ${userId || 'NO ENCONTRADO'}`);
      
      if (!userId) {
        throw new Error("ID de usuario requerido");
      }
      
      console.log(`🌐 GET ${window.API_BASE_URL}/api/orders/user/${userId}`);
      const response = await fetch(`${window.API_BASE_URL}/api/orders/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      
      const orders = await response.json();
      console.log(`📦 Recibidos ${orders.length} pedidos`);
      
      // Procesar pedidos
      this.orders = orders.map(order => ({
        ...order,
        createdAt: new Date(order.createdAt).toLocaleDateString(),
        updatedAt: order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : null,
        isNew: true
      }));
      
      console.log('✅ Pedidos cargados correctamente');
      return true;
    } catch (error) {
      console.error('[OrdersSystem] ❌ Error cargando pedidos:', error);
      
      // Mostrar notificación al usuario
      if (typeof Notifications !== 'undefined') {
        Notifications.showNotification('Error', 'No se pudieron cargar los pedidos');
      }
      
      return false;
    } finally {
      this.isLoading = false;
      console.groupEnd();
    }
  },
  
  openOrdersModal: async function() {
    try {
      console.groupCollapsed('[OrdersSystem] Abriendo modal de pedidos');
      
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
          <div class="modal-content">
            <div class="modal-header">
              <h2>📋 Mis Pedidos</h2>
              <button class="close-modal">&times;</button>
            </div>
            <div class="orders-container">
              <p>No tienes pedidos registrados</p>
              <button id="retry-load-orders" class="btn-primary">🔄 Reintentar</button>
            </div>
          </div>
        `;
        
        document.getElementById('retry-load-orders')?.addEventListener('click', async () => {
          await this.loadOrders();
          this.openOrdersModal();
        });
      } else {
        console.log(`📋 Mostrando ${this.orders.length} pedidos`);
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
        
        this.setupOrdersModalEvents();
      }
      
      console.log('✅ Modal de pedidos mostrado correctamente');
      console.groupEnd();
    } catch (error) {
      console.error('[OrdersSystem] ❌ Error en openOrdersModal:', error);
      console.groupEnd();
      
      if (typeof Notifications !== 'undefined') {
        Notifications.showNotification('Error', 'Error al mostrar pedidos');
      }
    }
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
      return '<p class="no-orders">No tienes pedidos registrados</p>';
    }
    
    return orders.map(order => {
      const isUpdated = order.updatedAt && 
        (new Date() - new Date(order.updatedAt)) < (24 * 60 * 60 * 1000);
      
      const thumbnails = order.items.slice(0, 5).map(item => {
        const imageUrl = item.image_url || 'https://via.placeholder.com/60';
        return `<img src="${imageUrl}" alt="${item.product_name}" class="order-thumb" data-src="${imageUrl}">`;
      }).join('');
      
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
            ${thumbnails}
          </div>
          
          <button class="view-order-details btn-primary" data-id="${order.id}">
            👁️ Ver detalles
          </button>
        </div>
      `;
    }).join('');
  },
  
  setupOrdersModalEvents: function() {
    console.log('[OrdersSystem] Configurando eventos del modal de pedidos');
    
    document.getElementById('client-status-filter')?.addEventListener('change', (e) => {
      this.renderOrdersForClient(e.target.value);
    });
    
    document.getElementById('client-sort-by')?.addEventListener('change', () => {
      this.renderOrdersForClient(document.getElementById('client-status-filter').value);
    });
    
    document.querySelectorAll('.view-order-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.target.getAttribute('data-id');
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
          order.isNew = false;
          this.viewOrderDetails(order);
        }
      });
    });
    
    document.querySelectorAll('.order-thumb').forEach(thumb => {
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
  
  renderOrdersForClient: function(statusFilter = 'all') {
    const sortBy = document.getElementById('client-sort-by')?.value || 'newest';
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
    
    const ordersContainer = document.getElementById('orders-container');
    if (ordersContainer) {
      ordersContainer.innerHTML = this.getOrdersHTML(orders);
      this.setupOrdersModalEvents();
    }
  },
  
  viewOrderDetails: function(order) {
    console.log(`[OrdersSystem] Mostrando detalles del pedido #${order.id}`);
    const modal = document.getElementById('product-modal');
    
    const recipientHTML = order.recipient ? `
      <h3>📦 Datos del Receptor</h3>
      <div class="recipient-info">
        <div><strong>Nombre:</strong> ${order.recipient.fullName || 'N/A'}</div>
        <div><strong>CI:</strong> ${order.recipient.ci || 'N/A'}</div>
        <div><strong>Teléfono:</strong> ${order.recipient.phone || 'N/A'}</div>
      </div>
    ` : '';
    
    const requiredFieldsHTML = order.requiredFields ? `
      <h3>📝 Campos Requeridos</h3>
      <div class="required-fields-info">
        ${Object.entries(order.requiredFields).map(([key, value]) => `
          <div><strong>${key}:</strong> ${value}</div>
        `).join('')}
      </div>
    ` : '';
    
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
          
          ${recipientHTML}
          ${requiredFieldsHTML}
          
          <h3>🛒 Productos</h3>
          <div class="order-products">
            ${order.items.map(item => {
              const imageUrl = item.image_url || 'https://via.placeholder.com/60';
              return `
                <div class="order-product-item">
                  <div class="product-image">
                    <img src="${imageUrl}" 
                         alt="${item.product_name}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                  </div>
                  <div class="product-details">
                    <div><strong>${item.product_name}</strong></div>
                    <div>${item.quantity} × $${item.price.toFixed(2)}</div>
                    <div>Total: $${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="modal-footer">
            <button class="btn-primary" id="back-to-orders">← Volver a pedidos</button>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('back-to-orders')?.addEventListener('click', () => {
      this.openOrdersModal();
    });
    
    document.querySelector('.close-modal')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
};

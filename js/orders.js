const OrdersSystem = {
  orders: [],
  
  init: function() {
      this.loadOrders();
  },
  
  createOrder: function(orderData) {
      const newOrder = {
          id: 'ORD-' + Date.now(),
          date: new Date().toLocaleString(),
          data: orderData,
          status: 'Pendiente',
          isNew: true
      };
      
      this.orders.unshift(newOrder);
      this.saveOrders();
      
      Notifications.showNotification('📦 Pedido creado', 'Tu pedido #' + newOrder.id + ' ha sido registrado');
      Notifications.addNotification('Nuevo pedido', 'Se ha creado el pedido #' + newOrder.id);
      
      return newOrder;
  },
  
  getOrders: function() {
      return this.orders;
  },
  
  getOrderById: function(orderId) {
      return this.orders.find(order => order.id === orderId);
  },
  
  updateOrderStatus: function(orderId, newStatus) {
      const order = this.getOrderById(orderId);
      if (order) {
          const oldStatus = order.status;
          order.status = newStatus;
          order.isNew = false;
          order.updatedAt = new Date().toISOString();
          this.saveOrders();
          
          if (oldStatus !== newStatus) {
              Notifications.showNotification(
                  '🔄 Estado actualizado', 
                  'Tu pedido #' + orderId + ' ahora está: ' + newStatus
              );
              Notifications.addNotification('Estado actualizado', 'El pedido #' + orderId + ' está ahora: ' + newStatus);
          }
      }
  },
  
  openOrdersModal: function() {
      const modal = document.getElementById('product-modal');
      
      const filterControls = `
          <div class="order-controls">
              <div class="order-filter">
                  <label>Filtrar por estado:</label>
                  <select id="client-status-filter">
                      <option value="all">Todos</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="En proceso">En proceso</option>
                      <option value="Enviado">Enviado</option>
                      <option value="Completado">Completado</option>
                  </select>
              </div>
              <div class="order-sort">
                  <label>Ordenar por:</label>
                  <select id="client-sort-by">
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
              <div class="orders-container">
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
                  <h3>Pedido #${order.id} 
                      ${order.isNew ? '<span class="new-badge">NUEVO</span>' : ''}
                      ${isUpdated ? '<span class="updated-badge">ACTUALIZADO</span>' : ''}
                  </h3>
                  <p>Fecha: ${order.date}</p>
                  <p>Total: $${order.data.total.toFixed(2)}</p>
                  <p class="order-status">Estado: <span class="status-${order.status.toLowerCase().replace(/\s+/g, '-')}">${order.status}</span></p>
                  
                  <div class="order-thumbnails">
                      ${order.data.items.map(item => `
                          <img src="${item.imageUrl || 'placeholder.jpg'}" 
                               alt="${item.name}" 
                               class="order-thumb"
                               data-src="${item.imageUrl || 'placeholder.jpg'}">
                      `).join('')}
                  </div>
                  
                  <button class="view-order-details" data-id="${order.id}">Ver detalles</button>
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
          orders.sort((a, b) => new Date(b.date) - new Date(a.date));
      } else if (sortBy === 'oldest') {
          orders.sort((a, b) => new Date(a.date) - new Date(b.date));
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
              const order = this.getOrderById(orderId);
              if (order) {
                  order.isNew = false;
                  this.saveOrders();
                  Notifications.renderNotificationCount();
              }
              AdminSystem.viewOrderDetails(orderId);
          });
      });
  },
  
  saveOrders: function() {
      localStorage.setItem('orders', JSON.stringify(this.orders));
  },
  
  loadOrders: function() {
      const savedOrders = localStorage.getItem('orders');
      if (savedOrders) {
          this.orders = JSON.parse(savedOrders);
      }
  }
};

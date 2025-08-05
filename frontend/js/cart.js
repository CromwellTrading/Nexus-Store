const CartSystem = {
  cart: { items: [] },
  isCartModalOpen: false,
  
  init: function() {
    console.log('[CartSystem] Inicializando sistema de carrito...');
    
    // Verificar elementos del DOM
    this.cartButton = document.getElementById('cart-button');
    if (!this.cartButton) {
      console.error('[CartSystem] ERROR: No se encontró el botón con ID "cart-button"');
      return;
    }
    console.log('[CartSystem] Botón del carrito encontrado:', this.cartButton);

    this.modal = document.getElementById('product-modal');
    if (!this.modal) {
      console.error('[CartSystem] ERROR: No se encontró el modal con ID "product-modal"');
      return;
    }
    console.log('[CartSystem] Modal encontrado:', this.modal);

    // Añadir event listeners
    this.cartButton.addEventListener('click', () => {
      console.log('[CartSystem] Click en botón del carrito detectado');
      this.openCartModal();
    });

    // Cargar carrito inicial
    this.loadCart()
      .then(() => {
        console.log('[CartSystem] Carrito inicial cargado:', this.cart);
        this.updateCartIcon();
      })
      .catch(error => {
        console.error('[CartSystem] Error cargando carrito inicial:', error);
      });

    console.log('[CartSystem] Sistema de carrito inicializado correctamente');
  },
  
  async loadCart() {
    console.log('[CartSystem] Cargando carrito...');
    const userId = UserProfile.getTelegramUserId();
    
    if (!userId) {
      console.log('[CartSystem] No hay usuario identificado, no se puede cargar el carrito');
      return;
    }
    
    try {
      console.log(`[CartSystem] Obteniendo carrito para usuario ${userId}`);
      const response = await fetch(`${window.API_BASE_URL}/api/cart/${userId}`);
      
      if (!response.ok) {
        console.error(`[CartSystem] Error en la respuesta: ${response.status}`);
        throw new Error('Error al cargar el carrito');
      }
      
      const cartData = await response.json();
      console.log('[CartSystem] Datos del carrito recibidos:', cartData);
      
      this.cart = cartData;
      this.updateCartIcon();
    } catch (error) {
      console.error('[CartSystem] Error cargando carrito:', error);
    }
  },
  
  async addToCart(productId, tabType) {
    console.log(`[CartSystem] Añadiendo al carrito - Producto: ${productId}, Tipo: ${tabType}`);
    const userId = UserProfile.getTelegramUserId();
    if (!userId) {
      console.log('[CartSystem] Usuario no identificado');
      alert('Por favor inicia sesión primero');
      return;
    }
    
    try {
      console.log('[CartSystem] Enviando petición para añadir al carrito...');
      const response = await fetch(`${window.API_BASE_URL}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId, tabType })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('[CartSystem] Error en la respuesta:', result.error);
        throw new Error(result.error || 'Error desconocido');
      }
      
      console.log('[CartSystem] Producto añadido correctamente:', result);
      this.cart = result;
      this.updateCartIcon();
      Notifications.showNotification('🛒 Producto añadido', `¡Producto añadido al carrito!`);
    } catch (error) {
      console.error('[CartSystem] Error añadiendo al carrito:', error);
      Notifications.showNotification('❌ Error', error.message || 'No se pudo añadir al carrito');
    }
  },
  
  async removeFromCart(productId, tabType) {
    console.log(`[CartSystem] Eliminando del carrito - Producto: ${productId}, Tipo: ${tabType}`);
    const userId = UserProfile.getTelegramUserId();
    try {
      console.log('[CartSystem] Enviando petición para eliminar...');
      const response = await fetch(`${window.API_BASE_URL}/api/cart/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId, tabType })
      });
      
      if (!response.ok) {
        console.error('[CartSystem] Error en la respuesta');
        throw new Error('Error al eliminar del carrito');
      }
      
      console.log('[CartSystem] Producto eliminado correctamente');
      this.cart = await response.json();
      this.updateCartIcon();
      if (this.isCartModalOpen) this.openCartModal();
    } catch (error) {
      console.error('[CartSystem] Error eliminando del carrito:', error);
    }
  },
  
  async updateCartItemQuantity(productId, tabType, newQuantity) {
    console.log(`[CartSystem] Actualizando cantidad - Producto: ${productId}, Cantidad: ${newQuantity}`);
    const userId = UserProfile.getTelegramUserId();
    try {
      console.log('[CartSystem] Enviando petición para actualizar cantidad...');
      const response = await fetch(`${window.API_BASE_URL}/api/cart/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          productId, 
          tabType, 
          quantity: newQuantity 
        })
      });
      
      if (!response.ok) {
        console.error('[CartSystem] Error en la respuesta');
        throw new Error('Error actualizando cantidad');
      }
      
      console.log('[CartSystem] Cantidad actualizada correctamente');
      this.cart = await response.json();
      this.updateCartIcon();
      if (this.isCartModalOpen) this.openCartModal();
    } catch (error) {
      console.error('[CartSystem] Error actualizando cantidad:', error);
    }
  },
  
  async openCartModal() {
    console.log('[CartSystem] Abriendo modal del carrito...');
    console.log('[CartSystem] Estado actual del modal:', this.isCartModalOpen);
    
    await this.loadCart();
    this.isCartModalOpen = true;
    console.log('[CartSystem] Modal marcado como abierto');
    
    if (!this.modal) {
      console.error('[CartSystem] ERROR: Modal no encontrado');
      return;
    }

    console.log('[CartSystem] Preparando contenido del carrito...');
    let cartContent = '<p>Tu carrito está vacío</p>';
    let totalByCurrency = {};
    
    if (this.cart.items && this.cart.items.length > 0) {
      console.log(`[CartSystem] ${this.cart.items.length} items en el carrito`);
      
      cartContent = await Promise.all(this.cart.items.map(async item => {
        console.log(`[CartSystem] Procesando item: ${item.productId} (${item.tabType})`);
        
        const product = await ProductView.getProductById(item.productId, item.tabType);
        if (!product) {
          console.warn(`[CartSystem] Producto ${item.productId} no encontrado`);
          return '';
        }
        
        const prices = product.prices;
        const price = prices?.CUP || Object.values(prices)[0] || 0;
        const itemTotal = price * item.quantity;
        
        Object.entries(prices || {}).forEach(([currency, priceVal]) => {
          if (priceVal) {
            totalByCurrency[currency] = (totalByCurrency[currency] || 0) + (priceVal * item.quantity);
          }
        });
        
        let imageUrl = 'placeholder.jpg';
        if (product.images && product.images.length > 0) {
          imageUrl = Array.isArray(product.images) ? product.images[0] : product.images;
        }
        
        return `
          <div class="cart-item">
            <img src="${imageUrl}" 
                  alt="${product.name}" 
                  style="width: 60px; height: 60px; object-fit: cover;">
            <div>
                <h3>${product.name}</h3>
                <div>${price} CUP x ${item.quantity}</div>
                <div>Total: ${itemTotal.toFixed(2)} CUP</div>
            </div>
            <div class="cart-buttons">
                <button class="decrease-quantity" data-id="${item.productId}" data-tab="${item.tabType}">-</button>
                <span>${item.quantity}</span>
                <button class="increase-quantity" data-id="${item.productId}" data-tab="${item.tabType}">+</button>
                <button class="remove-item" data-id="${item.productId}" data-tab="${item.tabType}">Eliminar</button>
            </div>
          </div>
        `;
      })).then(items => items.join(''));
    } else {
      console.log('[CartSystem] El carrito está vacío');
    }
    
    let totalDisplay = '';
    if (Object.keys(totalByCurrency).length > 0) {
      totalDisplay = Object.entries(totalByCurrency)
        .map(([currency, amount]) => 
          `<div>💰 Total ${currency}: ${amount.toFixed(2)}</div>`
        )
        .join('');
    }
    
    this.modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🛒 Carrito de Compras</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="cart-items" style="max-height: 50vh; overflow-y: auto; margin-bottom: 20px;">
          ${cartContent}
        </div>
        <div style="font-weight: bold; text-align: right; margin-bottom: 20px; font-size: 1.2rem;">
          ${totalDisplay}
        </div>
        <button id="checkout-button" class="checkout-btn" ${this.cart.items.length === 0 ? 'disabled' : ''}>
          ✅ Finalizar Compra
        </button>
      </div>
    `;
    
    this.modal.style.display = 'flex';
    console.log('[CartSystem] Modal mostrado en pantalla');
    
    this.modal.querySelector('.close-modal').addEventListener('click', () => {
      console.log('[CartSystem] Botón cerrar modal clickeado');
      this.isCartModalOpen = false;
      this.modal.style.display = 'none';
    });
    
    if (this.cart.items.length > 0) {
      console.log('[CartSystem] Añadiendo listeners para botones de items...');
      
      this.modal.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          console.log(`[CartSystem] Eliminando item: ${productId} (${tabType})`);
          this.removeFromCart(productId, tabType);
        });
      });
      
      this.modal.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          const item = this.cart.items.find(i => i.productId === productId && i.tabType === tabType);
          if (item) {
            console.log(`[CartSystem] Incrementando cantidad de ${productId} a ${item.quantity + 1}`);
            this.updateCartItemQuantity(productId, tabType, item.quantity + 1);
          }
        });
      });
      
      this.modal.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          const item = this.cart.items.find(i => i.productId === productId && i.tabType === tabType);
          if (item && item.quantity > 1) {
            console.log(`[CartSystem] Reduciendo cantidad de ${productId} a ${item.quantity - 1}`);
            this.updateCartItemQuantity(productId, tabType, item.quantity - 1);
          }
        });
      });
      
      const checkoutButton = this.modal.querySelector('#checkout-button');
      if (checkoutButton) {
        checkoutButton.addEventListener('click', () => {
          console.log('[CartSystem] Botón checkout clickeado');
          CheckoutSystem.openCheckout(this.cart, totalByCurrency);
        });
      } else {
        console.warn('[CartSystem] No se encontró el botón de checkout');
      }
    }
  },
  
  updateCartIcon: function() {
    console.log('[CartSystem] Actualizando icono del carrito...');
    if (!this.cartButton) {
      console.error('[CartSystem] ERROR: Botón del carrito no encontrado');
      return;
    }
    
    let itemCount = this.cart.items.reduce((count, item) => count + item.quantity, 0);
    console.log(`[CartSystem] Total items en el carrito: ${itemCount}`);
    
    let counter = this.cartButton.querySelector('.cart-counter');
    if (!counter) {
      console.log('[CartSystem] Creando contador del carrito');
      counter = document.createElement('span');
      counter.className = 'cart-counter';
      this.cartButton.appendChild(counter);
    }
    
    counter.textContent = itemCount;
    counter.style.display = itemCount > 0 ? 'flex' : 'none';
    console.log('[CartSystem] Icono del carrito actualizado');
  },
  
  clearCart: function() {
    console.log('[CartSystem] Limpiando carrito...');
    const userId = UserProfile.getTelegramUserId();
    if (!userId) {
      console.log('[CartSystem] Usuario no identificado');
      return;
    }
    
    console.log(`[CartSystem] Enviando petición para limpiar carrito de usuario ${userId}`);
    fetch(`${window.API_BASE_URL}/api/cart/clear/${userId}`, {
      method: 'POST'
    })
    .then(response => {
      if (response.ok) {
        console.log('[CartSystem] Carrito limpiado con éxito');
        this.cart = { items: [] };
        this.updateCartIcon();
      } else {
        console.error('[CartSystem] Error al limpiar carrito');
      }
    })
    .catch(error => console.error('[CartSystem] Error vaciando carrito:', error));
  }
};

const CartSystem = {
  cart: { items: [] },
  isCartModalOpen: false,
  
  init: function() {
    console.log('[Cart] Inicializando sistema de carrito');
    this.loadCart();
    this.updateCartIcon();
    
    const cartButton = document.getElementById('cart-button');
    if (!cartButton) {
      console.error('[Cart] Error: No se encontró el botón del carrito con ID "cart-button"');
      return;
    }
    
    console.log('[Cart] Añadiendo event listener al botón del carrito');
    cartButton.addEventListener('click', () => {
      console.log('[Cart] Botón del carrito clickeado');
      this.openCartModal();
    });
  },
  
  async loadCart() {
    console.log('[Cart] Cargando carrito...');
    const userId = UserProfile.getTelegramUserId();
    
    if (!userId) {
      console.log('[Cart] No hay usuario identificado, no se puede cargar el carrito');
      return;
    }
    
    try {
      console.log(`[Cart] Haciendo petición para cargar carrito del usuario ${userId}`);
      const response = await fetch(`${window.API_BASE_URL}/api/cart/${userId}`);
      
      if (!response.ok) {
        console.error(`[Cart] Error en la respuesta al cargar carrito: ${response.status}`);
        throw new Error('Error al cargar el carrito');
      }
      
      const cartData = await response.json();
      console.log('[Cart] Datos del carrito recibidos:', cartData);
      
      this.cart = cartData;
      this.updateCartIcon();
    } catch (error) {
      console.error('[Cart] Error cargando carrito:', error);
    }
  },
  
  async addToCart(productId) {
    console.log(`[Cart] ADD producto al carrito - Producto: ${productId}`);
    const userId = UserProfile.getTelegramUserId();
    if (!userId) {
      console.log('[Cart] Usuario no identificado al intentar añadir al carrito');
      alert('Por favor inicia sesión primero');
      return;
    }
    
    try {
      console.log('[Cart] Enviando petición para añadir al carrito');
      const response = await fetch(`${window.API_BASE_URL}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId, tabType: 'digital' })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('[Cart] Error en la respuesta del servidor:', result.error);
        throw new Error(result.error || 'Error desconocido');
      }
      
      console.log('[Cart] Producto añadido correctamente al carrito');
      this.cart = result;
      this.updateCartIcon();
      Notifications.showNotification('🛒 Producto añadido', `¡Producto añadido al carrito!`);
    } catch (error) {
      console.error('[Cart] Error añadiendo al carrito:', error);
      Notifications.showNotification('❌ Error', error.message || 'No se pudo añadir al carrito');
    }
  },
  
  async removeFromCart(productId) {
    console.log(`[Cart] REMOVE producto del carrito - Producto: ${productId}`);
    const userId = UserProfile.getTelegramUserId();
    try {
      console.log('[Cart] Enviando petición para eliminar del carrito');
      const response = await fetch(`${window.API_BASE_URL}/api/cart/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId, tabType: 'digital' })
      });
      
      if (!response.ok) {
        console.error('[Cart] Error en la respuesta del servidor');
        throw new Error('Error al eliminar del carrito');
      }
      
      console.log('[Cart] Producto eliminado correctamente del carrito');
      this.cart = await response.json();
      this.updateCartIcon();
      if (this.isCartModalOpen) this.openCartModal();
    } catch (error) {
      console.error('[Cart] Error eliminando del carrito:', error);
    }
  },
  
  async updateCartItemQuantity(productId, newQuantity) {
    console.log(`[Cart] UPDATE cantidad producto - Producto: ${productId}, Nueva cantidad: ${newQuantity}`);
    const userId = UserProfile.getTelegramUserId();
    try {
      console.log('[Cart] Enviando petición para actualizar cantidad');
      const response = await fetch(`${window.API_BASE_URL}/api/cart/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          productId, 
          tabType: 'digital', 
          quantity: newQuantity 
        })
      });
      
      if (!response.ok) {
        console.error('[Cart] Error en la respuesta del servidor');
        throw new Error('Error actualizando cantidad');
      }
      
      console.log('[Cart] Cantidad actualizada correctamente');
      this.cart = await response.json();
      this.updateCartIcon();
      if (this.isCartModalOpen) this.openCartModal();
    } catch (error) {
      console.error('[Cart] Error actualizando cantidad:', error);
    }
  },
  
  async openCartModal() {
    console.log('[Cart] Abriendo modal del carrito...');
    console.log('[Cart] Estado actual del modal:', this.isCartModalOpen);
    
    await this.loadCart();
    this.isCartModalOpen = true;
    console.log('[Cart] Modal marcado como abierto');
    
    const modal = document.getElementById('product-modal');
    if (!modal) {
      console.error('[Cart] Error: No se encontró el modal con ID "product-modal"');
      return;
    }
    
    console.log('[Cart] Preparando contenido del carrito...');
    let cartContent = '<p>Tu carrito está vacío</p>';
    let totalByCurrency = {};
    
    if (this.cart.items && this.cart.items.length > 0) {
      console.log(`[Cart] Hay ${this.cart.items.length} items en el carrito`);
      
      cartContent = await Promise.all(this.cart.items.map(async item => {
        console.log(`[Cart] Procesando item: ${item.productId}`);
        
        const product = await ProductView.getProductById(item.productId);
        if (!product) {
          console.warn(`[Cart] Producto ${item.productId} no encontrado`);
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
                <button class="decrease-quantity" data-id="${item.productId}">-</button>
                <span>${item.quantity}</span>
                <button class="increase-quantity" data-id="${item.productId}">+</button>
                <button class="remove-item" data-id="${item.productId}">Eliminar</button>
            </div>
          </div>
        `;
      })).then(items => items.join(''));
    } else {
      console.log('[Cart] El carrito está vacío');
    }
    
    let totalDisplay = '';
    if (Object.keys(totalByCurrency).length > 0) {
      totalDisplay = Object.entries(totalByCurrency)
        .map(([currency, amount]) => 
          `<div>💰 Total ${currency}: ${amount.toFixed(2)}</div>`
        )
        .join('');
    }
    
    modal.innerHTML = `
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
    
    modal.style.display = 'flex';
    console.log('[Cart] Modal mostrado en pantalla');
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      console.log('[Cart] Botón cerrar modal clickeado');
      this.isCartModalOpen = false;
      modal.style.display = 'none';
    });
    
    if (this.cart.items.length > 0) {
      console.log('[Cart] Añadiendo listeners para botones de items');
      
      modal.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          console.log(`[Cart] Eliminando item: ${productId}`);
          this.removeFromCart(productId);
        });
      });
      
      modal.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const item = this.cart.items.find(i => i.productId === productId);
          if (item) {
            console.log(`[Cart] Incrementando cantidad de ${productId} a ${item.quantity + 1}`);
            this.updateCartItemQuantity(productId, item.quantity + 1);
          }
        });
      });
      
      modal.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const item = this.cart.items.find(i => i.productId === productId);
          if (item && item.quantity > 1) {
            console.log(`[Cart] Reduciendo cantidad de ${productId} a ${item.quantity - 1}`);
            this.updateCartItemQuantity(productId, item.quantity - 1);
          }
        });
      });
      
      const checkoutButton = modal.querySelector('#checkout-button');
      if (checkoutButton) {
        checkoutButton.addEventListener('click', () => {
          console.log('[Cart] Botón checkout clickeado');
          CheckoutSystem.openCheckout(this.cart, totalByCurrency);
        });
      } else {
        console.warn('[Cart] No se encontró el botón de checkout');
      }
    }
  },
  
  updateCartIcon: function() {
    console.log('[Cart] Actualizando icono del carrito');
    const cartButton = document.getElementById('cart-button');
    if (!cartButton) {
      console.error('[Cart] Error: No se encontró el botón del carrito');
      return;
    }
    
    let itemCount = this.cart.items.reduce((count, item) => count + item.quantity, 0);
    console.log(`[Cart] Total de items en el carrito: ${itemCount}`);
    
    let counter = cartButton.querySelector('.cart-counter');
    if (!counter) {
      console.log('[Cart] Creando contador del carrito');
      counter = document.createElement('span');
      counter.className = 'cart-counter';
      cartButton.appendChild(counter);
    }
    
    counter.textContent = itemCount;
    counter.style.display = itemCount > 0 ? 'flex' : 'none';
    console.log('[Cart] Icono del carrito actualizado');
  },
  
  clearCart: function() {
    console.log('[Cart] Limpiando carrito');
    const userId = UserProfile.getTelegramUserId();
    if (!userId) {
      console.log('[Cart] Usuario no identificado al intentar limpiar carrito');
      return;
    }
    
    console.log(`[Cart] Enviando petición para limpiar carrito de usuario ${userId}`);
    fetch(`${window.API_BASE_URL}/api/cart/clear/${userId}`, {
      method: 'POST'
    })
    .then(response => {
      if (response.ok) {
        console.log('[Cart] Carrito limpiado con éxito');
        this.cart = { items: [] };
        this.updateCartIcon();
      } else {
        console.error('[Cart] Error al limpiar carrito');
      }
    })
    .catch(error => console.error('[Cart] Error vaciando carrito:', error));
  }
};

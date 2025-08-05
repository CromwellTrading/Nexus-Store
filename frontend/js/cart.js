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

    this.modal = document.getElementById('product-modal');
    if (!this.modal) {
      console.error('[CartSystem] ERROR: No se encontró el modal con ID "product-modal"');
      return;
    }

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
      
      // Filtrar items que no existen en la base de datos
      const validItems = await this.filterValidItems(cartData.items);
      this.cart = { ...cartData, items: validItems };
      
      // Si hubo cambios, actualizar en el servidor
      if (validItems.length !== cartData.items.length) {
        await this.syncCart(userId, validItems);
      }
      
      this.updateCartIcon();
    } catch (error) {
      console.error('[CartSystem] Error cargando carrito:', error);
    }
  },
  
  async filterValidItems(items) {
    if (!items || items.length === 0) return [];
    
    console.log('[CartSystem] Filtrando items válidos...');
    const validItems = [];
    
    for (const item of items) {
      try {
        console.log(`[CartSystem] Verificando producto: ${item.productId} (${item.tabType})`);
        const product = await ProductView.getProductById(item.productId, item.tabType);
        
        if (product) {
          validItems.push(item);
        } else {
          console.warn(`[CartSystem] Producto no encontrado, eliminando: ${item.productId}`);
        }
      } catch (error) {
        console.error(`[CartSystem] Error verificando producto ${item.productId}:`, error);
      }
    }
    
    return validItems;
  },
  
  async syncCart(userId, items) {
    try {
      console.log('[CartSystem] Sincronizando carrito con servidor...');
      const response = await fetch(`${window.API_BASE_URL}/api/cart/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          items 
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al sincronizar carrito');
      }
      
      console.log('[CartSystem] Carrito sincronizado correctamente');
    } catch (error) {
      console.error('[CartSystem] Error sincronizando carrito:', error);
    }
  },
  
  async openCartModal() {
    console.log('[CartSystem] Abriendo modal del carrito...');
    
    try {
      await this.loadCart();
      this.isCartModalOpen = true;
      
      if (!this.modal) {
        console.error('[CartSystem] ERROR: Modal no encontrado');
        return;
      }

      let cartContent = '<p>Tu carrito está vacío</p>';
      let totalByCurrency = {};
      
      if (this.cart.items && this.cart.items.length > 0) {
        console.log(`[CartSystem] Preparando ${this.cart.items.length} items`);
        
        cartContent = await Promise.all(this.cart.items.map(async item => {
          try {
            const product = await ProductView.getProductById(item.productId, item.tabType);
            if (!product) return '';
            
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
          } catch (error) {
            console.error(`[CartSystem] Error procesando item ${item.productId}:`, error);
            return '';
          }
        })).then(items => items.filter(item => item !== '').join(''));
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
          ${this.createTotalDisplay(totalByCurrency)}
          <button id="checkout-button" class="checkout-btn" ${this.cart.items.length === 0 ? 'disabled' : ''}>
            ✅ Finalizar Compra
          </button>
        </div>
      `;
      
      this.modal.style.display = 'flex';
      this.setupModalEvents();
      
    } catch (error) {
      console.error('[CartSystem] Error abriendo modal:', error);
      Notifications.showNotification('❌ Error', 'No se pudo cargar el carrito');
    }
  },
  
  createTotalDisplay(totalByCurrency) {
    if (Object.keys(totalByCurrency).length === 0) return '';
    
    return `
      <div style="font-weight: bold; text-align: right; margin-bottom: 20px; font-size: 1.2rem;">
        ${Object.entries(totalByCurrency)
          .map(([currency, amount]) => 
            `<div>💰 Total ${currency}: ${amount.toFixed(2)}</div>`
          ).join('')}
      </div>
    `;
  },
  
  setupModalEvents() {
    this.modal.querySelector('.close-modal').addEventListener('click', () => {
      this.isCartModalOpen = false;
      this.modal.style.display = 'none';
    });

    if (this.cart.items.length > 0) {
      this.modal.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          this.removeFromCart(productId, tabType);
        });
      });
      
      this.modal.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          const item = this.cart.items.find(i => i.productId === productId && i.tabType === tabType);
          if (item) this.updateCartItemQuantity(productId, tabType, item.quantity + 1);
        });
      });
      
      this.modal.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          const item = this.cart.items.find(i => i.productId === productId && i.tabType === tabType);
          if (item && item.quantity > 1) {
            this.updateCartItemQuantity(productId, tabType, item.quantity - 1);
          }
        });
      });
      
      const checkoutButton = this.modal.querySelector('#checkout-button');
      if (checkoutButton) {
        checkoutButton.addEventListener('click', () => {
          CheckoutSystem.openCheckout(this.cart, totalByCurrency);
        });
      }
    }
  },

  // ... (resto de los métodos se mantienen igual)
  updateCartIcon: function() {
    console.log('[CartSystem] Actualizando icono del carrito');
    const cartButton = document.getElementById('cart-button');
    if (!cartButton) {
      console.error('[CartSystem] Error: No se encontró el botón del carrito');
      return;
    }
    
    let itemCount = this.cart.items.reduce((count, item) => count + item.quantity, 0);
    console.log(`[CartSystem] Total items en el carrito: ${itemCount}`);
    
    let counter = cartButton.querySelector('.cart-counter');
    if (!counter) {
      console.log('[CartSystem] Creando contador del carrito');
      counter = document.createElement('span');
      counter.className = 'cart-counter';
      cartButton.appendChild(counter);
    }
    
    counter.textContent = itemCount;
    counter.style.display = itemCount > 0 ? 'flex' : 'none';
    console.log('[CartSystem] Icono del carrito actualizado');
  },
  
  clearCart: function() {
    console.log('[CartSystem] Limpiando carrito');
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

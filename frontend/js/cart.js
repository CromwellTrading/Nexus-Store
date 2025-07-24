const CartSystem = {
  cart: { items: [] },
  isCartModalOpen: false,
  
  init: function() {
    this.loadCart();
    this.updateCartIcon();
    
    // Configurar evento para el botón del carrito
    document.getElementById('cart-button').addEventListener('click', () => {
      this.openCartModal();
    });
  },
  
  async loadCart() {
    const userId = UserProfile.getTelegramUserId();
    if (!userId) return;
    
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/cart/${userId}`);
      if (!response.ok) {
        throw new Error('Error al cargar el carrito');
      }
      this.cart = await response.json();
      this.updateCartIcon();
    } catch (error) {
      console.error('Error cargando carrito:', error);
    }
  },
  
  async addToCart(productId, tabType) {
    const userId = UserProfile.getTelegramUserId();
    if (!userId) {
      alert('Por favor inicia sesión primero');
      return;
    }
    
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId, tabType })
      });
      
      if (!response.ok) {
        throw new Error('Error al añadir al carrito');
      }
      
      this.cart = await response.json();
      this.updateCartIcon();
      if (Notifications && Notifications.showNotification) {
        Notifications.showNotification('🛒 Producto añadido', `Producto añadido al carrito!`);
      }
    } catch (error) {
      console.error('Error añadiendo al carrito:', error);
      if (Notifications && Notifications.showNotification) {
        Notifications.showNotification('❌ Error', 'No se pudo añadir al carrito');
      }
    }
  },
  
  async removeFromCart(productId, tabType) {
    const userId = UserProfile.getTelegramUserId();
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/cart/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId, tabType })
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar del carrito');
      }
      
      this.cart = await response.json();
      this.updateCartIcon();
      if (this.isCartModalOpen) {
        this.openCartModal();
      }
    } catch (error) {
      console.error('Error eliminando del carrito:', error);
    }
  },
  
  async updateCartItemQuantity(productId, tabType, newQuantity) {
    const userId = UserProfile.getTelegramUserId();
    try {
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
        throw new Error('Error actualizando cantidad');
      }
      
      this.cart = await response.json();
      this.updateCartIcon();
      if (this.isCartModalOpen) {
        this.openCartModal();
      }
    } catch (error) {
      console.error('Error actualizando cantidad:', error);
    }
  },
  
  async openCartModal() {
    await this.loadCart(); // Asegurarse de tener los datos actualizados
    this.isCartModalOpen = true;
    
    const modal = document.getElementById('product-modal');
    let cartContent = '<p>Tu carrito está vacío</p>';
    
    if (this.cart.items && this.cart.items.length > 0) {
      cartContent = await Promise.all(this.cart.items.map(async item => {
        // Obtener detalles del producto
        const product = await ProductView.getProductById(item.productId, item.tabType);
        
        if (!product) return '';
        
        // Obtener precio actual
        const price = product.prices ? 
          (product.prices.CUP || product.prices.MLC || product.prices['Saldo Móvil'] || 0) : 
          0;
        
        return `
          <div class="cart-item">
            <img src="${product.image || (product.images && product.images[0]) || 'placeholder.jpg'}" 
                  alt="${product.name}" 
                  style="width: 60px; height: 60px; object-fit: cover;">
            <div>
                <h3>${product.name}</h3>
                <div>${price} CUP x ${item.quantity}</div>
                <div>Total: ${(price * item.quantity).toFixed(2)} CUP</div>
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
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Carrito de Compras</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="cart-items" style="max-height: 50vh; overflow-y: auto; margin-bottom: 20px;">
          ${cartContent}
        </div>
        <div style="font-weight: bold; text-align: right; margin-bottom: 20px;">
          Total: $${this.getCartTotal().toFixed(2)} CUP
        </div>
        <button id="checkout-button" style="background: var(--success-color); color: white; border: none; padding: 12px; width: 100%; border-radius: 5px; font-size: 1rem;" ${this.cart.items.length === 0 ? 'disabled' : ''}>
          Finalizar Compra
        </button>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      this.isCartModalOpen = false;
      modal.style.display = 'none';
    });
    
    if (this.cart.items.length > 0) {
      modal.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          this.removeFromCart(productId, tabType);
        });
      });
      
      modal.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          const item = this.cart.items.find(i => i.productId == productId && i.tabType === tabType);
          if (item) {
            this.updateCartItemQuantity(productId, tabType, item.quantity + 1);
          }
        });
      });
      
      modal.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', (e) => {
          const productId = e.target.getAttribute('data-id');
          const tabType = e.target.getAttribute('data-tab');
          const item = this.cart.items.find(i => i.productId == productId && i.tabType === tabType);
          if (item) {
            this.updateCartItemQuantity(productId, tabType, item.quantity - 1);
          }
        });
      });
      
      const checkoutButton = modal.querySelector('#checkout-button');
      checkoutButton.addEventListener('click', () => {
        CheckoutSystem.openCheckout(this.cart, this.getCartTotal());
      });
    }
  },
  
  getCartTotal: function() {
    return this.cart.items.reduce((total, item) => {
      return total + (item.quantity * 10); // Precio temporal
    }, 0);
  },
  
  updateCartIcon: function() {
    const cartButton = document.getElementById('cart-button');
    let itemCount = this.cart.items.reduce((count, item) => count + item.quantity, 0);
    
    let counter = cartButton.querySelector('.cart-counter');
    if (!counter) {
      counter = document.createElement('span');
      counter.className = 'cart-counter';
      cartButton.appendChild(counter);
    }
    
    if (itemCount > 0) {
      counter.textContent = itemCount;
      counter.style.display = 'flex';
    } else {
      counter.style.display = 'none';
    }
  },
  
  clearCart: function() {
    const userId = UserProfile.getTelegramUserId();
    if (!userId) return;
    
    fetch(`${window.API_BASE_URL}/api/cart/clear/${userId}`, {
      method: 'POST'
    })
    .then(response => {
      if (response.ok) {
        this.cart = { items: [] };
        this.updateCartIcon();
      }
    })
    .catch(error => {
      console.error('Error vaciando carrito:', error);
    });
  }
};

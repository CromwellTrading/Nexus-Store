const CartSystem = {
  cart: [],
  isCartModalOpen: false,
  
  init: function() {
      this.loadCart();
      this.updateCartIcon();
  },
  
  addToCart: function(productId, tabType) {
      const product = ProductView.getProductById(productId, tabType);
      if (!product) return;
      
      const existingItem = this.cart.find(item => item.id == productId && item.tabType === tabType);
      
      if (existingItem) {
          existingItem.quantity += 1;
      } else {
          this.cart.push({
              id: product.id,
              name: product.name,
              price: this.getProductPriceForCart(product),
              currency: this.getProductCurrencyForCart(product),
              quantity: 1,
              tabType: tabType,
              imageUrl: this.getProductImage(product, tabType)
          });
      }
      
      this.saveCart();
      this.updateCartIcon();
      Notifications.showNotification('🛒 Producto añadido', `${product.name} añadido al carrito!`);
  },
  
  getProductImage: function(product, tabType) {
      if (tabType === 'fisico' && product.images && product.images.length > 0) {
          return product.images[0];
      } else if (tabType === 'digital' && product.image) {
          return product.image;
      }
      return 'placeholder.jpg';
  },
  
  getProductPriceForCart: function(product) {
      if (product.prices) {
          const firstCurrency = Object.keys(product.prices)[0];
          return product.prices[firstCurrency];
      }
      return 0;
  },
  
  getProductCurrencyForCart: function(product) {
      if (product.prices) {
          return Object.keys(product.prices)[0];
      }
      return 'CUP';
  },
  
  removeFromCart: function(productId, tabType) {
      this.cart = this.cart.filter(item => !(item.id == productId && item.tabType === tabType));
      this.saveCart();
      this.updateCartIcon();
      if (this.isCartModalOpen) {
          this.openCartModal();
      }
  },
  
  updateCartItemQuantity: function(productId, tabType, newQuantity) {
      const item = this.cart.find(item => item.id == productId && item.tabType === tabType);
      if (item) {
          if (newQuantity > 0) {
              item.quantity = newQuantity;
          } else {
              this.removeFromCart(productId, tabType);
          }
          this.saveCart();
          this.updateCartIcon();
          if (this.isCartModalOpen) {
              this.openCartModal();
          }
      }
  },
  
  openCartModal: function() {
      this.isCartModalOpen = true;
      const modal = document.getElementById('product-modal');
      
      let cartContent = '<p>Tu carrito está vacío</p>';
      if (this.cart.length > 0) {
          cartContent = this.cart.map(item => `
              <div class="cart-item">
                  <img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover;">
                  <div>
                      <h3>${item.name}</h3>
                      <div>${item.price} ${item.currency} x ${item.quantity}</div>
                      <div>Total: ${(item.price * item.quantity).toFixed(2)} ${item.currency}</div>
                  </div>
                  <div class="cart-buttons">
                      <button class="decrease-quantity" data-id="${item.id}" data-tab="${item.tabType}">-</button>
                      <span>${item.quantity}</span>
                      <button class="increase-quantity" data-id="${item.id}" data-tab="${item.tabType}">+</button>
                      <button class="remove-item" data-id="${item.id}" data-tab="${item.tabType}">Eliminar</button>
                  </div>
              </div>
          `).join('');
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
                  Total: $${this.getCartTotal().toFixed(2)}
              </div>
              <button id="checkout-button" style="background: var(--success-color); color: white; border: none; padding: 12px; width: 100%; border-radius: 5px; font-size: 1rem;" ${this.cart.length === 0 ? 'disabled' : ''}>
                  Finalizar Compra
              </button>
          </div>
      `;
      
      modal.style.display = 'flex';
      
      modal.querySelector('.close-modal').addEventListener('click', () => {
          this.isCartModalOpen = false;
          modal.style.display = 'none';
      });
      
      if (this.cart.length > 0) {
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
                  const item = this.cart.find(i => i.id == productId && i.tabType === tabType);
                  if (item) {
                      this.updateCartItemQuantity(productId, tabType, item.quantity + 1);
                  }
              });
          });
          
          modal.querySelectorAll('.decrease-quantity').forEach(button => {
              button.addEventListener('click', (e) => {
                  const productId = e.target.getAttribute('data-id');
                  const tabType = e.target.getAttribute('data-tab');
                  const item = this.cart.find(i => i.id == productId && i.tabType === tabType);
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
      return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  },
  
  updateCartIcon: function() {
      const cartButton = document.getElementById('cart-button');
      let itemCount = this.cart.reduce((count, item) => count + item.quantity, 0);
      
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
  
  saveCart: function() {
      localStorage.setItem('cart', JSON.stringify(this.cart));
  },
  
  loadCart: function() {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
          this.cart = JSON.parse(savedCart);
      }
  },
  
  clearCart: function() {
      this.cart = [];
      this.saveCart();
      this.updateCartIcon();
  }
};

const ProductModal = {
  currentTab: null,
  
  init: function() {
      const modal = document.getElementById('product-modal');
      if (!modal.querySelector('.modal-content')) {
          modal.innerHTML = `
              <div class="modal-content">
                  <div class="modal-header">
                      <h2 class="modal-product-name"></h2>
                      <button class="close-modal">&times;</button>
                  </div>
                  <div class="main-image"></div>
                  <div class="thumbnails"></div>
                  <div class="modal-product-price"></div>
                  <p class="modal-product-description"></p>
                  <button class="modal-add-to-cart">Añadir al carrito</button>
              </div>
          `;
      }
      
      modal.addEventListener('click', (e) => {
          if (e.target.classList.contains('close-modal') || e.target === modal) {
              this.closeModal();
          }
      });
  },
  
  openModal: function(productId, tabType) {
      this.currentTab = tabType;
      const product = ProductView.getProductById(productId, tabType);
      if (!product) return;

      const modal = document.getElementById('product-modal');
      
      modal.querySelector('.modal-product-name').textContent = product.name;
      
      const pricesHTML = Object.entries(product.prices || {})
          .map(([currency, price]) => `${price} ${currency}`)
          .join(' / ');
      
      modal.querySelector('.modal-product-price').textContent = pricesHTML;
      modal.querySelector('.modal-product-description').textContent = product.description;
      
      const addToCartBtn = modal.querySelector('.modal-add-to-cart');
      addToCartBtn.setAttribute('data-id', product.id);
      addToCartBtn.setAttribute('data-tab', tabType);
      
      const mainImage = modal.querySelector('.main-image');
      const thumbnailsContainer = modal.querySelector('.thumbnails');
      thumbnailsContainer.innerHTML = '';
      
      if (product.type === 'fisico' && product.images && product.images.length > 0) {
          mainImage.innerHTML = `<img src="${product.images[0]}" alt="${product.name}" style="max-width: 100%; max-height: 300px;">`;
          
          product.images.forEach((img, index) => {
              const thumb = document.createElement('div');
              thumb.className = 'thumbnail';
              thumb.innerHTML = `<img src="${img}" alt="Miniatura ${index + 1}" style="width: 50px; height: 50px; object-fit: cover;">`;
              thumb.addEventListener('click', () => {
                  mainImage.innerHTML = `<img src="${img}" alt="${product.name}" style="max-width: 100%; max-height: 300px;">`;
              });
              thumbnailsContainer.appendChild(thumb);
          });
      } else if (product.image) {
          mainImage.innerHTML = `<img src="${product.image}" alt="${product.name}" style="max-width: 100%; max-height: 300px;">`;
      } else {
          mainImage.innerHTML = '<p>No hay imagen disponible</p>';
      }
      
      addToCartBtn.onclick = () => {
          CartSystem.addToCart(product.id, tabType);
          this.closeModal();
      };
      
      modal.style.display = 'flex';
  },
  
  closeModal: function() {
      document.getElementById('product-modal').style.display = 'none';
  }
};
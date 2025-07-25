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
          <div class="main-image-container"></div>
          <div class="thumbnails-container"></div>
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
    ProductView.getProductById(productId, tabType)
      .then(product => {
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
        
        const mainImage = modal.querySelector('.main-image-container');
        const thumbnailsContainer = modal.querySelector('.thumbnails-container');
        mainImage.innerHTML = '';
        thumbnailsContainer.innerHTML = '';
        
        if (product.images && product.images.length > 0) {
          product.images.forEach((img, index) => {
            if (index === 0) {
              mainImage.innerHTML = `<img src="${img}" alt="${product.name}" class="main-image">`;
            }
            
            const thumb = document.createElement('div');
            thumb.className = 'thumbnail';
            thumb.innerHTML = `<img src="${img}" alt="Thumbnail ${index + 1}">`;
            thumb.addEventListener('click', () => {
              mainImage.innerHTML = `<img src="${img}" alt="${product.name}" class="main-image">`;
            });
            thumbnailsContainer.appendChild(thumb);
          });
        } else if (product.image) {
          mainImage.innerHTML = `<img src="${product.image}" alt="${product.name}" class="main-image">`;
        } else {
          mainImage.innerHTML = '<p>No hay imagen disponible</p>';
        }
        
        addToCartBtn.onclick = () => {
          CartSystem.addToCart(product.id, tabType);
          this.closeModal();
        };
        
        modal.style.display = 'flex';
      })
      .catch(error => {
        console.error('Error opening product modal:', error);
      });
  },
  
  closeModal: function() {
    document.getElementById('product-modal').style.display = 'none';
  }
};

const ProductModal = {
  currentModal: null,
  isOpening: false,
  
  init: function() {
    const modal = document.getElementById('product-modal');
    
    // Crear estructura solo si no existe
    if (!modal.querySelector('.modal-content')) {
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-product-name"></h2>
            <button class="close-modal styled-close-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="main-image-container"></div>
          <div class="thumbnails-container"></div>
          <div class="modal-product-price"></div>
          <p class="modal-product-description"></p>
          <button class="modal-add-to-cart add-to-cart">
            <i class="fas fa-shopping-cart"></i> Añadir al carrito
          </button>
        </div>
      `;
    }
    
    // Manejar clic para cerrar
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('close-modal') || 
          e.target.classList.contains('styled-close-btn') ||
          e.target.closest('.styled-close-btn') ||
          e.target === modal) {
        this.closeModal();
      }
    });
  },
  
  openModal: function(productId) {
    // Evitar aperturas múltiples
    if (this.isOpening || this.currentModal === productId) return;
    this.isOpening = true;
    this.currentModal = productId;
    
    ProductView.getProductById(productId)
      .then(product => {
        if (!product) {
          this.isOpening = false;
          return;
        }

        const modal = document.getElementById('product-modal');
        
        // Actualizar contenido
        modal.querySelector('.modal-product-name').textContent = product.name;
        
        const pricesHTML = Object.entries(product.prices || {})
          .map(([currency, price]) => `${price} ${currency}`)
          .join(' / ');
        
        modal.querySelector('.modal-product-price').textContent = pricesHTML;
        modal.querySelector('.modal-product-description').textContent = product.description;
        
        // Configurar botón de añadir al carrito
        const addToCartBtn = modal.querySelector('.modal-add-to-cart');
        addToCartBtn.setAttribute('data-id', product.id);
        
        // Asegurar que tenga el ícono
        if (!addToCartBtn.querySelector('i')) {
          const icon = document.createElement('i');
          icon.className = 'fas fa-shopping-cart';
          addToCartBtn.prepend(icon);
          addToCartBtn.innerHTML += ' Añadir al carrito';
        }
        
        addToCartBtn.onclick = () => {
          CartSystem.addToCart(product.id);
          this.closeModal();
        };
        
        // Configurar imágenes
        const mainImage = modal.querySelector('.main-image-container');
        const thumbnailsContainer = modal.querySelector('.thumbnails-container');
        mainImage.innerHTML = '';
        thumbnailsContainer.innerHTML = '';
        
        if (product.images && product.images.length > 0) {
          // Mostrar primera imagen como principal
          mainImage.innerHTML = `<img src="${product.images[0]}" alt="${product.name}" class="main-image">`;
          
          // Mostrar miniaturas si hay más imágenes
          if (product.images.length > 1) {
            product.images.forEach((img, index) => {
              const thumb = document.createElement('div');
              thumb.className = 'thumbnail';
              thumb.innerHTML = `<img src="${img}" alt="Thumbnail ${index + 1}">`;
              thumb.addEventListener('click', () => {
                mainImage.innerHTML = `<img src="${img}" alt="${product.name}" class="main-image">`;
              });
              thumbnailsContainer.appendChild(thumb);
            });
          }
        } else if (product.image) {
          // Usar imagen única si existe
          mainImage.innerHTML = `<img src="${product.image}" alt="${product.name}" class="main-image">`;
        } else {
          // Mostrar mensaje si no hay imágenes
          mainImage.innerHTML = '<p>No hay imagen disponible</p>';
        }
        
        // Mostrar modal
        modal.style.display = 'flex';
        this.isOpening = false;
      })
      .catch(error => {
        console.error('Error opening product modal:', error);
        this.isOpening = false;
        this.currentModal = null;
      });
  },
  
  closeModal: function() {
    const modal = document.getElementById('product-modal');
    modal.style.display = 'none';
    this.currentModal = null;
  }
};

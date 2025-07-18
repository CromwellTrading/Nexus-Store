const ProductView = {
  currentView: 'list',
  productDatabase: {},
  
  init: function() {
      this.setupEventListeners();
  },
  
  setupEventListeners: function() {
      const viewButtons = document.querySelectorAll('.view-button');
      viewButtons.forEach(button => {
          button.addEventListener('click', () => {
              const viewType = button.getAttribute('data-view');
              this.switchView(viewType);
          });
      });
  },
  
  switchView: function(viewType) {
      if (viewType === this.currentView) return;
      
      this.currentView = viewType;
      
      document.querySelectorAll('.view-button').forEach(btn => {
          btn.classList.remove('active');
      });
      document.querySelector(`.view-button[data-view="${viewType}"]`).classList.add('active');
      
      this.loadProducts(Tabs.currentTab);
  },
  
  loadProducts: function(tabType) {
      if (!this.productDatabase[tabType]) {
          this.productDatabase[tabType] = {};
      }
      
      const categories = Object.keys(this.productDatabase[tabType]);
      
      document.getElementById('list-view').style.display = 'none';
      document.getElementById('columns-view').style.display = 'none';
      document.getElementById('grid-view').style.display = 'none';
      
      if (this.currentView === 'list') {
          this.generateListView(tabType, categories);
          document.getElementById('list-view').style.display = 'block';
      } else if (this.currentView === 'columns') {
          this.generateColumnsView(tabType, categories);
          document.getElementById('columns-view').style.display = 'flex';
      } else if (this.currentView === 'grid') {
          this.generateGridView(tabType, categories);
          document.getElementById('grid-view').style.display = 'grid';
      }
      
      this.setupProductEvents(tabType);
  },
  
  generateListView: function(tabType, categories) {
      const listView = document.getElementById('list-view');
      listView.innerHTML = '';
      
      let hasProducts = false;
      
      categories.forEach(category => {
          const products = this.productDatabase[tabType][category];
          if (!products || products.length === 0) return;
          
          hasProducts = true;
          
          const categorySection = document.createElement('div');
          categorySection.className = 'category-section';
          categorySection.innerHTML = `<h2 class="category-title">${this.getCategoryName(category)}</h2>`;
          
          products.forEach(product => {
              const productItem = document.createElement('div');
              productItem.className = 'product-item';
              productItem.dataset.id = product.id;
              productItem.dataset.category = category;
              
              const imageUrl = tabType === 'fisico' && product.images && product.images.length > 0 ? 
                  product.images[0] : (product.image || 'placeholder.jpg');
              
              const pricesHTML = this.getPricesHTML(product.prices);
              
              productItem.innerHTML = `
                  <div class="product-image">
                      <img src="${imageUrl}" alt="${product.name}" style="width: 80px; height: 80px; object-fit: cover;">
                  </div>
                  <div class="product-details">
                      <h3 class="product-name">${product.name}</h3>
                      <div class="product-prices">
                          ${pricesHTML}
                      </div>
                      <button class="add-to-cart" data-id="${product.id}">Añadir al carrito</button>
                  </div>
              `;
              categorySection.appendChild(productItem);
          });
          
          listView.appendChild(categorySection);
      });
      
      if (!hasProducts) {
          listView.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
      }
  },
  
  generateColumnsView: function(tabType, categories) {
      const columnsView = document.getElementById('columns-view');
      columnsView.innerHTML = '';
      
      let hasProducts = false;
      
      categories.forEach(category => {
          const products = this.productDatabase[tabType][category];
          if (!products || products.length === 0) return;
          
          hasProducts = true;
          
          const categoryColumn = document.createElement('div');
          categoryColumn.className = 'category-column';
          categoryColumn.innerHTML = `<h2 class="category-title">${this.getCategoryName(category)}</h2>`;
          
          products.forEach(product => {
              const productItem = document.createElement('div');
              productItem.className = 'product-item';
              productItem.dataset.id = product.id;
              
              const imageUrl = tabType === 'fisico' && product.images && product.images.length > 0 ? 
                  product.images[0] : (product.image || 'placeholder.jpg');
              
              const pricesHTML = this.getPricesHTML(product.prices);
              
              productItem.innerHTML = `
                  <div class="product-image">
                      <img src="${imageUrl}" alt="${product.name}" style="width: 100%; height: 120px; object-fit: cover;">
                  </div>
                  <h3 class="product-name">${product.name}</h3>
                  <div class="product-prices">
                      ${pricesHTML}
                  </div>
                  <button class="add-to-cart" data-id="${product.id}">Añadir al carrito</button>
              `;
              categoryColumn.appendChild(productItem);
          });
          
          columnsView.appendChild(categoryColumn);
      });
      
      if (!hasProducts) {
          columnsView.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
      }
  },
  
  generateGridView: function(tabType, categories) {
      const gridView = document.getElementById('grid-view');
      gridView.innerHTML = '';
      
      let hasProducts = false;
      
      categories.forEach(category => {
          const products = this.productDatabase[tabType][category];
          if (!products || products.length === 0) return;
          
          hasProducts = true;
          
          products.forEach(product => {
              const gridProduct = document.createElement('div');
              gridProduct.className = 'grid-product';
              gridProduct.dataset.id = product.id;
              gridProduct.dataset.category = category;
              
              const imageUrl = tabType === 'fisico' && product.images && product.images.length > 0 ? 
                  product.images[0] : (product.image || 'placeholder.jpg');
              
              const pricesHTML = this.getPricesHTML(product.prices);
              
              gridProduct.innerHTML = `
                  <div class="product-image">
                      <img src="${imageUrl}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">
                  </div>
                  <div class="product-overlay">
                      <h3 class="product-name">${product.name}</h3>
                      <div class="product-prices">
                          ${pricesHTML}
                      </div>
                      <button class="add-to-cart" data-id="${product.id}">Añadir al carrito</button>
                  </div>
              `;
              gridView.appendChild(gridProduct);
          });
      });
      
      if (!hasProducts) {
          gridView.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
      }
  },
  
  getPricesHTML: function(prices) {
      if (!prices) return '<div class="product-price">Precio no disponible</div>';
      
      let html = '';
      for (const [currency, price] of Object.entries(prices)) {
          if (price) {
              html += `<div class="product-price">${price} ${currency}</div>`;
          }
      }
      return html || '<div class="product-price">Precio no disponible</div>';
  },
  
  setupProductEvents: function(tabType) {
      document.querySelectorAll('.product-item, .grid-product').forEach(item => {
          item.addEventListener('click', function(e) {
              if (e.target.classList.contains('add-to-cart')) {
                  e.stopPropagation();
                  return;
              }
              const productId = this.dataset.id;
              ProductModal.openModal(productId, tabType);
          });
      });
      
      document.querySelectorAll('.add-to-cart').forEach(button => {
          button.addEventListener('click', function(e) {
              e.stopPropagation();
              const productId = this.dataset.id;
              CartSystem.addToCart(productId, tabType);
          });
      });
  },
  
  getCategoryName: function(categoryKey) {
      const names = {
          electronics: 'Electrónicos',
          clothing: 'Ropa',
          software: 'Software',
          ebooks: 'Libros Digitales'
      };
      return names[categoryKey] || categoryKey;
  },
  
  getProductById: function(id, tabType) {
      if (!this.productDatabase[tabType]) return null;
      
      const categories = Object.keys(this.productDatabase[tabType]);
      for (const category of categories) {
          const product = this.productDatabase[tabType][category].find(p => p.id == id);
          if (product) return product;
      }
      return null;
  }
};
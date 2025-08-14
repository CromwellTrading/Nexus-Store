const ProductView = {
  currentView: 'list',
  
  init: function() {
    this.setupEventListeners();
    this.loadProducts(); // Cargar productos digitales al inicio
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
    
    this.loadProducts();
  },
  
  loadProducts: function() {
    fetch(`${window.API_BASE_URL}/api/products/digital`)
      .then(response => response.json())
      .then(products => {
        this.displayProducts(products);
      })
      .catch(error => {
        console.error('Error cargando productos:', error);
        this.displayError();
      });
  },
  
  displayProducts: function(products) {
    document.getElementById('list-view').style.display = 'none';
    document.getElementById('columns-view').style.display = 'none';
    document.getElementById('grid-view').style.display = 'none';
    
    if (this.currentView === 'list') {
      this.generateListView(products);
      document.getElementById('list-view').style.display = 'block';
    } else if (this.currentView === 'columns') {
      this.generateColumnsView(products);
      document.getElementById('columns-view').style.display = 'flex';
    } else if (this.currentView === 'grid') {
      this.generateGridView(products);
      document.getElementById('grid-view').style.display = 'grid';
    }
    
    this.setupProductEvents();
  },
  
  generateListView: function(products) {
    const listView = document.getElementById('list-view');
    listView.innerHTML = '';
    
    if (!products || Object.keys(products).length === 0) {
      listView.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
      return;
    }
    
    Object.keys(products).forEach(category => {
      const productsInCategory = products[category];
      if (!productsInCategory || productsInCategory.length === 0) return;
      
      const categorySection = document.createElement('div');
      categorySection.className = 'category-section';
      categorySection.innerHTML = `<h2 class="category-title">${category}</h2>`;
      
      productsInCategory.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.dataset.id = product.id;
        productItem.dataset.category = category;
        
        const pricesHTML = this.getPricesHTML(product.prices);
        
        // Mostrar imagen del producto
        let imageHTML = '';
        if (product.images && product.images.length > 0) {
          imageHTML = `<img src="${product.images[0]}" alt="${product.name}" class="product-image">`;
        } else if (product.image) {
          imageHTML = `<img src="${product.image}" alt="${product.name}" class="product-image">`;
        } else {
          imageHTML = `<div class="product-image-placeholder">${product.name}</div>`;
        }
        
        productItem.innerHTML = `
          ${imageHTML}
          <div class="product-details">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
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
  },
  
  generateColumnsView: function(products) {
    const columnsView = document.getElementById('columns-view');
    columnsView.innerHTML = '';
    
    if (!products || Object.keys(products).length === 0) {
      columnsView.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
      return;
    }
    
    Object.keys(products).forEach(category => {
      const productsInCategory = products[category];
      if (!productsInCategory || productsInCategory.length === 0) return;
      
      const categoryColumn = document.createElement('div');
      categoryColumn.className = 'category-column';
      categoryColumn.innerHTML = `<h2 class="category-title">${category}</h2>`;
      
      productsInCategory.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.dataset.id = product.id;
        
        const pricesHTML = this.getPricesHTML(product.prices);
        
        // Mostrar imagen del producto
        let imageHTML = '';
        if (product.images && product.images.length > 0) {
          imageHTML = `<img src="${product.images[0]}" alt="${product.name}" class="product-image">`;
        } else if (product.image) {
          imageHTML = `<img src="${product.image}" alt="${product.name}" class="product-image">`;
        } else {
          imageHTML = `<div class="product-image-placeholder">${product.name}</div>`;
        }
        
        productItem.innerHTML = `
          ${imageHTML}
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
  },
  
  generateGridView: function(products) {
    const gridView = document.getElementById('grid-view');
    gridView.innerHTML = '';
    
    if (!products || Object.keys(products).length === 0) {
      gridView.innerHTML = '<p>No hay productos disponibles en esta categoría.</p>';
      return;
    }
    
    Object.keys(products).forEach(category => {
      const productsInCategory = products[category];
      productsInCategory.forEach(product => {
        const gridProduct = document.createElement('div');
        gridProduct.className = 'grid-product';
        gridProduct.dataset.id = product.id;
        gridProduct.dataset.category = category;
        
        const pricesHTML = this.getPricesHTML(product.prices);
        
        // Mostrar imagen del producto
        let imageHTML = '';
        if (product.images && product.images.length > 0) {
          imageHTML = `<img src="${product.images[0]}" alt="${product.name}">`;
        } else if (product.image) {
          imageHTML = `<img src="${product.image}" alt="${product.name}">`;
        } else {
          imageHTML = `<div class="product-image-placeholder">${product.name}</div>`;
        }
        
        gridProduct.innerHTML = `
          <div class="product-image">
            ${imageHTML}
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
  
  setupProductEvents: function() {
    document.querySelectorAll('.product-item, .grid-product').forEach(item => {
      item.addEventListener('click', function(e) {
        // Evitar abrir modal si se hizo clic en un botón dentro del item
        if (e.target.closest('.add-to-cart')) {
          return;
        }
        
        const productId = this.dataset.id;
        ProductModal.openModal(productId);
      });
    });
    
    document.querySelectorAll('.add-to-cart').forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        const productId = this.dataset.id;
        CartSystem.addToCart(productId);
      });
    });
  },
  
  getCategoryName: function(categoryKey) {
    return categoryKey;
  },
  
  getProductById: async function(id) {
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/products/digital/${id}`);
      return await response.json();
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      return null;
    }
  },
  
  displayError: function() {
    const containers = [
      document.getElementById('list-view'),
      document.getElementById('columns-view'),
      document.getElementById('grid-view')
    ];
    
    containers.forEach(container => {
      if (container) {
        container.innerHTML = '<p>Error cargando productos. Intente nuevamente más tarde.</p>';
      }
    });
  }
};

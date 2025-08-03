const AdminSystem = {
  productType: 'fisico',
  categoryType: 'fisico',
  isAdmin: false,
  telegramUserId: null,
  
  init: function() {
    this.telegramUserId = this.getTelegramUserId();
    this.checkAdminStatus().then(() => this.initializeAdmin());
  },
  
  getTelegramUserId: function() {
    const urlParams = new URLSearchParams(window.location.search);
    let tgid = urlParams.get('tgid') || localStorage.getItem('telegramUserId');
    
    if (!tgid && window.location.hostname === 'localhost') {
      tgid = '5376388604'; // ID de desarrollo
      console.warn('⚠️ Usando ID de Telegram de desarrollo');
    }
    
    if (tgid) {
      localStorage.setItem('telegramUserId', tgid);
      return tgid;
    }
    
    console.error('[Admin] ERROR: No se encontró ID de Telegram');
    return null;
  },
  
  checkAdminStatus: async function() {
    if (!this.telegramUserId) {
      this.isAdmin = false;
      return;
    }
    
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/admin/ids`);
      if (!response.ok) throw new Error(`Error en respuesta: ${response.status} ${response.statusText}`);
      
      const adminIds = await response.json();
      this.isAdmin = adminIds.includes(this.telegramUserId.toString());
    } catch (error) {
      console.error('[Admin] Error verificando estado de admin:', error);
      this.isAdmin = false;
    }
  },
  
  initializeAdmin: function() {
    const adminButton = document.getElementById('admin-button');
    if (!adminButton) return;
    
    if (this.isAdmin) {
      adminButton.style.display = 'block';
      adminButton.classList.add('admin-active');
      adminButton.addEventListener('click', () => this.openAdminPanel());
    } else {
      adminButton.style.display = 'none';
    }
  },

  openAdminPanel: function() {
    if (!this.isAdmin) return;
    
    const modal = document.getElementById('product-modal');
    modal.innerHTML = this.getAdminPanelHTML();
    modal.style.display = 'flex';
    
    this.setupAdminEvents();
    this.renderCategoryOptions();
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
  },
  
  getAdminPanelHTML: function() {
    return `
    <div class="modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h2>👑 Panel de Administración</h2>
        <div class="admin-id-info">
          <small>ID de Telegram: ${this.telegramUserId || 'NO DETECTADO'}</small>
        </div>
        <button class="close-modal">&times;</button>
      </div>
      
      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="products">🛒 Productos</button>
        <button class="admin-tab" data-tab="categories">📁 Categorías</button>
        <button class="admin-tab" data-tab="orders">📋 Pedidos</button>
      </div>
      
      <div class="admin-content">
        <div class="admin-tab-content active" id="admin-products">
          <div class="admin-section">
            <h3>📦 Gestionar Productos</h3>
            <button id="add-product-btn" class="admin-btn">➕ Nuevo Producto</button>
            <div id="product-form" style="display: none; margin-top: 20px; padding: 15px; border: 1px solid var(--border-color); border-radius: 8px; background: rgba(0,0,0,0.03);">
              <div class="form-group">
                <label>📦 Tipo de Producto:</label>
                <div class="tab-selector">
                  <button class="type-tab ${this.productType === 'fisico' ? 'active' : ''}" data-type="fisico">Físico</button>
                  <button class="type-tab ${this.productType === 'digital' ? 'active' : ''}" data-type="digital">Digital</button>
                </div>
              </div>
              
              <div id="physical-fields" style="${this.productType === 'fisico' ? '' : 'display: none;'}">
                <div class="form-group">
                  <label>🖼️ Imágenes (1-4):</label>
                  <input type="file" id="product-images" multiple accept="image/*">
                  <div id="image-preview" style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;"></div>
                </div>
                
                <div class="form-group">
                  <label class="checkbox-label">
                    <input type="checkbox" id="has-color-variant"> 
                    <span class="checkmark"></span>
                    🎨 ¿Tiene variantes de color?
                  </label>
                  
                  <div id="color-variant-section" style="display: none; margin-top: 10px;">
                    <div class="color-variants" id="color-variants-container"></div>
                    <button type="button" id="add-color-btn" class="small-btn">➕ Añadir Color</button>
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label>🏷️ Nombre:</label>
                <input type="text" id="product-name" required class="modern-input">
              </div>
              
              <div class="form-group">
                <label>📝 Descripción:</label>
                <textarea id="product-description" rows="3" required class="modern-input"></textarea>
              </div>
              
              <div id="digital-fields" style="${this.productType === 'digital' ? '' : 'display: none;'}">
                <div class="form-group">
                  <label>🖼️ Imagen:</label>
                  <input type="file" id="digital-image" accept="image/*">
                  <div id="digital-image-preview" style="margin-top: 10px;"></div>
                </div>
                <div class="form-group">
                  <label>📋 Campos Requeridos:</label>
                  <div id="required-fields-container">
                    <div class="required-field">
                      <input type="text" placeholder="Nombre del campo" class="field-name modern-input" style="flex: 1;">
                      <label class="checkbox-label">
                        <input type="checkbox" class="field-required" checked>
                        <span class="checkmark"></span>
                        Requerido
                      </label>
                      <button class="remove-field small-btn">🗑️</button>
                    </div>
                  </div>
                  <button type="button" id="add-field-btn" class="small-btn">➕ Añadir Campo</button>
                </div>
              </div>
              
              <div class="form-group">
                <label>💰 Precios (en diferentes monedas):</label>
                <div class="price-inputs">
                  <div class="price-input">
                    <label>CUP:</label>
                    <input type="number" step="0.01" class="price-currency modern-input" data-currency="CUP" placeholder="Precio en CUP">
                  </div>
                  <div class="price-input">
                    <label>MLC:</label>
                    <input type="number" step="0.01" class="price-currency modern-input" data-currency="MLC" placeholder="Precio en MLC">
                  </div>
                  <div class="price-input">
                    <label>Saldo Móvil:</label>
                    <input type="number" step="0.01" class="price-currency modern-input" data-currency="Saldo Móvil" placeholder="Precio en Saldo Móvil">
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label>📂 Categoría:</label>
                <select id="product-category" required class="modern-select">
                  <option value="">Seleccionar categoría</option>
                </select>
              </div>
              
              <div class="form-group" id="physical-details-section" style="${this.productType === 'fisico' ? '' : 'display: none;'}">
                <label>📄 Detalles Adicionales:</label>
                <textarea id="product-details" rows="2" class="modern-input"></textarea>
              </div>
              
              <div class="form-buttons">
                <button id="save-product" class="save-btn">💾 Guardar Producto</button>
                <button id="cancel-product" class="btn-cancel">❌ Cancelar</button>
              </div>
            </div>
            
            <div id="products-list" class="products-list" style="margin-top: 20px;"></div>
          </div>
        </div>
        
        <div class="admin-tab-content" id="admin-categories" style="display: none;">
          <div class="admin-section">
            <h3>📁 Gestionar Categorías</h3>
            
            <div class="category-type-selector">
              <label>📦 Tipo de Producto:</label>
              <div class="tab-selector">
                <button class="type-tab ${this.categoryType === 'fisico' ? 'active' : ''}" data-type="fisico">Físico</button>
                <button class="type-tab ${this.categoryType === 'digital' ? 'active' : ''}" data-type="digital">Digital</button>
              </div>
            </div>
            
            <div class="form-group">
              <label>🏷️ Nombre de Categoría:</label>
              <input type="text" id="new-category-name" placeholder="Ej: Free Fire Diamonds" class="modern-input">
            </div>
            
            <button id="add-category-btn" class="admin-btn">➕ Añadir Categoría</button>
            
            <div id="categories-list" style="margin-top: 20px;"></div>
          </div>
        </div>
        
        <div class="admin-tab-content" id="admin-orders" style="display: none;">
          <h3>📋 Lista de Pedidos</h3>
          <div class="order-filter">
            <label>Filtrar por estado:</label>
            <select id="order-status-filter">
              <option value="all">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En proceso">En proceso</option>
              <option value="Enviado">Enviado</option>
              <option value="Completado">Completado</option>
            </select>
          </div>
          <div class="admin-orders-list" id="admin-orders-list"></div>
        </div>
      </div>
    </div>`;
  },
  
  setupAdminEvents: function() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabType = tab.dataset.tab;
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.admin-tab-content').forEach(content => content.style.display = 'none');
        document.getElementById(`admin-${tabType}`).style.display = 'block';
        
        if (tabType === 'products') this.renderProductsList();
        else if (tabType === 'categories') this.renderCategoriesList();
        else if (tabType === 'orders') this.loadOrders('all');
      });
    });
    
    document.getElementById('add-product-btn').addEventListener('click', () => {
      document.getElementById('product-form').style.display = 'block';
      document.getElementById('add-product-btn').style.display = 'none';
      this.resetProductForm();
    });
    
    document.querySelectorAll('.type-tab[data-type]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        this.productType = type;
        document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        document.getElementById('physical-fields').style.display = type === 'fisico' ? 'block' : 'none';
        document.getElementById('digital-fields').style.display = type === 'digital' ? 'block' : 'none';
        document.getElementById('physical-details-section').style.display = type === 'fisico' ? 'block' : 'none';
        
        this.renderCategoryOptions(type);
      });
    });

    document.querySelectorAll('.type-tab[data-type]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.categoryType = e.target.dataset.type;
        this.renderCategoriesList();
      });
    });
    
    document.getElementById('has-color-variant').addEventListener('change', (e) => {
      document.getElementById('color-variant-section').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('add-color-btn').addEventListener('click', () => {
      const container = document.getElementById('color-variants-container');
      container.innerHTML += `
        <div class="color-variant" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <input type="color" value="#ffffff" class="color-picker">
          <input type="text" placeholder="Nombre del color" class="color-name">
          <button class="remove-color">❌</button>
        </div>
      `;
      
      container.querySelectorAll('.remove-color').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.closest('.color-variant').remove());
      });
    });
    
    document.getElementById('add-field-btn').addEventListener('click', () => {
      const container = document.getElementById('required-fields-container');
      container.innerHTML += `
        <div class="required-field" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <input type="text" placeholder="Nombre del campo (ej: ID de usuario)" class="field-name" style="flex: 1;">
          <input type="checkbox" class="field-required" checked>
          <label>Requerido</label>
          <button class="remove-field">❌</button>
        </div>
      `;
      
      container.querySelectorAll('.remove-field').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.closest('.required-field').remove());
      });
    });
    
    document.getElementById('save-product').addEventListener('click', () => this.saveProduct());
    document.getElementById('cancel-product').addEventListener('click', () => {
      document.getElementById('product-form').style.display = 'none';
      document.getElementById('add-product-btn').style.display = 'block';
    });
    document.getElementById('add-category-btn').addEventListener('click', () => this.addCategory());
    document.getElementById('order-status-filter')?.addEventListener('change', (e) => this.loadOrders(e.target.value));
    document.getElementById('product-images')?.addEventListener('change', (e) => this.previewImages(e.target, 'image-preview'));
    document.getElementById('digital-image')?.addEventListener('change', (e) => this.previewImages(e.target, 'digital-image-preview', false));
    
    this.renderProductsList();
    this.renderCategoriesList();
    this.loadOrders('all');
  },
  
  previewImages: function(input, previewId) {
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    
    if (!input.files || input.files.length === 0) return;
    
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '100px';
        img.style.maxHeight = '100px';
        img.style.objectFit = 'contain';
        img.style.margin = '5px';
        img.style.border = '1px solid #ddd';
        img.style.borderRadius = '4px';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  },
  
  saveProduct: async function() {
    const type = this.productType;
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const categoryId = document.getElementById('product-category').value;
    const details = document.getElementById('product-details').value;
    
    const prices = {};
    document.querySelectorAll('.price-currency').forEach(input => {
      if (input.value) prices[input.dataset.currency] = parseFloat(input.value);
    });
    
    if (!name || !description || !categoryId) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    
    // Crear el objeto producto con los nombres de campos corregidos
    const product = { 
      name, 
      description, 
      prices, 
      details: details || '', 
      date_created: new Date().toISOString(),
      has_color_variant: document.getElementById('has-color-variant').checked,
      colors: [],
      required_fields: [] // Campo corregido
    };
    
    try {
      if (type === 'fisico') {
        const imageFiles = document.getElementById('product-images').files;
        if (imageFiles.length > 0) {
          product.images = [];
          for (let i = 0; i < imageFiles.length; i++) {
            const imageUrl = await ImageUploader.uploadImage(imageFiles[i]);
            product.images.push(imageUrl);
          }
        }
        
        if (product.has_color_variant) {
          document.querySelectorAll('.color-variant').forEach(variant => {
            const color = variant.querySelector('.color-picker').value;
            const name = variant.querySelector('.color-name').value || 'Color ' + (product.colors.length + 1);
            product.colors.push({ color, name });
          });
        }
      } else {
        const imageFile = document.getElementById('digital-image').files[0];
        if (imageFile) {
          const imageUrl = await ImageUploader.uploadImage(imageFile);
          product.images = [imageUrl];
        }
        
        document.querySelectorAll('.required-field').forEach(field => {
          const fieldName = field.querySelector('.field-name').value.trim();
          const isRequired = field.querySelector('.field-required').checked;
          if (fieldName) product.required_fields.push({ name: fieldName, required: isRequired });
        });
      }
      
      const response = await fetch(`${window.API_BASE_URL}/api/admin/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Telegram-ID': this.telegramUserId.toString()
        },
        body: JSON.stringify({ 
          type: type, 
          categoryId: categoryId, 
          product: product 
        })
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error ${response.status}: ${errorBody}`);
      }
      
      const result = await response.json();
      alert('✅ Producto creado correctamente!');
      this.renderProductsList();
      document.getElementById('product-form').style.display = 'none';
      document.getElementById('add-product-btn').style.display = 'block';
    } catch (error) {
      alert('Error al guardar el producto: ' + error.message);
    }
  },
  
  renderProductsList: function() {
    const container = document.getElementById('products-list');
    container.innerHTML = '<div class="loading">Cargando productos...</div>';
    
    fetch(`${window.API_BASE_URL}/api/admin/products`, {
      headers: { 'Telegram-ID': this.telegramUserId.toString() }
    })
      .then(response => response.json())
      .then(products => {
        if (!products || products.length === 0) {
          container.innerHTML = '<p>No hay productos disponibles</p>';
          return;
        }
        
        container.innerHTML = `
          <h4>📦 Productos Existentes</h4>
          <div class="admin-items-list">
            ${products.map(product => `
              <div class="admin-product-item">
                <div class="product-info">
                  <div class="product-image-preview">
                    ${product.images?.length > 0 ? 
                      `<img src="${product.images[0]}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover;">` : 
                      `<div class="no-image">🖼️</div>`
                    }
                  </div>
                  <div class="product-details">
                    <strong>${product.name}</strong>
                    <div>Tipo: ${product.type === 'fisico' ? '📦 Físico' : '💾 Digital'}</div>
                    <div>Categoría: ${product.category || 'Sin categoría'}</div>
                    <div>${Object.entries(product.prices || {}).map(([currency, price]) => `${currency}: ${price}`).join(', ')}</div>
                  </div>
                </div>
                <div class="product-actions">
                  <button class="edit-product" data-id="${product.id}">✏️ Editar</button>
                  <button class="delete-product" data-id="${product.id}">🗑️ Eliminar</button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        
        container.querySelectorAll('.edit-product').forEach(btn => {
          btn.addEventListener('click', (e) => this.editProduct(e.target.dataset.id));
        });
        
        container.querySelectorAll('.delete-product').forEach(btn => {
          btn.addEventListener('click', (e) => {
            if (confirm('¿Estás seguro de eliminar este producto?')) this.deleteProduct(e.target.dataset.id);
          });
        });
      })
      .catch(error => {
        container.innerHTML = `<div class="error"><p>Error cargando productos</p><p><small>${error.message}</small></p></div>`;
      });
  },
  
  editProduct: function(id) {
    fetch(`${window.API_BASE_URL}/api/admin/products/${id}`, {
      headers: { 'Telegram-ID': this.telegramUserId.toString() }
    })
      .then(response => response.json())
      .then(product => {
        const form = document.getElementById('product-form');
        form.style.display = 'block';
        document.getElementById('add-product-btn').style.display = 'none';
        
        this.productType = product.type;
        document.querySelectorAll('.type-tab').forEach(tab => {
          tab.classList.toggle('active', tab.dataset.type === product.type);
        });
        
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description;
        document.getElementById('product-category').value = product.category_id;
        document.getElementById('product-details').value = product.details || '';
        
        const prices = product.prices || {};
        document.querySelectorAll('.price-currency').forEach(input => {
          if (prices[input.dataset.currency]) input.value = prices[input.dataset.currency];
        });
        
        if (product.type === 'fisico') {
          document.getElementById('has-color-variant').checked = !!product.has_color_variant;
          document.getElementById('color-variant-section').style.display = product.has_color_variant ? 'block' : 'none';
          
          const preview = document.getElementById('image-preview');
          preview.innerHTML = '';
          if (product.images) {
            product.images.forEach(img => {
              const imgEl = document.createElement('img');
              imgEl.src = img;
              imgEl.style.maxWidth = '100px';
              imgEl.style.maxHeight = '100px';
              imgEl.style.objectFit = 'contain';
              imgEl.style.margin = '5px';
              imgEl.style.border = '1px solid #ddd';
              imgEl.style.borderRadius = '4px';
              preview.appendChild(imgEl);
            });
          }
          
          if (product.has_color_variant && product.colors) {
            const container = document.getElementById('color-variants-container');
            container.innerHTML = '';
            product.colors.forEach(color => {
              container.innerHTML += `
                <div class="color-variant" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                  <input type="color" value="${color.color}" class="color-picker">
                  <input type="text" value="${color.name}" placeholder="Nombre del color" class="color-name">
                  <button class="remove-color">❌</button>
                </div>
              `;
            });
            
            container.querySelectorAll('.remove-color').forEach(btn => {
              btn.addEventListener('click', (e) => e.target.closest('.color-variant').remove());
            });
          }
        } else {
          const preview = document.getElementById('digital-image-preview');
          preview.innerHTML = '';
          if (product.images?.length > 0) {
            const imgEl = document.createElement('img');
            imgEl.src = product.images[0];
            imgEl.style.maxWidth = '200px';
            imgEl.style.maxHeight = '200px';
            imgEl.style.objectFit = 'contain';
            preview.appendChild(imgEl);
          }
          
          const container = document.getElementById('required-fields-container');
          container.innerHTML = '';
          if (product.required_fields?.length > 0) {
            product.required_fields.forEach(field => {
              container.innerHTML += `
                <div class="required-field" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                  <input type="text" value="${field.name}" class="field-name" style="flex: 1;">
                  <input type="checkbox" class="field-required" ${field.required ? 'checked' : ''}>
                  <label>Requerido</label>
                  <button class="remove-field">❌</button>
                </div>
              `;
            });
          } else {
            container.innerHTML = `
              <div class="required-field" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <input type="text" placeholder="Nombre del campo (ej: ID de usuario)" class="field-name" style="flex: 1;">
                <input type="checkbox" class="field-required" checked>
                <label>Requerido</label>
                <button class="remove-field">❌</button>
              </div>
            `;
          }
          
          container.querySelectorAll('.remove-field').forEach(btn => {
            btn.addEventListener('click', (e) => e.target.closest('.required-field').remove());
          });
        }
        
        document.getElementById('save-product').onclick = () => this.saveProduct();
      })
      .catch(() => alert('Error al cargar el producto para edición'));
  },
  
  deleteProduct: function(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    fetch(`${window.API_BASE_URL}/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { 'Telegram-ID': this.telegramUserId.toString() }
    })
    .then(response => {
      if (response.ok) {
        this.renderProductsList();
        alert('✅ Producto eliminado correctamente');
      } else throw new Error('Error del servidor');
    })
    .catch(error => alert('Error al eliminar el producto: ' + error.message));
  },
  
  addCategory: function() {
    const type = this.categoryType;
    const nameInput = document.getElementById('new-category-name');
    const name = nameInput.value.trim();
    
    if (!name) return alert('Por favor ingrese un nombre para la categoría');
    
    const btn = document.getElementById('add-category-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner"></div> Creando...';
    btn.disabled = true;
    
    fetch(`${window.API_BASE_URL}/api/admin/categories`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Telegram-ID': this.telegramUserId.toString()
      },
      body: JSON.stringify({ type, name })
    })
    .then(response => {
      if (response.status === 201) return response.json();
      else if (response.status === 400) return response.json().then(data => { throw new Error(data.error); });
      else throw new Error(`Error ${response.status}`);
    })
    .then(() => {
      alert(`✅ Categoría "${name}" creada correctamente!`);
      nameInput.value = '';
      this.renderCategoriesList();
      this.renderCategoryOptions();
    })
    .catch(error => alert(`❌ Error: ${error.message}`))
    .finally(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
  },
  
  renderCategoriesList: function() {
    const type = this.categoryType;
    const container = document.getElementById('categories-list');
    container.innerHTML = '<div class="loading">Cargando categorías...</div>';
    
    fetch(`${window.API_BASE_URL}/api/admin/categories`, {
      headers: { 'Telegram-ID': this.telegramUserId.toString() }
    })
    .then(response => response.json())
    .then(categories => {
      const filtered = categories.filter(cat => cat.type === type);
      
      if (filtered.length === 0) {
        container.innerHTML = '<p>No hay categorías definidas</p>';
        return;
      }
      
      container.innerHTML = `
        <h4>📁 Categorías de ${type === 'fisico' ? '📦 Productos Físicos' : '💾 Productos Digitales'}</h4>
        <div class="admin-items-list">
          ${filtered.map(category => `
            <div class="admin-category-item">
              <div class="category-info">
                <strong>${category.name}</strong>
                <small>Tipo: ${category.type}</small>
              </div>
              <div class="category-actions">
                <button class="delete-category" data-id="${category.id}">🗑️ Eliminar</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      
      container.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', (e) => this.deleteCategory(e.target.dataset.id));
      });
    })
    .catch(error => {
      container.innerHTML = `<div class="error"><p>Error cargando categorías</p><p><small>${error.message}</small></p></div>`;
    });
  },
  
  deleteCategory: function(id) {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Todos los productos en ella serán eliminados.')) return;
    
    fetch(`${window.API_BASE_URL}/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { 'Telegram-ID': this.telegramUserId.toString() }
    })
    .then(response => {
      if (response.ok) {
        this.renderCategoriesList();
        this.renderProductsList();
        alert('✅ Categoría eliminada correctamente');
      } else throw new Error('Error al eliminar categoría');
    })
    .catch(error => alert('Error al eliminar categoría: ' + error.message));
  },
  
  loadOrders: function(filter = 'all') {
    const ordersList = document.getElementById('admin-orders-list');
    ordersList.innerHTML = '<div class="loading">Cargando pedidos...</div>';
    
    fetch(`${window.API_BASE_URL}/api/admin/orders`, {
      headers: { 
        'Telegram-ID': this.telegramUserId.toString(),
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(orders => {
      let filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);
      
      if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<p>No hay pedidos registrados</p>';
        return;
      }
      
      // Ordenar por estado
      const statusOrder = { 'Pendiente': 1, 'En proceso': 2, 'Enviado': 3, 'Completado': 4 };
      filteredOrders.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      
      ordersList.innerHTML = '';
      filteredOrders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'admin-order';
        orderElement.innerHTML = `
          <div class="order-header">
            <div class="order-id">📋 Pedido #${order.id}</div>
            <div class="order-date">📅 ${new Date(order.createdAt).toLocaleDateString()}</div>
            <div class="order-status">
              <select class="status-select" data-id="${order.id}">
                <option value="Pendiente" ${order.status === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="En proceso" ${order.status === 'En proceso' ? 'selected' : ''}>En proceso</option>
                <option value="Enviado" ${order.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                <option value="Completado" ${order.status === 'Completado' ? 'selected' : ''}>Completado</option>
              </select>
            </div>
          </div>
          <div class="order-details">
            <div><strong>👤 Cliente:</strong> ${order.userData?.fullName || order.userId}</div>
            <div><strong>💰 Total:</strong> $${order.total.toFixed(2)}</div>
          </div>
          <div class="order-actions">
            <button class="btn-view" data-id="${order.id}">👁️ Ver Detalles</button>
          </div>
        `;
        ordersList.appendChild(orderElement);
      });
      
      document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => this.viewOrderDetails(e.target.dataset.id));
      });
      
      document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => this.updateOrderStatus(e.target.dataset.id, e.target.value));
      });
    })
    .catch(error => {
      ordersList.innerHTML = `<div class="error"><p>Error cargando pedidos</p><p><small>${error.message}</small></p></div>`;
    });
  },
  
  updateOrderStatus: function(orderId, newStatus) {
    fetch(`${window.API_BASE_URL}/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Telegram-ID': this.telegramUserId.toString()
      },
      body: JSON.stringify({ status: newStatus })
    })
    .then(() => {
      this.loadOrders(document.getElementById('order-status-filter').value);
      alert('✅ Estado actualizado correctamente');
    })
    .catch(error => alert('Error actualizando estado: ' + error.message));
  },
  
  viewOrderDetails: function(orderId) {
    fetch(`${window.API_BASE_URL}/api/admin/orders/${orderId}`, {
      headers: { 'Telegram-ID': this.telegramUserId.toString() }
    })
    .then(response => response.json())
    .then(order => {
      const modal = document.getElementById('product-modal');
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>📋 Detalles del Pedido #${order.id}</h2>
            <button class="close-modal">&times;</button>
          </div>
          <div class="order-details-full">
            <div class="order-info">
              <div><strong>📅 Fecha:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
              <div><strong>🔄 Estado:</strong> ${order.status}</div>
              <div><strong>💰 Total:</strong> $${order.total.toFixed(2)}</div>
            </div>
            
            <h3>👤 Datos del Cliente</h3>
            <div class="customer-info">
              <div><strong>ID:</strong> ${order.userId}</div>
              <div><strong>Nombre:</strong> ${order.userData?.fullName || 'No especificado'}</div>
              <div><strong>🆔 CI:</strong> ${order.userData?.ci || 'No especificado'}</div>
              <div><strong>📱 Teléfono:</strong> ${order.userData?.phone || 'No especificado'}</div>
              <div><strong>📍 Dirección:</strong> ${order.userData?.address || 'No especificado'}, ${order.userData?.province || ''}</div>
            </div>
            
            <h3>💳 Información de Pago</h3>
            <div class="payment-info">
              <div><strong>Método:</strong> ${order.payment?.method || 'No especificado'}</div>
              <div><strong>🔑 ID Transferencia:</strong> ${order.payment?.transferId || 'N/A'}</div>
              ${order.payment?.transferProof ? `
                <div><strong>📸 Comprobante:</strong> <a href="${order.payment?.transferProof}" target="_blank">Ver imagen</a></div>
              ` : ''}
            </div>
            
            <h3>🛒 Productos</h3>
            <div class="order-products">
              ${order.items.map(item => `
                <div class="order-product-item">
                  <div class="product-image">
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.product_name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : ''}
                  </div>
                  <div class="product-details">
                    <div><strong>${item.product_name}</strong></div>
                    <div>${item.tab_type === 'fisico' ? '📦 Físico' : '💾 Digital'}</div>
                    <div>${item.quantity} x $${item.price.toFixed(2)}</div>
                    <div>Total: $${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <h3>📝 Información Adicional</h3>
            ${order.recipient && Object.keys(order.recipient).length > 0 ? 
              `<div class="additional-info">
                <h4>📦 Datos del Receptor</h4>
                <div><strong>Nombre:</strong> ${order.recipient.fullName || 'N/A'}</div>
                <div><strong>CI:</strong> ${order.recipient.ci || 'N/A'}</div>
                <div><strong>Teléfono:</strong> ${order.recipient.phone || 'N/A'}</div>
              </div>` : 
              '<p>No hay información adicional de receptor</p>'}
              
            ${order.requiredFields && Object.keys(order.requiredFields).length > 0 ? 
              `<div class="required-fields-info">
                <h4>📝 Campos Requeridos</h4>
                ${Object.entries(order.requiredFields).map(([key, value]) => `
                  <div><strong>${key}:</strong> ${value}</div>
                `).join('')}
              </div>` : ''}
          </div>
        </div>
      `;
      
      modal.querySelector('.close-modal').addEventListener('click', () => this.openAdminPanel());
    })
    .catch(error => {
      alert(`Error cargando detalles del pedido: ${error.message}`);
    });
  },
  
  renderCategoryOptions: function(type = this.productType) {
    const categorySelect = document.getElementById('product-category');
    if (!categorySelect) return;
    
    categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
    
    fetch(`${window.API_BASE_URL}/api/categories/${type}`, {
      headers: { 'Telegram-ID': this.telegramUserId.toString() }
    })
    .then(response => response.json())
    .then(categories => {
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    })
    .catch(error => console.error('Error cargando categorías:', error));
  },
  
  resetProductForm: function() {
    document.getElementById('product-name').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-details').value = '';
    document.getElementById('has-color-variant').checked = false;
    document.getElementById('color-variant-section').style.display = 'none';
    document.getElementById('color-variants-container').innerHTML = '';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('digital-image-preview').innerHTML = '';
    document.getElementById('required-fields-container').innerHTML = `
      <div class="required-field" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <input type="text" placeholder="Nombre del campo (ej: ID de usuario)" class="field-name" style="flex: 1;">
        <input type="checkbox" class="field-required" checked>
        <label>Requerido</label>
        <button class="remove-field">❌</button>
      </div>
    `;
    
    document.querySelectorAll('.price-currency').forEach(input => input.value = '');
  }
};

window.addEventListener('DOMContentLoaded', () => AdminSystem.init());

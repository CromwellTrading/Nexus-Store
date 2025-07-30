const AdminSystem = {
  productType: 'fisico',
  categoryType: 'fisico',
  isAdmin: false,
  telegramUserId: null,
  
  init: function() {
    console.log('[Admin] Iniciando sistema de administración');
    this.telegramUserId = this.getTelegramUserId();
    console.log(`[Admin] ID de Telegram: ${this.telegramUserId}`);
    
    const adminButton = document.getElementById('admin-button');
    if (!adminButton) {
      console.error('[Admin] Botón de admin no encontrado en el DOM');
      return;
    }
    
    this.checkAdminStatus().then(() => {
      console.log(`[Admin] Verificación completada. ¿Es admin? ${this.isAdmin}`);
      this.initializeAdmin();
    }).catch(error => {
      console.error('[Admin] Error verificando estado de admin:', error);
      this.initializeAdmin();
    });
  },
  
  getTelegramUserId: function() {
    // 1. Buscar en URL
    const urlParams = new URLSearchParams(window.location.search);
    let tgid = urlParams.get('tgid');
    
    // 2. Buscar en localStorage
    if (!tgid) {
      tgid = localStorage.getItem('telegramUserId');
    }
    
    // 3. Buscar en sessionStorage
    if (!tgid) {
      tgid = sessionStorage.getItem('telegramUserId');
    }
    
    // 4. Si aún no se encuentra, usar un valor por defecto para desarrollo
    if (!tgid && window.location.hostname === 'localhost') {
      tgid = '5376388604'; // ID por defecto para desarrollo
      console.warn('⚠️ Usando ID de Telegram de desarrollo');
    }
    
    if (tgid) {
      localStorage.setItem('telegramUserId', tgid);
      console.log(`[Admin] ID de Telegram: ${tgid}`);
      return tgid;
    }
    
    console.error('[Admin] ERROR: No se encontró ID de Telegram');
    return null;
  },
  
  checkAdminStatus: async function() {
    if (!this.telegramUserId) {
      console.log('[Admin] No hay ID de Telegram. Usuario no es admin');
      this.isAdmin = false;
      return;
    }
    
    try {
      console.log(`[Admin] Verificando estado de admin con backend: ${window.API_BASE_URL}/api/admin/ids`);
      const response = await fetch(`${window.API_BASE_URL}/api/admin/ids`);
      
      if (!response.ok) {
        throw new Error(`Error en respuesta: ${response.status} ${response.statusText}`);
      }
      
      const adminIds = await response.json();
      console.log(`[Admin] IDs de admin recibidos: ${adminIds.join(', ')}`);
      
      this.isAdmin = adminIds.includes(this.telegramUserId.toString());
      console.log(`[Admin] ¿Usuario ${this.telegramUserId} es admin? ${this.isAdmin}`);
    } catch (error) {
      console.error('[Admin] Error verificando estado de admin:', error);
      this.isAdmin = false;
    }
  },
  
  initializeAdmin: function() {
    console.log('[Admin] Inicializando interfaz de admin');
    const adminButton = document.getElementById('admin-button');
    const adminIndicator = document.getElementById('admin-indicator');
    
    if (!adminButton) {
      console.error('[Admin] Botón de admin no encontrado en el DOM');
      return;
    }
    
    if (this.isAdmin) {
      console.log('[Admin] Mostrando botón de admin');
      adminButton.style.display = 'block';
      adminButton.classList.add('admin-active');
      
      if (adminIndicator) {
        adminIndicator.style.display = 'block';
      }
      
      adminButton.addEventListener('click', () => {
        console.log('[Admin] Abriendo panel de administración');
        this.openAdminPanel();
      });
    } else {
      console.log('[Admin] Ocultando botón de admin');
      adminButton.style.display = 'none';
      if (adminIndicator) {
        adminIndicator.style.display = 'none';
      }
    }
  },

  openAdminPanel: function() {
    if (!this.isAdmin) {
      console.warn('[Admin] Intento de acceso no autorizado al panel');
      alert('Acceso restringido: solo administradores pueden acceder');
      return;
    }
    
    console.log('[Admin] Creando HTML del panel de admin');
    const modal = document.getElementById('product-modal');
    modal.innerHTML = this.getAdminPanelHTML();
    modal.style.display = 'flex';
    
    console.log('[Admin] Configurando eventos del panel');
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
        const tabType = tab.getAttribute('data-tab');
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.admin-tab-content').forEach(content => {
          content.style.display = 'none';
        });
        document.getElementById(`admin-${tabType}`).style.display = 'block';
        
        if (tabType === 'products') {
          this.renderProductsList();
        } else if (tabType === 'categories') {
          this.renderCategoriesList();
        } else if (tabType === 'orders') {
          this.loadOrders('all');
        }
      });
    });
    
    document.getElementById('add-product-btn').addEventListener('click', () => {
      document.getElementById('product-form').style.display = 'block';
      document.getElementById('add-product-btn').style.display = 'none';
      this.resetProductForm();
    });
    
    document.querySelectorAll('.type-tab[data-type]').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-type');
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
        const type = e.target.getAttribute('data-type');
        this.categoryType = type;
        this.renderCategoriesList();
      });
    });
    
    document.getElementById('has-color-variant').addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      document.getElementById('color-variant-section').style.display = isChecked ? 'block' : 'none';
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
        btn.addEventListener('click', (e) => {
          e.target.closest('.color-variant').remove();
        });
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
        btn.addEventListener('click', (e) => {
          e.target.closest('.required-field').remove();
        });
      });
    });
    
    document.getElementById('save-product').addEventListener('click', () => {
      this.saveProduct();
    });
    
    document.getElementById('cancel-product').addEventListener('click', () => {
      document.getElementById('product-form').style.display = 'none';
      document.getElementById('add-product-btn').style.display = 'block';
    });
    
    document.getElementById('add-category-btn').addEventListener('click', () => {
      this.addCategory();
    });
    
    document.getElementById('order-status-filter')?.addEventListener('change', (e) => {
      this.loadOrders(e.target.value);
    });
    
    // Eventos para previsualización de imágenes
    document.getElementById('product-images')?.addEventListener('change', (e) => {
      this.previewImages(e.target, 'image-preview');
    });
    
    document.getElementById('digital-image')?.addEventListener('change', (e) => {
      this.previewImages(e.target, 'digital-image-preview', false);
    });
    
    this.renderProductsList();
    this.renderCategoriesList();
    this.loadOrders('all');
  },
  
  previewImages: function(input, previewId, isMultiple = true) {
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    // Mostrar un mensaje de carga
    ImageUploader.showLoading(previewId, 'Preparando para subir...');
    
    // Subir cada imagen y luego previsualizar
    const files = Array.from(input.files);
    files.forEach((file, index) => {
      this.uploadAndPreviewImage(file, previewId, index, files.length);
    });
  },
  
  uploadAndPreviewImage: async function(file, previewId, index, total) {
    try {
      // Mostrar estado de carga para esta imagen
      ImageUploader.showLoading(previewId, `Subiendo imagen ${index + 1}/${total}...`);
      
      // Subir la imagen
      const imageUrl = await ImageUploader.uploadImageToImageBin(file);
      
      // Previsualizar la imagen subida
      ImageUploader.previewUploadedImage(imageUrl, previewId);
    } catch (error) {
      ImageUploader.showError(previewId, `Error subiendo imagen: ${error.message}`);
    }
  },
  
  saveProduct: async function() {
    const type = this.productType;
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const categoryId = document.getElementById('product-category').value;
    const details = document.getElementById('product-details').value;
    
    const priceInputs = document.querySelectorAll('.price-currency');
    const prices = {};
    priceInputs.forEach(input => {
      if (input.value) {
        prices[input.dataset.currency] = parseFloat(input.value);
      }
    });
    
    if (!name || !description || !categoryId) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    
    const product = {
      name,
      description,
      prices, // Ahora es un objeto (JSONB)
      details: details || '',
      date_created: new Date().toISOString()
    };
    
    if (type === 'fisico') {
      // Subir imágenes para producto físico
      const imageFiles = document.getElementById('product-images').files;
      if (imageFiles.length > 0) {
        product.images = [];
        for (let i = 0; i < imageFiles.length; i++) {
          try {
            // Mostrar carga
            ImageUploader.showLoading('image-preview', `Subiendo imagen ${i+1}/${imageFiles.length}...`);
            
            const imageUrl = await ImageUploader.uploadImageToImageBin(imageFiles[i]);
            product.images.push(imageUrl);
            
            // Previsualizar la imagen subida
            ImageUploader.previewUploadedImage(imageUrl, 'image-preview');
          } catch (error) {
            ImageUploader.showError('image-preview', `Error subiendo imagen ${i+1}: ${error.message}`);
            console.error('Error en subida de imagen:', error);
            return;
          }
        }
      }
      
      product.hasColorVariant = document.getElementById('has-color-variant').checked;
      
      if (product.hasColorVariant) {
        product.colors = [];
        document.querySelectorAll('.color-variant').forEach(variant => {
          const color = variant.querySelector('.color-picker').value;
          const name = variant.querySelector('.color-name').value || 'Color ' + (product.colors.length + 1);
          product.colors.push({ color, name });
        });
      }
    } else {
      // Subir imagen para producto digital
      const imageFile = document.getElementById('digital-image').files[0];
      if (imageFile) {
        try {
          ImageUploader.showLoading('digital-image-preview', 'Subiendo imagen...');
          
          const imageUrl = await ImageUploader.uploadImageToImageBin(imageFile);
          product.images = [imageUrl]; // Ahora es un array
          
          ImageUploader.previewUploadedImage(imageUrl, 'digital-image-preview');
        } catch (error) {
          ImageUploader.showError('digital-image-preview', `Error subiendo imagen: ${error.message}`);
          console.error('Error en subida de imagen digital:', error);
          return;
        }
      }
      
      product.requiredFields = [];
      document.querySelectorAll('.required-field').forEach(field => {
        const fieldName = field.querySelector('.field-name').value.trim();
        const isRequired = field.querySelector('.field-required').checked;
        
        if (fieldName) {
          product.requiredFields.push({
            name: fieldName,
            required: isRequired
          });
        }
      });
    }
    
    try {
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
        const errorText = await response.text();
        throw new Error(`Error al guardar: ${errorText}`);
      }
      
      const newProduct = await response.json();
      alert('✅ Producto creado correctamente!');
      
      // Actualizar la lista de productos
      this.renderProductsList();
      
      // Cerrar el formulario
      document.getElementById('product-form').style.display = 'none';
      document.getElementById('add-product-btn').style.display = 'block';
    } catch (error) {
      alert('Error al guardar el producto: ' + error.message);
    }
  },
  
  renderProductsList: function() {
    const container = document.getElementById('products-list');
    if (!container) {
      console.error('[Admin] No se encontró el contenedor de productos');
      return;
    }
    
    container.innerHTML = '<h4>📦 Productos Existentes</h4>';
    
    fetch(`${window.API_BASE_URL}/api/admin/products`)
      .then(response => response.json())
      .then(products => {
        if (!products || products.length === 0) {
          container.innerHTML += '<p>No hay productos disponibles</p>';
          return;
        }
        
        products.forEach(product => {
          const productEl = document.createElement('div');
          productEl.className = 'admin-product-item';
          
          // Mostrar la primera imagen del producto
          let imageHtml = '';
          if (product.images && product.images.length > 0) {
            imageHtml = `<img src="${product.images[0]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 10px;">`;
          }
          
          // Parsear precios
          const prices = product.prices || {};
          
          productEl.innerHTML = `
            <div class="product-info">
              <div style="display: flex; align-items: center;">
                ${imageHtml}
                <div>
                  <strong>${product.name}</strong> (${product.categories?.name || 'Sin categoría'})
                  <div>${product.type === 'fisico' ? '📦 Físico' : '💾 Digital'}</div>
                  <div>${Object.entries(prices).map(([currency, price]) => `${currency}: ${price}`).join(', ')}</div>
                </div>
              </div>
            </div>
            <div class="product-actions">
              <button class="edit-product" data-id="${product.id}">✏️ Editar</button>
              <button class="delete-product" data-id="${product.id}">🗑️ Eliminar</button>
            </div>
          `;
          container.appendChild(productEl);
        });
        
        container.querySelectorAll('.edit-product').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            this.editProduct(id);
          });
        });
        
        container.querySelectorAll('.delete-product').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e

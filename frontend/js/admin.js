const AdminSystem = {
  productDB: {
      fisico: {},
      digital: {}
  },
  categories: {
      fisico: [],
      digital: []
  },
  productType: 'fisico',
  categoryType: 'fisico',
  
  init: function() {
      this.loadData();
      document.getElementById('admin-button').style.display = this.isAdminUser() ? 'block' : 'none';
  },
  
  loadData: function() {
      const savedProducts = localStorage.getItem('adminProducts');
      const savedCategories = localStorage.getItem('adminCategories');
      
      if (savedProducts) {
          this.productDB = JSON.parse(savedProducts);
      }
      
      if (savedCategories) {
          this.categories = JSON.parse(savedCategories);
      }
  },
  
  saveData: function() {
      localStorage.setItem('adminProducts', JSON.stringify(this.productDB));
      localStorage.setItem('adminCategories', JSON.stringify(this.categories));
  },
  
  isAdminUser: function() {
      const telegramUserId = UserProfile.getTelegramUserId();
      const adminIds = [5376388604, 718827739];
      return adminIds.includes(telegramUserId);
  },

  openAdminPanel: function() {
      if (!this.isAdminUser()) {
          alert('Acceso restringido: solo administradores pueden acceder');
          return;
      }
      
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
              <button class="close-modal">&times;</button>
          </div>
          
          <div class="admin-tabs">
              <button class="admin-tab active" data-tab="products">🛒 Productos</button>
              <button class="admin-tab" data-tab="categories">📁 Categorías</button>
              <button class="admin-tab" data-tab="orders">📋 Pedidos</button>
              <button class="admin-tab" data-tab="payment">💳 Métodos de Pago</button>
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
              
              <div class="admin-tab-content" id="admin-payment" style="display: none;">
                  <div class="admin-section">
                      <h3>💳 Métodos de Pago</h3>
                      
                      <div class="payment-methods-form">
                          <div class="form-group">
                              <label>💳 Tarjeta BPA:</label>
                              <input type="text" id="admin-bpa" value="${UserProfile.userData.adminCards?.bpa || ''}" class="modern-input" placeholder="Número de tarjeta">
                          </div>
                          <div class="form-group">
                              <label>💳 Tarjeta BANDEC:</label>
                              <input type="text" id="admin-bandec" value="${UserProfile.userData.adminCards?.bandec || ''}" class="modern-input" placeholder="Número de tarjeta">
                          </div>
                          <div class="form-group">
                              <label>💳 Tarjeta MLC:</label>
                              <input type="text" id="admin-mlc" value="${UserProfile.userData.adminCards?.mlc || ''}" class="modern-input" placeholder="Número de tarjeta">
                          </div>
                          <div class="form-group">
                              <label>📱 Teléfono para transferencias:</label>
                              <input type="text" id="admin-phone" value="${UserProfile.userData.adminPhone || ''}" class="modern-input" placeholder="Número de teléfono">
                          </div>
                          <button id="save-payment-methods" class="save-btn">💾 Guardar Métodos de Pago</button>
                      </div>
                  </div>
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
          document.getElementById('color-variant-section').style.display = 
              e.target.checked ? 'block' : 'none';
      });
      
      document.getElementById('add-color-btn').addEventListener('click', () => {
          const container = document.getElementById('color-variants-container');
          const index = container.children.length;
          container.innerHTML += `
              <div class="color-variant" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                  <input type="color" value="#ffffff" class="color-picker">
                  <input type="text" placeholder="Nombre del color" class="color-name">
                  <button class="remove-color" data-index="${index}">❌</button>
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
      
      document.getElementById('save-payment-methods')?.addEventListener('click', () => {
          UserProfile.userData.adminCards = {
              bpa: document.getElementById('admin-bpa').value,
              bandec: document.getElementById('admin-bandec').value,
              mlc: document.getElementById('admin-mlc').value
          };
          UserProfile.userData.adminPhone = document.getElementById('admin-phone').value;
          UserProfile.saveUserData();
          alert('✅ Métodos de pago actualizados correctamente');
      });
      
      document.getElementById('order-status-filter')?.addEventListener('change', (e) => {
          this.loadOrders(e.target.value);
      });
      
      this.renderProductsList();
      this.renderCategoriesList();
      this.loadOrders('all');
  },
  
  uploadImageToImageKit: async function(file) {
      try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileName', file.name);
          formData.append('publicKey', 'public_hhFA4QLrpbIf5aVDBZfodu08iOA=');
          
          const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
              method: 'POST',
              body: formData,
              headers: {
                  'Authorization': `Basic ${btoa('tzsnnmyff' + ':')}`
              }
          });
          
          const data = await response.json();
          return data.url;
      } catch (error) {
          console.error('Error subiendo imagen:', error);
          return null;
      }
  },

  handleImageUploads: async function(inputId, previewId, isMultiple = true) {
      const input = document.getElementById(inputId);
      const preview = document.getElementById(previewId);
      preview.innerHTML = '';
      
      if (!input.files || input.files.length === 0) return [];
      
      const urls = [];
      
      for (let i = 0; i < input.files.length; i++) {
          const file = input.files[i];
          const reader = new FileReader();
          
          reader.onload = async (e) => {
              const img = document.createElement('img');
              img.src = e.target.result;
              img.style.maxWidth = '100px';
              img.style.margin = '5px';
              preview.appendChild(img);
              
              const imageUrl = await this.uploadImageToImageKit(file);
              if (imageUrl) {
                  urls.push(imageUrl);
                  
                  if (!isMultiple) {
                      return imageUrl;
                  }
              }
          };
          
          reader.readAsDataURL(file);
          
          if (!isMultiple) break;
      }
      
      return urls;
  },
  
  saveProduct: async function() {
      const type = this.productType;
      const name = document.getElementById('product-name').value;
      const description = document.getElementById('product-description').value;
      const category = document.getElementById('product-category').value;
      const details = document.getElementById('product-details').value;
      
      const priceInputs = document.querySelectorAll('.price-currency');
      const prices = {};
      priceInputs.forEach(input => {
          if (input.value) {
              prices[input.dataset.currency] = parseFloat(input.value);
          }
      });
      
      if (!name || !description || !category) {
          alert('Por favor complete todos los campos requeridos');
          return;
      }
      
      const product = {
          id: Date.now(),
          name,
          prices,
          category,
          description,
          type,
          dateCreated: new Date().toISOString()
      };
      
      if (type === 'fisico') {
          product.images = await this.handleImageUploads('product-images', 'image-preview', true);
          product.details = details;
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
          const images = await this.handleImageUploads('digital-image', 'digital-image-preview', false);
          product.image = images.length > 0 ? images[0] : '';
          
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
      
      if (!this.productDB[type]) {
          this.productDB[type] = {};
      }
      
      if (!this.productDB[type][category]) {
          this.productDB[type][category] = [];
      }
      
      const existingIndex = this.productDB[type][category].findIndex(p => p.id == product.id);
      
      if (existingIndex >= 0) {
          this.productDB[type][category][existingIndex] = product;
      } else {
          this.productDB[type][category].push(product);
      }
      
      ProductView.productDatabase = this.productDB;
      
      this.saveData();
      this.renderProductsList();
      
      document.getElementById('product-form').style.display = 'none';
      document.getElementById('add-product-btn').style.display = 'block';
      
      alert('✅ Producto creado correctamente!');
  },
  
  renderProductsList: function() {
      const container = document.getElementById('products-list');
      container.innerHTML = '<h4>📦 Productos Existentes</h4>';
      
      let allProducts = [];
      
      Object.keys(this.productDB).forEach(type => {
          Object.keys(this.productDB[type]).forEach(category => {
              this.productDB[type][category].forEach(product => {
                  allProducts.push({
                      ...product,
                      type,
                      category
                  });
              });
          });
      });
      
      allProducts.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      
      allProducts.forEach(product => {
          const productEl = document.createElement('div');
          productEl.className = 'admin-product-item';
          productEl.innerHTML = `
              <div class="product-info">
                  <strong>${product.name}</strong> (${this.getCategoryName(product.category)})
                  <div>${product.type === 'fisico' ? '📦 Físico' : '💾 Digital'}</div>
                  <div>${Object.entries(product.prices).map(([currency, price]) => `${currency}: ${price}`).join(', ')}</div>
              </div>
              <div class="product-actions">
                  <button class="edit-product" data-id="${product.id}" data-type="${product.type}" data-category="${product.category}">✏️ Editar</button>
                  <button class="delete-product" data-id="${product.id}" data-type="${product.type}" data-category="${product.category}">🗑️ Eliminar</button>
              </div>
          `;
          container.appendChild(productEl);
      });
      
      if (allProducts.length === 0) {
          container.innerHTML += '<p>No hay productos disponibles</p>';
      }
      
      container.querySelectorAll('.edit-product').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const id = e.target.getAttribute('data-id');
              const type = e.target.getAttribute('data-type');
              const category = e.target.getAttribute('data-category');
              this.editProduct(id, type, category);
          });
      });
      
      container.querySelectorAll('.delete-product').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const id = e.target.getAttribute('data-id');
              const type = e.target.getAttribute('data-type');
              const category = e.target.getAttribute('data-category');
              
              if (confirm('¿Estás seguro de eliminar este producto?')) {
                  this.deleteProduct(id, type, category);
              }
          });
      });
  },
  
  editProduct: function(id, type, category) {
      const product = this.productDB[type][category].find(p => p.id == id);
      if (!product) return;
      
      const form = document.getElementById('product-form');
      form.style.display = 'block';
      document.getElementById('add-product-btn').style.display = 'none';
      
      this.productType = type;
      document.querySelectorAll('.type-tab').forEach(tab => {
          tab.classList.toggle('active', tab.getAttribute('data-type') === type);
      });
      
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-description').value = product.description;
      document.getElementById('product-category').value = product.category;
      
      document.querySelectorAll('.price-currency').forEach(input => {
          const currency = input.dataset.currency;
          if (product.prices[currency]) {
              input.value = product.prices[currency];
          }
      });
      
      if (type === 'fisico') {
          document.getElementById('product-details').value = product.details || '';
          document.getElementById('has-color-variant').checked = !!product.hasColorVariant;
          document.getElementById('color-variant-section').style.display = 
              product.hasColorVariant ? 'block' : 'none';
          
          if (product.colors) {
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
                  btn.addEventListener('click', (e) => {
                      e.target.closest('.color-variant').remove();
                  });
              });
          }
      } else {
          const container = document.getElementById('required-fields-container');
          container.innerHTML = '';
          if (product.requiredFields && product.requiredFields.length > 0) {
              product.requiredFields.forEach(field => {
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
              btn.addEventListener('click', (e) => {
                  e.target.closest('.required-field').remove();
              });
          });
      }
      
      document.getElementById('save-product').onclick = () => {
          this.productDB[type][category] = this.productDB[type][category].filter(p => p.id != id);
          this.saveProduct();
      };
  },
  
  deleteProduct: function(id, type, category) {
      this.productDB[type][category] = this.productDB[type][category].filter(p => p.id != id);
      
      if (this.productDB[type][category].length === 0) {
          delete this.productDB[type][category];
      }
      
      this.saveData();
      this.renderProductsList();
      ProductView.productDatabase = this.productDB;
  },
  
  addCategory: function() {
      const type = this.categoryType;
      const name = document.getElementById('new-category-name').value.trim();
      
      if (!name) {
          alert('Por favor ingrese un nombre para la categoría');
          return;
      }
      
      const id = name.toLowerCase().replace(/\s+/g, '-');
      
      if (!this.categories[type]) {
          this.categories[type] = [];
      }
      
      if (!this.categories[type].includes(id)) {
          this.categories[type].push(id);
          this.saveData();
          this.renderCategoriesList();
          
          if (!ProductView.productDatabase[type]) {
              ProductView.productDatabase[type] = {};
          }
          ProductView.productDatabase[type][id] = [];
          
          alert('✅ Categoría añadida correctamente!');
      } else {
          alert('⚠️ Esta categoría ya existe');
      }
  },
  
  renderCategoriesList: function() {
      const type = this.categoryType;
      const container = document.getElementById('categories-list');
      container.innerHTML = `<h4>📁 Categorías de ${type === 'fisico' ? '📦 Productos Físicos' : '💾 Productos Digitales'}</h4>`;
      
      if (!this.categories[type] || this.categories[type].length === 0) {
          container.innerHTML += '<p>No hay categorías definidas</p>';
          return;
      }
      
      this.categories[type].forEach(category => {
          const categoryEl = document.createElement('div');
          categoryEl.className = 'admin-category-item';
          categoryEl.innerHTML = `
              <div class="category-info">
                  ${this.getCategoryName(category)}
                  <span>(${category})</span>
              </div>
              <div class="category-actions">
                  <button class="delete-category" data-type="${type}" data-category="${category}">🗑️ Eliminar</button>
              </div>
          `;
          container.appendChild(categoryEl);
      });
      
      container.querySelectorAll('.delete-category').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const type = e.target.getAttribute('data-type');
              const category = e.target.getAttribute('data-category');
              
              if (confirm('¿Estás seguro de eliminar esta categoría? Todos los productos en ella serán eliminados.')) {
                  this.categories[type] = this.categories[type].filter(cat => cat !== category);
                  
                  if (this.productDB[type] && this.productDB[type][category]) {
                      delete this.productDB[type][category];
                  }
                  
                  this.saveData();
                  this.renderCategoriesList();
                  this.renderProductsList();
                  ProductView.productDatabase = this.productDB;
              }
          });
      });
  },
  
  loadOrders: function(filter = 'all') {
      const ordersList = document.getElementById('admin-orders-list');
      ordersList.innerHTML = '';
      
      const orders = OrdersSystem.getOrders();
      let filteredOrders = orders;
      
      if (filter !== 'all') {
          filteredOrders = orders.filter(order => order.status === filter);
      }
      
      const statusOrder = {
          'Pendiente': 1,
          'En proceso': 2,
          'Enviado': 3,
          'Completado': 4
      };
      
      filteredOrders.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      
      if (filteredOrders.length === 0) {
          ordersList.innerHTML = '<p>No hay pedidos registrados</p>';
          return;
      }
      
      filteredOrders.forEach(order => {
          const orderElement = document.createElement('div');
          orderElement.className = 'admin-order';
          orderElement.innerHTML = `
              <div class="order-header">
                  <div class="order-id">📋 Pedido #${order.id}</div>
                  <div class="order-date">📅 ${order.date}</div>
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
                  <div><strong>👤 Cliente:</strong> ${order.data.customer.fullName}</div>
                  <div><strong>🆔 CI:</strong> ${order.data.customer.ci}</div>
                  <div><strong>📍 Provincia:</strong> ${order.data.customer.province}</div>
                  ${order.data.recipient ? `
                      <div class="recipient-info">
                          <strong>📦 Entregar a:</strong> ${order.data.recipient.fullName} (CI: ${order.data.recipient.ci})
                      </div>
                  ` : ''}
                  <div><strong>💳 Método de pago:</strong> ${order.data.payment.method}</div>
                  <div><strong>🔑 ID Transferencia:</strong> ${order.data.payment.transferId}</div>
                  <div><strong>💰 Total:</strong> $${order.data.total.toFixed(2)}</div>
              </div>
              <div class="order-actions">
                  <button class="btn-view" data-id="${order.id}">👁️ Ver Detalles</button>
              </div>
          `;
          ordersList.appendChild(orderElement);
      });
      
      document.querySelectorAll('.btn-view').forEach(button => {
          button.addEventListener('click', (e) => {
              const orderId = e.target.getAttribute('data-id');
              this.viewOrderDetails(orderId);
          });
      });
      
      document.querySelectorAll('.status-select').forEach(select => {
          select.addEventListener('change', (e) => {
              const orderId = e.target.getAttribute('data-id');
              const newStatus = e.target.value;
              this.updateOrderStatus(orderId, newStatus);
              this.loadOrders(filter);
          });
      });
  },
  
  updateOrderStatus: function(orderId, newStatus) {
      const order = OrdersSystem.getOrderById(orderId);
      if (order) {
          OrdersSystem.updateOrderStatus(orderId, newStatus);
      }
  },
  
  viewOrderDetails: function(orderId) {
      const order = OrdersSystem.getOrderById(orderId);
      if (!order) return;
      
      const modal = document.getElementById('product-modal');
      modal.innerHTML = `
          <div class="modal-content">
              <div class="modal-header">
                  <h2>📋 Detalles del Pedido #${order.id}</h2>
                  <button class="close-modal">&times;</button>
              </div>
              <div class="order-details-full">
                  <div class="order-info">
                      <div><strong>📅 Fecha:</strong> ${order.date}</div>
                      <div><strong>🔄 Estado:</strong> ${order.status}</div>
                      <div><strong>💰 Total:</strong> $${order.data.total.toFixed(2)}</div>
                  </div>
                  
                  <h3>👤 Datos del Cliente</h3>
                  <div class="customer-info">
                      <div><strong>Nombre:</strong> ${order.data.customer.fullName}</div>
                      <div><strong>🆔 CI:</strong> ${order.data.customer.ci}</div>
                      <div><strong>📱 Teléfono:</strong> ${order.data.customer.phone}</div>
                      <div><strong>🏠 Dirección:</strong> ${order.data.customer.address}</div>
                      <div><strong>📍 Provincia:</strong> ${order.data.customer.province}</div>
                  </div>
                  
                  ${order.data.recipient ? `
                      <h3>📦 Datos del Receptor</h3>
                      <div class="recipient-info">
                          <div><strong>Nombre:</strong> ${order.data.recipient.fullName}</div>
                          <div><strong>🆔 CI:</strong> ${order.data.recipient.ci}</div>
                          <div><strong>📱 Teléfono:</strong> ${order.data.recipient.phone}</div>
                      </div>
                  ` : ''}
                  
                  <h3>💳 Información de Pago</h3>
                  <div class="payment-info">
                      <div><strong>Método:</strong> ${order.data.payment.method}</div>
                      <div><strong>🔑 ID Transferencia:</strong> ${order.data.payment.transferId}</div>
                      ${order.data.payment.method === 'Saldo Móvil' && order.data.payment.transferProof ? `
                          <div class="transfer-proof">
                              <strong>📸 Captura de transferencia:</strong>
                              <img src="${order.data.payment.transferProof}" 
                                   alt="Comprobante de transferencia" 
                                   class="proof-thumbnail"
                                   style="max-width: 100px; cursor: pointer; margin-top: 10px;">
                          </div>
                      ` : ''}
                  </div>
                  
                  <h3>🛒 Productos</h3>
                  <div class="order-products">
                      ${order.data.items.map(item => `
                          <div class="order-product-item">
                              <div class="product-image-container">
                                  <img src="${item.imageUrl || 'placeholder.jpg'}" 
                                       alt="${item.name}" 
                                       class="order-product-image"
                                       data-src="${item.imageUrl || 'placeholder.jpg'}">
                              </div>
                              <div class="product-details">
                                  <div>${item.name}</div>
                                  <div>${item.quantity} x $${item.price.toFixed(2)}</div>
                                  <div>$${(item.price * item.quantity).toFixed(2)}</div>
                              </div>
                          </div>
                      `).join('')}
                  </div>
                  
                  ${order.data.requiredFields && Object.keys(order.data.requiredFields).length > 0 ? `
                      <h3>📝 Datos Específicos</h3>
                      <div class="required-fields-info">
                          ${Object.entries(order.data.requiredFields).map(([field, value]) => `
                              <div><strong>${field}:</strong> ${value}</div>
                          `).join('')}
                      </div>
                  ` : ''}
              </div>
          </div>
      `;
      
      modal.querySelector('.close-modal').addEventListener('click', () => {
          this.openAdminPanel();
      });
      
      modal.querySelectorAll('.order-product-image, .proof-thumbnail').forEach(img => {
          img.addEventListener('click', function(e) {
              const src = this.getAttribute('data-src') || this.src;
              const modalImg = document.createElement('div');
              modalImg.className = 'image-modal';
              modalImg.innerHTML = `
                  <div class="image-modal-content">
                      <img src="${src}" alt="Imagen ampliada">
                  </div>
              `;
              document.body.appendChild(modalImg);
              
              modalImg.addEventListener('click', function() {
                  document.body.removeChild(modalImg);
              });
          });
      });
  },
  
  renderCategoryOptions: function(type = 'fisico') {
      const categorySelect = document.getElementById('product-category');
      categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
      
      if (!this.categories[type]) return;
      
      this.categories[type].forEach(category => {
          const option = document.createElement('option');
          option.value = category;
          option.textContent = this.getCategoryName(category);
          categorySelect.appendChild(option);
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
              <input type="text" placeholder="Nombre del campo (ej: ID de usuario)" class="field-name" style="flex: 1; margin-right: 10px;">
              <input type="checkbox" class="field-required" checked>
              <label>Requerido</label>
              <button class="remove-field">❌</button>
          </div>
      `;
      
      document.querySelectorAll('.price-currency').forEach(input => {
          input.value = '';
      });
  }
};

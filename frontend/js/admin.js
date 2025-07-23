// admin.js - Sistema de administración optimizado
"use strict";

// Sistema de logging mejorado
if (!window.addDebugLog) {
    window.addDebugLog = function(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
    };
}

const AdminSystem = {
  productType: 'fisico',
  categoryType: 'fisico',
  isAdmin: false,
  telegramUserId: null,
  
  init: function() {
      addDebugLog("Iniciando AdminSystem...", "debug");
      
      this.telegramUserId = this.getTelegramUserId();
      addDebugLog(`ID de Telegram obtenido: ${this.telegramUserId || 'No encontrado'}`, 
                  this.telegramUserId ? "info" : "warning");
      
      this.checkAdminStatus().then(() => {
          addDebugLog(`Resultado de verificación admin: ${this.isAdmin}`, 
                      this.isAdmin ? "success" : "warning");
          this.initializeAdmin();
      }).catch(error => {
          addDebugLog(`Error en checkAdminStatus: ${error.message}`, "error");
      });
  },
  
  getTelegramUserId: function() {
      const urlParams = new URLSearchParams(window.location.search);
      const tgid = urlParams.get('tgid');
      
      if (tgid) {
          addDebugLog(`ID de Telegram encontrado en URL: ${tgid}`, "info");
          localStorage.setItem('telegramUserId', tgid);
          return tgid;
      }
      
      const savedId = localStorage.getItem('telegramUserId');
      if (savedId) {
          addDebugLog(`ID de Telegram encontrado en localStorage: ${savedId}`, "info");
          return savedId;
      }
      
      return null;
  },
  
  checkAdminStatus: async function() {
      addDebugLog("Verificando estado de administrador...", "debug");
      
      if (!this.telegramUserId) {
          addDebugLog("No hay ID de Telegram - acceso denegado", "warning");
          this.isAdmin = false;
          return;
      }
      
      try {
          addDebugLog("Solicitando IDs de administradores al servidor...", "debug");
          const response = await fetch(`${window.API_BASE_URL}/api/admin/ids`);
          
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          const adminIds = await response.json();
          addDebugLog(`IDs de administradores recibidos: ${adminIds.join(', ')}`, "info");
          
          this.isAdmin = adminIds.includes(this.telegramUserId.toString());
      } catch (error) {
          addDebugLog(`Error verificando admin: ${error.message}`, "error");
          this.isAdmin = false;
      }
  },
  
  initializeAdmin: function() {
      addDebugLog("Inicializando AdminSystem...", "debug");
      
      const adminButton = document.getElementById('admin-button');
      const adminIndicator = document.getElementById('admin-indicator');
      
      if (!adminButton) {
          addDebugLog("ERROR: Botón de admin no encontrado en el DOM", "error");
          return;
      }
      
      if (this.isAdmin) {
          adminButton.style.display = 'block';
          adminButton.classList.add('admin-active');
          
          if (adminIndicator) {
              adminIndicator.style.display = 'block';
          }
          
          addDebugLog("Registrando evento click para botón de admin", "debug");
          adminButton.addEventListener('click', () => {
              addDebugLog("Clic en botón de admin", "info");
              this.openAdminPanel();
          });
      } else {
          adminButton.style.display = 'none';
          if (adminIndicator) {
              adminIndicator.style.display = 'none';
          }
      }
  },

  openAdminPanel: function() {
      addDebugLog("Intentando abrir panel de administración", "debug");
      
      if (!this.isAdmin) {
          addDebugLog("Acceso denegado: no es administrador", "error");
          alert('Acceso restringido: solo administradores pueden acceder');
          return;
      }
      
      addDebugLog("Mostrando panel de administración", "success");
      const modal = document.getElementById('product-modal');
      modal.innerHTML = this.getAdminPanelHTML();
      modal.style.display = 'flex';
      this.setupAdminEvents();
      this.renderCategoryOptions();
      
      modal.querySelector('.close-modal').addEventListener('click', () => {
          modal.style.display = 'none';
          addDebugLog("Panel de administración cerrado", "info");
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
      addDebugLog("Configurando eventos del panel admin", "debug");
      
      document.querySelectorAll('.admin-tab').forEach(tab => {
          tab.addEventListener('click', () => {
              const tabType = tab.getAttribute('data-tab');
              addDebugLog(`Cambiando a pestaña: ${tabType}`, "info");
              
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
          addDebugLog("Mostrando formulario de nuevo producto", "info");
          document.getElementById('product-form').style.display = 'block';
          document.getElementById('add-product-btn').style.display = 'none';
          this.resetProductForm();
      });
      
      document.querySelectorAll('.type-tab[data-type]').forEach(tab => {
          tab.addEventListener('click', (e) => {
              const type = e.target.getAttribute('data-type');
              this.productType = type;
              addDebugLog(`Tipo de producto cambiado a: ${type}`, "info");
              
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
              addDebugLog(`Tipo de categoría cambiado a: ${type}`, "info");
              this.renderCategoriesList();
          });
      });
      
      document.getElementById('has-color-variant').addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          addDebugLog(`Variantes de color: ${isChecked ? 'activado' : 'desactivado'}`, "info");
          document.getElementById('color-variant-section').style.display = 
              isChecked ? 'block' : 'none';
      });
      
      document.getElementById('add-color-btn').addEventListener('click', () => {
          addDebugLog("Añadiendo variante de color", "info");
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
                  addDebugLog("Eliminando variante de color", "info");
                  e.target.closest('.color-variant').remove();
              });
          });
      });
      
      document.getElementById('add-field-btn').addEventListener('click', () => {
          addDebugLog("Añadiendo campo requerido", "info");
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
                  addDebugLog("Eliminando campo requerido", "info");
                  e.target.closest('.required-field').remove();
              });
          });
      });
      
      document.getElementById('save-product').addEventListener('click', () => {
          addDebugLog("Guardando producto...", "info");
          this.saveProduct();
      });
      
      document.getElementById('cancel-product').addEventListener('click', () => {
          addDebugLog("Cancelando creación de producto", "info");
          document.getElementById('product-form').style.display = 'none';
          document.getElementById('add-product-btn').style.display = 'block';
      });
      
      document.getElementById('add-category-btn').addEventListener('click', () => {
          addDebugLog("Añadiendo nueva categoría", "info");
          this.addCategory();
      });
      
      document.getElementById('order-status-filter')?.addEventListener('change', (e) => {
          addDebugLog(`Filtrando pedidos por estado: ${e.target.value}`, "info");
          this.loadOrders(e.target.value);
      });
      
      this.renderProductsList();
      this.renderCategoriesList();
      this.loadOrders('all');
  },
  
  uploadImageToImageKit: async function(file) {
      addDebugLog(`Subiendo imagen: ${file.name}`, "debug");
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
          addDebugLog(`Imagen subida exitosamente: ${data.url}`, "success");
          return data.url;
      } catch (error) {
          addDebugLog(`Error subiendo imagen: ${error.message}`, "error");
          return null;
      }
  },

  handleImageUploads: async function(inputId, previewId, isMultiple = true) {
      addDebugLog(`Procesando subida de imágenes para: ${inputId}`, "debug");
      const input = document.getElementById(inputId);
      const preview = document.getElementById(previewId);
      preview.innerHTML = '';
      
      if (!input.files || input.files.length === 0) {
          addDebugLog("No se seleccionaron archivos", "warning");
          return [];
      }
      
      const urls = [];
      addDebugLog(`Número de archivos seleccionados: ${input.files.length}`, "info");
      
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
      
      addDebugLog(`Guardando producto: ${name} (${type})`, "info");
      
      const priceInputs = document.querySelectorAll('.price-currency');
      const prices = {};
      priceInputs.forEach(input => {
          if (input.value) {
              prices[input.dataset.currency] = parseFloat(input.value);
          }
      });
      
      if (!name || !description || !category) {
          addDebugLog("Campos requeridos incompletos", "error");
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
          addDebugLog("Guardando producto físico", "debug");
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
          addDebugLog("Guardando producto digital", "debug");
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
      
      // Enviar el producto al backend
      try {
          addDebugLog("Enviando producto al servidor...", "info");
          const response = await fetch(`${window.API_BASE_URL}/api/admin/products`, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Telegram-ID': this.telegramUserId.toString()
              },
              body: JSON.stringify({
                  type: type,
                  category: category,
                  product: product
              })
          });
          
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
          
          const savedProduct = await response.json();
          addDebugLog("✅ Producto creado correctamente!", "success");
          alert('✅ Producto creado correctamente!');
          
          // Actualizar la lista de productos
          this.renderProductsList();
          
          document.getElementById('product-form').style.display = 'none';
          document.getElementById('add-product-btn').style.display = 'block';
      } catch (error) {
          addDebugLog(`Error guardando producto: ${error.message}`, "error");
          alert('Error al guardar el producto: ' + error.message);
      }
  },
  
  renderProductsList: function() {
      addDebugLog("Cargando lista de productos...", "debug");
      const container = document.getElementById('products-list');
      container.innerHTML = '<h4>📦 Productos Existentes</h4>';
      
      // Cargar productos desde el backend
      Promise.all([
        fetch(`${window.API_BASE_URL}/api/products/fisico`).then(res => res.json()),
        fetch(`${window.API_BASE_URL}/api/products/digital`).then(res => res.json())
      ])
      .then(([physicalProducts, digitalProducts]) => {
          const allProducts = [];
          
          // Procesar productos físicos
          Object.keys(physicalProducts).forEach(category => {
              physicalProducts[category].forEach(product => {
                  allProducts.push({
                      ...product,
                      type: 'fisico',
                      category
                  });
              });
          });
          
          // Procesar productos digitales
          Object.keys(digitalProducts).forEach(category => {
              digitalProducts[category].forEach(product => {
                  allProducts.push({
                      ...product,
                      type: 'digital',
                      category
                  });
              });
          });
          
          allProducts.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
          
          if (allProducts.length === 0) {
              container.innerHTML += '<p>No hay productos disponibles</p>';
              addDebugLog("No se encontraron productos", "info");
              return;
          }
          
          addDebugLog(`Mostrando ${allProducts.length} productos`, "info");
          
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
          
          container.querySelectorAll('.edit-product').forEach(btn => {
              btn.addEventListener('click', (e) => {
                  const id = e.target.getAttribute('data-id');
                  const type = e.target.getAttribute('data-type');
                  const category = e.target.getAttribute('data-category');
                  addDebugLog(`Editando producto: ${id} (${type})`, "info");
                  this.editProduct(id, type, category);
              });
          });
          
          container.querySelectorAll('.delete-product').forEach(btn => {
              btn.addEventListener('click', (e) => {
                  const id = e.target.getAttribute('data-id');
                  const type = e.target.getAttribute('data-type');
                  const category = e.target.getAttribute('data-category');
                  
                  if (confirm('¿Estás seguro de eliminar este producto?')) {
                      addDebugLog(`Eliminando producto: ${id} (${type})`, "info");
                      this.deleteProduct(id, type, category);
                  }
              });
          });
      })
      .catch(error => {
          addDebugLog(`Error cargando productos: ${error.message}`, "error");
          container.innerHTML = '<p>Error cargando productos</p>';
      });
  },
  
  editProduct: function(id, type, category) {
      addDebugLog(`Cargando producto para edición: ${id} (${type})`, "info");
      fetch(`${window.API_BASE_URL}/api/products/${type}/${id}`)
          .then(response => response.json())
          .then(product => {
              if (!product) {
                  addDebugLog("Producto no encontrado", "error");
                  return;
              }
              
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
                  this.saveProduct();
              };
          })
          .catch(error => {
              addDebugLog(`Error cargando producto: ${error.message}`, "error");
              alert('Error al cargar el producto para edición');
          });
  },
  
  deleteProduct: function(id, type, category) {
      if (!confirm('¿Estás seguro de eliminar este producto?')) return;
      
      fetch(`${window.API_BASE_URL}/api/admin/products/${type}/${category}/${id}`, {
          method: 'DELETE',
          headers: {
              'Telegram-ID': this.telegramUserId.toString()
          }
      })
      .then(response => {
          if (response.ok) {
              addDebugLog("✅ Producto eliminado correctamente", "success");
              this.renderProductsList();
              alert('✅ Producto eliminado correctamente');
          } else {
              throw new Error('Error al eliminar el producto');
          }
      })
      .catch(error => {
          addDebugLog(`Error eliminando producto: ${error.message}`, "error");
          alert('Error al eliminar el producto: ' + error.message);
      });
  },
  
  addCategory: function() {
      const type = this.categoryType;
      const name = document.getElementById('new-category-name').value.trim();
      
      if (!name) {
          addDebugLog("Nombre de categoría vacío", "warning");
          alert('Por favor ingrese un nombre para la categoría');
          return;
      }
      
      addDebugLog(`Añadiendo categoría: ${name} (${type})`, "info");
      
      fetch(`${window.API_BASE_URL}/api/admin/categories`, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Telegram-ID': this.telegramUserId.toString()
          },
          body: JSON.stringify({
              type: type,
              category: name
          })
      })
      .then(response => {
          if (response.ok) {
              addDebugLog("✅ Categoría añadida correctamente!", "success");
              alert('✅ Categoría añadida correctamente!');
              this.renderCategoriesList();
          } else {
              throw new Error('Error al añadir categoría');
          }
      })
      .catch(error => {
          addDebugLog(`Error añadiendo categoría: ${error.message}`, "error");
          alert('Error al añadir categoría: ' + error.message);
      });
  },
  
  renderCategoriesList: function() {
      const type = this.categoryType;
      addDebugLog(`Cargando categorías de ${type}`, "debug");
      const container = document.getElementById('categories-list');
      container.innerHTML = `<h4>📁 Categorías de ${type === 'fisico' ? '📦 Productos Físicos' : '💾 Productos Digitales'}</h4>`;
      
      fetch(`${window.API_BASE_URL}/api/categories/${type}`)
          .then(response => response.json())
          .then(categories => {
              if (!categories || categories.length === 0) {
                  container.innerHTML += '<p>No hay categorías definidas</p>';
                  addDebugLog("No se encontraron categorías", "info");
                  return;
              }
              
              addDebugLog(`Mostrando ${categories.length} categorías`, "info");
              
              categories.forEach(category => {
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
                          addDebugLog(`Eliminando categoría: ${category} (${type})`, "info");
                          
                          fetch(`${window.API_BASE_URL}/api/admin/categories/${type}/${category}`, {
                              method: 'DELETE',
                              headers: {
                                  'Telegram-ID': this.telegramUserId.toString()
                              }
                          })
                          .then(response => {
                              if (response.ok) {
                                  addDebugLog("✅ Categoría eliminada correctamente", "success");
                                  this.renderCategoriesList();
                                  this.renderProductsList();
                                  alert('✅ Categoría eliminada correctamente');
                              } else {
                                  throw new Error('Error al eliminar categoría');
                              }
                          })
                          .catch(error => {
                              addDebugLog(`Error eliminando categoría: ${error.message}`, "error");
                              alert('Error al eliminar categoría: ' + error.message);
                          });
                      }
                  });
              });
          })
          .catch(error => {
              addDebugLog(`Error cargando categorías: ${error.message}`, "error");
              container.innerHTML = '<p>Error cargando categorías</p>';
          });
  },
  
  loadOrders: function(filter = 'all') {
      addDebugLog(`Cargando pedidos (filtro: ${filter})`, "debug");
      const ordersList = document.getElementById('admin-orders-list');
      ordersList.innerHTML = '';
      
      fetch(`${window.API_BASE_URL}/api/admin/orders`)
          .then(response => response.json())
          .then(orders => {
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
                  addDebugLog("No se encontraron pedidos", "info");
                  return;
              }
              
              addDebugLog(`Mostrando ${filteredOrders.length} pedidos`, "info");
              
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
                          <div><strong>👤 Cliente:</strong> ${order.recipient?.fullName || 'No especificado'}</div>
                          <div><strong>💰 Total:</strong> $${order.total.toFixed(2)}</div>
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
                      addDebugLog(`Viendo detalles del pedido: ${orderId}`, "info");
                      this.viewOrderDetails(orderId);
                  });
              });
              
              document.querySelectorAll('.status-select').forEach(select => {
                  select.addEventListener('change', (e) => {
                      const orderId = e.target.getAttribute('data-id');
                      const newStatus = e.target.value;
                      addDebugLog(`Actualizando estado del pedido ${orderId} a ${newStatus}`, "info");
                      this.updateOrderStatus(orderId, newStatus);
                  });
              });
          })
          .catch(error => {
              addDebugLog(`Error cargando pedidos: ${error.message}`, "error");
              ordersList.innerHTML = '<p>Error cargando pedidos</p>';
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
      .then(response => {
          if (response.ok) {
              addDebugLog("✅ Estado actualizado correctamente", "success");
              this.loadOrders(document.getElementById('order-status-filter').value);
              alert('✅ Estado actualizado correctamente');
          } else {
              throw new Error('Error actualizando estado');
          }
      })
      .catch(error => {
          addDebugLog(`Error actualizando estado: ${error.message}`, "error");
          alert('Error actualizando estado: ' + error.message);
      });
  },
  
  viewOrderDetails: function(orderId) {
      addDebugLog(`Cargando detalles del pedido: ${orderId}`, "debug");
      fetch(`${window.API_BASE_URL}/api/orders/${orderId}`)
          .then(response => response.json())
          .then(order => {
              if (!order) {
                  addDebugLog("Pedido no encontrado", "error");
                  return;
              }
              
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
                              <div><strong>Nombre:</strong> ${order.recipient.fullName}</div>
                              <div><strong>🆔 CI:</strong> ${order.recipient.ci}</div>
                              <div><strong>📱 Teléfono:</strong> ${order.recipient.phone}</div>
                              <div><strong>📍 Provincia:</strong> ${order.recipient.province}</div>
                          </div>
                          
                          <h3>💳 Información de Pago</h3>
                          <div class="payment-info">
                              <div><strong>Método:</strong> ${order.payment.method}</div>
                              <div><strong>🔑 ID Transferencia:</strong> ${order.payment.transferId}</div>
                          </div>
                          
                          <h3>🛒 Productos</h3>
                          <div class="order-products">
                              ${order.items.map(item => `
                                  <div class="order-product-item">
                                      <div class="product-details">
                                          <div>${item.name}</div>
                                          <div>${item.quantity} x $${item.price.toFixed(2)}</div>
                                          <div>$${(item.price * item.quantity).toFixed(2)}</div>
                                      </div>
                                  </div>
                              `).join('')}
                          </div>
                      </div>
                  </div>
              `;
              
              modal.querySelector('.close-modal').addEventListener('click', () => {
                  addDebugLog("Cerrando detalles del pedido", "info");
                  this.openAdminPanel();
              });
          })
          .catch(error => {
              addDebugLog(`Error cargando detalles del pedido: ${error.message}`, "error");
              alert('Error al cargar detalles del pedido');
          });
  },
  
  renderCategoryOptions: function(type = 'fisico') {
      addDebugLog(`Cargando opciones de categoría para tipo: ${type}`, "debug");
      const categorySelect = document.getElementById('product-category');
      categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';
      
      fetch(`${window.API_BASE_URL}/api/categories/${type}`)
          .then(response => response.json())
          .then(categories => {
              categories.forEach(category => {
                  const option = document.createElement('option');
                  option.value = category;
                  option.textContent = this.getCategoryName(category);
                  categorySelect.appendChild(option);
              });
              addDebugLog(`${categories.length} categorías cargadas`, "info");
          })
          .catch(error => {
              addDebugLog(`Error cargando categorías: ${error.message}`, "error");
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
      addDebugLog("Reseteando formulario de producto", "debug");
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
      
      document.querySelectorAll('.price-currency').forEach(input => {
          input.value = '';
      });
  }
};

// Inicializar AdminSystem cuando el script se carga
document.addEventListener('DOMContentLoaded', () => {
    AdminSystem.init();
});

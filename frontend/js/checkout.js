const CheckoutSystem = {
  selectedMethodPrices: {},
  cartItemsWithDetails: [],
    
  async openCheckout(cart, totalByCurrency) {
    this.selectedMethodPrices = totalByCurrency;
    const userData = UserProfile.getUserData();
    const modal = document.getElementById('product-modal');
    const isProfileComplete = userData.fullName && userData.ci && userData.phone && userData.address && userData.province;
    const startingStep = isProfileComplete ? 2 : 1;
    
    // Obtener detalles de los productos del carrito
    this.cartItemsWithDetails = await this.getCartItemsDetails(cart.items);
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>🚀 Finalizar Compra</h2>
          <button class="close-modal">&times;</button>
        </div>
        
        <div class="checkout-steps">
          <div class="step ${startingStep >= 1 ? 'active' : ''}" data-step="1">👤 Datos</div>
          <div class="step ${startingStep >= 2 ? 'active' : ''}" data-step="2">💳 Pago</div>
          <div class="step" data-step="3">✅ Confirmar</div>
        </div>
        
        <div class="checkout-content" id="checkout-content">
          <div class="checkout-step" id="step-1" style="display: ${startingStep === 1 ? 'block' : 'none'};">
            <h3>👤 Tus Datos Personales</h3>
            <div class="form-group">
              <label>Nombre y Apellidos:</label>
              <input type="text" id="checkout-fullname" value="${userData.fullName || ''}" required class="modern-input">
            </div>
            <div class="form-group">
              <label>Carnet de Identidad:</label>
              <input type="text" id="checkout-ci" value="${userData.ci || ''}" required class="modern-input">
            </div>
            <div class="form-group">
              <label>Teléfono:</label>
              <input type="text" id="checkout-phone" value="${userData.phone || ''}" required class="modern-input">
            </div>
            <div class="form-group">
              <label>Dirección:</label>
              <input type="text" id="checkout-address" value="${userData.address || ''}" required class="modern-input">
            </div>
            <div class="form-group">
              <label>Provincia:</label>
              <select id="checkout-province" required class="modern-select">
                <option value="">Seleccionar provincia</option>
                ${['Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas', 'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila', 'Camagüey', 'Las Tunas', 'Granma', 'Holguín', 'Santiago de Cuba', 'Guantánamo', 'Isla de la Juventud']
                  .map(prov => `<option value="${prov}" ${userData.province === prov ? 'selected' : ''}>${prov}</option>`).join('')}
              </select>
            </div>
            
            <div class="optional-recipient">
              <label class="checkbox-label">
                <input type="checkbox" id="add-recipient"> 
                <span class="checkmark"></span>
                📦 ¿Entregar a otra persona?
              </label>
              
              <div id="recipient-fields" style="display: none; margin-top: 15px;">
                <div class="form-group">
                  <label>Nombre y Apellidos del Receptor:</label>
                  <input type="text" id="recipient-name" class="modern-input">
                </div>
                <div class="form-group">
                  <label>CI del Receptor:</label>
                  <input type="text" id="recipient-ci" class="modern-input">
                </div>
                <div class="form-group">
                  <label>Teléfono del Receptor:</label>
                  <input type="text" id="recipient-phone" class="modern-input">
                </div>
              </div>
            </div>
            
            <div class="checkout-buttons">
              <button class="btn-cancel" id="cancel-checkout">❌ Cancelar</button>
              <button class="btn-next" id="next-to-payment">👉 Siguiente</button>
            </div>
          </div>
          
          <div class="checkout-step" id="step-2" style="display: ${startingStep === 2 ? 'block' : 'none'};">
            <h3>💳 Método de Pago</h3>
            
            <div class="payment-methods" id="payment-methods-container">
              <!-- Los métodos de pago se generarán dinámicamente -->
            </div>
            
            <div class="admin-info">
              <p><strong>📌 Realizar transferencia a:</strong></p>
              <div class="account-info">
                <p id="admin-card-number">Cargando información...</p>
                <p id="admin-phone-number">Cargando teléfono...</p>
              </div>
              <p class="warning-note">⚠️ Importante: Debe incluir la prueba de transferencia en el siguiente paso</p>
            </div>
            
            <div class="checkout-buttons">
              <button class="btn-back" id="back-to-info">👈 Atrás</button>
              <button class="btn-next" id="next-to-confirm">👉 Siguiente</button>
            </div>
          </div>
          
          <div class="checkout-step" id="step-3" style="display: none;">
            <h3>✅ Confirmar Pedido</h3>
            
            <div class="order-summary">
              <h4>📦 Resumen del Pedido</h4>
              <div id="order-items-list"></div>
              <div class="order-total" id="order-total-display"></div>
            </div>
            
            <div class="transfer-info">
              <div class="form-group">
                <label>📸 Captura de pantalla de la transferencia:</label>
                <input type="file" id="transfer-proof" accept="image/*" required>
                <div id="transfer-proof-preview" style="margin-top: 10px;"></div>
                <p class="info-note">Por favor, suba una imagen que muestre claramente:</p>
                <ul class="info-note">
                  <li>ID de la transferencia</li>
                  <li>Monto transferido</li>
                  <li>Fecha y hora</li>
                </ul>
              </div>
            </div>
            
            <!-- Sección de campos requeridos - SIEMPRE presente -->
            <div id="required-fields-section" style="margin-top: 20px;">
              <h4>📝 Datos Requeridos</h4>
              <div id="required-fields-inputs"></div>
            </div>
            
            <div class="checkout-buttons">
              <button class="btn-back" id="back-to-payment">👈 Atrás</button>
              <button class="btn-confirm" id="confirm-purchase">✅ Confirmar Compra</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    modal.style.display = 'flex';
    this.setupCheckoutEvents(cart);
    
    // Generar métodos de pago disponibles basados en los precios de los productos
    this.generatePaymentMethods();
    
    // Mostrar los productos en el resumen
    this.updateOrderSummary();
    
    // Verificar si hay campos requeridos y mostrarlos
    const requiredFields = this.getRequiredFields(cart.items);
    if (requiredFields.length > 0) {
      this.showRequiredFields(requiredFields);
    }
  },
  
  async getCartItemsDetails(cartItems) {
    const itemsWithDetails = [];
    
    for (const item of cartItems) {
      try {
        const product = await ProductView.getProductById(item.productId, item.tabType);
        if (product) {
          itemsWithDetails.push({
            ...item,
            name: product.name,
            prices: product.prices // Guardamos todos los precios
          });
        }
      } catch (error) {
        console.error('Error obteniendo detalles del producto:', error);
      }
    }
    
    return itemsWithDetails;
  },
  
  generatePaymentMethods() {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;
    
    // Determinar qué métodos de pago están disponibles basados en los precios de los productos
    const availableCurrencies = this.getAvailableCurrencies();
    
    container.innerHTML = '';
    
    // BPA y BANDEC siempre disponibles para CUP
    if (availableCurrencies.includes('CUP')) {
      container.innerHTML += `
        <div class="payment-method">
          <input type="radio" name="payment-method" id="payment-bpa" value="BPA">
          <label for="payment-bpa">💳 Transferencia BPA (CUP)</label>
        </div>
        <div class="payment-method">
          <input type="radio" name="payment-method" id="payment-bandec" value="BANDEC">
          <label for="payment-bandec">💳 Transferencia BANDEC (CUP)</label>
        </div>
      `;
    }
    
    // MLC solo disponible si hay productos con precio en MLC
    if (availableCurrencies.includes('MLC')) {
      container.innerHTML += `
        <div class="payment-method">
          <input type="radio" name="payment-method" id="payment-mlc" value="MLC">
          <label for="payment-mlc">💳 Transferencia MLC</label>
        </div>
      `;
    }
    
    // Saldo Móvil solo disponible si hay productos con precio en Saldo Móvil
    if (availableCurrencies.includes('Saldo Móvil')) {
      container.innerHTML += `
        <div class="payment-method">
          <input type="radio" name="payment-method" id="payment-mobile" value="Saldo Móvil" checked>
          <label for="payment-mobile">📱 Saldo Móvil</label>
        </div>
      `;
    }
    
    // Si solo hay un método disponible, seleccionarlo automáticamente
    const methods = container.querySelectorAll('input[type="radio"]');
    if (methods.length === 1) {
      methods[0].checked = true;
    } else {
      // Seleccionar Saldo Móvil por defecto si está disponible
      const mobilePayment = document.getElementById('payment-mobile');
      if (mobilePayment) mobilePayment.checked = true;
    }
    
    // Actualizar la información de pago
    this.updatePaymentInfo();
  },
  
  getAvailableCurrencies() {
    const currencies = new Set();
    
    this.cartItemsWithDetails.forEach(item => {
      if (item.prices) {
        Object.keys(item.prices).forEach(currency => {
          // Solo considerar monedas con precio definido y mayor a 0
          if (item.prices[currency] && parseFloat(item.prices[currency]) > 0) {
            currencies.add(currency);
          }
        });
      }
    });
    
    return Array.from(currencies);
  },
  
  updateOrderSummary() {
    const itemsList = document.getElementById('order-items-list');
    if (!itemsList) return;
    
    itemsList.innerHTML = '';
    
    this.cartItemsWithDetails.forEach(item => {
      const itemElement = document.createElement('div');
      itemElement.className = 'order-item';
      itemElement.innerHTML = `
        <div>${item.name || 'Producto'} x ${item.quantity}</div>
        <div>${this.getPriceForDisplay(item)}</div>
      `;
      itemsList.appendChild(itemElement);
    });
    
    this.updatePaymentInfo();
  },
  
  getPriceForDisplay(item) {
    // Mostrar todos los precios disponibles para el producto
    if (!item.prices) return 'Precio no disponible';
    
    let display = '';
    Object.entries(item.prices).forEach(([currency, price]) => {
      if (price && parseFloat(price) > 0) {
        display += `${price} ${currency} `;
      }
    });
    
    return display || 'Precio no disponible';
  },
  
  setupCheckoutEvents: function(cart) {
    document.getElementById('add-recipient')?.addEventListener('change', function() {
      document.getElementById('recipient-fields').style.display = this.checked ? 'block' : 'none';
    });
    
    document.getElementById('next-to-payment')?.addEventListener('click', () => {
      const fullName = document.getElementById('checkout-fullname').value;
      const ci = document.getElementById('checkout-ci').value;
      const phone = document.getElementById('checkout-phone').value;
      const address = document.getElementById('checkout-address').value;
      const province = document.getElementById('checkout-province').value;
      
      if (!fullName || !ci || !phone || !address || !province) {
        alert('Por favor complete todos los campos obligatorios');
        return;
      }
      
      UserProfile.userData = { fullName, ci, phone, address, province };
      UserProfile.saveUserData();
      this.goToStep(2);
    });
    
    document.getElementById('back-to-info')?.addEventListener('click', () => this.goToStep(1));
    document.getElementById('next-to-confirm')?.addEventListener('click', () => {
      this.goToStep(3);
    });
    document.getElementById('back-to-payment')?.addEventListener('click', () => this.goToStep(2));
    document.getElementById('cancel-checkout')?.addEventListener('click', () => {
      document.getElementById('product-modal').style.display = 'none';
    });
    
    document.querySelectorAll('input[name="payment-method"]')?.forEach(radio => {
      radio.addEventListener('change', () => this.updatePaymentInfo());
    });
    
    document.getElementById('transfer-proof')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = document.getElementById('transfer-proof-preview');
        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = event.target.result;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '200px';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
    
    document.getElementById('confirm-purchase')?.addEventListener('click', async () => {
      try {
        const method = document.querySelector('input[name="payment-method"]:checked')?.value;
        const userId = UserProfile.getTelegramUserId();
        
        if (!method) return alert('Por favor seleccione un método de pago');
        if (!userId) return alert('No se pudo identificar su usuario');
        
        const proofFile = document.getElementById('transfer-proof')?.files[0];
        if (!proofFile) return alert('Por favor suba la captura de pantalla de la transferencia');

        // Mostrar estado de carga
        const confirmBtn = document.getElementById('confirm-purchase');
        const originalBtnText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<div class="spinner"></div> Procesando...';
        confirmBtn.disabled = true;
        
        const proofPreview = document.getElementById('transfer-proof-preview');
        proofPreview.innerHTML = '<div class="loading">Subiendo comprobante...</div>';

        // 1. Crear FormData para enviar la imagen y los datos
        const formData = new FormData();
        formData.append('image', proofFile);
        formData.append('userId', userId);
        formData.append('paymentMethod', method);
        
        // Datos del usuario
        formData.append('fullName', document.getElementById('checkout-fullname').value);
        formData.append('ci', document.getElementById('checkout-ci').value);
        formData.append('phone', document.getElementById('checkout-phone').value);
        formData.append('address', document.getElementById('checkout-address').value);
        formData.append('province', document.getElementById('checkout-province').value);
        
        // Datos del receptor si aplica
        if (document.getElementById('add-recipient')?.checked) {
          formData.append('recipientName', document.getElementById('recipient-name').value);
          formData.append('recipientCi', document.getElementById('recipient-ci').value);
          formData.append('recipientPhone', document.getElementById('recipient-phone').value);
        }
        
        // Campos requeridos
        const requiredFields = {};
        document.querySelectorAll('#required-fields-inputs .form-group').forEach(group => {
          const input = group.querySelector('input');
          const label = group.querySelector('label');
          if (input && label) {
            const fieldName = label.textContent.replace(':', '').trim();
            requiredFields[fieldName] = input.value;
          }
        });
        formData.append('requiredFields', JSON.stringify(requiredFields));
        
        // Calcular el total basado en el método de pago seleccionado
        let total = 0;
        this.cartItemsWithDetails.forEach(item => {
          // Usar el precio correspondiente al método de pago seleccionado
          let price = 0;
          if (method === 'BPA' || method === 'BANDEC') {
            price = item.prices['CUP'] || 0;
          } else if (method === 'MLC') {
            price = item.prices['MLC'] || 0;
          } else if (method === 'Saldo Móvil') {
            price = item.prices['Saldo Móvil'] || 0;
          }
          
          total += price * item.quantity;
        });
        
        formData.append('total', total.toString());
        
        // 2. Enviar datos al backend
        const response = await fetch(`${window.API_BASE_URL}/api/checkout`, {
          method: 'POST',
          headers: { 
            'Telegram-ID': userId.toString()
          },
          body: formData
        });

        // Manejar respuesta
        if (!response.ok) {
          let errorMessage = 'Error en el servidor';
          try {
            const errorBody = await response.json();
            errorMessage = errorBody.error || errorBody.message || errorMessage;
          } catch (e) {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        
        // Éxito - limpiar y notificar
        document.getElementById('product-modal').style.display = 'none';
        CartSystem.clearCart();
        Notifications.showNotification('🎉 ¡Compra realizada!', `Tu pedido #${result.orderId} ha sido creado`);
        
      } catch (error) {
        console.error('Error en checkout:', error);
        
        // Mostrar error en la interfaz
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
          <strong>Error al confirmar la compra:</strong>
          <p>${error.message}</p>
          <p>Por favor, inténtalo de nuevo.</p>
        `;
        
        const proofPreview = document.getElementById('transfer-proof-preview');
        const existingError = proofPreview.querySelector('.error-message');
        if (existingError) existingError.remove();
        proofPreview.appendChild(errorContainer);
        
        alert('Error al confirmar la compra: ' + error.message);
      } finally {
        // Restaurar botón
        const confirmBtn = document.getElementById('confirm-purchase');
        if (confirmBtn) {
          confirmBtn.innerHTML = '✅ Confirmar Compra';
          confirmBtn.disabled = false;
        }
      }
    });
  },
  
  getRequiredFields: function(cartItems) {
    const fields = new Map(); // Usar Map para evitar duplicados
    
    cartItems.forEach(item => {
      if (item.tabType === 'digital') {
        const product = ProductView.getProductById(item.productId, 'digital');
        
        if (product && product.required_fields) {
          product.required_fields.forEach(field => {
            if (field.required) {
              // Agregar solo si no existe
              if (!fields.has(field.name)) {
                fields.set(field.name, {
                  name: field.name,
                  required: field.required
                });
              }
            }
          });
        }
      }
    });
    
    return Array.from(fields.values());
  },
  
  showRequiredFields: function(fields) {
    const container = document.getElementById('required-fields-inputs');
    if (container) {
      container.innerHTML = '';
      
      fields.forEach(field => {
        const fieldId = `field-${field.name.replace(/\s+/g, '-')}`;
        container.innerHTML += `
          <div class="form-group">
            <label for="${fieldId}">${field.name}:</label>
            <input type="text" 
                   id="${fieldId}" 
                   required 
                   class="modern-input"
                   placeholder="Ingrese ${field.name.toLowerCase()}">
          </div>
        `;
      });
    }
  },
  
  goToStep: function(step) {
    document.querySelectorAll('.checkout-step').forEach(el => el.style.display = 'none');
    const stepEl = document.getElementById(`step-${step}`);
    if (stepEl) stepEl.style.display = 'block';
    
    document.querySelectorAll('.step').forEach((el, index) => {
      if (index + 1 <= step) el.classList.add('active');
      else el.classList.remove('active');
    });
  },
  
  updatePaymentInfo: function() {
    const userData = UserProfile.getUserData();
    const method = document.querySelector('input[name="payment-method"]:checked')?.value;
    if (!method) return;
    
    let cardNumber = '';
    let phoneNumber = userData.adminPhone || 'Número no disponible';
    
    if (method === 'Saldo Móvil') {
      document.getElementById('admin-card-number').textContent = `📱 Teléfono: ${phoneNumber}`;
      document.getElementById('admin-phone-number').textContent = '';
    } else {
      if (userData.adminCards) {
        switch(method) {
          case 'BPA': cardNumber = userData.adminCards.bpa || 'Tarjeta no configurada'; break;
          case 'BANDEC': cardNumber = userData.adminCards.bandec || 'Tarjeta no configurada'; break;
          case 'MLC': cardNumber = userData.adminCards.mlc || 'Tarjeta no configurada'; break;
        }
      }
      
      document.getElementById('admin-card-number').textContent = `💳 Tarjeta: ${cardNumber}`;
      document.getElementById('admin-phone-number').textContent = `📱 Teléfono: ${phoneNumber}`;
    }
    
    // Determinar moneda
    let currency = 'CUP';
    if (method === 'MLC') currency = 'MLC';
    else if (method === 'Saldo Móvil') currency = 'Saldo Móvil';
    
    // Calcular el total basado en los precios de los productos para la moneda seleccionada
    let total = 0;
    this.cartItemsWithDetails.forEach(item => {
      if (item.prices && item.prices[currency]) {
        total += item.prices[currency] * item.quantity;
      }
    });
    
    const totalDisplay = document.getElementById('order-total-display');
    if (totalDisplay) {
      totalDisplay.textContent = `Total: ${total.toFixed(2)} ${currency}`;
    }
  }
};

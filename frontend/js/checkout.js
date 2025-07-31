const CheckoutSystem = {
  init: function() {},
  selectedMethodPrices: {}, // Almacenará los precios por método de pago
    
  openCheckout: function(cart, totalByCurrency) {
    this.selectedMethodPrices = totalByCurrency;
    const userData = UserProfile.getUserData();
    const modal = document.getElementById('product-modal');
    
    const isProfileComplete = userData.fullName && userData.ci && userData.phone && userData.address && userData.province;
    const startingStep = isProfileComplete ? 2 : 1;
    
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
                ${[
                  'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas',
                  'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila',
                  'Camagüey', 'Las Tunas', 'Granma', 'Holguín', 'Santiago de Cuba',
                  'Guantánamo', 'Isla de la Juventud'
                ].map(prov => `
                  <option value="${prov}" ${userData.province === prov ? 'selected' : ''}>
                    ${prov}
                  </option>
                `).join('')}
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
            
            <div class="payment-methods">
              <div class="payment-method">
                <input type="radio" name="payment-method" id="payment-bpa" value="BPA">
                <label for="payment-bpa">💳 Transferencia BPA</label>
              </div>
              <div class="payment-method">
                <input type="radio" name="payment-method" id="payment-bandec" value="BANDEC">
                <label for="payment-bandec">💳 Transferencia BANDEC</label>
              </div>
              <div class="payment-method">
                <input type="radio" name="payment-method" id="payment-mlc" value="MLC">
                <label for="payment-mlc">💳 Transferencia MLC</label>
              </div>
              <div class="payment-method">
                <input type="radio" name="payment-method" id="payment-mobile" value="Saldo Móvil" checked>
                <label for="payment-mobile">📱 Saldo Móvil</label>
              </div>
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
              <h4>📦 Resumen del Pedido</极速赛车开奖直播官网h4>
              <div id="order-items-list"></div>
              <div class="order-total" id="order-total-display">
                <!-- Total se actualizará dinámicamente -->
              </div>
            </div>
            
            <div class="transfer-info">
              <div class="form-group">
                <label>📸 Captura de pantalla de la transferencia:</label>
                <input type="file" id="transfer-proof" accept="image/*" required>
                <p class="info-note">Por favor, suba una imagen que muestre claramente:</p>
                <ul class="info-note">
                  <li>ID de la transferencia</li>
                  <li>Monto transferido</li>
                  <li>Fecha y hora</li>
                </ul>
              </div>
            </div>
            
            <div id="required-fields-section" style="display: none; margin-top: 20px;">
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
    this.setupCheckoutEvents(cart, totalByCurrency);
  },
  
  setupCheckoutEvents: function(cart, totalByCurrency) {
    const addRecipient = document.getElementById('add-recipient');
    if (addRecipient) {
      addRecipient.addEventListener('change', function() {
        const recipientFields = document.getElementById('recipient-fields');
        recipientFields.style.display = this.checked ? 'block' : 'none';
      });
    }
    
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
      
      UserProfile.userData.fullName = fullName;
      UserProfile.userData.ci = ci;
      UserProfile.userData.phone = phone;
      UserProfile.userData.address = address;
      UserProfile.userData.province = province;
      UserProfile.saveUserData();
      
      this.goToStep(2);
    });
    
    document.getElementById('back-to-info')?.addEventListener('click', () => this.goToStep(1));
    document.getElementById('next-to-confirm')?.addEventListener('click', () => {
      this.goToStep(3);
    });
    document.getElementById('back-to-payment')?.addEventListener('click', () => this.goTo极速赛车开奖直播官网Step(2));
    
    document.getElementById('cancel-checkout')?.addEventListener('click', () => {
      document.getElementById('product-modal').style.display = 'none';
    });
    
    document.querySelectorAll('input[name="payment-method"]')?.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updatePaymentInfo();
      });
    });
    
    this.updatePaymentInfo();
    
    const itemsList = document.getElementById('order-items-list');
    if (itemsList) {
      itemsList.innerHTML = '';
      cart.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'order-item';
        itemElement.innerHTML = `
          <div>${item.name || 'Producto'} x ${item.quantity}</div>
          <div>$${(item.price * item.quantity).toFixed(2)}</div>
        `;
        itemsList.appendChild(itemElement);
      });
    }
    
    document.getElementById('confirm-purchase')?.addEventListener('click', async () => {
      const method = document.querySelector('input[name="payment-method"]:checked')?.value;
      const userId = UserProfile.getTelegramUserId();
      
      const proofFile = document.getElementById('transfer-proof')?.files[0];
      if (!proofFile) {
        alert('Por favor suba la captura de pantalla de la transferencia');
        return;
      }
      
      const transferData = {};
      
      // Subir la imagen de comprobante a ImgBB usando ImageUploader
      try {
        const imageUrl = await ImageUploader.uploadImage(proofFile);
        transferData.transferProof = imageUrl;
        transferData.transferId = `TRF-${Date.now()}`;
      } catch (error) {
        console.error('Error subiendo comprobante:', error);
        alert('Error al subir el comprobante: ' + error.message);
        return;
      }
      
      // Continuar con la orden
      const recipientData = {};
      if (document.getElementById('add-recipient')?.checked) {
        recipientData.fullName = document.getElementById('recipient-name').value;
        recipientData.ci = document.getElementById('recipient-ci').value;
        recipientData.phone = document.getElementById('recipient-phone').value;
      }
      
      const requiredFieldsData = {};
      if (document.getElementById('required-fields-inputs')) {
        document.querySelectorAll('#required-fields-inputs .form-group').forEach(group => {
          const input = group.querySelector('input');
          const fieldName = group.querySelector('label').textContent.replace(':', '').trim();
          requiredFieldsData[fieldName] = input.value;
        });
      }
      
      // Crear la orden en el backend
      fetch(`${window.API_BASE_URL}/api/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Telegram-ID': userId.toString()
        },
        body: JSON.stringify({
          userId: userId,
          paymentMethod: method,
          transferData: transferData,
          recipient: recipientData,  // Cambiamos a recipient (singular)
          requiredFields: requiredFieldsData
        })
      })
      .then(response => response.json())
      .then(orderResult => {
        document.getElementById('product-modal').style.display = 'none';
        CartSystem.clearCart();
        
        Notifications.showNotification('🎉 ¡Compra realizada!', 'Tu pedido #' + orderResult.orderId + ' ha sido creado');
      })
      .catch(error => {
        console.error('Error confirmando compra:', error);
        alert('Error al confirmar la compra: ' + error.message);
      });
    });
  },
  
  getRequiredFields: function(cartItems) {
    const fields = new Set();
    cartItems.forEach(item => {
      if (item.tabType === 'digital') {
        const product = ProductView.getProductById(item.productId, 'digital');
        if (product && product.required_fields) {
          product.required_fields.forEach(field => {
            if (field.required) {
              fields.add(field.name);
            }
          });
        }
      }
    });
    return Array.from(fields);
  },
  
  showRequiredFields: function(fields) {
    const container = document.getElementById('required-fields-inputs');
    if (container) {
      container.innerHTML = '';
      fields.forEach(field => {
        container.innerHTML += `
          <div class="form-group">
            <label>${field}:</label>
            <input type="text" id="field-${field.replace(/\s+/g, '-')}" required class="modern-input">
          </div>
        `;
      });
      document.getElementById('required-fields-section').style.display = 'block';
    }
  },
  
  goToStep: function(step) {
    document.querySelectorAll('.checkout-step').forEach(el => {
      el.style.display = 'none';
    });
    
    const stepEl = document.getElementById(`step-${step}`);
    if (stepEl) {
      stepEl.style.display = 'block';
    }
    
    document.querySelectorAll('.step').forEach((el, index) => {
      if (index + 1 <= step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
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
          case 'BPA':
            cardNumber = userData.adminCards.bpa || 'Tarjeta no configurada';
            break;
          case 'BANDEC':
            cardNumber = userData.adminCards.bandec || 'Tarjeta no configurada';
            break;
          case 'MLC':
            cardNumber = userData.adminCards.mlc || 'Tarjeta no configurada';
            break;
        }
      }
      
      const adminCardEl = document.getElementById('admin-card-number');
      const adminPhoneEl = document.getElementById('admin-phone-number');
      if (adminCardEl) adminCardEl.textContent = `💳 Tarjeta: ${cardNumber}`;
      if (adminPhoneEl) adminPhoneEl.textContent = `📱 Teléfono: ${phoneNumber}`;
    }
    
    // Actualizar el total mostrado según el método de pago
    const totalDisplay = document.getElementById('order-total-display');
    if (totalDisplay) {
      const total = this.selectedMethodPrices[method];
      if (total !== undefined) {
        totalDisplay.textContent = `Total: ${total.toFixed(2)} ${method}`;
      } else {
        totalDisplay.textContent = 'Total no disponible';
      }
    }
  }
};

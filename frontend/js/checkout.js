const CheckoutSystem = {
  init: function() {},
    
  openCheckout: function(cart, total) {
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
              <input type="text" id="checkout-fullname" value="${userData.fullName || ''}" required>
            </div>
            <div class="form-group">
              <label>Carnet de Identidad:</label>
              <input type="text" id="checkout-ci" value="${userData.ci || ''}" required>
            </div>
            <div class="form-group">
              <label>Teléfono:</label>
              <input type="text" id="checkout-phone" value="${userData.phone || ''}" required>
            </div>
            <div class="form-group">
              <label>Dirección:</label>
              <input type="text" id="checkout-address" value="${userData.address || ''}" required>
            </div>
            <div class="form-group">
              <label>Provincia:</label>
              <select id="checkout-province" required>
                <option value="">Seleccionar provincia</option>
                <option value="Pinar del Río" ${userData.province === 'Pinar del Río' ? 'selected' : ''}>Pinar del Río</option>
                <option value="Artemisa" ${userData.province === 'Artemisa' ? 'selected' : ''}>Artemisa</option>
                <option value="La Habana" ${userData.province === 'La Habana' ? 'selected' : ''}>La Habana</option>
                <option value="Mayabeque" ${userData.province === 'Mayabeque' ? 'selected' : ''}>Mayabeque</option>
                <option value="Matanzas" ${userData.province === 'Matanzas' ? 'selected' : ''}>Matanzas</option>
                <option value="Cienfuegos" ${userData.province === 'Cienfuegos' ? 'selected' : ''}>Cienfuegos</option>
                <option value="Villa Clara" ${userData.province === 'Villa Clara' ? 'selected' : ''}>Villa Clara</option>
                <option value="Sancti Spíritus" ${userData.province === 'Sancti Spíritus' ? 'selected' : ''}>Sancti Spíritus</option>
                <option value="Ciego de Ávila" ${userData.province === 'Ciego de Ávila' ? 'selected' : ''}>Ciego de Ávila</option>
                <option value="Camagüey" ${userData.province === 'Camagüey' ? 'selected' : ''}>Camagüey</option>
                <option value="Las Tunas" ${userData.province === 'Las Tunas' ? 'selected' : ''}>Las Tunas</option>
                <option value="Granma" ${userData.province === 'Granma' ? 'selected' : ''}>Granma</option>
                <option value="Holguín" ${userData.province === 'Holguín' ? 'selected' : ''}>Holguín</option>
                <option value="Santiago de Cuba" ${userData.province === 'Santiago de Cuba' ? 'selected' : ''}>Santiago de Cuba</option>
                <option value="Guantánamo" ${userData.province === 'Guantánamo' ? 'selected' : ''}>Guantánamo</option>
                <option value="Isla de la Juventud" ${userData.province === 'Isla de la Juventud' ? 'selected' : ''}>Isla de la Juventud</option>
              </select>
            </div>
            
            <div class="optional-recipient">
              <label>
                <input type="checkbox" id="add-recipient"> 
                📦 ¿Entregar a otra persona?
              </label>
              
              <div id="recipient-fields" style="display: none; margin-top: 15px;">
                <div class="form-group">
                  <label>Nombre y Apellidos del Receptor:</label>
                  <input type="text" id="recipient-name">
                </div>
                <div class="form-group">
                  <label>CI del Receptor:</label>
                  <input type="text" id="recipient-ci">
                </div>
                <div class="form-group">
                  <label>Teléfono del Receptor:</label>
                  <input type="text" id="recipient-phone">
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
              <h4>📦 Resumen del Pedido</h4>
              <div id="order-items-list"></div>
              <div class="order-total" id="order-total-display">
                Total: $${total.toFixed(2)} CUP
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
    this.setupCheckoutEvents(cart, total);
  },
  
  setupCheckoutEvents: function(cart, total) {
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
    document.getElementById('back-to-payment')?.addEventListener('click', () => this.goToStep(2));
    
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
          <div>${item.name} x ${item.quantity}</div>
          <div>$${(item.price * item.quantity).toFixed(2)} CUP</div>
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
      
      // Subir la imagen de comprobante a Imagebin
      try {
        const formData = new FormData();
        formData.append('key', 'oQJs9Glzy1gzHGvYSc1M0N8AzPQ7oKRe');
        formData.append('file', proofFile);
        
        const response = await fetch('https://imagebin.ca/upload.php', {
          method: 'POST',
          body: formData
        });

        const text = await response.text();
        const lines = text.split('\n');
        const urlLine = lines.find(line => line.startsWith('url:'));
        if (urlLine) {
          const url = urlLine.split('url:')[1].trim();
          transferData.transferProof = url;
          transferData.transferId = proofFile.name;
        } else {
          throw new Error('No se encontró la URL en la respuesta de Imagebin');
        }
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
          recipientData: recipientData,
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
        if (product && product.requiredFields) {
          product.requiredFields.forEach(field => {
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
            <input type="text" id="field-${field.replace(/\s+/g, '-')}" required>
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
      return;
    }

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
};

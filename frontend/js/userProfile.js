const UserProfile = {
  userData: {
    fullName: "",
    ci: "",
    phone: "",
    address: "",
    province: "",
    adminCards: {
      bpa: "",
      bandec: "",
      mlc: ""
    },
    adminPhone: ""
  },
  
  init: async function() {
    try {
      console.groupCollapsed('[UserProfile] Iniciando inicialización');
      await this.loadUserData();
      console.log('✅ UserProfile inicializado correctamente');
      return true;
    } catch (error) {
      console.error('[UserProfile] ❌ Error en init:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  },
  
  async loadUserData() {
    try {
      console.groupCollapsed('[UserProfile] Cargando datos de usuario');
      const userId = this.getTelegramUserId();
      console.log('🔍 ID de usuario obtenido:', userId);

      // 1. Cargar desde localStorage
      this.loadFromLocalStorage();
      console.log('📦 Datos de localStorage:', this.userData);

      // 2. Cargar desde API si hay userId
      if (userId) {
        console.log('🌐 Intentando cargar datos desde API...');
        const response = await fetch(`${window.API_BASE_URL}/api/users/${userId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }

        const user = await response.json();
        console.log('📡 Datos recibidos de API:', user);

        this.userData = {
          ...this.userData,
          ...(user.profile_data || {})
        };
        
        // Guardar en localStorage después de cargar desde API
        console.log('💾 Guardando datos actualizados en localStorage...');
        localStorage.setItem('userProfile', JSON.stringify(this.userData));
      }
      console.groupEnd();
    } catch (error) {
      console.error('[UserProfile] ❌ Error en loadUserData:', error);
      console.groupEnd();
      throw error;
    }
  },
  
  loadFromLocalStorage: function() {
    try {
      const savedData = localStorage.getItem('userProfile');
      if (savedData) {
        this.userData = {
          ...this.userData,
          ...JSON.parse(savedData)
        };
        console.log('[UserProfile] Datos cargados desde localStorage');
      } else {
        console.log('[UserProfile] No hay datos en localStorage');
      }
    } catch (error) {
      console.error('[UserProfile] Error parseando datos de localStorage:', error);
      localStorage.removeItem('userProfile');
    }
  },
  
  async saveUserData() {
    try {
      localStorage.setItem('userProfile', JSON.stringify(this.userData));
      
      const userId = this.getTelegramUserId();
      if (userId) {
        const response = await fetch(`${window.API_BASE_URL}/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.userData)
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status} guardando perfil`);
        }
        console.log("Perfil guardado en API correctamente");
      }
    } catch (error) {
      console.error('Error guardando perfil:', error);
      throw error;
    }
  },
  
  openProfileModal: function() {
    try {
      console.groupCollapsed('[UserProfile] Abriendo modal de perfil');
      
      const userId = this.getTelegramUserId();
      console.log('🔍 ID de usuario:', userId);
      if (!userId) {
        console.error("No se pudo obtener ID de usuario");
        if (typeof Notifications !== 'undefined') {
          Notifications.showNotification('Error', 'Debes iniciar sesión primero');
        } else {
          alert('Debes iniciar sesión primero');
        }
        console.groupEnd();
        return;
      }
      
      const modal = document.getElementById('product-modal');
      
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>👤 Mi Perfil</h2>
            <button class="close-modal">&times;</button>
          </div>
          <div class="profile-form">
            <div class="form-group">
              <label>👤 Nombre y Apellidos:</label>
              <input type="text" id="full-name" value="${this.userData.fullName || ''}" class="modern-input" required>
            </div>
            <div class="form-group">
              <label>🆔 Carnet de Identidad:</label>
              <input type="text" id="ci" value="${this.userData.ci || ''}" class="modern-input" required>
            </div>
            <div class="form-group">
              <label>📱 Teléfono:</label>
              <input type="text" id="phone" value="${this.userData.phone || ''}" class="modern-input" required>
            </div>
            <div class="form-group">
              <label>🏠 Dirección:</label>
              <input type="text" id="address" value="${this.userData.address || ''}" class="modern-input" required>
            </div>
            <div class="form-group">
              <label>📍 Provincia:</label>
              <select id="province" class="modern-select" required>
                <option value="">Seleccionar provincia</option>
                ${[
                  'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas',
                  'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila',
                  'Camagüey', 'Las Tunas', 'Granma', 'Holguín', 'Santiago de Cuba',
                  'Guantánamo', 'Isla de la Juventud'
                ].map(prov => `
                  <option value="${prov}" ${this.userData.province === prov ? 'selected' : ''}>
                    ${prov}
                  </option>
                `).join('')}
              </select>
            </div>
            
            ${this.isAdmin() ? this.getAdminFieldsHTML() : ''}
            
            <div class="form-buttons">
              <button id="save-profile" class="btn-primary">💾 Guardar Perfil</button>
              <button id="cancel-profile" class="btn-cancel">❌ Cancelar</button>
            </div>
          </div>
        </div>
      `;
      
      modal.style.display = 'flex';
      
      document.getElementById('save-profile').addEventListener('click', async () => {
        try {
          await this.saveProfile();
          modal.style.display = 'none';
          if (typeof Notifications !== 'undefined') {
            Notifications.showNotification('Éxito', 'Perfil guardado correctamente');
          }
        } catch (error) {
          console.error("Error guardando perfil:", error);
          if (typeof Notifications !== 'undefined') {
            Notifications.showNotification('Error', 'Error al guardar perfil');
          }
        }
      });
      
      document.getElementById('cancel-profile').addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      document.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      console.log('✅ Modal de perfil abierto correctamente');
      console.groupEnd();
    } catch (error) {
      console.error("[UserProfile] ❌ Error crítico en openProfileModal:", error);
      console.groupEnd();
      
      if (typeof Notifications !== 'undefined') {
        Notifications.showNotification('Error', 'Error al mostrar perfil');
      } else {
        alert(`Error abriendo perfil: ${error.message}`);
      }
    }
  },
  
  getAdminFieldsHTML: function() {
    return `
      <div class="admin-fields-section">
        <h3>🔧 Configuración de Administrador</h3>
        
        <div class="form-group">
          <label>📱 Teléfono para Saldo Móvil:</label>
          <input type="text" id="admin-phone" value="${this.userData.adminPhone || ''}" class="modern-input">
        </div>
        
        <h4>💳 Tarjetas para Transferencias</h4>
        <div class="form-group">
          <label>BPA:</label>
          <input type="text" id="admin-bpa" value="${this.userData.adminCards?.bpa || ''}" class="modern-input">
        </div>
        <div class="form-group">
          <label>BANDEC:</label>
          <input type="text" id="admin-bandec" value="${this.userData.adminCards?.bandec || ''}" class="modern-input">
        </div>
        <div class="form-group">
          <label>MLC:</label>
          <input type="text" id="admin-mlc" value="${this.userData.adminCards?.mlc || ''}" class="modern-input">
        </div>
      </div>
    `;
  },
  
  isAdmin: function() {
    return AdminSystem.isAdmin;
  },
  
  async saveProfile() {
    this.userData = {
      ...this.userData,
      fullName: document.getElementById('full-name').value.trim(),
      ci: document.getElementById('ci').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      province: document.getElementById('province').value
    };
    
    if (this.isAdmin()) {
      this.userData = {
        ...this.userData,
        adminPhone: document.getElementById('admin-phone').value.trim(),
        adminCards: {
          bpa: document.getElementById('admin-bpa').value.trim(),
          bandec: document.getElementById('admin-bandec').value.trim(),
          mlc: document.getElementById('admin-mlc').value.trim()
        }
      };
    }
    
    await this.saveUserData();
  },
  
  getUserData: function() {
    return this.userData;
  },
  
  getTelegramUserId: function() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tgid = urlParams.get('tgid') || localStorage.getItem('telegramUserId');
      
      if (tgid) {
        localStorage.setItem('telegramUserId', tgid);
        return tgid;
      }
      
      return null;
    } catch (error) {
      console.error('[UserProfile] ❌ Error en getTelegramUserId:', error);
      return null;
    }
  }
};

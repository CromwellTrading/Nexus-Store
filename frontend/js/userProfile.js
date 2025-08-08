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
      console.log("[UserProfile] Iniciando inicialización...");
      await this.loadUserData();
      console.log("[UserProfile] Inicializado correctamente");
    } catch (error) {
      console.error("[UserProfile] Error en init:", error);
    }
  },
  
  async loadUserData() {
    console.log("[UserProfile] Cargando datos de usuario...");
    const userId = this.getUserId();
    
    // Primero intentar cargar desde localStorage
    this.loadFromLocalStorage();
    
    // Asegurar que adminCards existe
    if (!this.userData.adminCards) {
      this.userData.adminCards = {
        bpa: "",
        bandec: "",
        mlc: ""
      };
    }
    
    // Luego intentar cargar desde API si hay userId
    if (userId) {
      try {
        console.log(`[UserProfile] Cargando datos desde API para userId: ${userId}`);
        const response = await fetch(`${window.API_BASE_URL}/api/users/${userId}`);
        if (response.ok) {
          const user = await response.json();
          this.userData = {
            ...this.userData,
            ...(user.profile_data || {})
          };
          console.log("[UserProfile] Datos de usuario cargados desde API");
          
          // Asegurar que adminCards está completo
          this.userData.adminCards = {
            bpa: this.userData.adminCards?.bpa || "",
            bandec: this.userData.adminCards?.bandec || "",
            mlc: this.userData.adminCards?.mlc || ""
          };
          
          // Guardar en localStorage después de cargar desde API
          localStorage.setItem('userProfile', JSON.stringify(this.userData));
        } else {
          console.warn(`[UserProfile] API respondió con estado ${response.status}`);
        }
      } catch (error) {
        console.error('[UserProfile] Error cargando perfil desde API:', error);
      }
    } else {
      console.warn("[UserProfile] No se encontró userId, usando solo localStorage");
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
        console.log("[UserProfile] Datos de usuario cargados desde localStorage");
      } else {
        console.log("[UserProfile] No hay datos guardados en localStorage");
      }
    } catch (error) {
      console.error("[UserProfile] Error parseando datos de localStorage:", error);
    }
  },
  
  async saveUserData() {
    try {
      console.log("[UserProfile] Guardando datos de usuario...");
      localStorage.setItem('userProfile', JSON.stringify(this.userData));
      
      const userId = this.getUserId();
      if (userId) {
        console.log(`[UserProfile] Enviando datos a API para userId: ${userId}`);
        const response = await fetch(`${window.API_BASE_URL}/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.userData)
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status} guardando perfil`);
        }
        console.log("[UserProfile] Perfil guardado en API correctamente");
      } else {
        console.log("[UserProfile] No hay userId, solo se guardó en localStorage");
      }
    } catch (error) {
      console.error('[UserProfile] Error guardando perfil:', error);
      throw error;
    }
  },
  
  openProfileModal: function() {
    try {
      console.log("[UserProfile] Abriendo modal de perfil...");
      
      const userId = this.getUserId();
      if (!userId) {
        console.error("[UserProfile] No se pudo obtener ID de usuario");
        if (typeof Notifications !== 'undefined') {
          Notifications.showNotification('Error', 'Debes iniciar sesión primero');
        } else {
          alert('Debes iniciar sesión primero');
        }
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
          console.log("[UserProfile] Guardando perfil...");
          await this.saveProfile();
          modal.style.display = 'none';
          if (typeof Notifications !== 'undefined') {
            Notifications.showNotification('Éxito', 'Perfil guardado correctamente');
          }
        } catch (error) {
          console.error("[UserProfile] Error guardando perfil:", error);
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
      
      console.log("[UserProfile] Modal de perfil abierto correctamente");
    } catch (error) {
      console.error("[UserProfile] Error crítico en openProfileModal:", error);
      alert(`Error abriendo perfil: ${error.message}`);
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
  
  // Función corregida para obtener el ID de usuario
  getUserId: function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tgid = urlParams.get('tgid') || localStorage.getItem('telegramUserId');
    
    if (tgid) {
      localStorage.setItem('telegramUserId', tgid);
      return tgid;
    }
    
    return null;
  },
  
  // Nueva función para compatibilidad
  getTelegramUserId: function() {
    return this.getUserId();
  }
};

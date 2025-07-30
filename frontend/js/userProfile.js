const UserProfile = {
  userData: {
    fullName: "",
    ci: "",
    phone: "",
    address: "",
    province: ""
  },
  
  init: function() {
    this.loadUserData();
  },
  
  async loadUserData() {
    const userId = this.getTelegramUserId();
    if (!userId) return;
    
    try {
      const response = await fetch(`${window.API_BASE_URL}/api/users/${userId}`);
      if (response.ok) {
        const user = await response.json();
        // Ahora profile_data es un objeto JSONB directamente
        this.userData = user.profile_data || {};
      } else {
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      this.loadFromLocalStorage();
    }
  },
  
  loadFromLocalStorage: function() {
    const savedData = localStorage.getItem('userProfile');
    if (savedData) this.userData = JSON.parse(savedData);
  },
  
  async saveUserData() {
    localStorage.setItem('userProfile', JSON.stringify(this.userData));
    
    const userId = this.getTelegramUserId();
    if (userId) {
      try {
        await fetch(`${window.API_BASE_URL}/api/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.userData)
        });
      } catch (error) {
        console.error('Error guardando perfil:', error);
      }
    }
  },
  
  openProfileModal: function() {
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
            <input type="text" id="full-name" value="${this.userData.fullName || ''}" class="modern-input">
          </div>
          <div class="form-group">
            <label>🆔 Carnet de Identidad:</label>
            <input type="text" id="ci" value="${this.userData.ci || ''}" class="modern-input">
          </div>
          <div class="form-group">
            <label>📱 Teléfono:</label>
            <input type="text" id="phone" value="${this.userData.phone || ''}" class="modern-input">
          </div>
          <div class="form-group">
            <label>🏠 Dirección:</label>
            <input type="text" id="address" value="${this.userData.address || ''}" class="modern-input">
          </div>
          <div class="form-group">
            <label>📍 Provincia:</label>
            <select id="province" class="modern-select">
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
          <button id="save-profile" class="save-btn">💾 Guardar Perfil</button>
        </div>
      </div>
    `;
    
    modal.style.display = 'flex';
    
    document.getElementById('save-profile').addEventListener('click', () => this.saveProfile());
    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
  },
  
  saveProfile: function() {
    this.userData.fullName = document.getElementById('full-name').value;
    this.userData.ci = document.getElementById('ci').value;
    this.userData.phone = document.getElementById('phone').value;
    this.userData.address = document.getElementById('address').value;
    this.userData.province = document.getElementById('province').value;
    
    this.saveUserData();
    alert('✅ Perfil guardado correctamente');
  },
  
  getUserData: function() {
    return this.userData;
  },
  
  getTelegramUserId: function() {
    return localStorage.getItem('telegramUserId') || '';
  }
};

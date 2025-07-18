const UserProfile = {
  userData: {
      fullName: "",
      ci: "",
      phone: "",
      address: "",
      province: "",
      isAdmin: false,
      adminCards: {
          bpa: "",
          bandec: "",
          mlc: ""
      },
      adminPhone: ""
  },
  
  init: function() {
      this.loadUserData();
  },
  
  loadUserData: function() {
      const savedData = localStorage.getItem('userProfile');
      if (savedData) {
          this.userData = JSON.parse(savedData);
      }
      
      if (localStorage.getItem('isAdmin') === 'true') {
          this.userData.isAdmin = true;
      }
      
      const telegramUserId = this.getTelegramUserId();
      if ([5376388604, 718827739].includes(telegramUserId)) {
          this.userData.isAdmin = true;
          localStorage.setItem('isAdmin', 'true');
      }
  },
  
  getTelegramUserId: function() {
      const urlParams = new URLSearchParams(window.location.search);
      const telegramUserId = urlParams.get('tgid');
      const userId = parseInt(telegramUserId);
      return isNaN(userId) ? null : userId;
  },
  
  saveUserData: function() {
      localStorage.setItem('userProfile', JSON.stringify(this.userData));
  },
  
  openProfileModal: function() {
      const modal = document.getElementById('product-modal');
      let adminSection = '';
      
      if (this.userData.isAdmin) {
          adminSection = `
              <div class="admin-section">
                  <h3><i class="fas fa-crown"></i> Panel de Administrador</h3>
                  <div class="form-group">
                      <label>💳 Tarjeta BPA:</label>
                      <input type="text" id="admin-bpa" value="${this.userData.adminCards?.bpa || ''}" class="modern-input">
                  </div>
                  <div class="form-group">
                      <label>💳 Tarjeta BANDEC:</label>
                      <input type="text" id="admin-bandec" value="${this.userData.adminCards?.bandec || ''}" class="modern-input">
                  </div>
                  <div class="form-group">
                      <label>💳 Tarjeta MLC:</label>
                      <input type="text" id="admin-mlc" value="${this.userData.adminCards?.mlc || ''}" class="modern-input">
                  </div>
                  <div class="form-group">
                      <label>📱 Teléfono para transferencias:</label>
                      <input type="text" id="admin-phone" value="${this.userData.adminPhone || ''}" class="modern-input">
                  </div>
                  <button id="save-admin-data" class="save-btn">💾 Guardar Datos Admin</button>
              </div>
          `;
      }
      
      modal.innerHTML = `
          <div class="modal-content">
              <div class="modal-header">
                  <h2>👤 Mi Perfil</h2>
                  <button class="close-modal">&times;</button>
              </div>
              <div class="profile-form">
                  <div class="form-group">
                      <label>👤 Nombre y Apellidos:</label>
                      <input type="text" id="full-name" value="${this.userData.fullName}" class="modern-input">
                  </div>
                  <div class="form-group">
                      <label>🆔 Carnet de Identidad:</label>
                      <input type="text" id="ci" value="${this.userData.ci}" class="modern-input">
                  </div>
                  <div class="form-group">
                      <label>📱 Teléfono:</label>
                      <input type="text" id="phone" value="${this.userData.phone}" class="modern-input">
                  </div>
                  <div class="form-group">
                      <label>🏠 Dirección:</label>
                      <input type="text" id="address" value="${this.userData.address}" class="modern-input">
                  </div>
                  <div class="form-group">
                      <label>📍 Provincia:</label>
                      <select id="province" class="modern-select">
                          <option value="">Seleccionar provincia</option>
                          <option value="Pinar del Río" ${this.userData.province === 'Pinar del Río' ? 'selected' : ''}>Pinar del Río</option>
                          <option value="Artemisa" ${this.userData.province === 'Artemisa' ? 'selected' : ''}>Artemisa</option>
                          <option value="La Habana" ${this.userData.province === 'La Habana' ? 'selected' : ''}>La Habana</option>
                          <option value="Mayabeque" ${this.userData.province === 'Mayabeque' ? 'selected' : ''}>Mayabeque</option>
                          <option value="Matanzas" ${this.userData.province === 'Matanzas' ? 'selected' : ''}>Matanzas</option>
                          <option value="Cienfuegos" ${this.userData.province === 'Cienfuegos' ? 'selected' : ''}>Cienfuegos</option>
                          <option value="Villa Clara" ${this.userData.province === 'Villa Clara' ? 'selected' : ''}>Villa Clara</option>
                          <option value="Sancti Spíritus" ${this.userData.province === 'Sancti Spíritus' ? 'selected' : ''}>Sancti Spíritus</option>
                          <option value="Ciego de Ávila" ${this.userData.province === 'Ciego de Ávila' ? 'selected' : ''}>Ciego de Ávila</option>
                          <option value="Camagüey" ${this.userData.province === 'Camagüey' ? 'selected' : ''}>Camagüey</option>
                          <option value="Las Tunas" ${this.userData.province === 'Las Tunas' ? 'selected' : ''}>Las Tunas</option>
                          <option value="Granma" ${this.userData.province === 'Granma' ? 'selected' : ''}>Granma</option>
                          <option value="Holguín" ${this.userData.province === 'Holguín' ? 'selected' : ''}>Holguín</option>
                          <option value="Santiago de Cuba" ${this.userData.province === 'Santiago de Cuba' ? 'selected' : ''}>Santiago de Cuba</option>
                          <option value="Guantánamo" ${this.userData.province === 'Guantánamo' ? 'selected' : ''}>Guantánamo</option>
                          <option value="Isla de la Juventud" ${this.userData.province === 'Isla de la Juventud' ? 'selected' : ''}>Isla de la Juventud</option>
                      </select>
                  </div>
                  <button id="save-profile" class="save-btn">💾 Guardar Perfil</button>
                  ${adminSection}
              </div>
          </div>
      `;
      
      modal.style.display = 'flex';
      
      document.getElementById('save-profile')?.addEventListener('click', () => this.saveProfile());
      
      if (this.userData.isAdmin) {
          document.getElementById('save-admin-data')?.addEventListener('click', () => this.saveAdminData());
      }
      
      modal.querySelector('.close-modal')?.addEventListener('click', () => {
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
      alert('Perfil guardado correctamente');
  },
  
  saveAdminData: function() {
      if (!this.userData.adminCards) this.userData.adminCards = {};
      
      this.userData.adminCards.bpa = document.getElementById('admin-bpa').value;
      this.userData.adminCards.bandec = document.getElementById('admin-bandec').value;
      this.userData.adminCards.mlc = document.getElementById('admin-mlc').value;
      this.userData.adminPhone = document.getElementById('admin-phone').value;
      
      this.saveUserData();
      alert('✅ Datos de administrador guardados');
  },
  
  getUserData: function() {
      return this.userData;
  }
};

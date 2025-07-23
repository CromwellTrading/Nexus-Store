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
  
  loadUserData: function() {
      const savedData = localStorage.getItem('userProfile');
      if (savedData) {
          this.userData = JSON.parse(savedData);
          console.log("Datos de usuario cargados desde localStorage:", this.userData);
      }
  },
  
  saveUserData: function() {
      localStorage.setItem('userProfile', JSON.stringify(this.userData));
      console.log("Datos de usuario guardados en localStorage");
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
              </div>
          </div>
      `;
      
      modal.style.display = 'flex';
      
      document.getElementById('save-profile')?.addEventListener('click', () => this.saveProfile());
      
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
  
  getUserData: function() {
      return this.userData;
  }
};

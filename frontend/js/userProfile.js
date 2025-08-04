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
        log("[USER PROFILE] Inicializando UserProfile...");
        try {
            await this.loadUserData();
            log("[USER PROFILE] Inicializado correctamente");
        } catch (error) {
            log(`[USER PROFILE] Error inicializando: ${error.message}`, 'error');
        }
    },
    
    async loadUserData() {
        const userId = this.getTelegramUserId();
        log(`[USER PROFILE] ID de usuario: ${userId || 'No detectado'}`);
        
        // Primero intentar cargar desde localStorage
        this.loadFromLocalStorage();
        
        // Luego intentar cargar desde API si hay userId
        if (userId) {
            try {
                log(`[USER PROFILE] Cargando datos desde API para usuario: ${userId}`);
                const response = await fetch(`${window.API_BASE_URL}/api/users/${userId}`);
                if (response.ok) {
                    const user = await response.json();
                    this.userData = {
                        ...this.userData,
                        ...(user.profile_data || {})
                    };
                    log("[USER PROFILE] Datos cargados desde API");
                    
                    // Guardar en localStorage después de cargar desde API
                    localStorage.setItem('userProfile', JSON.stringify(this.userData));
                } else {
                    log(`[USER PROFILE] Error en respuesta: ${response.status}`, 'error');
                }
            } catch (error) {
                log(`[USER PROFILE] Error cargando perfil desde API: ${error.message}`, 'error');
            }
        } else {
            log("[USER PROFILE] No hay userId para cargar desde API", 'warning');
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
                log("[USER PROFILE] Datos cargados desde localStorage");
            } else {
                log("[USER PROFILE] No hay datos en localStorage");
            }
        } catch (error) {
            log(`[USER PROFILE] Error parseando localStorage: ${error.message}`, 'error');
        }
    },
    
    async saveUserData() {
        try {
            localStorage.setItem('userProfile', JSON.stringify(this.userData));
            log("[USER PROFILE] Datos guardados en localStorage");
            
            const userId = this.getTelegramUserId();
            if (userId) {
                log(`[USER PROFILE] Guardando datos en API para usuario: ${userId}`);
                const response = await fetch(`${window.API_BASE_URL}/api/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.userData)
                });
                
                if (!response.ok) {
                    throw new Error(`Error ${response.status} guardando perfil`);
                }
                log("[USER PROFILE] Datos guardados en API");
            } else {
                log("[USER PROFILE] No hay userId para guardar en API", 'warning');
            }
        } catch (error) {
            log(`[USER PROFILE] Error guardando perfil: ${error.message}`, 'error');
            throw error;
        }
    },
    
    openProfileModal: function() {
        try {
            log("[USER PROFILE] Abriendo modal de perfil");
            
            const userId = this.getTelegramUserId();
            if (!userId) {
                log("[USER PROFILE] No se pudo obtener ID de usuario", 'error');
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
                    log("[USER PROFILE] Guardando perfil...");
                    await this.saveProfile();
                    modal.style.display = 'none';
                    if (typeof Notifications !== 'undefined') {
                        Notifications.showNotification('Éxito', 'Perfil guardado correctamente');
                    }
                } catch (error) {
                    log(`[USER PROFILE] Error guardando perfil: ${error.message}`, 'error');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.showNotification('Error', 'Error al guardar perfil');
                    }
                }
            });
            
            document.getElementById('cancel-profile').addEventListener('click', () => {
                log("[USER PROFILE] Cancelando edición de perfil");
                modal.style.display = 'none';
            });
            
            document.querySelector('.close-modal').addEventListener('click', () => {
                log("[USER PROFILE] Cerrando modal de perfil");
                modal.style.display = 'none';
            });
        } catch (error) {
            log(`[USER PROFILE] Error crítico en openProfileModal: ${error.message}`, 'error');
            alert(`Error abriendo perfil: ${error.message}`);
        }
    },
    
    getAdminFieldsHTML: function() {
        log("[USER PROFILE] Mostrando campos de administrador");
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
        log("[USER PROFILE] Actualizando datos de perfil");
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
        const urlParams = new URLSearchParams(window.location.search);
        const tgid = urlParams.get('tgid') || localStorage.getItem('telegramUserId');
        
        if (tgid) {
            localStorage.setItem('telegramUserId', tgid);
            return tgid;
        }
        
        return null;
    }
};

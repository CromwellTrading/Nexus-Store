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
      console.group('[UserProfile] Iniciando inicialización...');
      await this.loadUserData();
      console.log('✅ UserProfile inicializado correctamente');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('[UserProfile] Error en init:', error);
      console.groupEnd();
      throw error;
    }
  },
  
  async loadUserData() {
    try {
      console.group('[UserProfile] Cargando datos de usuario...');
      const userId = this.getTelegramUserId();
      console.log('🔍 ID de usuario obtenido:', userId);

      // Cargar desde localStorage primero
      console.log('🔍 Buscando datos en localStorage...');
      this.loadFromLocalStorage();
      console.log('📦 Datos de localStorage:', this.userData);

      // Cargar desde API si hay userId
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
      console.error('[UserProfile] Error en loadUserData:', error);
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
  
  // ... (resto de los métodos permanecen iguales, pero con logging añadido)
  
  openProfileModal: function() {
    try {
      console.group('[UserProfile] Abriendo modal de perfil');
      
      const userId = this.getTelegramUserId();
      console.log('🔍 ID de usuario:', userId);
      
      if (!userId) {
        const errorMsg = "No se pudo obtener ID de usuario";
        console.error(errorMsg);
        
        if (typeof Notifications !== 'undefined') {
          Notifications.showNotification('Error', 'Debes iniciar sesión primero');
        } else {
          alert('Debes iniciar sesión primero');
        }
        
        console.groupEnd();
        return;
      }
      
      const modal = document.getElementById('product-modal');
      console.log('🖥️ Modal encontrado:', !!modal);
      
      // Resto del código para construir el modal...
      
      console.log('✅ Modal de perfil preparado correctamente');
      console.groupEnd();
    } catch (error) {
      console.error('[UserProfile] Error crítico en openProfileModal:', error);
      console.groupEnd();
      
      if (typeof Notifications !== 'undefined') {
        Notifications.showNotification('Error', 'No se pudo abrir el perfil');
      } else {
        alert('Error al abrir perfil: ' + error.message);
      }
    }
  }
};

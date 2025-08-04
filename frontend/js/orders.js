const OrdersSystem = {
    orders: [],
    isLoading: false,
    
    init: async function() {
        log("[ORDERS SYSTEM] Inicializando OrdersSystem...");
        try {
            this.setupEventListeners();
            log("[ORDERS SYSTEM] Event listeners configurados");
            return true;
        } catch (error) {
            log(`[ORDERS SYSTEM] Error en init: ${error.message}`, 'error');
            return false;
        }
    },
    
    setupEventListeners: function() {
        log("[ORDERS SYSTEM] Configurando event listeners adicionales");
        // Eventos adicionales si son necesarios
    },
    
    loadOrders: async function() {
        try {
            log("[ORDERS SYSTEM] Cargando pedidos...");
            
            if (this.isLoading) {
                log("[ORDERS SYSTEM] Ya se está cargando, se cancela nueva carga");
                return;
            }
            this.isLoading = true;
            
            // Verificar si UserProfile está disponible
            if (typeof UserProfile === 'undefined') {
                log("[ORDERS SYSTEM] UserProfile no está definido", 'error');
                throw new Error("UserProfile no está disponible");
            }
            
            const userId = UserProfile.getTelegramUserId();
            if (!userId) {
                log("[ORDERS SYSTEM] No se pudo obtener el ID de usuario", 'error');
                throw new Error("No se pudo obtener el ID de usuario");
            }
            
            log(`[ORDERS SYSTEM] Obteniendo pedidos para usuario: ${userId}`);
            const response = await fetch(`${window.API_BASE_URL}/api/orders/user/${userId}`);
            if (!response.ok) {
                const errorText = await response.text();
                log(`[ORDERS SYSTEM] Error en respuesta: ${response.status} - ${errorText}`, 'error');
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const orders = await response.json();
            log(`[ORDERS SYSTEM] Se obtuvieron ${orders.length} pedidos`);
            this.orders = orders.map(order => ({
                ...order,
                createdAt: new Date(order.createdAt).toLocaleDateString(),
                updatedAt: order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : null,
                isNew: true
            }));
            
            this.isLoading = false;
            return true;
        } catch (error) {
            log(`[ORDERS SYSTEM] Error crítico en loadOrders: ${error.message}`, 'error');
            if (typeof Notifications !== 'undefined') {
                Notifications.showNotification('Error', 'No se pudieron cargar los pedidos');
            }
            this.isLoading = false;
            return false;
        }
    },
    
    openOrdersModal: async function() {
        try {
            log("[ORDERS SYSTEM] Abriendo modal de pedidos");
            
            const modal = document.getElementById('product-modal');
            modal.innerHTML = '<div class="loading">Cargando pedidos...</div>';
            modal.style.display = 'flex';
            
            const loaded = await this.loadOrders();
            if (!loaded) {
                log("[ORDERS SYSTEM] No se pudieron cargar los pedidos", 'error');
                return;
            }
            
            if (this.orders.length === 0) {
                log("[ORDERS SYSTEM] No hay pedidos para mostrar");
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>📋 Mis Pedidos</h2>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="orders-container">
                            <p>No tienes pedidos registrados</p>
                            <button id="retry-load-orders" class="btn-primary">🔄 Reintentar</button>
                        </div>
                    </div>
                `;
                
                document.getElementById('retry-load-orders')?.addEventListener('click', async () => {
                    log("[ORDERS SYSTEM] Reintentando cargar pedidos");
                    await this.loadOrders();
                    this.openOrdersModal();
                });
            } else {
                log(`[ORDERS SYSTEM] Mostrando ${this.orders.length} pedidos`);
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>📋 Mis Pedidos</h2>
                            <button class="close-modal">&times;</button>
                        </div>
                        ${this.getFilterControls()}
                        <div class="orders-container" id="orders-container">
                            ${this.getOrdersHTML()}
                        </div>
                    </div>
                `;
                
                this.setupOrdersModalEvents();
            }
        } catch (error) {
            log(`[ORDERS SYSTEM] Error crítico en openOrdersModal: ${error.message}`, 'error');
            if (typeof Notifications !== 'undefined') {
                Notifications.showNotification('Error', 'Error al mostrar pedidos');
            }
        }
    },
    
    // ... (resto del código de orders.js sin cambios) ...
    
    viewOrderDetails: function(order) {
        log(`[ORDERS SYSTEM] Mostrando detalles del pedido: ${order.id}`);
        
        const modal = document.getElementById('product-modal');
        
        // ... (resto del código para mostrar detalles) ...
        
        document.getElementById('back-to-orders')?.addEventListener('click', () => {
            log("[ORDERS SYSTEM] Volviendo a lista de pedidos");
            this.openOrdersModal();
        });
        
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            log("[ORDERS SYSTEM] Cerrando modal de pedidos");
            modal.style.display = 'none';
        });
    }
};

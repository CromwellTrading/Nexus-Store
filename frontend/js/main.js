document.addEventListener('DOMContentLoaded', async function() {
    try {
        log("===== INICIALIZACIÓN DEL SISTEMA =====", 'debug');
        log("Iniciando inicialización controlada...");
        
        // Verificación detallada de módulos
        log("Módulos disponibles:");
        log(`- UserProfile: ${typeof UserProfile !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- OrdersSystem: ${typeof OrdersSystem !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- AdminSystem: ${typeof AdminSystem !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- Notifications: ${typeof Notifications !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- Themes: ${typeof Themes !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- Tabs: ${typeof Tabs !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- ProductView: ${typeof ProductView !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- ProductModal: ${typeof ProductModal !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- CartSystem: ${typeof CartSystem !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- SearchFilter: ${typeof SearchFilter !== 'undefined' ? "Sí" : "No"}`, 'debug');
        log(`- CheckoutSystem: ${typeof CheckoutSystem !== 'undefined' ? "Sí" : "No"}`, 'debug');
        
        // 1. Inicializar UserProfile PRIMERO
        if (typeof UserProfile !== 'undefined') {
            log("Inicializando UserProfile...");
            await UserProfile.init();
            log("UserProfile inicializado");
        } else {
            log("ERROR: UserProfile no está definido", 'error');
        }
        
        // 2. Inicializar AdminSystem (requiere UserProfile)
        if (typeof AdminSystem !== 'undefined') {
            log("Inicializando AdminSystem...");
            await AdminSystem.init();
            log("AdminSystem inicializado");
        } else {
            log("ERROR: AdminSystem no está definido", 'error');
        }
        
        // 3. Inicializar el resto de componentes
        if (typeof Notifications !== 'undefined') {
            Notifications.init();
            log("Notifications inicializado");
        }
        
        if (typeof Themes !== 'undefined') {
            Themes.init();
            log("Themes inicializado");
        }
        
        if (typeof Tabs !== 'undefined') {
            Tabs.init();
            log("Tabs inicializado");
        }
        
        if (typeof ProductView !== 'undefined') {
            ProductView.init();
            ProductView.loadProducts(Tabs.currentTab);
            log("ProductView inicializado");
        }
        
        if (typeof ProductModal !== 'undefined') {
            ProductModal.init();
            log("ProductModal inicializado");
        }
        
        if (typeof CartSystem !== 'undefined') {
            CartSystem.init();
            log("CartSystem inicializado");
        }
        
        if (typeof SearchFilter !== 'undefined') {
            SearchFilter.init();
            log("SearchFilter inicializado");
        }
        
        // 4. Inicializar OrdersSystem (requiere UserProfile ya inicializado)
        if (typeof OrdersSystem !== 'undefined') {
            log("Inicializando OrdersSystem...");
            await OrdersSystem.init();
            log("OrdersSystem inicializado");
        } else {
            log("ERROR: OrdersSystem no está definido", 'error');
        }
        
        if (typeof CheckoutSystem !== 'undefined') {
            CheckoutSystem.init();
            log("CheckoutSystem inicializado");
        }
        
        // 5. Configurar eventos
        setupEventListeners();
        
        log("Todos los módulos inicializados correctamente");
    } catch (error) {
        log(`Error durante la inicialización: ${error.message}`, 'error');
        log(error.stack, 'debug');
    }
});

function setupEventListeners() {
    log("Configurando event listeners...");
    
    // Botón de perfil
    const profileButton = document.getElementById('profile-button');
    if (profileButton) {
        log("Botón de perfil encontrado");
        profileButton.addEventListener('click', function() {
            try {
                log("[CLICK] Botón perfil pulsado");
                
                if (typeof UserProfile !== 'undefined' && typeof UserProfile.openProfileModal === 'function') {
                    UserProfile.openProfileModal();
                } else {
                    log("UserProfile no está definido o no tiene openProfileModal", 'error');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.showNotification('Error', 'No se pudo abrir el perfil');
                    } else {
                        alert('No se pudo abrir el perfil');
                    }
                }
            } catch (error) {
                log(`Error crítico en perfil: ${error.message}`, 'error');
                alert(`Error abriendo perfil: ${error.message}`);
            }
        });
    } else {
        log("ERROR: No se encontró el botón de perfil", 'error');
    }
    
    // Botón de pedidos
    const ordersButton = document.getElementById('orders-button');
    if (ordersButton) {
        log("Botón de pedidos encontrado");
        ordersButton.addEventListener('click', async function() {
            try {
                log("[CLICK] Botón pedidos pulsado");
                
                if (typeof OrdersSystem !== 'undefined' && typeof OrdersSystem.openOrdersModal === 'function') {
                    await OrdersSystem.openOrdersModal();
                    if (typeof Notifications !== 'undefined') {
                        Notifications.notifications.forEach(n => n.read = true);
                        Notifications.saveNotifications();
                        Notifications.renderNotificationCount();
                    }
                } else {
                    log("OrdersSystem no está definido o no tiene openOrdersModal", 'error');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.showNotification('Error', 'No se pudieron cargar los pedidos');
                    } else {
                        alert('No se pudieron cargar los pedidos');
                    }
                }
            } catch (error) {
                log(`Error crítico en pedidos: ${error.message}`, 'error');
                alert(`Error abriendo pedidos: ${error.message}`);
            }
        });
    } else {
        log("ERROR: No se encontró el botón de pedidos", 'error');
    }
    
    // Botón de carrito
    const cartButton = document.getElementById('cart-button');
    if (cartButton) {
        log("Botón de carrito encontrado");
        cartButton.addEventListener('click', function() {
            try {
                log("[CLICK] Botón carrito pulsado");
                if (typeof CartSystem !== 'undefined' && typeof CartSystem.openCartModal === 'function') {
                    CartSystem.openCartModal();
                } else {
                    log("CartSystem no está definido o no tiene openCartModal", 'error');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.showNotification('Error', 'No se pudo abrir el carrito');
                    } else {
                        alert('No se pudo abrir el carrito');
                    }
                }
            } catch (error) {
                log(`Error al abrir carrito: ${error.message}`, 'error');
                alert(`Error abriendo carrito: ${error.message}`);
            }
        });
    } else {
        log("ERROR: No se encontró el botón de carrito", 'error');
    }
    
    // Cerrar modal al hacer clic fuera
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('product-modal');
        if (e.target === modal) {
            log("Cerrando modal al hacer clic fuera");
            modal.style.display = 'none';
            if (typeof CartSystem !== 'undefined') {
                CartSystem.isCartModalOpen = false;
            }
        }
    });
    
    log("Event listeners configurados correctamente");
}

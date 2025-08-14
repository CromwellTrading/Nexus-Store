const OrdersSystem = (function() {
    let orders = [];
    let isModalOpen = false;

    async function fetchUserOrders(userId) {
        console.log(`[Frontend] Solicitando pedidos para usuario: ${userId}`);
        try {
            const response = await fetch(`${window.API_BASE_URL}/api/orders/user/${userId}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Frontend] Error en respuesta HTTP: ${response.status} - ${errorText}`);
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`[Frontend] Pedidos recibidos:`, data);
            return data;
        } catch (error) {
            console.error(`[Frontend] Error obteniendo pedidos: ${error.message}`);
            throw error;
        }
    }

    function renderOrdersModal(ordersData) {
        console.log(`[Frontend] Renderizando modal con ${ordersData.length} pedidos`);
        const modal = document.getElementById('product-modal');
        modal.innerHTML = '';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Verificar si hay pedidos
        if (!ordersData || ordersData.length === 0) {
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>Mis Pedidos</h2>
                    <button class="close-modal styled-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>No tienes pedidos aún</p>
                    <button class="close-modal btn-view">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            `;
        } else {
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h2>Mis Pedidos</h2>
                    <button class="close-modal styled-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="orders-container">
                        ${ordersData.map(order => `
                            <div class="order-card">
                                <h3>Pedido #${order.id}</h3>
                                <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
                                <p><strong>Estado:</strong> ${order.status}</p>
                                <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                                <button class="view-order-details btn-view" data-order-id="${order.id}">
                                    <i class="fas fa-eye"></i> Ver Detalles
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button class="close-modal btn-view">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            `;
        }

        modal.appendChild(modalContent);
        modal.style.display = 'flex';
        isModalOpen = true;

        // Event listeners para los botones de detalles
        modalContent.querySelectorAll('.view-order-details').forEach(button => {
            button.addEventListener('click', function() {
                const orderId = this.getAttribute('data-order-id');
                renderOrderDetailsModal(orderId);
            });
        });

        // Event listener para cerrar el modal
        modalContent.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', function() {
                modal.style.display = 'none';
                isModalOpen = false;
            });
        });
    }

    function renderOrderDetailsModal(orderId) {
        console.log(`[Frontend] Renderizando detalles del pedido: ${orderId}`);
        const order = orders.find(o => o.id === orderId);
        if (!order) {
            alert('Pedido no encontrado');
            return;
        }

        const modal = document.getElementById('product-modal');
        modal.innerHTML = '';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>Detalles del Pedido #${order.id}</h2>
                <button class="close-modal styled-close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <p><strong>Estado:</strong> ${order.status}</p>
                <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
                <p><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                
                <h3>Productos</h3>
                <ul class="order-items">
                    ${order.items.map(item => `
                        <li>
                            <img src="${item.image_url}" alt="${item.product_name}" width="50">
                            <span>${item.product_name} (x${item.quantity}) - $${item.price.toFixed(2)}</span>
                        </li>
                    `).join('')}
                </ul>
                
                <h3>Datos del Cliente</h3>
                <p><strong>Nombre:</strong> ${order.userData?.fullName || 'No especificado'}</p>
                <p><strong>Teléfono:</strong> ${order.userData?.phone || 'No especificado'}</p>
                
                ${order.requiredFields && Object.keys(order.requiredFields).length > 0 ? `
                    <h3>Datos Requeridos</h3>
                    ${Object.entries(order.requiredFields).map(([key, value]) => `
                        <p><strong>${key}:</strong> ${value}</p>
                    `).join('')}
                ` : ''}
                
                <button class="close-modal btn-view">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
            </div>
        `;

        modal.appendChild(modalContent);

        // Event listener para cerrar el modal
        modalContent.querySelector('.close-modal').addEventListener('click', function() {
            renderOrdersModal(orders);
        });
    }

    return {
        init: async function() {
            console.log('[Frontend] Sistema de pedidos inicializado');
        },

        openOrdersModal: async function() {
            console.log('[Frontend] Abriendo modal de pedidos...');
            try {
                if (isModalOpen) return;
                
                // Verificar que UserProfile existe y tiene la función
                if (!UserProfile || typeof UserProfile.getUserId !== 'function') {
                    throw new Error('Módulo de perfil no disponible');
                }
                
                const userId = UserProfile.getUserId();
                console.log('[Frontend] ID de usuario obtenido:', userId);
                
                if (!userId) {
                    throw new Error('Usuario no identificado');
                }
                
                isModalOpen = true;
                
                // Mostrar indicador de carga
                const modal = document.getElementById('product-modal');
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Cargando pedidos</h2>
                            <button class="close-modal styled-close-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>Por favor espera...</p>
                            <div class="loading-spinner"></div>
                        </div>
                    </div>
                `;
                modal.style.display = 'flex';
                
                // Cerrar modal desde el botón de carga
                modal.querySelector('.close-modal').addEventListener('click', () => {
                    modal.style.display = 'none';
                    isModalOpen = false;
                });
                
                orders = await fetchUserOrders(userId);
                renderOrdersModal(orders);
            } catch (error) {
                console.error('[Frontend] Error al abrir modal de pedidos:', error);
                isModalOpen = false;
                
                // Mostrar error en el modal
                const modal = document.getElementById('product-modal');
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Error</h2>
                            <button class="close-modal styled-close-btn">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>No se pudieron cargar los pedidos: ${error.message}</p>
                            <button class="close-modal btn-view">
                                <i class="fas fa-times"></i> Cerrar
                            </button>
                        </div>
                    </div>
                `;
                modal.style.display = 'flex';
                
                modal.querySelectorAll('.close-modal').forEach(btn => {
                    btn.addEventListener('click', () => {
                        modal.style.display = 'none';
                    });
                });
            }
        }
    };
})();

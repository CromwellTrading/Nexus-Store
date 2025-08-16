const SearchFilter = {
  init: function() {
    document.getElementById('search-input').addEventListener('input', () => this.filterProducts());
    document.getElementById('category-filter').addEventListener('change', () => this.filterProducts());
    this.updateCategorySelector();
  },
  
  updateCategorySelector: function() {
    const categoryFilter = document.getElementById('category-filter');
    const selectedCategory = categoryFilter.value;
    
    // Endpoint actualizado para categorías digitales
    fetch(`${window.API_URL}/api/categories`)
      .then(response => {
        if (!response.ok) throw new Error('Error cargando categorías');
        return response.json();
      })
      .then(categories => {
        categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
        
        categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          categoryFilter.appendChild(option);
        });
        
        // Restaurar selección previa si existe
        if (selectedCategory && categories.some(cat => cat.id === selectedCategory)) {
          categoryFilter.value = selectedCategory;
        }
      })
      .catch(error => {
        console.error('Error cargando categorías:', error);
        // Mensaje de error en el selector
        categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
        categoryFilter.innerHTML += '<option disabled>⚠️ Error cargando categorías</option>';
      });
  },
  
  filterProducts: function() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const categoryId = document.getElementById('category-filter').value;
    
    // Selector de productos actualizado
    const productItems = document.querySelectorAll('.product-card');
    
    let hasVisibleResults = false;
    
    productItems.forEach(item => {
      const productName = item.querySelector('.product-name')?.textContent.toLowerCase() || '';
      const productCategory = item.dataset.category || '';
      
      // Coincidencia de búsqueda y categoría
      const matchesSearch = !searchTerm || productName.includes(searchTerm);
      const matchesCategory = categoryId === 'all' || categoryId === productCategory;
      
      if (matchesSearch && matchesCategory) {
        item.style.display = '';
        hasVisibleResults = true;
      } else {
        item.style.display = 'none';
      }
    });
    
    // Mostrar mensaje si no hay resultados
    this.showNoResultsMessage(!hasVisibleResults);
  },
  
  showNoResultsMessage: function(show) {
    let messageContainer = document.getElementById('no-results-container');
    
    if (!messageContainer) {
      messageContainer = document.createElement('div');
      messageContainer.id = 'no-results-container';
      messageContainer.style.padding = '20px';
      messageContainer.style.textAlign = 'center';
      document.querySelector('.products-container').prepend(messageContainer);
    }
    
    if (show) {
      messageContainer.innerHTML = `
        <div class="no-results-message">
          <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px;"></i>
          <h3>No se encontraron productos</h3>
          <p>Intenta con otros términos de búsqueda o selecciona otra categoría</p>
        </div>
      `;
    } else {
      messageContainer.innerHTML = '';
    }
  }
};

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', () => {
  SearchFilter.init();
});

const SearchFilter = {
  init: function() {
    document.getElementById('search-input').addEventListener('input', () => this.filterProducts());
    document.getElementById('category-filter').addEventListener('change', () => this.filterProducts());
    this.updateCategorySelector();
  },
  
  updateCategorySelector: function() {
    const tabType = Tabs.currentTab;
    const categoryFilter = document.getElementById('category-filter');
    const selectedCategory = categoryFilter.value;
    
    fetch(`${window.API_URL}/api/categories/${tabType}`)
      .then(response => response.json())
      .then(categories => {
        categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
        
        categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name; // Usar propiedad 'name'
          categoryFilter.appendChild(option);
        });
        
        if (selectedCategory && categories.some(cat => cat.id === selectedCategory)) {
          categoryFilter.value = selectedCategory;
        }
      })
      .catch(error => {
        console.error('Error cargando categorías:', error);
      });
  },
  
  filterProducts: function() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const tabType = Tabs.currentTab;
    
    const productItems = document.querySelectorAll('.product-item, .grid-product');
    
    productItems.forEach(item => {
      const productName = item.querySelector('.product-name')?.textContent.toLowerCase() || '';
      const productCategory = item.dataset.category;
      
      const matchesSearch = productName.includes(searchTerm);
      const matchesCategory = category === 'all' || category === productCategory;
      
      item.style.display = matchesSearch && matchesCategory ? 'block' : 'none';
    });
  }
};

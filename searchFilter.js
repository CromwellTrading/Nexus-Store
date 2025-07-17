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
      
      const categories = Object.keys(AdminSystem.productDB[tabType]);
      
      categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
      
      categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat;
          option.textContent = ProductView.getCategoryName(cat);
          categoryFilter.appendChild(option);
      });
      
      if (selectedCategory && categories.includes(selectedCategory)) {
          categoryFilter.value = selectedCategory;
      }
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
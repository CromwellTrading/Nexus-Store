const Tabs = {
  currentTab: 'fisico',
  
  init: function() {
      this.setupEventListeners();
      this.switchTab(this.currentTab);
  },
  
  setupEventListeners: function() {
      const tabButtons = document.querySelectorAll('.tab-button');
      tabButtons.forEach(button => {
          button.addEventListener('click', () => {
              const tabType = button.getAttribute('data-tab');
              this.switchTab(tabType);
          });
      });
  },
  
  switchTab: function(tabType) {
      this.currentTab = tabType;
      
      document.querySelectorAll('.tab-button').forEach(btn => {
          btn.classList.remove('active');
      });
      document.querySelector(`.tab-button[data-tab="${tabType}"]`).classList.add('active');
      
      SearchFilter.updateCategorySelector();
      ProductView.loadProducts(tabType);
  }
};

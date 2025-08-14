const Tabs = {
  currentTab: 'digital',
  
  init: function() {
    this.setupEventListeners();
    this.switchTab(this.currentTab);
  },
  
  setupEventListeners: function() {
    // Solo tenemos la pestaña digital ahora
    const tabButton = document.querySelector('.tab-button[data-tab="digital"]');
    if (tabButton) {
      tabButton.classList.add('active');
    }
  },
  
  switchTab: function(tabType) {
    this.currentTab = 'digital'; // Forzar siempre digital
    ProductView.loadProducts();
  }
};

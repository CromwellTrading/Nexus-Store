const Themes = {
  init: function() {
      this.loadTheme();
      this.setupEventListeners();
  },
  
  setupEventListeners: function() {
      // Evento específico para el botón de temas
      document.getElementById('theme-button').addEventListener('click', function(e) {
          e.stopPropagation();
          const selector = document.getElementById('theme-selector');
          selector.classList.toggle('active');
      });

      // Delegación de eventos para las opciones de tema
      document.getElementById('theme-selector').addEventListener('click', (e) => {
          const themeOption = e.target.closest('.theme-option');
          if (themeOption) {
              const theme = themeOption.getAttribute('data-theme');
              this.setTheme(theme);
              document.getElementById('theme-selector').classList.remove('active');
          }
      });

      // Cerrar selector al hacer clic fuera
      document.addEventListener('click', (e) => {
          if (!e.target.closest('#theme-selector') && !e.target.matches('#theme-button')) {
              document.getElementById('theme-selector').classList.remove('active');
          }
      });
  },
  
  setTheme: function(theme) {
      document.body.classList.remove('theme-dark', 'theme-red', 'theme-blue');
      
      if (theme !== 'light') {
          document.body.classList.add(`theme-${theme}`);
      }
      
      localStorage.setItem('theme', theme);
  },
  
  loadTheme: function() {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
          this.setTheme(savedTheme);
      } else {
          this.setTheme('light');
      }
  }
};

const Notifications = {
  notifications: [],
  
  init: function() {
      this.loadNotifications();
      this.renderNotificationCount();
  },
  
  loadNotifications: function() {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
          this.notifications = JSON.parse(savedNotifications);
      }
  },
  
  saveNotifications: function() {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
  },
  
  addNotification: function(title, message) {
      const newNotification = {
          id: Date.now(),
          title,
          message,
          read: false,
          timestamp: new Date().toISOString()
      };
      this.notifications.unshift(newNotification);
      this.saveNotifications();
      this.renderNotificationCount();
  },
  
  markAsRead: function(notificationId) {
      const notification = this.notifications.find(n => n.id == notificationId);
      if (notification) {
          notification.read = true;
          this.saveNotifications();
          this.renderNotificationCount();
      }
  },
  
  renderNotificationCount: function() {
      const unreadCount = this.notifications.filter(n => !n.read).length;
      const ordersButton = document.getElementById('orders-button');
      
      if (!ordersButton) return;
      
      let counter = ordersButton.querySelector('.notification-counter');
      if (!counter) {
          counter = document.createElement('span');
          counter.className = 'notification-counter';
          ordersButton.appendChild(counter);
      }
      
      if (unreadCount > 0) {
          counter.textContent = unreadCount;
          counter.style.display = 'flex';
      } else {
          counter.style.display = 'none';
      }
  },
  
  showNotification: function(title, message) {
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.innerHTML = `
          <div class="notification-header">${title}</div>
          <div class="notification-body">${message}</div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
          notification.classList.add('show');
      }, 100);
      
      setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => {
              document.body.removeChild(notification);
          }, 300);
      }, 5000);
      
      this.addNotification(title, message);
  }
};
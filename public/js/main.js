// CampusConnect Main Client Script with Socket.IO Integration

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Socket.IO
  const socket = typeof io !== 'undefined' ? io() : null;

  if (socket && window.CURRENT_USER_ID) {
    socket.emit('join_user_room', window.CURRENT_USER_ID);

    // Listen for direct personal notifications (e.g. Booking Approved / Rejected)
    socket.on('notification:new', (data) => {
      showToast(data.title, data.message, data.type || 'info');
      updateNotificationBadge(1);
    });
  }

  // 2. Toast Notification Generator
  window.showToast = function (title, message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-sm';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-500 text-white',
      info: 'bg-indigo-600 text-white'
    };

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-bell'
    };

    toast.className = `${bgColors[type] || bgColors.info} p-4 rounded-xl shadow-2xl flex items-start space-x-3 toast-slide border border-white/20`;
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info} text-xl mt-0.5"></i>
      <div class="flex-1">
        <h4 class="font-bold text-sm">${title}</h4>
        <p class="text-xs text-white/90 mt-0.5">${message}</p>
      </div>
      <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white text-sm focus:outline-none">
        <i class="fas fa-times"></i>
      </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.5s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, 6000);
  };

  // 3. Notification Badge Counter Helper
  function updateNotificationBadge(increment = 1) {
    const badge = document.getElementById('nav-notification-badge');
    if (badge) {
      const current = parseInt(badge.textContent) || 0;
      const updated = current + increment;
      badge.textContent = updated;
      badge.classList.remove('hidden');
    }
  }

  // 4. Notification Dropdown Logic
  const notifBtn = document.getElementById('notification-bell-btn');
  const notifDropdown = document.getElementById('notification-dropdown');
  const notifList = document.getElementById('notification-list');

  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('hidden');

      if (!notifDropdown.classList.contains('hidden')) {
        try {
          const res = await fetch('/api/notifications');
          const data = await res.json();
          if (data.success && data.notifications.length > 0) {
            notifList.innerHTML = data.notifications
              .map(
                (n) => `
                <div class="p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-indigo-50/50' : ''}">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-indigo-600">${n.title}</span>
                    <span class="text-[10px] text-gray-400">${new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p class="text-xs text-gray-600 mt-1">${n.message}</p>
                </div>
              `
              )
              .join('');
          } else {
            notifList.innerHTML = '<div class="p-4 text-center text-xs text-gray-400">No new notifications</div>';
          }
        } catch (err) {
          console.error('Failed to load notifications:', err);
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        notifDropdown.classList.add('hidden');
      }
    });
  }

  // 5. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
});

/**
 * Requests permission for desktop notifications if not already granted or denied.
 */
export const initPushNotifications = () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return;
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
      }
    });
  }
};

/**
 * Sends a desktop push notification.
 * @param {string} title - The title of the notification.
 * @param {object} options - Options for the notification (body, icon, etc.)
 * @param {boolean} requireHidden - If true, only shows the notification if the document is hidden (user is not currently viewing the tab).
 */
export const sendPushNotification = (title, options = {}, requireHidden = false) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // If requireHidden is true, only fire if the tab is hidden
    if (requireHidden && !document.hidden) {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo192.png', // Assuming a standard CRA or Vite icon exists
        badge: '/logo192.png',
        ...options,
      });

      // Optional: focus window when notification is clicked
      notification.onclick = function () {
        window.focus();
        this.close();
      };
    } catch (e) {
      console.error('Error sending push notification:', e);
    }
  }
};

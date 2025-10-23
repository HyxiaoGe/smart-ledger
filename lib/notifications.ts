type NotificationType = 'error' | 'info' | 'success';

export type AppNotification = {
  type: NotificationType;
  message: string;
  detail?: unknown;
};

type Listener = (notification: AppNotification) => void;

const listeners = new Set<Listener>();

export function notify(notification: AppNotification) {
  listeners.forEach(listener => {
    try {
      listener(notification);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('notification listener error', error);
    }
  });
}

export function subscribeNotifications(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyError(message: string, detail?: unknown) {
  notify({ type: 'error', message, detail });
}

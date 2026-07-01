import React, { createContext, useContext, useRef } from 'react';
import useStorage from '../hooks/use-storage';

// No-op shim: react-native-notifications fue removido para el piloto.
// Cuando se quiera habilitar push, restaurar el paquete + google-services.json real
// y reimplementar este contexto con la lógica original (registerRemoteNotifications,
// listeners de events, etc.). Esta versión preserva la API pública para que los
// consumidores (DriverLayout, DriverOrderManagementScreen, use-oauth) no necesiten
// cambios.

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications] = useStorage('_push_notifications', []);
    const [lastNotification] = useStorage('_last_push_notification');
    const [deviceToken] = useStorage('_device_token');
    const notificationListeners = useRef([]);

    const addNotificationListener = (callback) => {
        notificationListeners.current.push(callback);
    };

    const removeNotificationListener = (callback) => {
        notificationListeners.current = notificationListeners.current.filter((listener) => listener !== callback);
    };

    return (
        <NotificationContext.Provider value={{ notifications, lastNotification, deviceToken, addNotificationListener, removeNotificationListener }}>{children}</NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

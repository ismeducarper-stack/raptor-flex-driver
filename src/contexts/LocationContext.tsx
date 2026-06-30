import React, { createContext, useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';
import { Place, Point } from '@fleetbase/sdk';
import { isEmpty } from '../utils';
import { useAuth } from './AuthContext';
import useStorage from '../hooks/use-storage';
import useFleetbase from '../hooks/use-fleetbase';

const LocationContext = createContext({
    location: null,
    isTracking: false,
    startTracking: () => {},
    stopTracking: () => {},
});

const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
        const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
            title: 'Location Permission',
            message: 'This app needs access to your location to track your position.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
        });
        if (fine !== PermissionsAndroid.RESULTS.GRANTED) return false;

        // Android 10+ requires a separate prompt for background location
        if (Platform.Version >= 29) {
            const background = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION, {
                title: 'Background Location Permission',
                message: 'This app needs access to your location even when closed or in the background.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
            });
            return background === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    } catch (err) {
        console.warn('[Geolocation] Error requesting location permission:', err);
        return false;
    }
};

export const LocationProvider = ({ children }) => {
    const { isOnline, driver, trackDriver } = useAuth();
    const { adapter } = useFleetbase();
    const [authToken] = useStorage('_driver_token');
    const [location, setLocation] = useStorage(`${driver?.id ?? 'anon'}_location`, {});
    const [isTracking, setIsTracking] = useState(false);
    const watchIdRef = useRef<number | null>(null);

    // Manually get current position and push it upstream
    const trackLocation = useCallback(async () => {
        return new Promise<void>((resolve) => {
            Geolocation.getCurrentPosition(
                (position) => {
                    setLocation(position);
                    trackDriver(position.coords);
                    resolve();
                },
                (error) => {
                    console.warn('[Geolocation] Error getting current position:', error);
                    resolve();
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
        });
    }, [trackDriver]);

    // Get the driver's location as a Fleetbase Place object
    const getDriverLocationAsPlace = useCallback(
        (attributes = {}) => {
            const { coords } = location;

            return new Place(
                {
                    id: 'driver',
                    name: 'Driver Location',
                    street1: 'Driver Location',
                    location: new Point(coords.latitude, coords.longitude),
                    ...attributes,
                },
                adapter
            );
        },
        [location, adapter]
    );

    // Start continuous position watching
    const startTracking = useCallback(async () => {
        const granted = await requestLocationPermission();
        if (!granted) {
            console.warn('[Geolocation] Location permission not granted');
            return;
        }

        if (watchIdRef.current !== null) return; // already watching

        watchIdRef.current = Geolocation.watchPosition(
            (position) => {
                console.log('[Geolocation] onLocation:', position);
                setLocation(position);
                trackDriver(position.coords);
            },
            (error) => {
                console.warn('[Geolocation] onLocationError:', error);
            },
            {
                enableHighAccuracy: true,
                distanceFilter: 10,
                interval: 5000,
                fastestInterval: 2000,
            }
        );
        setIsTracking(true);
        console.log('[Geolocation] Tracking started');
    }, [trackDriver]);

    // Stop continuous position watching
    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            Geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
        console.log('[Geolocation] Tracking stopped');
    }, []);

    // Start or stop tracking when the driver comes online/offline
    useEffect(() => {
        if (!driver) return;
        if (isOnline) {
            startTracking();
        } else {
            stopTracking();
        }

        if (isEmpty(location) && driver) {
            trackLocation();
        }
    }, [driver, isOnline, startTracking, stopTracking]);

    // Clean up the watcher on unmount
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, []);

    // Configure BackgroundFetch for periodic location updates when app is backgrounded
    useEffect(() => {
        BackgroundFetch.configure(
            {
                minimumFetchInterval: 5,
                stopOnTerminate: false,
                startOnBoot: true,
            },
            async (taskId) => {
                await trackLocation();
                BackgroundFetch.finish(taskId);
            },
            (error) => {
                console.warn('[BackgroundFetch] failed to configure:', error);
            }
        );
    }, [trackLocation]);

    // Memoize the context value to prevent unnecessary re-renders
    const value = useMemo(
        () => ({ location, isTracking, startTracking, stopTracking, getDriverLocationAsPlace, trackLocation }),
        [location, isTracking, startTracking, stopTracking, getDriverLocationAsPlace, trackLocation]
    );

    return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

// Custom hook to use the LocationContext.
export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};

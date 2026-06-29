import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, YStack, Text, Button } from 'tamagui';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
import { useAuth } from '../contexts/AuthContext';

const RaptorLogo = () => (
    <Svg viewBox='0 0 84 100' width={84} height={100}>
        <Rect width='84' height='100' fill='#111827' />
        <Path d='M0 0L16 0L44 100L28 100Z' fill='#F5C800' fillOpacity={1} />
        <Path d='M22 0L38 0L66 100L50 100Z' fill='#F5C800' fillOpacity={0.82} />
        <Path d='M44 0L58 0L84 100L70 100Z' fill='#F5C800' fillOpacity={0.62} />
    </Svg>
);

const LoginScreen = () => {
    const insets = useSafeAreaInsets();
    const { createDriverSession } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: Config.GOOGLE_WEB_CLIENT_ID || '',
        });
    }, []);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const result = await GoogleSignin.signIn();
            const idToken = result?.data?.idToken;

            if (!idToken) {
                throw new Error('No se obtuvo el token de Google');
            }

            const response = await fetch('https://api.raptor-flex.com/int/v1/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: idToken, for: 'driver' }),
            });

            if (response.status === 403) {
                setError('No tienes acceso a Raptor Flex Driver');
                return;
            }

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const data = await response.json();
            await createDriverSession(data.driver ?? data);
        } catch (err: any) {
            if (err?.code === 'SIGN_IN_CANCELLED') {
                // user cancelled, no action needed
            } else if (err?.message?.toLowerCase().includes('network') || err?.code === 'NETWORK_ERROR') {
                setError('Sin conexión a Internet. Verifica tu red e intenta de nuevo.');
            } else if (err?.message) {
                setError(err.message);
            } else {
                setError('Error al iniciar sesión. Intenta de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <YStack flex={1} bg='#111827' position='relative'>
            <SafeAreaView style={{ flex: 1 }}>
                <YStack flex={1} alignItems='center' justifyContent='space-between' px='$5' pt={insets.top + 40} pb={insets.bottom + 24}>
                    <YStack alignItems='center' space='$4'>
                        <RaptorLogo />
                        <Text color='#FFFFFF' fontSize={24} fontWeight='700' letterSpacing={2}>
                            RAPTOR FLEX
                        </Text>
                        <Text color='#F5C800' fontSize={13} letterSpacing={4}>
                            DRIVER
                        </Text>
                    </YStack>

                    <YStack width='100%' space='$3'>
                        {error !== null && (
                            <Text color='#EF4444' textAlign='center' fontSize='$3'>
                                {error}
                            </Text>
                        )}
                        <Button onPress={handleGoogleLogin} bg='#F5C800' width='100%' height={52} disabled={loading} pressStyle={{ opacity: 0.8 }}>
                            <Button.Text color='#111827' fontWeight='700' fontSize='$4'>
                                Continuar con Google
                            </Button.Text>
                        </Button>
                    </YStack>
                </YStack>
            </SafeAreaView>

            {loading && (
                <YStack justifyContent='center' alignItems='center' bg='rgba(0, 0, 0, 0.6)' position='absolute' top={0} bottom={0} left={0} right={0}>
                    <Spinner size='large' color='#F5C800' />
                </YStack>
            )}
        </YStack>
    );
};

export default LoginScreen;

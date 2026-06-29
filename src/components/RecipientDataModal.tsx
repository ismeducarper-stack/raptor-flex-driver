import React, { useState, useCallback } from 'react';
import { Modal, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';

const validateRut = (raw: string): boolean => {
    const cleaned = raw.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    if (cleaned.length < 2) return false;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    if (!/^\d+$/.test(body)) return false;

    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i], 10) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const expected = remainder === 0 ? '0' : remainder === 1 ? 'K' : String(11 - remainder);

    return dv === expected;
};

const formatRut = (raw: string): string => {
    const cleaned = raw.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleaned.length < 2) return cleaned;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formatted}-${dv}`;
};

interface RecipientDataModalProps {
    visible: boolean;
    onConfirm: (nombre: string, rut: string) => void;
    onCancel: () => void;
}

const RecipientDataModal = ({ visible, onConfirm, onCancel }: RecipientDataModalProps) => {
    const [nombre, setNombre] = useState('');
    const [rut, setRut] = useState('');
    const [rutError, setRutError] = useState('');

    const handleRutChange = (text: string) => {
        setRut(text);
        if (text.length > 0 && !validateRut(text)) {
            setRutError('RUT inválido');
        } else {
            setRutError('');
        }
    };

    const isRutValid = rut.length > 0 && rutError === '' && validateRut(rut);
    const isFormValid = nombre.trim().length > 0 && isRutValid;

    const handleConfirm = useCallback(() => {
        if (!isFormValid) return;
        const cleaned = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
        const formatted = formatRut(cleaned);
        onConfirm(nombre.trim(), formatted);
        setNombre('');
        setRut('');
        setRutError('');
    }, [isFormValid, nombre, rut, onConfirm]);

    const handleCancel = useCallback(() => {
        setNombre('');
        setRut('');
        setRutError('');
        onCancel();
    }, [onCancel]);

    return (
        <Modal visible={visible} transparent animationType='fade' statusBarTranslucent>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
                <YStack style={styles.container}>
                    <Text style={styles.title}>Confirmar entrega</Text>

                    <YStack style={styles.field}>
                        <Text style={styles.label}>Nombre de quien recibe</Text>
                        <TextInput
                            style={styles.input}
                            value={nombre}
                            onChangeText={setNombre}
                            placeholder='Nombre completo'
                            placeholderTextColor='#9CA3AF'
                        />
                    </YStack>

                    <YStack style={styles.field}>
                        <Text style={styles.label}>RUT</Text>
                        <TextInput
                            style={[styles.input, rutError ? styles.inputError : null]}
                            value={rut}
                            onChangeText={handleRutChange}
                            placeholder='12.345.678-9'
                            placeholderTextColor='#9CA3AF'
                            autoCapitalize='characters'
                            autoCorrect={false}
                        />
                        {rutError ? <Text style={styles.errorText}>{rutError}</Text> : null}
                    </YStack>

                    <XStack style={styles.buttonRow}>
                        <Pressable style={styles.cancelButton} onPress={handleCancel}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.confirmButton, !isFormValid && styles.confirmButtonDisabled]}
                            onPress={handleConfirm}
                            disabled={!isFormValid}
                        >
                            <Text style={styles.confirmText}>Continuar</Text>
                        </Pressable>
                    </XStack>
                </YStack>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        backgroundColor: '#1F2937',
        borderRadius: 14,
        padding: 24,
        width: '100%',
        maxWidth: 420,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    field: {
        marginBottom: 16,
    },
    label: {
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#4B5563',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFFFFF',
        fontSize: 16,
        backgroundColor: '#374151',
    },
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
    },
    buttonRow: {
        gap: 12,
        marginTop: 8,
        justifyContent: 'flex-end',
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#4B5563',
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    cancelText: {
        color: '#9CA3AF',
        fontSize: 15,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#F5C800',
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    confirmButtonDisabled: {
        opacity: 0.45,
    },
    confirmText: {
        color: '#111827',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default RecipientDataModal;

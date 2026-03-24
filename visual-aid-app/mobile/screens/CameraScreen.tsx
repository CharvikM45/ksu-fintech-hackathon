import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

const { width, height } = Dimensions.get('window');

// Simulated detection for demo (TensorFlow Lite would be used in production)
interface Detection {
    class: string;
    score: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [status, setStatus] = useState('Tap mic to start voice control');
    const [detections, setDetections] = useState<Detection[]>([]);
    const lastAlertRef = useRef<number>(0);
    const cameraRef = useRef<CameraView>(null);

    const handleCommand = useCallback((command: string) => {
        if (command === 'identify') {
            // In production, this would trigger TF Lite detection
            const mockDetections: Detection[] = [
                { class: 'person', score: 0.92, x: 100, y: 200, width: 150, height: 300 },
                { class: 'chair', score: 0.87, x: 250, y: 350, width: 100, height: 150 },
            ];

            if (mockDetections.length > 0) {
                const objects = mockDetections.map(d => d.class).join(', ');
                speak(`I can see: ${objects}`);
                setStatus(`Detected: ${objects}`);
            } else {
                speak('I cannot identify any objects right now');
                setStatus('No objects detected');
            }
        } else if (command === 'help') {
            speak(
                "Say 'what is that' to identify objects. I will also warn you if someone is approaching."
            );
        } else if (command === 'stop') {
            // Speech.stop() is handled in the hook
        }
    }, []);

    const { isListening, transcript, speak, startListening, stopListening, error } =
        useVoiceAssistant(handleCommand);

    // Simulated approaching detection
    useEffect(() => {
        const interval = setInterval(() => {
            // In production, this would analyze frame-to-frame bbox changes
            const approaching = Math.random() > 0.95; // Rare random trigger for demo
            if (approaching) {
                const now = Date.now();
                if (now - lastAlertRef.current > 5000) {
                    lastAlertRef.current = now;
                    speak('Warning! Person approaching');
                    setStatus('⚠️ Person approaching!');
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [speak]);

    const toggleListening = async () => {
        if (isListening) {
            await stopListening();
            setStatus('Voice control paused');
        } else {
            await startListening();
            setStatus('Listening for commands...');
        }
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.statusText}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.statusText}>Camera permission required</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Camera */}
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
            />

            {/* Top Status Bar */}
            <View style={styles.topBar}>
                <View style={styles.statusIndicator}>
                    <View
                        style={[
                            styles.dot,
                            { backgroundColor: isListening ? '#22c55e' : '#ef4444' },
                        ]}
                    />
                    <Text style={styles.statusLabel}>
                        {isListening ? 'Listening' : 'Voice Off'}
                    </Text>
                </View>
                <Text style={styles.detectionCount}>
                    {detections.length} objects
                </Text>
            </View>

            {/* Center Crosshair */}
            <View style={styles.crosshairContainer}>
                <View style={styles.crosshair}>
                    <View style={styles.crosshairDot} />
                </View>
            </View>

            {/* Bottom Panel */}
            <View style={styles.bottomPanel}>
                <Text style={styles.statusText}>{status}</Text>
                {transcript && (
                    <Text style={styles.transcriptText}>Heard: "{transcript}"</Text>
                )}
                {error && <Text style={styles.errorText}>{error}</Text>}

                <View style={styles.buttonRow}>
                    {/* Main Mic Button */}
                    <TouchableOpacity
                        style={[
                            styles.micButton,
                            isListening && styles.micButtonActive,
                        ]}
                        onPress={toggleListening}
                    >
                        <Text style={styles.micIcon}>🎤</Text>
                    </TouchableOpacity>

                    {/* Identify Button */}
                    <TouchableOpacity
                        style={styles.identifyButton}
                        onPress={() => handleCommand('identify')}
                    >
                        <Text style={styles.identifyIcon}>🔍</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.hint}>
                    Say "What is that?" or tap 🔍 to identify objects
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    topBar: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    statusLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    detectionCount: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
    },
    crosshairContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    crosshair: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    crosshairDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    bottomPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    statusText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    transcriptText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginTop: 4,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginTop: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        gap: 20,
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButtonActive: {
        backgroundColor: '#22c55e',
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    micIcon: {
        fontSize: 36,
    },
    identifyButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    identifyIcon: {
        fontSize: 28,
    },
    hint: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 16,
        textAlign: 'center',
    },
    permissionButton: {
        marginTop: 20,
        backgroundColor: '#3b82f6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

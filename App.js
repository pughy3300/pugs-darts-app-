import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  Slider 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [zoom, setZoom] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationMode, setCalibrationMode] = useState(false);
  
  // 4-Point Perspective Correction Coordinates (Top, Right, Bottom, Left)
  const [points, setPoints] = useState([
    { x: 0.50, y: 0.20 }, // Top (20)
    { x: 0.80, y: 0.50 }, // Right (6)
    { x: 0.50, y: 0.80 }, // Bottom (3)
    { x: 0.20, y: 0.50 }  // Left (11)
  ]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.text}>Camera access is required to detect darts.</Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Simulated Auto-Calibration logic (Detects board ring boundaries)
  const handleAutoCalibrate = () => {
    // In production, frame processing algorithms analyze edge contrast to fit the outer double wire
    setPoints([
      { x: 0.50, y: 0.25 },
      { x: 0.75, y: 0.52 },
      { x: 0.50, y: 0.78 },
      { x: 0.25, y: 0.52 }
    ]);
    setIsCalibrated(true);
    setCalibrationMode(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} zoom={zoom}>
          {/* Perspective Alignment Mesh */}
          <View style={styles.overlay}>
            <View 
              style={[
                styles.calibrationGuide, 
                isCalibrated && styles.calibratedGuide
              ]}
            >
              <Text style={styles.guideText}>
                {isCalibrated ? "Angle Corrected & Calibrated" : "Align Dartboard Outer Ring"}
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Controls Dashboard */}
      <View style={styles.controls}>
        {/* Zoom Slider */}
        <View style={styles.zoomContainer}>
          <Text style={styles.controlLabel}>Zoom: {(zoom * 100).toFixed(0)}%</Text>
          <View style={styles.zoomButtons}>
            <TouchableOpacity 
              style={styles.zoomBtn} 
              onPress={() => setZoom(Math.max(0, zoom - 0.1))}
            >
              <Text style={styles.btnText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.zoomBtn} 
              onPress={() => setZoom(Math.min(1, zoom + 0.1))}
            >
              <Text style={styles.btnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.btn, styles.actionBtn]} 
            onPress={handleAutoCalibrate}
          >
            <Text style={styles.btnText}>
              {isCalibrated ? "Recalibrate" : "Auto Calibrate"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    margin: 10,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calibrationGuide: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: '#ff4444',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotateX: '45deg' }] // Simulates angled board perspective
  },
  calibratedGuide: {
    borderColor: '#00C851',
    borderStyle: 'solid',
  },
  guideText: {
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  controls: {
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  zoomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  zoomButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  zoomBtn: {
    backgroundColor: '#333333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btn: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
});

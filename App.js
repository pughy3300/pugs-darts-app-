import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Sector order starting from top (12 o'clock) moving clockwise
const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [calibrated, setCalibrated] = useState(false);
  const [calibStep, setCalibStep] = useState(0); // 0: Top, 1: Right, 2: Bottom, 3: Left
  const [calibPoints, setCalibPoints] = useState([]);
  
  // Game State (Default: 501 Double Out)
  const [score, setScore] = useState(501);
  const [turnScore, setTurnScore] = useState(501);
  const [dartsInTurn, setDartsInTurn] = useState([]);
  const [lastAction, setLastAction] = useState("Game Started");

  const calibLabels = [
    "Tap Double 20 (Top)",
    "Tap Double 6 (Right)",
    "Tap Double 3 (Bottom)",
    "Tap Double 11 (Left)"
  ];

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="camera-outline" size={64} color="#FF5722" />
          <Text style={styles.title}>Camera Access Required</Text>
          <Text style={styles.subtitle}>Darts Lens needs the camera to detect dart positions on the board.</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- CALIBRATION HANDLER ---
  const handleTouchCamera = (event) => {
    if (calibrated) return;
    const { locationX, locationY } = event.nativeEvent;
    const newPoints = [...calibPoints, { x: locationX, y: locationY }];
    setCalibPoints(newPoints);

    if (calibStep < 3) {
      setCalibStep(calibStep + 1);
    } else {
      setCalibrated(true);
      setLastAction("Board Calibrated! Ready to play.");
    }
  };

  // --- DART GEOMETRY SCORER ---
  const calculateScoreFromPoint = (x, y) => {
    // Convert screen coordinates relative to board center
    const boardCenterX = width / 2;
    const boardCenterY = 250; 
    const dx = x - boardCenterX;
    const dy = boardCenterY - y; // Flip Y-axis

    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check Bulls
    if (distance < 12) return { score: 50, label: "DB (50)", multiplier: 2 };
    if (distance < 28) return { score: 25, label: "SB (25)", multiplier: 1 };
    if (distance > 160) return { score: 0, label: "MISS", multiplier: 0 };

    // Calculate Sector Angle
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // Adjust so 90 deg (top) aligns with Sector 20
    let adjustedAngle = (99.0 - angle) % 360.0;
    if (adjustedAngle < 0) adjustedAngle += 360;

    const sectorIndex = Math.floor(adjustedAngle / 18);
    const baseValue = SECTORS[sectorIndex];

    // Determine Multipliers (Double / Triple)
    if (distance >= 90 && distance <= 105) {
      return { score: baseValue * 3, label: `T${baseValue}`, multiplier: 3 };
    } else if (distance >= 145 && distance <= 160) {
      return { score: baseValue * 2, label: `D${baseValue}`, multiplier: 2 };
    } else {
      return { score: baseValue, label: `S${baseValue}`, multiplier: 1 };
    }
  };

  // --- GAME RULES ENGINE (501) ---
  const processThrow = (dartResult) => {
    const pts = dartResult.score;
    const mult = dartResult.multiplier;
    const newScore = score - pts;

    let updatedDarts = [...dartsInTurn, dartResult.label];

    // Bust Logic
    if (newScore < 0 || newScore === 1 || (newScore === 0 && mult !== 2)) {
      setScore(turnScore); // Revert to turn start
      setDartsInTurn([]);
      setLastAction(`BUST! (${dartResult.label}) - Score reset to ${turnScore}`);
      return;
    }

    // Win Logic
    if (newScore === 0 && mult === 2) {
      setScore(0);
      setLastAction(`GAME WON! Finish: ${dartResult.label}`);
      Alert.alert("Game Won!", "Congratulations, you checked out!");
      return;
    }

    // Valid Throw
    setScore(newScore);
    setDartsInTurn(updatedDarts);
    setLastAction(`Hit: ${dartResult.label} (-${pts})`);

    // End Turn (3 Darts thrown)
    if (updatedDarts.length === 3) {
      setTimeout(() => {
        setDartsInTurn([]);
        setTurnScore(newScore);
        setLastAction(`Turn Finished. Next Turn Score: ${newScore}`);
      }, 1500);
    }
  };

  const resetGame = () => {
    setScore(501);
    setTurnScore(501);
    setDartsInTurn([]);
    setLastAction("Game Reset to 501");
  };

  const resetCalibration = () => {
    setCalibrated(false);
    setCalibStep(0);
    setCalibPoints([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. CAMERA / LENS FRAME */}
      <View style={styles.cameraContainer}>
        <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
        
        {/* Touch Overlay for Calibration & Tap-Scoring */}
        <TouchableOpacity 
          activeOpacity={1} 
          style={StyleSheet.absoluteFillObject} 
          onPress={handleTouchCamera}
        >
          {/* Draw Calibration Target Dots */}
          {calibPoints.map((pt, idx) => (
            <View key={idx} style={[styles.calibDot, { left: pt.x - 10, top: pt.y - 10 }]}>
              <Text style={styles.dotText}>{idx + 1}</Text>
            </View>
          ))}

          {!calibrated && (
            <View style={styles.calibOverlay}>
              <Text style={styles.calibTitle}>LENS CALIBRATION</Text>
              <Text style={styles.calibInstruction}>{calibLabels[calibStep]}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. SCOREBOARD & GAME ENGINE UI */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreHeader}>
          <Text style={styles.playerTitle}>PLAYER 1 (501)</Text>
          <TouchableOpacity onPress={resetGame}>
            <Ionicons name="refresh-circle" size={32} color="#FF5722" />
          </TouchableOpacity>
        </View>

        <Text style={styles.mainScore}>{score}</Text>

        {/* Darts Thrown This Turn */}
        <View style={styles.dartsRow}>
          {[0, 1, 2].map((idx) => (
            <View key={idx} style={styles.dartBadge}>
              <Text style={styles.dartText}>
                {dartsInTurn[idx] ? dartsInTurn[idx] : "—"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.statusLog}>{lastAction}</Text>

        {/* MANUAL OVERRIDE KEYPAD */}
        <Text style={styles.keypadTitle}>Quick Manual Entry</Text>
        <View style={styles.keypadGrid}>
          {[
            { label: "T20", score: 60, multiplier: 3 },
            { label: "D20", score: 40, multiplier: 2 },
            { label: "S20", score: 20, multiplier: 1 },
            { label: "BULL", score: 50, multiplier: 2 },
            { label: "25", score: 25, multiplier: 1 },
            { label: "MISS", score: 0, multiplier: 0 }
          ].map((item, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.keyBtn}
              onPress={() => processThrow(item)}
            >
              <Text style={styles.keyText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.recalibBtn} onPress={resetCalibration}>
          <Text style={styles.recalibText}>Recalibrate Camera Lens</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  subtitle: { color: '#888', textAlign: 'center', marginVertical: 10 },
  btnPrimary: { backgroundColor: '#FF5722', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 8, marginTop: 15 },
  btnText: { color: 'white', fontWeight: 'bold' },

  cameraContainer: { height: 320, width: '100%', position: 'relative', backgroundColor: 'black' },
  calibOverlay: { position: 'absolute', top: 20, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.75)', padding: 12, borderRadius: 8, alignItems: 'center' },
  calibTitle: { color: '#FF5722', fontWeight: 'bold', fontSize: 12 },
  calibInstruction: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  calibDot: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF5722', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  dotText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  scoreContainer: { flex: 1, padding: 16, justifyContent: 'space-between' },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-[#121212]', alignItems: 'center' },
  playerTitle: { color: '#888', fontWeight: 'bold', fontSize: 14 },
  mainScore: { color: 'white', fontSize: 72, fontWeight: 'bold', textAlign: 'center', marginVertical: -10 },

  dartsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  dartBadge: { backgroundColor: '#222', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#333', minWidth: 60, alignItems: 'center' },
  dartText: { color: '#FF5722', fontWeight: 'bold', fontSize: 16 },

  statusLog: { color: '#AAA', textAlign: 'center', fontSize: 12, fontStyle: 'italic' },
  keypadTitle: { color: '#666', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  keypadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  keyBtn: { backgroundColor: '#1E1E1E', width: '31%', paddingVertical: 12, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A' },
  keyText: { color: 'white', fontWeight: 'bold' },

  recalibBtn: { alignItems: 'center', paddingVertical: 6 },
  recalibText: { color: '#666', fontSize: 12, textDecorationLine: 'underline' }
});

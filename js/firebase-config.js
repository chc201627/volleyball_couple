/**
 * Firebase Configuration
 *
 * Setup steps:
 *  1. Go to https://console.firebase.google.com and create a project.
 *  2. Click "Add app" → Web, register the app, and copy the config object.
 *  3. In the Firebase console, go to Build → Realtime Database → Create database.
 *     Choose a region, then start in TEST MODE (allows public read/write).
 *  4. Replace every placeholder value below with your actual project values.
 *
 * When the values are still placeholders the app falls back to the old
 * URL-hash sharing approach (no real-time sync).
 */

/* global */
/* exported FIREBASE_CONFIG */

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyCFP4VCIoHeJlDMimd0gNTy26fviwE6azo",
  authDomain: "volley-couple.firebaseapp.com",
  databaseURL: "https://volley-couple-default-rtdb.firebaseio.com",
  projectId: "volley-couple",
  storageBucket: "volley-couple.firebasestorage.app",
  messagingSenderId: "646587267339",
  appId: "1:646587267339:web:ef7a1f03416363e61f0a0e"
};

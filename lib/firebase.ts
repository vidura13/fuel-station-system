// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWtzLWEAF_LcRr_ZpSj2GWsxjispdxETg",
  authDomain: "fuel-station-system-rl.firebaseapp.com",
  projectId: "fuel-station-system-rl",
  storageBucket: "fuel-station-system-rl.firebasestorage.app",
  messagingSenderId: "871918845282",
  appId: "1:871918845282:web:bbb215eba14944f78d403b"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
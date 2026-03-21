// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvohtlBk2uL2RaY3SGijoj1RIHa1qpujY",
  authDomain: "aviator-5c03c.firebaseapp.com",
  projectId: "aviator-5c03c",
  storageBucket: "aviator-5c03c.firebasestorage.app",
  messagingSenderId: "535276064015",
  appId: "1:535276064015:web:4804a198f726069deb027a",
  measurementId: "G-YCPM5KWV6Q"
};

// Initialize Firebase
let app, auth, db, storage;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error("Firebase init failed:", error.message);
}

export { app, auth, db, storage };
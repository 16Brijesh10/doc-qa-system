import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // ✅ Added GoogleAuthProvider
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAFYtuG0Qjy08F8WcvU_HyEyt_eGNU8Mlg",
    authDomain: "docintel-de06c.firebaseapp.com",
    projectId: "docintel-de06c",
    storageBucket: "docintel-de06c.firebasestorage.app",
    messagingSenderId: "989972545129",
    appId: "1:989972545129:web:e5f8e4213cdd44c78e6cf8",
    measurementId: "G-23XZE4KWC3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // ✅ Export this for User Portal
export const db = getFirestore(app);
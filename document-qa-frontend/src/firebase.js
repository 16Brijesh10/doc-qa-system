import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // ✅ Added GoogleAuthProvider
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "enter your key",
    authDomain: "enter your key",
    projectId: "enter your key",
    storageBucket: "enter your key"
    messagingSenderId: "enter your key",
    appId:"enter your key",
    measurementId: "enter your key"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // ✅ Export this for User Portal
export const db = getFirestore(app);

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyByb_EXX0y1Oi_YL7-HhUgk6Q2F5KIh-Sk",
  authDomain: "eneftee-43d64.firebaseapp.com",
  projectId: "eneftee-43d64",
  storageBucket: "eneftee-43d64.firebasestorage.app",
  messagingSenderId: "8418473811",
  appId: "1:8418473811:web:f8a12c8c18af5ea89ed3a6",
  measurementId: "G-RBWNC949QM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Export them for use in other files
export { app, auth, analytics };

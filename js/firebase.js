import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1I3tNkzVUGmMqi7cDXv_6mgUcfFCuMEg",
  authDomain: "chordsynclive.firebaseapp.com",
  projectId: "chordsynclive",
  storageBucket: "chordsynclive.firebasestorage.app",
  messagingSenderId: "777081343996",
  appId: "1:777081343996:web:92bd69bdc28529aba12c79"
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

// Exportamos solo elementos estables y nativos
export { rtdb, ref, onValue, set, push };
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    // Tus credenciales de Firebase de siempre
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

// Exportamos solo lo que la app necesita, sin 'remove'
export { rtdb, ref, onValue, set, push };

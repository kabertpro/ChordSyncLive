import { rtdb, ref, set, onValue, update, push } from "./firebase.js";

// Estructura limpia para parsear el string plano del input a JSON estructurado
export function parseChordsInput(rawText) {
    const tokens = rawText.trim().split(/\s+/);
    const sections = [];
    let currentSection = null;

    tokens.forEach(token => {
        if (token.startsWith(':')) {
            if (currentSection) sections.push(currentSection);
            currentSection = { name: token.substring(1).toUpperCase(), chords: [] };
        } else if (token) {
            if (!currentSection) {
                currentSection = { name: "INTRO", chords: [] };
            }
            currentSection.chords.push(token);
        }
    });
    if (currentSection) sections.push(currentSection);
    return sections;
}

export function saveSong(songData) {
    const id = songData.id || push(ref(rtdb, 'songs')).key;
    songData.id = id;
    songData.updatedAt = Date.now();
    if (!songData.createdAt) songData.createdAt = Date.now();
    
    return set(ref(rtdb, `songs/${id}`), songData);
}

export function deleteSong(id) {
    return set(ref(rtdb, `songs/${id}`), null);
}

// Inicialización de datos semilla si la base de datos está vacía (Incluye el Círculo de Sostenidos)
export function checkAndInitSongsSeed() {
    onValue(ref(rtdb, 'songs'), (snapshot) => {
        if (!snapshot.exists()) {
            const seedSong = {
                id: "seed_sharps_circle",
                title: "Circle of Sharps (Exercise)",
                author: "Viss",
                group: "Estudio Armónico",
                key: "C",
                timeSignature: "4/4",
                bpm: 70,
                tags: ["Ensayo", "Ejercicios"],
                sections: [{
                    name: "ASCENDING",
                    chords: [
                        "C_major", "C_major", "G_major", "G_major",
                        "D_major", "D_major", "A_major", "A_major",
                        "E_major", "E_major", "B_major", "B_major",
                        "F#_major", "F#_major", "C#_major", "Db_major",
                        "Ab_major", "Ab_major", "Eb_major", "Eb_major",
                        "Bb_major", "Bb_major", "F_major", "F_major",
                        "C_major", "C_major"
                    ]
                }],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            set(ref(rtdb, 'songs/seed_sharps_circle'), seedSong);
        }
    }, { onlyOnce: true });
}
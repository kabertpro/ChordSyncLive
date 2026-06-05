import { rtdb, ref, set, onValue, update, push } from "./firebase.js";

// Estructura limpia para parsear el string plano del input a JSON estructurado
// Reemplaza esta función en tu js/songs.js
export function parseChordsInput(rawText) {
    const lines = rawText.split('\n');
    const sections = [];
    let currentSection = { name: "INTRO", chords: [] };

    lines.forEach(line => {
        const tokens = line.trim().split(/\s+/);
        tokens.forEach(token => {
            if (!token) return;

            // Si el token define una sección (Ej: :INTRO, :CORO, :ESTROFA)
            if (token.startsWith(':')) {
                if (currentSection.chords.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = { name: token.substring(1).toUpperCase(), chords: [] };
            } else {
                // NORMALIZADOR INTELIGENTE DE ACORDES
                let standardizedChord = token;

                // 1. Limpiar caracteres extraños
                let cleanToken = token.replace(/[\[\]()]/g, ''); 

                // 2. Detectar Menores (Ej: Cm, Cmin, C-) -> Convertir a _minor
                if (cleanToken.endsWith('m') || cleanToken.endsWith('min') || cleanToken.endsWith('-')) {
                    let root = cleanToken.replace(/m|min|-/g, '');
                    standardizedChord = `${root}_minor`;
                } 
                // 3. Detectar Séptimas (Ej: C7) -> Convertir a _7
                else if (cleanToken.endsWith('7')) {
                    let root = cleanToken.slice(0, -1);
                    standardizedChord = `${root}_7`;
                } 
                // 4. Si es solo la nota (Ej: C, D, G) -> Convertir a _major
                else if (/^[A-G]#?$/.test(cleanToken)) {
                    standardizedChord = `${cleanToken}_major`;
                }

                currentSection.chords.push(standardizedChord);
            }
        });
    });

    if (currentSection.chords.length > 0) {
        sections.push(currentSection);
    }

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
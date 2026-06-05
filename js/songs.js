import { rtdb, ref, push, set, remove } from "./firebase.js";

// PARSEADOR INTELIGENTE ADAPTADO A CHORDS-DB.JS
export function parseChordsInput(rawText) {
    if (!rawText) return [];
    const lines = rawText.split('\n');
    const sections = [];
    let currentSection = { name: "INTRO", chords: [] };

    lines.forEach(line => {
        const tokens = line.trim().split(/\s+/);
        tokens.forEach(token => {
            if (!token) return;
            if (token.startsWith(':')) {
                if (currentSection.chords.length > 0) sections.push(currentSection);
                currentSection = { name: token.substring(1).toUpperCase(), chords: [] };
            } else {
                let cleanToken = token.trim();
                let standardizedChord = cleanToken;

                // Detectar alteraciones manteniendo el # original de la base de datos
                let isMinor = cleanToken.includes('m') || cleanToken.includes('min') || cleanToken.includes('-');
                let is7 = cleanToken.includes('7');

                let root = cleanToken.replace(/m|min|7|-/g, '');

                if (isMinor) {
                    standardizedChord = `${root}_minor`;
                } else if (is7) {
                    standardizedChord = `${root}_7`;
                } else {
                    standardizedChord = `${root}_major`;
                }
                currentSection.chords.push(standardizedChord);
            }
        });
    });
    if (currentSection.chords.length > 0) sections.push(currentSection);
    return sections;
}

export function saveSong(songData) {
    return set(ref(rtdb, `songs/${songData.id}`), songData);
}

export function deleteSong(id) {
    return remove(ref(rtdb, `songs/${id}`));
}
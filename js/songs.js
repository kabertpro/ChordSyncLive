import { rtdb, ref, set } from "./firebase.js";

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
                let isMinor = cleanToken.includes('m') || cleanToken.includes('min') || cleanToken.includes('-');
                let is7 = cleanToken.includes('7');
                let root = cleanToken.replace(/m|min|7|-/g, '');

                let standardizedChord = isMinor ? `${root}_minor` : (is7 ? `${root}_7` : `${root}_major`);
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
    // Reemplazo seguro de remove asignando null a la referencia
    return set(ref(rtdb, `songs/${id}`), null);
}
import { rtdb, ref, set, update } from "./firebase.js";

export function toggleLiveState(active, directorName) {
    if (active) {
        return set(ref(rtdb, 'live'), {
            active: true,
            director: directorName,
            currentSongId: "",
            currentSectionIndex: -1,
            currentChordIndex: -1
        });
    } else {
        return set(ref(rtdb, 'live'), {
            active: false,
            director: "",
            currentSongId: "",
            currentSectionIndex: -1,
            currentChordIndex: -1
        });
    }
}

export function updateLiveNavigation(songId, sectionIndex, chordIndex) {
    return update(ref(rtdb, 'live'), {
        currentSongId: songId,
        currentSectionIndex: sectionIndex,
        currentChordIndex: chordIndex
    });
}
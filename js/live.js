import { rtdb, ref, set } from "./firebase.js";

export function toggleLiveState(activeState, username, currentSongId = "") {
    return set(ref(rtdb, 'live'), {
        active: activeState,
        director: activeState ? username : "",
        currentSongId: activeState ? currentSongId : "",
        currentSectionIndex: -1,
        currentChordIndex: -1
    });
}

export function updateLiveNavigation(songId, directorName, sectionIdx, chordIdx) {
    return set(ref(rtdb, 'live'), {
        active: true,
        director: directorName,
        currentSongId: songId,
        currentSectionIndex: sectionIdx,
        currentChordIndex: chordIdx
    });
}
import { rtdb, ref, set, push } from "./firebase.js";

export function createRepertoire(name) {
    const id = push(ref(rtdb, 'repertoires')).key;
    const repData = {
        id: id,
        name: name,
        songIds: []
    };
    return set(ref(rtdb, `repertoires/${id}`), repData);
}

export function addSongToRepertoire(repertoireId, songIdsList) {
    return set(ref(rtdb, `repertoires/${repertoireId}/songIds`), songIdsList);
}

export function deleteRepertoire(id) {
    return set(ref(rtdb, `repertoires/${id}`), null);
}
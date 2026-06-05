import { rtdb, ref, set } from "./firebase.js";

export function createRepertoire(id, name) {
    return set(ref(rtdb, `repertoires/${id}`), {
        id: id,
        name: name,
        songs: {}
    });
}

export function deleteRepertoire(id) {
    // Uso nativo de remoción mediante set nulo
    return set(ref(rtdb, `repertoires/${id}`), null);
}
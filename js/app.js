import { rtdb, ref, onValue } from "./firebase.js";
import { saveSong, deleteSong, parseChordsInput, checkAndInitSongsSeed } from "./songs.js";
import { createRepertoire, deleteRepertoire, addSongToRepertoire } from "./repertoire.js";
import { toggleLiveState, updateLiveNavigation } from "./live.js";

// LOCAL STATE
let currentUser = localStorage.getItem("cs_username") || "";
let currentRole = "Músico"; // Por defecto todos entran como Músico
let isLiveActiveGlobal = false;
let globalSongs = {};
let globalRepertoires = {};
let currentSelectedSong = null;
let liveState = { active: false, director: "", currentSongId: "", currentSectionIndex: -1, currentChordIndex: -1 };

// DOM ELEMENTS
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const usernameInput = document.getElementById("username-input");
const btnEnter = document.getElementById("btn-enter");
const displayUserName = document.getElementById("display-user-name");
const btnLiveToggle = document.getElementById("btn-live-toggle");
const liveBanner = document.getElementById("live-banner");
const liveDirectorName = document.getElementById("live-director-name");
const btnJoinLive = document.getElementById("btn-join-live");
const chordsGrid = document.getElementById("chords-grid");
const selectInstrument = document.getElementById("select-instrument");
const switchFollow = document.getElementById("switch-follow");
const activeSectionIndicator = document.getElementById("active-section-indicator");
const currentActiveSectionName = document.getElementById("current-active-section-name");

// INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    if (currentUser) {
        showApp();
    }
    checkAndInitSongsSeed();
    setupRealtimeListeners();
    setupUIEventListeners();
});

// LOGIN MANAGER
btnEnter.addEventListener("click", () => {
    const val = usernameInput.value.trim();
    if (val) {
        currentUser = val;
        localStorage.setItem("cs_username", currentUser);
        showApp();
    }
});

function showApp() {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    displayUserName.textContent = currentUser;
}

// REALTIME DATABASE SYNCHRONIZATION
function setupRealtimeListeners() {
    // 1. Escucha del estado LIVE central
    onValue(ref(rtdb, 'live'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            liveState = data;
            isLiveActiveGlobal = data.active;
            updateLiveUIStatus();
            
            // Lógica de arrastre de pantalla (Seguir Director)
            if (data.active && switchFollow.checked && data.currentSongId) {
                if (currentSelectedSong?.id !== data.currentSongId) {
                    currentSelectedSong = globalSongs[data.currentSongId];
                    renderVisorSong();
                }
                highlightActiveLiveChord(data.currentSectionIndex, data.currentChordIndex);
            }
        }
    });

    // 2. Escucha de cambios en Banco de Canciones
    onValue(ref(rtdb, 'songs'), (snapshot) => {
        globalSongs = snapshot.val() || {};
        renderSongsList(globalSongs);
        if (currentSelectedSong && globalSongs[currentSelectedSong.id]) {
            currentSelectedSong = globalSongs[currentSelectedSong.id];
            renderVisorSong();
        }
    });

    // 3. Escucha de Repertorios
    onValue(ref(rtdb, 'repertoires'), (snapshot) => {
        globalRepertoires = snapshot.val() || {};
        renderRepertoiresList(globalRepertoires);
    });
}

function updateLiveUIStatus() {
    if (liveState.active) {
        liveBanner.classList.remove("hidden");
        liveDirectorName.textContent = liveState.director;
        
        if (liveState.director === currentUser) {
            btnLiveToggle.classList.add("active");
            btnLiveToggle.textContent = "⏹ STOP LIVE";
            currentRole = "Director";
        } else {
            btnLiveToggle.classList.remove("active");
            btnLiveToggle.textContent = "🔴 LIVE";
            currentRole = "Músico";
        }
    } else {
        liveBanner.classList.add("hidden");
        btnLiveToggle.classList.remove("active");
        btnLiveToggle.textContent = "🔴 LIVE";
        currentRole = "Músico";
    }
}

// CONMUTADOR LIVE
btnLiveToggle.addEventListener("click", () => {
    if (liveState.active && liveState.director === currentUser) {
        toggleLiveState(false, "");
    } else {
        toggleLiveState(true, currentUser);
    }
});

btnJoinLive.addEventListener("click", () => {
    switchFollow.checked = true;
    if (liveState.currentSongId) {
        currentSelectedSong = globalSongs[liveState.currentSongId];
        renderVisorSong();
        highlightActiveLiveChord(liveState.currentSectionIndex, liveState.currentChordIndex);
    }
});

// INTERFAZ DE NAVEGACIÓN ENTRE TABS
document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
        document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
        
        e.target.classList.add("active");
        document.getElementById(e.target.dataset.target).classList.remove("hidden");
    });
});

// RENDERING DEL VISOR PRINCIPAL (ESTILO IREAL PRO)
function renderVisorSong() {
    if (!currentSelectedSong) return;
    
    document.getElementById("visor-title").textContent = currentSelectedSong.title;
    document.getElementById("visor-author-group").textContent = `${currentSelectedSong.author} ${currentSelectedSong.group ? '• ' + currentSelectedSong.group : ''}`;
    document.getElementById("visor-key").textContent = currentSelectedSong.key;
    document.getElementById("visor-signature").textContent = currentSelectedSong.timeSignature;
    document.getElementById("visor-bpm").textContent = currentSelectedSong.bpm;
    
    chordsGrid.innerHTML = "";
    const selectedInst = selectInstrument.value;
    
    let absoluteChordCounter = 0;
    
    currentSelectedSong.sections.forEach((section, sIdx) => {
        section.chords.forEach((chordKey, cIdx) => {
            const box = document.createElement("div");
            box.classList.add("chord-box");
            box.dataset.sectionIndex = sIdx;
            box.dataset.chordIndex = cIdx;
            box.dataset.absoluteIndex = absoluteChordCounter;
            
            // Si es el primer acorde de la sección se renderiza la etiqueta flotante de la sección
            if (cIdx === 0) {
                const secBadge = document.createElement("div");
                secBadge.classList.add("chord-section-header");
                secBadge.textContent = section.name;
                box.appendChild(secBadge);
                box.classList.add("active-section");
            }
            
            // Nombre del acorde limpio (sin guión bajo)
            const cleanName = chordKey.replace("_major", "").replace("_minor", "m").replace("_", " ");
            const nameEl = document.createElement("div");
            nameEl.classList.add("chord-name");
            nameEl.textContent = cleanName;
            box.appendChild(nameEl);
            
            // Renderización de digitación si se solicita un instrumento válido
            if (selectedInst !== "none" && window.db && window.db[chordKey]) {
                const instrumentData = window.db[chordKey][selectedInst];
                if (instrumentData) {
                    const diagEl = document.createElement("div");
                    diagEl.classList.add("chord-diagram");
                    diagEl.textContent = Array.isArray(instrumentData) ? instrumentData.join("-") : instrumentData;
                    box.appendChild(diagEl);
                }
            }
            
            // Evento Click: Solo el director puede guiar la armonía global
            box.addEventListener("click", () => {
                if (currentRole === "Director" && isLiveActiveGlobal) {
                    updateLiveNavigation(currentSelectedSong.id, sIdx, cIdx);
                }
            });
            
            chordsGrid.appendChild(box);
            absoluteChordCounter++;
        });
    });
}

function highlightActiveLiveChord(sIdx, cIdx) {
    document.querySelectorAll(".chord-box").forEach(box => {
        if (parseInt(box.dataset.sectionIndex) === sIdx && parseInt(box.dataset.chordIndex) === cIdx) {
            box.classList.add("active-chord");
            if (switchFollow.checked) {
                box.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            box.classList.remove("active-chord");
        }
    });
    
    if (currentSelectedSong?.sections[sIdx]) {
        activeSectionIndicator.classList.remove("hidden");
        currentActiveSectionName.textContent = currentSelectedSong.sections[sIdx].name;
    } else {
        activeSectionIndicator.classList.add("hidden");
    }
}

selectInstrument.addEventListener("change", renderVisorSong);

// GESTIÓN COMPLETA DEL BANCO DE CANCIONES (CRUD + BUSCADOR)
function renderSongsList(songsObj) {
    const listContainer = document.getElementById("songs-list");
    listContainer.innerHTML = "";
    
    const filter = document.getElementById("search-song").value.toLowerCase();
    
    Object.values(songsObj).forEach(song => {
        const matchesSearch = song.title.toLowerCase().includes(filter) || 
                              song.author.toLowerCase().includes(filter) || 
                              (song.group && song.group.toLowerCase().includes(filter)) ||
                              (song.tags && song.tags.some(t => t.toLowerCase().includes(filter)));
                              
        if (!matchesSearch) return;
        
        const card = document.createElement("div");
        card.classList.add("item-card");
        
        card.innerHTML = `
            <div class="item-info">
                <h4>${song.title}</h4>
                <p>${song.author} ${song.group ? '• ' + song.group : ''} | Tono: ${song.key} | Tags: ${song.tags ? song.tags.join(', ') : '-'}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-accent btn-sm btn-view-song" data-id="${song.id}">Ver</button>
                <button class="btn btn-secondary btn-sm btn-edit-song" data-id="${song.id}">Editar</button>
                <button class="btn btn-danger btn-sm btn-delete-song" data-id="${song.id}">Eliminar</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
    
    // Vinculación dinámica de eventos de la lista
    document.querySelectorAll(".btn-view-song").forEach(b => b.addEventListener("click", (e) => {
        currentSelectedSong = globalSongs[e.target.dataset.id];
        renderVisorSong();
        document.querySelector('[data-target="section-visor"]').click();
    }));
    
    document.querySelectorAll(".btn-edit-song").forEach(b => b.addEventListener("click", (e) => {
        openSongForm(globalSongs[e.target.dataset.id]);
    }));
    
    document.querySelectorAll(".btn-delete-song").forEach(b => b.addEventListener("click", (e) => {
        if(confirm("¿Eliminar canción?")) deleteSong(e.target.dataset.id);
    }));
}

// FORMULARIO DINÁMICO
const songFormContainer = document.getElementById("song-form-container");
document.getElementById("btn-new-song").addEventListener("click", () => openSongForm());
document.getElementById("btn-cancel-song").addEventListener("click", () => songFormContainer.classList.add("hidden"));

function openSongForm(song = null) {
    songFormContainer.classList.remove("hidden");
    if (song) {
        document.getElementById("form-song-title").textContent = "Editar Canción";
        document.getElementById("form-song-id").value = song.id;
        document.getElementById("form-title").value = song.title;
        document.getElementById("form-author").value = song.author;
        document.getElementById("form-group").value = song.group || "";
        document.getElementById("form-key").value = song.key;
        document.getElementById("form-signature").value = song.timeSignature;
        document.getElementById("form-bpm").value = song.bpm;
        document.getElementById("form-tags").value = song.tags ? song.tags.join(", ") : "";
        
        let rawStr = "";
        song.sections.forEach(s => {
            rawStr += `:${s.name} ${s.chords.join(" ")} `;
        });
        document.getElementById("form-raw-chords").value = rawStr.trim();
    } else {
        document.getElementById("form-song-title").textContent = "Nueva Canción";
        document.getElementById("song-form").reset();
        document.getElementById("form-song-id").value = "";
    }
    songFormContainer.scrollIntoView({ behavior: 'smooth' });
}

document.getElementById("song-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("form-song-id").value;
    const tagsArr = document.getElementById("form-tags").value.split(",").map(t => t.trim()).filter(t => t);
    
    const songData = {
        title: document.getElementById("form-title").value.trim(),
        author: document.getElementById("form-author").value.trim(),
        group: document.getElementById("form-group").value.trim(),
        key: document.getElementById("form-key").value.trim(),
        timeSignature: document.getElementById("form-signature").value.trim(),
        bpm: parseInt(document.getElementById("form-bpm").value) || 80,
        tags: tagsArr,
        sections: parseChordsInput(document.getElementById("form-raw-chords").value)
    };
    
    if (id) songData.id = id;
    
    saveSong(songData).then(() => {
        songFormContainer.classList.add("hidden");
    });
});

document.getElementById("search-song").addEventListener("input", () => renderSongsList(globalSongs));

// REPERTORIOS
function renderRepertoiresList(repObj) {
    const container = document.getElementById("repertoires-list");
    container.innerHTML = "";
    
    Object.values(repObj).forEach(rep => {
        const card = document.createElement("div");
        card.classList.add("item-card");
        card.innerHTML = `
            <div class="item-info">
                <h4>📂 ${rep.name}</h4>
                <p>Canciones asociadas: ${rep.songIds ? rep.songIds.length : 0}</p>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-sm btn-del-rep" data-id="${rep.id}">Eliminar</button>
            </div>
        `;
        container.appendChild(card);
    });
    
    document.querySelectorAll(".btn-del-rep").forEach(b => b.addEventListener("click", (e) => {
        if(confirm("¿Eliminar repertorio?")) deleteRepertoire(e.target.dataset.id);
    }));
}

document.getElementById("btn-create-repertoire").addEventListener("click", () => {
    const input = document.getElementById("new-repertoire-name");
    if (input.value.trim()) {
        createRepertoire(input.value.trim());
        input.value = "";
    }
});

function setupUIEventListeners() {}
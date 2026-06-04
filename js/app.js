import { rtdb, ref, onValue } from "./firebase.js";
import { saveSong, deleteSong, parseChordsInput, checkAndInitSongsSeed } from "./songs.js";
import { createRepertoire, deleteRepertoire } from "./repertoire.js";
import { toggleLiveState, updateLiveNavigation } from "./live.js";

// LOCAL STATE
let currentUser = localStorage.getItem("cs_username") || "";
let currentRole = "Músico";
let isLiveActiveGlobal = false;
let globalSongs = {};
let currentSelectedSong = null;
let liveState = { active: false, director: "", currentSongId: "", currentSectionIndex: -1, currentChordIndex: -1 };

// DOM ELEMENTS
const splashScreen = document.getElementById("splash-screen");
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const mainNav = document.getElementById("main-nav");
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
const btnFloatingExitLive = document.getElementById("btn-floating-exit-live");

document.addEventListener("DOMContentLoaded", () => {
    // Simular lectura de Splash Screen durante 2.5 segundos de carga profesional
    setTimeout(() => {
        splashScreen.classList.add("hidden");
        if (currentUser) {
            showApp();
        } else {
            authScreen.classList.remove("hidden");
        }
    }, 2500);

    checkAndInitSongsSeed();
    setupRealtimeListeners();
    setupUIEventListeners();
});

btnEnter.addEventListener("click", () => {
    const val = usernameInput.value.trim();
    if (val) {
        currentUser = val;
        localStorage.setItem("cs_username", currentUser);
        authScreen.classList.add("hidden");
        showApp();
    }
});

function showApp() {
    appScreen.classList.remove("hidden");
    displayUserName.textContent = currentUser;
}

function setupRealtimeListeners() {
    onValue(ref(rtdb, 'live'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            liveState = data;
            isLiveActiveGlobal = data.active;
            updateLiveUIStatus();
            
            // EVALUACIÓN CONDICIONAL DE NAVEGACIÓN BLOQUEADA PARA EL MÚSICO EN LIVE
            if (data.active && switchFollow.checked && data.currentSongId) {
                if (currentRole === "Músico") {
                    mainNav.classList.add("hidden"); // Oculta barra de pestañas por completo
                    document.querySelector('[data-target="section-visor"]').click(); // Fuerza la vista del Visor
                    btnFloatingExitLive.classList.remove("hidden"); // Muestra botón flotante de escape
                }
                
                if (currentSelectedSong?.id !== data.currentSongId) {
                    currentSelectedSong = globalSongs[data.currentSongId];
                    renderVisorSong();
                }
                highlightActiveLiveChord(data.currentSectionIndex, data.currentChordIndex);
            } else {
                // Si el LIVE se detiene o el usuario decide salirse: liberar la app
                if (currentRole === "Músico") {
                    mainNav.classList.remove("hidden");
                    btnFloatingExitLive.classList.add("hidden");
                }
            }
        }
    });

    onValue(ref(rtdb, 'songs'), (snapshot) => {
        globalSongs = snapshot.val() || {};
        renderSongsList(globalSongs);
        if (currentSelectedSong && globalSongs[currentSelectedSong.id]) {
            currentSelectedSong = globalSongs[currentSelectedSong.id];
            renderVisorSong();
        }
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
            mainNav.classList.remove("hidden"); 
            btnFloatingExitLive.classList.add("hidden");
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
        mainNav.classList.remove("hidden");
        btnFloatingExitLive.classList.add("hidden");
    }
}

// SALIR FORZADAMENTE DEL LIVE (REQUISITO MÚSICO)
btnFloatingExitLive.addEventListener("click", () => {
    switchFollow.checked = false; 
    mainNav.classList.remove("hidden"); // Devolver barra de navegación
    btnFloatingExitLive.classList.add("hidden");
    document.querySelectorAll(".chord-box").forEach(box => box.classList.remove("active-chord"));
    activeSectionIndicator.classList.add("hidden");
});

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

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
        document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
        e.target.classList.add("active");
        document.getElementById(e.target.dataset.target).classList.remove("hidden");
    });
});

function renderVisorSong() {
    if (!currentSelectedSong) return;
    
    document.getElementById("visor-title").textContent = currentSelectedSong.title;
    document.getElementById("visor-author-group").textContent = `${currentSelectedSong.author} ${currentSelectedSong.group ? '• ' + currentSelectedSong.group : ''}`;
    document.getElementById("visor-key").textContent = currentSelectedSong.key;
    document.getElementById("visor-signature").textContent = currentSelectedSong.timeSignature;
    document.getElementById("visor-bpm").textContent = currentSelectedSong.bpm;
    
    chordsGrid.innerHTML = "";
    const selectedInst = selectInstrument.value;
    
    currentSelectedSong.sections.forEach((section, sIdx) => {
        section.chords.forEach((chordKey, cIdx) => {
            const box = document.createElement("div");
            box.classList.add("chord-box");
            box.dataset.sectionIndex = sIdx;
            box.dataset.chordIndex = cIdx;
            
            if (cIdx === 0) {
                const secBadge = document.createElement("div");
                secBadge.classList.add("chord-section-header");
                secBadge.textContent = section.name;
                box.appendChild(secBadge);
            }
            
            const cleanName = chordKey.replace("_major", "").replace("_minor", "m").replace("_7", "7").replace("_", " ");
            const nameEl = document.createElement("div");
            nameEl.classList.add("chord-name");
            nameEl.textContent = cleanName;
            box.appendChild(nameEl);
            
            // LEER DE LA BD GLOBAL (CORREGIDA VÍA SCRIPT EXPLICITO)
            if (selectedInst !== "none" && window.db && window.db[chordKey]) {
                const chordData = window.db[chordKey];
                
                if (selectedInst === "piano") {
                    const pianoContainer = document.createElement("div");
                    pianoContainer.classList.add("piano-mini");
                    
                    const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
                    const blackKeys = [{k:1}, {k:3}, {k:6}, {k:8}, {k:10}];
                    const absoluteNotes = chordData.piano.map(n => n % 12);
                    
                    whiteKeys.forEach(noteVal => {
                        const wKey = document.createElement("div");
                        wKey.classList.add("piano-key-white");
                        if (absoluteNotes.includes(noteVal)) wKey.classList.add("active-key");
                        pianoContainer.appendChild(wKey);
                    });
                    
                    blackKeys.forEach(bObj => {
                        const bKey = document.createElement("div");
                        bKey.classList.add("piano-key-black", `k-${bObj.k}`);
                        if (absoluteNotes.includes(bObj.k)) bKey.classList.add("active-key");
                        pianoContainer.appendChild(bKey);
                    });
                    box.appendChild(pianoContainer);
                    
                } else {
                    const stringPositions = chordData[selectedInst];
                    if (stringPositions && Array.isArray(stringPositions)) {
                        const fretboard = document.createElement("div");
                        fretboard.classList.add("fretboard-mini");
                        
                        stringPositions.forEach(pos => {
                            const stringLine = document.createElement("div");
                            stringLine.classList.add("string-line");
                            
                            if (pos === "x") {
                                const mute = document.createElement("span");
                                mute.classList.add("string-fret-mute");
                                mute.textContent = "×";
                                stringLine.appendChild(mute);
                            } else if (parseInt(pos) === 0) {
                                const open = document.createElement("span");
                                open.classList.add("string-fret-open");
                                open.textContent = "○";
                                stringLine.appendChild(open);
                            } else {
                                const dot = document.createElement("div");
                                dot.classList.add("string-fret-dot");
                                const calculatedTop = Math.min((parseInt(pos) * 6) + 4, 32);
                                dot.style.top = `${calculatedTop}px`;
                                stringLine.appendChild(dot);
                            }
                            fretboard.appendChild(stringLine);
                        });
                        box.appendChild(fretboard);
                    }
                }
            }
            
            box.addEventListener("click", () => {
                if (currentRole === "Director" && isLiveActiveGlobal) {
                    updateLiveNavigation(currentSelectedSong.id, sIdx, cIdx);
                }
            });
            chordsGrid.appendChild(box);
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

function renderSongsList(songsObj) {
    const listContainer = document.getElementById("songs-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";
    const filter = document.getElementById("search-song").value.toLowerCase();
    
    Object.values(songsObj).forEach(song => {
        const matchesSearch = song.title.toLowerCase().includes(filter) || song.author.toLowerCase().includes(filter);
        if (!matchesSearch) return;
        
        const card = document.createElement("div");
        card.classList.add("item-card");
        card.innerHTML = `
            <div class="item-info"><h4>${song.title}</h4><p>${song.author} | Tono: ${song.key}</p></div>
            <div class="item-actions">
                <button class="btn btn-accent btn-sm btn-view-song" data-id="${song.id}">Ver</button>
                <button class="btn btn-secondary btn-sm btn-edit-song" data-id="${song.id}">Editar</button>
                <button class="btn btn-danger btn-sm btn-delete-song" data-id="${song.id}">Eliminar</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
    
    document.querySelectorAll(".btn-view-song").forEach(b => b.addEventListener("click", (e) => {
        currentSelectedSong = globalSongs[e.target.dataset.id];
        renderVisorSong();
        document.querySelector('[data-target="section-visor"]').click();
    }));
}

function setupUIEventListeners() {
    const searchSong = document.getElementById("search-song");
    if(searchSong) {
        searchSong.addEventListener("input", () => renderSongsList(globalSongs));
    }
}
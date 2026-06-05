import { rtdb, ref, onValue, push } from "./firebase.js";
import { localChordsDB } from "./chords-db.js";
import { saveSong, deleteSong, parseChordsInput } from "./songs.js";
import { createRepertoire, deleteRepertoire } from "./repertoire.js";
import { toggleLiveState, updateLiveNavigation } from "./live.js";

// ESTADO GLOBAL DE LA APP
let currentUser = localStorage.getItem("cs_username") || "";
let currentRole = "Músico";
let isLiveActiveGlobal = false;
let globalSongs = {};
let globalRepertoires = {};
let currentSelectedSong = null;
let liveState = { active: false, director: "", currentSongId: "", currentSectionIndex: -1, currentChordIndex: -1 };

// MAPEO DE ELEMENTOS DE LA UI
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

function launchFullScreen(element) {
    if (element && element.requestFullscreen) element.requestFullscreen();
}

// INICIALIZADOR PRINCIPAL DE LA APP
document.addEventListener("DOMContentLoaded", () => {
    try {
        setupRealtimeListeners();
        setupUIEventListeners();
    } catch (err) {
        console.error("Error en inicialización estructural: ", err);
    }

    // El Splash Screen se remueve pase lo que pase al terminar la carga
    setTimeout(() => {
        if (splashScreen) splashScreen.classList.add("hidden");
        if (currentUser) {
            showApp();
        } else {
            if (authScreen) authScreen.classList.remove("hidden");
        }
    }, 1200);
});

function showApp() {
    if (appScreen) appScreen.classList.remove("hidden");
    if (displayUserName) displayUserName.textContent = currentUser;
}

if (btnEnter) {
    btnEnter.addEventListener("click", () => {
        const val = usernameInput.value.trim();
        if (val) {
            currentUser = val;
            localStorage.setItem("cs_username", currentUser);
            if (authScreen) authScreen.classList.add("hidden");
            showApp();
            launchFullScreen(document.documentElement);
        }
    });
}

function setupRealtimeListeners() {
    onValue(ref(rtdb, 'live'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            liveState = data;
            isLiveActiveGlobal = data.active;
            updateLiveUIStatus();
            
            if (data.active && switchFollow && switchFollow.checked && data.currentSongId) {
                if (currentRole === "Músico" && mainNav) {
                    mainNav.classList.add("hidden");
                    const viewTrigger = document.querySelector('[data-target="section-visor"]');
                    if (viewTrigger) viewTrigger.click();
                    if (btnFloatingExitLive) btnFloatingExitLive.classList.remove("hidden");
                }
                if (!currentSelectedSong || currentSelectedSong.id !== data.currentSongId) {
                    currentSelectedSong = globalSongs[data.currentSongId];
                    renderVisorSong();
                }
                highlightActiveLiveChord(data.currentSectionIndex, data.currentChordIndex);
            } else {
                if (currentRole === "Músico" && mainNav) {
                    mainNav.classList.remove("hidden");
                    if (btnFloatingExitLive) btnFloatingExitLive.classList.add("hidden");
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

    onValue(ref(rtdb, 'repertoires'), (snapshot) => {
        globalRepertoires = snapshot.val() || {};
        renderRepertoiresList(globalRepertoires);
    });
}

function updateLiveUIStatus() {
    if (liveState.active) {
        if (liveBanner) liveBanner.classList.remove("hidden");
        if (liveDirectorName) liveDirectorName.textContent = liveState.director;
        if (liveState.director === currentUser) {
            if (btnLiveToggle) {
                btnLiveToggle.classList.add("active");
                btnLiveToggle.textContent = "⏹ STOP LIVE";
            }
            currentRole = "Director";
            if (mainNav) mainNav.classList.remove("hidden");
        } else {
            if (btnLiveToggle) {
                btnLiveToggle.classList.remove("active");
                btnLiveToggle.textContent = "🔴 LIVE";
            }
            currentRole = "Músico";
        }
    } else {
        if (liveBanner) liveBanner.classList.add("hidden");
        if (btnLiveToggle) {
            btnLiveToggle.classList.remove("active");
            btnLiveToggle.textContent = "🔴 LIVE";
        }
        currentRole = "Músico";
        if (mainNav) mainNav.classList.remove("hidden");
        if (btnFloatingExitLive) btnFloatingExitLive.classList.add("hidden");
    }
}

function setupUIEventListeners() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
            e.target.classList.add("active");
            const targetEl = document.getElementById(e.target.dataset.target);
            if (targetEl) targetEl.classList.remove("hidden");
            window.scrollTo({ top: 0 });
        });
    });

    const btnNewSong = document.getElementById("btn-new-song");
    const songFormContainer = document.getElementById("song-form-container");
    const btnCancelSong = document.getElementById("btn-cancel-song");
    const songForm = document.getElementById("song-form");
    const searchSong = document.getElementById("search-song");

    if (btnNewSong) {
        btnNewSong.addEventListener("click", () => {
            const formId = document.getElementById("form-song-id");
            if (formId) formId.value = "";
            if (songForm) songForm.reset();
            if (songFormContainer) songFormContainer.classList.remove("hidden");
        });
    }

    if (btnCancelSong) {
        btnCancelSong.addEventListener("click", () => {
            if (songFormContainer) songFormContainer.classList.add("hidden");
        });
    }

    if (songForm) {
        songForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const formIdVal = document.getElementById("form-song-id").value;
            const id = formIdVal || push(ref(rtdb, 'songs')).key;
            const rawChords = document.getElementById("form-raw-chords").value;
            
            const sections = parseChordsInput(rawChords);

            const songData = {
                id: id,
                title: document.getElementById("form-title").value.trim(),
                author: document.getElementById("form-author").value.trim(),
                group: document.getElementById("form-group").value.trim(),
                key: document.getElementById("form-key").value.trim(),
                timeSignature: document.getElementById("form-signature").value.trim(),
                bpm: parseInt(document.getElementById("form-bpm").value) || 80,
                sections: sections
            };

            saveSong(songData)
                .then(() => {
                    if (songFormContainer) songFormContainer.classList.add("hidden");
                    songForm.reset();
                }).catch(err => alert("Error: " + err.message));
        });
    }

    if (searchSong) {
        searchSong.addEventListener("input", () => renderSongsList(globalSongs));
    }

    const btnCreateRepertoire = document.getElementById("btn-create-repertoire");
    const newRepertoireName = document.getElementById("new-repertoire-name");

    if (btnCreateRepertoire && newRepertoireName) {
        btnCreateRepertoire.addEventListener("click", () => {
            const name = newRepertoireName.value.trim();
            if (!name) return;
            const repId = push(ref(rtdb, 'repertoires')).key;
            createRepertoire(repId, name)
                .then(() => newRepertoireName.value = "")
                .catch(err => console.error(err));
        });
    }

    if (btnLiveToggle) {
        btnLiveToggle.addEventListener("click", () => {
            launchFullScreen(document.documentElement);
            if (liveState.active && liveState.director === currentUser) {
                toggleLiveState(false, "");
            } else {
                toggleLiveState(true, currentUser, currentSelectedSong ? currentSelectedSong.id : "");
            }
        });
    }

    if (btnJoinLive) {
        btnJoinLive.addEventListener("click", () => {
            launchFullScreen(document.documentElement);
            if (switchFollow) switchFollow.checked = true;
            if (liveState.currentSongId) {
                currentSelectedSong = globalSongs[liveState.currentSongId];
                renderVisorSong();
                highlightActiveLiveChord(liveState.currentSectionIndex, liveState.currentChordIndex);
            }
        });
    }

    if (btnFloatingExitLive) {
        btnFloatingExitLive.addEventListener("click", () => {
            if (switchFollow) switchFollow.checked = false;
            if (mainNav) mainNav.classList.remove("hidden");
            btnFloatingExitLive.classList.add("hidden");
            document.querySelectorAll(".chord-box").forEach(b => b.classList.remove("active-chord"));
            if (activeSectionIndicator) activeSectionIndicator.classList.add("hidden");
        });
    }
}

function renderSongsList(songsObj) {
    const listContainer = document.getElementById("songs-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";
    const filter = document.getElementById("search-song")?.value.toLowerCase() || "";
    
    Object.values(songsObj).forEach(song => {
        if (filter && !song.title.toLowerCase().includes(filter) && !song.author.toLowerCase().includes(filter)) return;
        
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
        const visorTrigger = document.querySelector('[data-target="section-visor"]');
        if (visorTrigger) visorTrigger.click();
    }));

    document.querySelectorAll(".btn-edit-song").forEach(b => b.addEventListener("click", (e) => {
        const song = globalSongs[e.target.dataset.id];
        if(!song) return;
        document.getElementById("form-song-id").value = song.id;
        document.getElementById("form-title").value = song.title;
        document.getElementById("form-author").value = song.author;
        document.getElementById("form-group").value = song.group || "";
        document.getElementById("form-key").value = song.key;
        document.getElementById("form-signature").value = song.timeSignature || "4/4";
        document.getElementById("form-bpm").value = song.bpm || 80;

        let rawTextBuffer = "";
        if (song.sections) {
            song.sections.forEach(sec => {
                rawTextBuffer += `:${sec.name} ` + sec.chords.map(c => 
                    c.replace("_major", "").replace("_minor", "m").replace("_7", "7")
                ).join(" ") + "\n";
            });
        }
        document.getElementById("form-raw-chords").value = rawTextBuffer.trim();
        const container = document.getElementById("song-form-container");
        if (container) container.classList.remove("hidden");
    }));

    document.querySelectorAll(".btn-delete-song").forEach(b => b.addEventListener("click", (e) => {
        if(confirm("¿Seguro que deseas eliminar esta canción?")) {
            deleteSong(e.target.dataset.id);
        }
    }));
}

function renderRepertoiresList(repObj) {
    const listContainer = document.getElementById("repertoires-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    Object.values(repObj).forEach(rep => {
        const card = document.createElement("div");
        card.classList.add("item-card");
        card.innerHTML = `
            <div class="item-info"><h4>📂 ${rep.name}</h4><p>Sincronizado en tiempo real</p></div>
            <div class="item-actions">
                <button class="btn btn-danger btn-sm btn-delete-rep" data-id="${rep.id}">Eliminar</button>
            </div>
        `;
        listContainer.appendChild(card);
    });

    document.querySelectorAll(".btn-delete-rep").forEach(b => b.addEventListener("click", (e) => {
        if(confirm("¿Eliminar este repertorio?")) {
            deleteRepertoire(e.target.dataset.id);
        }
    }));
}

function renderVisorSong() {
    if (!currentSelectedSong || !chordsGrid) return;
    
    document.getElementById("visor-title").textContent = currentSelectedSong.title;
    document.getElementById("visor-author-group").textContent = `${currentSelectedSong.author} ${currentSelectedSong.group ? '• ' + currentSelectedSong.group : ''}`;
    document.getElementById("visor-key").textContent = currentSelectedSong.key;
    document.getElementById("visor-signature").textContent = currentSelectedSong.timeSignature;
    document.getElementById("visor-bpm").textContent = currentSelectedSong.bpm;
    
    chordsGrid.innerHTML = "";
    const selectedInst = selectInstrument ? selectInstrument.value : "none";
    
    if (!currentSelectedSong.sections) return;

    currentSelectedSong.sections.forEach((section, sIdx) => {
        if (!section.chords) return;
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
            
            const displayChordName = chordKey.replace("_major", "").replace("_minor", "m").replace("_7", "7");
            const nameEl = document.createElement("div");
            nameEl.classList.add("chord-name");
            nameEl.textContent = displayChordName;
            box.appendChild(nameEl);
            
            if (selectedInst !== "none" && localChordsDB[chordKey]) {
                const chordData = localChordsDB[chordKey];
                
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
                    updateLiveNavigation(currentSelectedSong.id, currentUser, sIdx, cIdx);
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
            if (switchFollow && switchFollow.checked) {
                box.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            box.classList.remove("active-chord");
        }
    });
    
    if (currentSelectedSong?.sections?.[sIdx]) {
        if (activeSectionIndicator) activeSectionIndicator.classList.remove("hidden");
        if (currentActiveSectionName) currentActiveSectionName.textContent = currentSelectedSong.sections[sIdx].name;
    } else {
        if (activeSectionIndicator) activeSectionIndicator.classList.add("hidden");
    }
}

if (selectInstrument) {
    selectInstrument.addEventListener("change", renderVisorSong);
}
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const notesList = document.getElementById('notesList');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const searchInput = document.querySelector('.search-input');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const sortBtn = document.getElementById('sortBtn');
    const newNoteContainer = document.getElementById('newNoteContainer');
    const newNoteTitle = document.getElementById('newNoteTitle');
    const newNoteContent = document.getElementById('newNoteContent');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const cancelNoteBtn = document.getElementById('cancelNoteBtn');
    const editNoteContainer = document.getElementById('editNoteContainer');
    const editNoteTitle = document.getElementById('editNoteTitle');
    const editNoteContent = document.getElementById('editNoteContent');
    const saveEditNoteBtn = document.getElementById('saveEditNoteBtn');
    const cancelEditNoteBtn = document.getElementById('cancelEditNoteBtn');
    const toast = document.getElementById('toast');
    const themeOptions = document.querySelectorAll('.theme-option');
    
    // Image upload elements
    const imageUploadBtn = document.getElementById('imageUploadBtn');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const editImageUploadBtn = document.getElementById('editImageUploadBtn');
    const editImageInput = document.getElementById('editImageInput');
    const editImagePreview = document.getElementById('editImagePreview');
    const removeEditImageBtn = document.getElementById('removeEditImageBtn');
    
    // Voice note elements
    const voiceNoteBtn = document.getElementById('voiceNoteBtn');
    
    // App state
    let notes = JSON.parse(localStorage.getItem('notes')) || [];
    let noteCounter = notes.length > 0 ? Math.max(...notes.map(note => note.id)) + 1 : 1;
    let currentlyEditingId = null;
    let currentImageDataUrl = null;
    let currentEditImageDataUrl = null;
    let currentSortMethod = 'newest';
    let voiceRecognition = null;
    let isRecording = false;
    
    // Initialize the app
    initApp();
    
    function initApp() {
        renderNotes(notes);
        setupEventListeners();
        applyTheme(localStorage.getItem('theme') || 'light');
        setupVoiceRecognition();
    }
    
    function setupEventListeners() {
        // Add new note button
        addNoteBtn.addEventListener('click', openNewNoteEditor);
        
        // Save new note
        saveNoteBtn.addEventListener('click', saveNewNote);
        
        // Cancel new note
        cancelNoteBtn.addEventListener('click', closeNewNoteEditor);
        
        // Save edited note
        saveEditNoteBtn.addEventListener('click', saveEditedNote);
        
        // Cancel edited note
        cancelEditNoteBtn.addEventListener('click', closeEditNoteEditor);
        
        // Image upload for new note
        imageUploadBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);
        removeImageBtn.addEventListener('click', removeImage);
        
        // Image upload for edit note
        editImageUploadBtn.addEventListener('click', () => editImageInput.click());
        editImageInput.addEventListener('change', handleEditImageUpload);
        removeEditImageBtn.addEventListener('click', removeEditImage);
        
        // Voice note
        voiceNoteBtn.addEventListener('click', toggleVoiceRecording);
        
        // Search functionality
        searchInput.addEventListener('input', searchNotes);
        clearSearchBtn.addEventListener('click', clearSearch);
        
        // Sort functionality
        sortBtn.addEventListener('click', toggleSortMethod);
        
        // Theme selection
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.getAttribute('data-theme');
                applyTheme(theme);
                localStorage.setItem('theme', theme);
            });
        });
        
        // Format buttons
        document.querySelectorAll('.format-btn').forEach(button => {
            button.addEventListener('click', function() {
                const command = this.getAttribute('data-command');
                const value = this.getAttribute('data-value');
                document.execCommand(command, false, value || null);
                const activeEditor = newNoteContainer.classList.contains('active') ? newNoteContent : editNoteContent;
                activeEditor.focus();
            });
        });
        
        // Close editors when clicking outside
        document.addEventListener('click', (e) => {
            if (newNoteContainer.classList.contains('active') && 
                !newNoteContainer.contains(e.target) && 
                e.target !== addNoteBtn) {
                closeNewNoteEditor();
            }
            
            if (editNoteContainer.classList.contains('active') && 
                !editNoteContainer.contains(e.target)) {
                closeEditNoteEditor();
            }
        });
    }
    
    function openNewNoteEditor() {
        closeEditNoteEditor();
        newNoteContainer.classList.add('active');
        createOverlay();
        newNoteTitle.value = '';
        newNoteContent.innerHTML = '';
        currentImageDataUrl = null;
        imagePreview.style.display = 'none';
        removeImageBtn.style.display = 'none';
        imagePreview.src = '';
        imageInput.value = '';
        newNoteTitle.focus();
    }
    
    function closeNewNoteEditor() {
        newNoteContainer.classList.remove('active');
        removeOverlay();
        currentImageDataUrl = null;
        imageInput.value = '';
    }
    
    function openEditNoteEditor(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        
        currentlyEditingId = noteId;
        editNoteTitle.value = note.title;
        editNoteContent.innerHTML = note.content;
        
        // Handle image in edit mode
        currentEditImageDataUrl = note.image || null;
        if (note.image) {
            editImagePreview.src = note.image;
            editImagePreview.style.display = 'block';
            removeEditImageBtn.style.display = 'block';
        } else {
            editImagePreview.style.display = 'none';
            removeEditImageBtn.style.display = 'none';
        }
        editImageInput.value = '';
        
        // Hide new note container if open
        closeNewNoteEditor();
        
        // Show edit container
        editNoteContainer.classList.add('active');
        createOverlay();
        editNoteTitle.focus();
    }
    
    function closeEditNoteEditor() {
        editNoteContainer.classList.remove('active');
        removeOverlay();
        currentlyEditingId = null;
        currentEditImageDataUrl = undefined;
        editImageInput.value = '';
    }
    
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'overlay active';
        overlay.addEventListener('click', () => {
            closeNewNoteEditor();
            closeEditNoteEditor();
        });
        document.body.appendChild(overlay);
    }
    
    function removeOverlay() {
        const overlay = document.querySelector('.overlay');
        if (overlay) overlay.remove();
    }
    
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                currentImageDataUrl = event.target.result;
                imagePreview.src = currentImageDataUrl;
                imagePreview.style.display = 'block';
                removeImageBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
    
    function handleEditImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                currentEditImageDataUrl = event.target.result;
                editImagePreview.src = currentEditImageDataUrl;
                editImagePreview.style.display = 'block';
                removeEditImageBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }
    
    function removeImage() {
        currentImageDataUrl = null;
        imagePreview.style.display = 'none';
        removeImageBtn.style.display = 'none';
        imageInput.value = '';
    }
    
    function removeEditImage() {
        currentEditImageDataUrl = null;
        editImagePreview.style.display = 'none';
        removeEditImageBtn.style.display = 'none';
        editImageInput.value = '';
    }
    
    function saveNewNote() {
        const title = newNoteTitle.value.trim() || `Note ${notes.length + 1}`;
        const content = newNoteContent.innerHTML.trim() || '<p>Click to edit this note...</p>';
        
        const newNote = {
            id: noteCounter++,
            title: title,
            content: content,
            image: currentImageDataUrl,
            timestamp: new Date().toISOString(),
            lastEdited: new Date().toISOString()
        };
        
        notes.unshift(newNote);
        saveNotes();
        renderNotes(notes);
        closeNewNoteEditor();
        showToast('Note added successfully!');
    }
    
    function saveEditedNote() {
        if (!currentlyEditingId) return;
        
        const title = editNoteTitle.value.trim() || `Note ${notes.length + 1}`;
        const content = editNoteContent.innerHTML.trim() || '<p>Click to edit this note...</p>';
        
        const noteIndex = notes.findIndex(n => n.id === currentlyEditingId);
        if (noteIndex !== -1) {
            notes[noteIndex].title = title;
            notes[noteIndex].content = content;
            notes[noteIndex].lastEdited = new Date().toISOString();
            
            // Only update image if a new one was selected or removed
            if (currentEditImageDataUrl !== undefined) {
                notes[noteIndex].image = currentEditImageDataUrl;
            }
            
            saveNotes();
            renderNotes(notes);
            showToast('Note updated successfully!');
        }
        
        closeEditNoteEditor();
    }
    
    function deleteNote(noteId) {
        notes = notes.filter(note => note.id !== noteId);
        saveNotes();
        
        const noteElement = document.querySelector(`.note[data-id="${noteId}"]`);
        if (noteElement) {
            noteElement.classList.add('deleting');
            setTimeout(() => {
                renderNotes(notes);
                showToast('Note deleted');
            }, 300);
        }
        
        // If deleting the note being edited, hide the edit container
        if (currentlyEditingId === noteId) {
            closeEditNoteEditor();
        }
    }
    
    function searchNotes() {
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm.trim() === '') {
            renderNotes(notes);
            clearSearchBtn.style.display = 'none';
            return;
        }
        
        clearSearchBtn.style.display = 'block';
        
        const filteredNotes = notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) || 
            note.content.toLowerCase().includes(searchTerm)
        );
        
        renderNotes(filteredNotes);
    }
    
    function clearSearch() {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        renderNotes(notes);
    }
    
    function toggleSortMethod() {
        currentSortMethod = currentSortMethod === 'newest' ? 'oldest' : 'newest';
        sortBtn.innerHTML = `<i class="fas fa-sort"></i> ${currentSortMethod === 'newest' ? 'Newest First' : 'Oldest First'}`;
        sortNotes();
    }
    
    function sortNotes() {
        if (currentSortMethod === 'newest') {
            notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else {
            notes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        saveNotes();
        renderNotes(notes);
    }
    
    function renderNotes(notesToRender) {
        // Clear existing notes (except the containers)
        const existingNotes = notesList.querySelectorAll('.note');
        existingNotes.forEach(note => note.remove());
        
        if (notesToRender.length === 0) {
            const noNotesMsg = document.createElement('p');
            noNotesMsg.className = 'no-notes-message';
            noNotesMsg.textContent = searchInput.value.trim() ? 
                'No notes match your search.' : 
                'No notes found. Click the + button to add a new note.';
            notesList.appendChild(noNotesMsg);
            return;
        }
        
        notesToRender.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note';
            noteElement.setAttribute('data-id', note.id);
            
            let imageHtml = '';
            if (note.image) {
                imageHtml = `<img src="${note.image}" class="note-image" alt="Note image">`;
            }
            
            const date = new Date(note.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            // Truncate content for preview (remove HTML tags)
            const contentPreview = note.content.replace(/<[^>]*>/g, '').substring(0, 200);
            
            noteElement.innerHTML = `
                <div class="note-title">${note.title}</div>
                ${imageHtml}
                <div class="note-content">${contentPreview}</div>
                <div class="note-date">${formattedDate}</div>
                <button class="delete-note" data-id="${note.id}"><i class="fas fa-trash"></i></button>
            `;
            
            notesList.appendChild(noteElement);
            
            // Add click event to edit note
            noteElement.addEventListener('click', function(e) {
                if (!e.target.classList.contains('delete-note') && 
                    !e.target.classList.contains('fa-trash') &&
                    !e.target.classList.contains('note-image')) {
                    openEditNoteEditor(note.id);
                }
            });
            
            // Add delete button event
            const deleteBtn = noteElement.querySelector('.delete-note');
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this note?')) {
                    deleteNote(note.id);
                }
            });
            
            // Add swipe to delete functionality
            setupSwipeToDelete(noteElement, note.id);
        });
    }
    
    function setupSwipeToDelete(element, noteId) {
        let touchStartX = 0;
        let touchEndX = 0;
        let isSwiping = false;
        
        element.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
            element.classList.add('swiping');
        }, {passive: true});
        
        element.addEventListener('touchmove', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX;
            
            if (diff < 0 && Math.abs(diff) > 10) {
                isSwiping = true;
                element.style.transform = `translateX(${diff}px)`;
            }
        }, {passive: true});
        
        element.addEventListener('touchend', function() {
            element.classList.remove('swiping');
            
            if (isSwiping) {
                const diff = touchEndX - touchStartX;
                
                if (diff < -100) { // Swiped left enough to delete
                    if (confirm('Delete this note?')) {
                        deleteNote(noteId);
                    } else {
                        element.style.transform = '';
                    }
                } else {
                    element.style.transform = '';
                }
            }
            
            isSwiping = false;
            touchStartX = 0;
            touchEndX = 0;
        }, {passive: true});
    }
    
    function setupVoiceRecognition() {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                voiceRecognition = new SpeechRecognition();
                voiceRecognition.continuous = true;
                voiceRecognition.interimResults = true;
                voiceRecognition.lang = 'en-US';
                
                voiceRecognition.onresult = function(event) {
                    const activeEditor = newNoteContainer.classList.contains('active') ? newNoteContent : editNoteContent;
                    let transcript = '';
                    
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            transcript += event.results[i][0].transcript;
                        }
                    }
                    
                    if (transcript) {
                        const currentContent = activeEditor.innerHTML;
                        activeEditor.innerHTML = currentContent + (currentContent ? ' ' : '') + transcript;
                    }
                };
                
                voiceRecognition.onerror = function(event) {
                    console.error('Speech recognition error', event.error);
                    showToast('Voice recognition error: ' + event.error);
                    stopVoiceRecording();
                };
            } else {
                voiceNoteBtn.style.display = 'none';
            }
        } catch (e) {
            console.error('Speech recognition not supported', e);
            voiceNoteBtn.style.display = 'none';
        }
    }
    
    function toggleVoiceRecording() {
        if (!voiceRecognition) {
            showToast('Voice recognition not supported in your browser');
            return;
        }
        
        if (isRecording) {
            stopVoiceRecording();
        } else {
            startVoiceRecording();
        }
    }
    
    function startVoiceRecording() {
        try {
            voiceRecognition.start();
            isRecording = true;
            voiceNoteBtn.innerHTML = '<i class="fas fa-microphone-slash"></i> Stop Recording';
            voiceNoteBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
            
            // Add recording indicator
            const activeEditor = newNoteContainer.classList.contains('active') ? newNoteContent : editNoteContent;
            const recordingIndicator = document.createElement('div');
            recordingIndicator.className = 'voice-recording';
            recordingIndicator.innerHTML = `
                <div class="recording-dot"></div>
                <span>Recording...</span>
            `;
            activeEditor.parentNode.insertBefore(recordingIndicator, activeEditor.nextSibling);
            
            showToast('Voice recording started');
        } catch (e) {
            console.error('Error starting voice recognition', e);
            showToast('Error starting voice recording');
        }
    }
    
    function stopVoiceRecording() {
        if (voiceRecognition && isRecording) {
            voiceRecognition.stop();
            isRecording = false;
            voiceNoteBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice Note';
            voiceNoteBtn.style.backgroundColor = '';
            
            // Remove recording indicator
            const recordingIndicator = document.querySelector('.voice-recording');
            if (recordingIndicator) recordingIndicator.remove();
            
            showToast('Voice recording stopped');
        }
    }
    
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
    
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    function saveNotes() {
        localStorage.setItem('notes', JSON.stringify(notes));
    }
});
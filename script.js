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
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeOptionsContainer = document.getElementById('themeOptionsContainer');
    
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
    let isSaving = false; // Flag to prevent multiple saves
    
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
        addNoteBtn.addEventListener('touchend', handleTouchEvent(openNewNoteEditor));
        
        // Save buttons with enhanced mobile handling
        saveNoteBtn.addEventListener('click', handleSaveNote);
        saveNoteBtn.addEventListener('touchend', handleTouchEvent(handleSaveNote));
        
        saveEditNoteBtn.addEventListener('click', handleSaveEditNote);
        saveEditNoteBtn.addEventListener('touchend', handleTouchEvent(handleSaveEditNote));
        
        // Cancel buttons
        cancelNoteBtn.addEventListener('click', closeNewNoteEditor);
        cancelNoteBtn.addEventListener('touchend', handleTouchEvent(closeNewNoteEditor));
        
        cancelEditNoteBtn.addEventListener('click', closeEditNoteEditor);
        cancelEditNoteBtn.addEventListener('touchend', handleTouchEvent(closeEditNoteEditor));
        
        // Image upload for new note
        imageUploadBtn.addEventListener('click', () => imageInput.click());
        imageUploadBtn.addEventListener('touchend', handleTouchEvent(() => imageInput.click()));
        imageInput.addEventListener('change', handleImageUpload);
        removeImageBtn.addEventListener('click', removeImage);
        removeImageBtn.addEventListener('touchend', handleTouchEvent(removeImage));
        
        // Image upload for edit note
        editImageUploadBtn.addEventListener('click', () => editImageInput.click());
        editImageUploadBtn.addEventListener('touchend', handleTouchEvent(() => editImageInput.click()));
        editImageInput.addEventListener('change', handleEditImageUpload);
        removeEditImageBtn.addEventListener('click', removeEditImage);
        removeEditImageBtn.addEventListener('touchend', handleTouchEvent(removeEditImage));
        
        // Voice note functionality
        voiceNoteBtn.addEventListener('click', toggleVoiceRecording);
        voiceNoteBtn.addEventListener('touchend', handleTouchEvent(toggleVoiceRecording));
        
        // Search functionality
        searchInput.addEventListener('input', searchNotes);
        clearSearchBtn.addEventListener('click', clearSearch);
        clearSearchBtn.addEventListener('touchend', handleTouchEvent(clearSearch));
        
        // Sort functionality
        sortBtn.addEventListener('click', toggleSortMethod);
        sortBtn.addEventListener('touchend', handleTouchEvent(toggleSortMethod));
        
        // Theme toggle
        themeToggleBtn.addEventListener('click', toggleThemeOptions);
        themeToggleBtn.addEventListener('touchend', handleTouchEvent(toggleThemeOptions));
        
        // Format buttons
        document.querySelectorAll('.format-btn').forEach(button => {
            button.addEventListener('click', handleFormatButton);
            button.addEventListener('touchend', handleTouchEvent(handleFormatButton));
        });
    }
    
    // Special touch event handler for mobile devices
    function handleTouchEvent(handler) {
        return function(e) {
            e.preventDefault();
            e.stopPropagation();
            handler(e);
        };
    }
    
    function toggleThemeOptions(e) {
        if (e) e.preventDefault();
        themeOptionsContainer.classList.toggle('show');
    }
    
    function handleFormatButton(e) {
        if (e) e.preventDefault();
        const command = this.getAttribute('data-command');
        const value = this.getAttribute('data-value');
        document.execCommand(command, false, value || null);
        const activeEditor = newNoteContainer.classList.contains('active') ? newNoteContent : editNoteContent;
        activeEditor.focus();
    }
    
    function handleSaveNote(e) {
        if (e) e.preventDefault();
        if (isSaving) return;
        isSaving = true;
        
        try {
            saveNewNote();
        } catch (error) {
            console.error('Save error:', error);
            showToast('Error saving note');
        } finally {
            setTimeout(() => {
                isSaving = false;
            }, 1000);
        }
    }
    
    function handleSaveEditNote(e) {
        if (e) e.preventDefault();
        if (isSaving) return;
        isSaving = true;
        
        try {
            saveEditedNote();
        } catch (error) {
            console.error('Save error:', error);
            showToast('Error saving changes');
        } finally {
            setTimeout(() => {
                isSaving = false;
            }, 1000);
        }
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
                console.warn('Speech recognition not supported in this browser');
            }
        } catch (e) {
            console.error('Speech recognition initialization error', e);
            voiceNoteBtn.style.display = 'none';
        }
    }
    
    function toggleVoiceRecording(e) {
        if (e) e.preventDefault();
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
    
    function openNewNoteEditor(e) {
        if (e) e.preventDefault();
        closeEditNoteEditor();
        newNoteContainer.classList.add('active');
        createOverlay();
        newNoteTitle.value = '';
        newNoteContent.innerHTML = '<p></p>';
        currentImageDataUrl = null;
        imagePreview.style.display = 'none';
        removeImageBtn.style.display = 'none';
        imagePreview.src = '';
        imageInput.value = '';
        
        // Improved mobile focus handling
        setTimeout(() => {
            newNoteTitle.focus();
            window.scrollTo(0, 0);
        }, 100);
    }
    
    function closeNewNoteEditor(e) {
        if (e) e.preventDefault();
        newNoteContainer.classList.remove('active');
        removeOverlay();
        currentImageDataUrl = null;
        imageInput.value = '';
    }
    
    function openEditNoteEditor(noteId, e) {
        if (e) e.preventDefault();
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        
        currentlyEditingId = noteId;
        editNoteTitle.value = note.title;
        editNoteContent.innerHTML = note.content || '<p></p>';
        
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
        
        // Improved mobile focus handling
        setTimeout(() => {
            editNoteTitle.focus();
            window.scrollTo(0, 0);
        }, 100);
    }
    
    function closeEditNoteEditor(e) {
        if (e) e.preventDefault();
        editNoteContainer.classList.remove('active');
        removeOverlay();
        currentlyEditingId = null;
        currentEditImageDataUrl = undefined;
        editImageInput.value = '';
    }
    
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'overlay active';
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            closeNewNoteEditor();
            closeEditNoteEditor();
        });
        overlay.addEventListener('touchend', (e) => {
            e.preventDefault();
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
    
    function removeImage(e) {
        if (e) e.preventDefault();
        currentImageDataUrl = null;
        imagePreview.style.display = 'none';
        removeImageBtn.style.display = 'none';
        imageInput.value = '';
    }
    
    function removeEditImage(e) {
        if (e) e.preventDefault();
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
    
    function deleteNote(noteId, e) {
        if (e) e.preventDefault();
        if (confirm('Are you sure you want to delete this note?')) {
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
            (note.content && note.content.toLowerCase().includes(searchTerm))
        );
        
        renderNotes(filteredNotes);
    }
    
    function clearSearch(e) {
        if (e) e.preventDefault();
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        renderNotes(notes);
    }
    
    function toggleSortMethod(e) {
        if (e) e.preventDefault();
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
            const contentPreview = note.content 
                ? note.content.replace(/<[^>]*>/g, ' ').substring(0, 200) 
                : '';
            
            noteElement.innerHTML = `
                <div class="note-title">${note.title}</div>
                ${imageHtml}
                <div class="note-content">${contentPreview}</div>
                <div class="note-date">${formattedDate}</div>
                <button class="delete-note" data-id="${note.id}"><i class="fas fa-trash"></i></button>
            `;
            
            notesList.appendChild(noteElement);
            
            // Add click event to edit note - improved for mobile
            noteElement.addEventListener('click', function(e) {
                handleNoteClick(e, note.id);
            });
            noteElement.addEventListener('touchend', function(e) {
                handleNoteClick(e, note.id);
            });
            
            // Add delete button event
            const deleteBtn = noteElement.querySelector('.delete-note');
            deleteBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                deleteNote(note.id, e);
            });
            deleteBtn.addEventListener('touchend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                deleteNote(note.id, e);
            });
        });
    }
    
    function handleNoteClick(e, noteId) {
        // Only open editor if clicking on the note content, not delete button or image
        const isDeleteBtn = e.target.classList.contains('delete-note') || 
                          e.target.classList.contains('fa-trash') ||
                          e.target.closest('.delete-note');
        const isImage = e.target.classList.contains('note-image');
        
        if (!isDeleteBtn && !isImage) {
            e.preventDefault();
            openEditNoteEditor(noteId, e);
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

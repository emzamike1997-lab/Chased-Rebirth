// ===================================
// CHASED MESSAGING SYSTEM (ENHANCED)
// ===================================

let currentSubscription = null;
let activeConversationId = null;
let activeReplyId = null;
let activeParticipants = {};

// Calling Variables
let peer = null;
let currentCall = null;
let localStream = null;
let callTimerInterval = null;
let callStartTime = null;

// Dynamically Load PeerJS
(function loadPeerJS() {
    if (document.getElementById('peerjs-script')) return;
    const script = document.createElement('script');
    script.id = 'peerjs-script';
    script.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    script.onload = () => { console.log("PeerJS loaded."); initPeer(); };
    document.head.appendChild(script);
})();

// 1. Open Messages Dashboard
async function openMessagesDashboard() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Please login to view messages.");
        return;
    }

    if (!peer) initPeer();

    let msgModal = document.getElementById('messages-modal');
    if (!msgModal) {
        createMessagesModal();
        msgModal = document.getElementById('messages-modal');
    }

    const convList = document.getElementById('conversation-list');
    convList.innerHTML = '<p class="loading-text">Loading chats...</p>';
    msgModal.classList.add('active');

    try {
        const { data: conversations, error } = await supabaseClient
            .from('conversations')
            .select('*')
            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        renderConversationList(conversations, user.id);
    } catch (err) {
        console.error("Error loading chats:", err);
        convList.innerHTML = '<p class="error-text">Failed to load messages.</p>';
    }
}

// 2. Render Conversation List
async function renderConversationList(conversations, currentUserId) {
    const list = document.getElementById('conversation-list');
    list.innerHTML = '';

    if (!conversations || conversations.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">No messages yet.</p>';
        return;
    }

    conversations.forEach(conv => {
        const isBuyer = conv.buyer_id === currentUserId;
        let displayName = isBuyer ? conv.seller_name : conv.buyer_name;
        if (!displayName || displayName === 'Buyer' || displayName === 'Seller') {
            displayName = isBuyer ? "Seller" : "Buyer";
        }

        const itemHTML = `
            <div class="conversation-item" onclick="openChat('${conv.id}', '${conv.item_title || 'Item Inquiry'}')">
                <div class="conv-avatar"><i class="fas fa-user"></i></div>
                <div class="conv-details">
                    <h4>${displayName}</h4>
                    <p>${conv.item_title || 'Item Inquiry'}</p>
                </div>
                <div class="conv-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// 3. Theme Logic
function toggleTheme() {
    const modal = document.getElementById('messages-modal');
    if (!modal) return;
    const isLight = modal.classList.contains('light-theme');
    if (isLight) {
        modal.classList.remove('light-theme');
        localStorage.setItem('chased_msg_theme', 'dark');
    } else {
        modal.classList.add('light-theme');
        localStorage.setItem('chased_msg_theme', 'light');
    }
    updateToggleIcon();
}

function applyTheme() {
    const modal = document.getElementById('messages-modal');
    if (!modal) return;
    const saved = localStorage.getItem('chased_msg_theme') || 'dark';
    if (saved === 'dark') {
        modal.classList.remove('light-theme');
    } else {
        modal.classList.add('light-theme');
    }
    updateToggleIcon();
}

function updateToggleIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    const btn2 = document.getElementById('theme-toggle-btn-chat');
    const modal = document.getElementById('messages-modal');
    if (!modal) return;
    const isLight = modal.classList.contains('light-theme');
    const iconClass = isLight ? 'fa-moon' : 'fa-sun';
    if (btn) btn.innerHTML = `<i class="fas ${iconClass}"></i>`;
    if (btn2) btn2.innerHTML = `<i class="fas ${iconClass}"></i>`;
}

// 4. Chat Management
async function startChat(sellerId, itemId, itemTitle, sellerName) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Please login to message.");
        return;
    }
    if (user.id === sellerId) {
        alert("You cannot message yourself!");
        return;
    }

    const { data: existing } = await supabaseClient
        .from('conversations')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .eq('item_id', itemId)
        .single();

    if (existing) {
        openMessagesDashboard();
        setTimeout(() => openChat(existing.id, itemTitle), 500);
    } else {
        const buyerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Buyer';
        const { data: newConv, error } = await supabaseClient
            .from('conversations')
            .insert({
                buyer_id: user.id,
                seller_id: sellerId,
                item_id: itemId,
                item_title: itemTitle,
                buyer_name: buyerName,
                seller_name: sellerName || 'Seller'
            })
            .select().single();

        if (error) {
            alert("Failed to start chat.");
            return;
        }
        openMessagesDashboard();
        setTimeout(() => openChat(newConv.id, itemTitle), 500);
    }
}

async function openChat(conversationId, title) {
    activeConversationId = conversationId;
    activeReplyId = null;
    hideReplyUI();

    document.getElementById('conversations-view').style.display = 'none';
    document.getElementById('chat-view').style.display = 'flex';
    document.getElementById('messages-modal').classList.add('chat-active');

    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '<p class="loading-text">Loading...</p>';

    const { data: convData } = await supabaseClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

    const { data: { user } } = await supabaseClient.auth.getUser();

    // Participant Names
    let otherName = (user.id === convData.buyer_id) ? convData.seller_name : convData.buyer_name;
    activeParticipants = {
        [convData.buyer_id]: convData.buyer_name || "Buyer",
        [convData.seller_id]: convData.seller_name || "Seller"
    };

    document.getElementById('chat-title').innerHTML = `
        <div style="display:flex; flex-direction:column;">
            <span style="font-size: 1.1rem; font-weight: 600;">${otherName || 'User'}</span>
            <span id="chat-subtitle" style="font-size: 0.75rem; color: var(--msg-text-sec); font-weight: normal;">${convData.item_title || 'Item Inquiry'}</span>
        </div>
    `;

    // Store target for calling
    const otherId = (user.id === convData.buyer_id) ? convData.seller_id : convData.buyer_id;
    document.getElementById('call-btn-header').onclick = () => startCall(otherId, otherName);

    const { data: messages } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    renderMessages(messages, user.id, convData.buyer_id, convData.seller_id);
    subscribeToMessages(conversationId, user.id, convData.buyer_id, convData.seller_id);
    markAsRead(conversationId, user.id);
    scrollToBottom();
}

async function markAsRead(conversationId, currentUserId) {
    await supabaseClient
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .eq('is_read', false);
}

function renderMessages(messages, currentUserId, buyerId, sellerId) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    messages.forEach(msg => {
        const isMe = msg.sender_id === currentUserId;
        const isSenderBuyer = msg.sender_id === buyerId;
        const alignClass = isMe ? 'message-align-right' : 'message-align-left';
        const styleClass = isSenderBuyer ? 'message-style-buyer' : 'message-style-seller';

        let replyHTML = '';
        if (msg.reply_to_id) {
            const quoted = messages.find(m => m.id === msg.reply_to_id);
            if (quoted) replyHTML = `<div class="message-quote">${quoted.content}</div>`;
        }

        let statusIcon = isMe ? (msg.is_read ? '<i class="fas fa-box-open"></i>' : '<i class="fas fa-shopping-bag"></i>') : '';
        let nameDisplay = isMe ? "Me" : (activeParticipants[msg.sender_id] || (isSenderBuyer ? "Buyer" : "Seller"));
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let contentHTML = `<div class="message-content-text">${msg.content}</div>`;

        // Render Voice Player if metadata exists
        if (msg.voice_metadata && msg.voice_metadata.is_voice) {
            const duration = msg.voice_metadata.duration || "0:00";
            contentHTML = `
                <div class="voice-player">
                    <div class="voice-avatar-container">
                        <div class="voice-avatar"><i class="fas fa-user"></i></div>
                        <i class="fas fa-microphone voice-mic-badge"></i>
                    </div>
                    <button class="voice-play-btn" onclick="playVoiceMessage('${msg.id}')">
                        <i class="fas fa-play" id="play-icon-${msg.id}"></i>
                    </button>
                    <div class="voice-info">
                        <div class="voice-wave-visual">
                            <span></span><span></span><span></span><span></span><span></span>
                            <span></span><span></span><span></span><span></span><span></span>
                            <span></span><span></span><span></span><span></span><span></span>
                            <span></span><span></span><span></span><span></span><span></span>
                            <span></span><span></span><span></span><span></span><span></span>
                        </div>
                        <span class="voice-duration">${duration}</span>
                    </div>
                </div>
                <audio id="audio-${msg.id}" src="${msg.content.startsWith('data:audio') ? msg.content : ''}" style="display:none;"></audio>
            `;
        }

        // Reactions
        let reactionsHTML = '';
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
            reactionsHTML = '<div class="message-reactions">';
            for (const [emoji, users] of Object.entries(msg.reactions)) {
                if (users.length > 0) {
                    const hasReacted = users.includes(currentUserId);
                    reactionsHTML += `
                        <span class="reaction-tag ${hasReacted ? 'active' : ''}" onclick="toggleReaction('${msg.id}', '${emoji}')">
                            ${emoji} <span class="reaction-count">${users.length}</span>
                        </span>
                    `;
                }
            }
            reactionsHTML += '</div>';
        }

        const messageHTML = `
            <div class="message-wrapper ${alignClass}">
                <div class="message-sender-name">${nameDisplay}</div>
                <div class="message ${styleClass}" id="msg-${msg.id}">
                    <div class="message-bubble" onclick="triggerReply('${msg.id}', '${escapeHtml(msg.content)}')">
                        ${replyHTML}
                        <div class="message-content">
                            ${contentHTML}
                            <div class="message-meta">
                                <span class="message-time">${time}</span>
                                <span class="message-status">${statusIcon}</span>
                            </div>
                        </div>
                        ${reactionsHTML}
                        <button class="reaction-btn" onclick="showReactionPicker(event, '${msg.id}')">
                            <i class="far fa-smile"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', messageHTML);
    });
}

function playVoiceMessage(msgId) {
    const audio = document.getElementById(`audio-${msgId}`);
    const icon = document.getElementById(`play-icon-${msgId}`);
    if (!audio || !audio.src) {
        alert("This voice note is a placeholder and cannot be played.");
        return;
    }
    if (audio.paused) {
        audio.play();
        icon.classList.replace('fa-play', 'fa-pause');
        audio.onended = () => icon.classList.replace('fa-pause', 'fa-play');
    } else {
        audio.pause();
        icon.classList.replace('fa-pause', 'fa-play');
    }
}

function subscribeToMessages(conversationId, currentUserId, buyerId, sellerId) {
    if (currentSubscription) supabaseClient.removeChannel(currentSubscription);
    currentSubscription = supabaseClient
        .channel(`chat:${conversationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            async (payload) => {
                const { data: messages } = await supabaseClient
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: true });
                if (messages) renderMessages(messages, currentUserId, buyerId, sellerId);
                scrollToBottom();
                if (payload.new && payload.new.sender_id !== currentUserId) markAsRead(conversationId, currentUserId);
            }).subscribe();
}

async function sendMessage(contentOverride = null, voiceMetadata = null) {
    const input = document.getElementById('chat-input');
    const content = (contentOverride || input.value).trim();
    if (!content || !activeConversationId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    input.value = '';
    const replyId = activeReplyId;
    activeReplyId = null;
    hideReplyUI();

    const { error } = await supabaseClient.from('messages').insert({
        conversation_id: activeConversationId,
        sender_id: user.id,
        content: content,
        reply_to_id: replyId,
        voice_metadata: voiceMetadata || {}
    });

    if (error) {
        alert("Failed to send.");
        input.value = content;
    } else {
        await supabaseClient.from('conversations').update({ updated_at: new Date() }).eq('id', activeConversationId);
    }
}

// 5. Voice & File Extras
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordingStartTime;
let timerInterval;

async function toggleRecording() {
    const btn = document.getElementById('voice-rec-btn');
    const recordingStatus = document.getElementById('recording-status');
    const timerDisplay = document.getElementById('recording-timer');

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    const durationInSeconds = Math.round((Date.now() - recordingStartTime) / 1000);
                    const minutes = Math.floor(durationInSeconds / 60);
                    const seconds = durationInSeconds % 60;
                    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                    sendMessage(base64Audio, { is_voice: true, duration: durationStr });
                };
                stream.getTracks().forEach(t => t.stop());
            };

            recordingStartTime = Date.now();
            mediaRecorder.start();
            isRecording = true;
            btn.classList.add('recording');
            recordingStatus.style.display = 'flex';

            timerInterval = setInterval(() => {
                const elapsed = Math.round((Date.now() - recordingStartTime) / 1000);
                const m = Math.floor(elapsed / 60);
                const s = elapsed % 60;
                timerDisplay.textContent = `${m}:${s.toString().padStart(2, '0')}`;
            }, 1000);

        } catch (err) {
            alert("Mic access denied.");
        }
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        clearInterval(timerInterval);
        btn.classList.remove('recording');
        recordingStatus.style.display = 'none';
        timerDisplay.textContent = '0:00';
    }
    input.placeholder = "Type a message...";
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert("Images only."); return; }
    sendMessage(`📷 Sent an image: ${file.name}`);
    event.target.value = '';
}

// 6. Calling Implementation
async function initPeer() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || peer) return;

    peer = new Peer(user.id, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 1
    });

    peer.on('open', (id) => console.log('Peer connected with ID:', id));
    peer.on('call', async (incomingCall) => {
        const accept = confirm("Incoming voice call! Accept?");
        if (accept) {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                incomingCall.answer(localStream);
                showCallOverlay("In Call...");
                handleCallConnection(incomingCall);
            } catch (err) {
                alert("Could not access microphone.");
                incomingCall.close();
            }
        } else {
            incomingCall.close();
        }
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'peer-unavailable') {
            // Silently handle offline/unavailable state to keep "Reaching..." UI active
            console.log("Peer unavailable. Maintaining 'Reaching...' state.");
        }
    });
}

async function startCall(otherId, name) {
    if (!peer) await initPeer();

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        showCallOverlay(`Reaching ${name}...`);

        // Timer to switch to "Ringing" if no error occurs quickly
        setTimeout(() => {
            const statusElem = document.getElementById('call-status-text');
            if (statusElem && statusElem.textContent.startsWith('Reaching') && !currentCall?.open) {
                statusElem.textContent = `Ringing ${name}...`;
            }
        }, 3000);

        currentCall = peer.call(otherId, localStream);
        handleCallConnection(currentCall);
    } catch (err) {
        alert("Microphone access is required for calls.");
    }
}

function handleCallConnection(call) {
    currentCall = call;

    call.on('stream', (remoteStream) => {
        // Create audio element for remote stream
        let remoteAudio = document.getElementById('remote-call-audio');
        if (!remoteAudio) {
            remoteAudio = document.createElement('audio');
            remoteAudio.id = 'remote-call-audio';
            remoteAudio.autoplay = true;
            remoteAudio.style.display = 'none';
            document.body.appendChild(remoteAudio);
        }

        remoteAudio.srcObject = remoteStream;

        // Ensure audio plays (handle autoplay restrictions)
        remoteAudio.play().catch(err => {
            console.error('Error playing remote audio:', err);
            // Try playing again after user interaction
            setTimeout(() => remoteAudio.play().catch(e => console.error('Retry failed:', e)), 500);
        });

        document.getElementById('call-status-text').textContent = "Connected";
        startCallTimer();
    });

    call.on('close', () => endCall());
    call.on('error', () => endCall());
}

function showCallOverlay(status) {
    const overlay = document.getElementById('call-overlay');
    overlay.style.display = 'flex';
    document.getElementById('call-status-text').textContent = status;
}

function startCallTimer() {
    callStartTime = Date.now();
    const timerElem = document.getElementById('call-duration-timer');
    timerElem.style.display = 'block';

    callTimerInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - callStartTime) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        timerElem.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

function endCall() {
    // If we hang up BEFORE connecting (no callStartTime), send a missed call notification
    if (!callStartTime && activeConversationId) {
        sendMessage("📞 Missed Call");
    }

    if (currentCall) currentCall.close();
    if (localStream) localStream.getTracks().forEach(t => t.stop());

    // Clean up remote audio element
    const remoteAudio = document.getElementById('remote-call-audio');
    if (remoteAudio) {
        if (remoteAudio.srcObject) {
            remoteAudio.srcObject.getTracks().forEach(t => t.stop());
        }
        remoteAudio.srcObject = null;
        remoteAudio.remove();
    }

    clearInterval(callTimerInterval);
    const overlay = document.getElementById('call-overlay');
    if (overlay) overlay.style.display = 'none';
    const timerElem = document.getElementById('call-duration-timer');
    if (timerElem) timerElem.textContent = "0:00";

    currentCall = null;
    localStream = null;
    callStartTime = null;
}

// 7. Emoji & Reactions
let activeReactionMessageId = null;

function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    picker.style.display = picker.style.display === 'block' ? 'none' : 'block';
}

function insertEmoji(emoji) {
    const input = document.getElementById('chat-input');
    input.value += emoji;
    input.focus();
    toggleEmojiPicker();
}

function showReactionPicker(event, msgId) {
    event.stopPropagation();
    activeReactionMessageId = msgId;
    const picker = document.getElementById('reaction-picker');
    const rect = event.currentTarget.getBoundingClientRect();

    picker.style.display = 'flex';
    picker.style.top = `${rect.top - 45}px`;
    picker.style.left = `${rect.left}px`;

    // Close on click anywhere else
    const closePicker = () => {
        picker.style.display = 'none';
        document.removeEventListener('click', closePicker);
    };
    setTimeout(() => document.addEventListener('click', closePicker), 10);
}

async function handleReactionSelect(emoji) {
    if (activeReactionMessageId) {
        await toggleReaction(activeReactionMessageId, emoji);
    }
}

async function toggleReaction(msgId, emoji) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Fetch current reactions
    const { data: msg } = await supabaseClient
        .from('messages')
        .select('reactions')
        .eq('id', msgId)
        .single();

    let reactions = msg.reactions || {};
    if (!reactions[emoji]) reactions[emoji] = [];

    if (reactions[emoji].includes(user.id)) {
        // Remove reaction
        reactions[emoji] = reactions[emoji].filter(id => id !== user.id);
    } else {
        // Add reaction
        reactions[emoji].push(user.id);
    }

    // Clean up empty emoji arrays
    if (reactions[emoji].length === 0) delete reactions[emoji];

    await supabaseClient
        .from('messages')
        .update({ reactions })
        .eq('id', msgId);
}

// 8. Helpers
function triggerReply(msgId, content) {
    activeReplyId = msgId;
    const rb = document.getElementById('reply-bar');
    rb.style.display = 'flex';
    document.getElementById('reply-text').textContent = `Replying to: "${content.substring(0, 30)}..."`;
    document.getElementById('chat-input').focus();
}
function hideReplyUI() { activeReplyId = null; document.getElementById('reply-bar').style.display = 'none'; }
function escapeHtml(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function scrollToBottom() { const c = document.getElementById('chat-messages'); c.scrollTop = c.scrollHeight; }
function backToConversations() {
    document.getElementById('chat-view').style.display = 'none';
    document.getElementById('conversations-view').style.display = 'block';
    document.getElementById('messages-modal').classList.remove('chat-active');
    activeConversationId = null;
    if (currentSubscription) supabaseClient.removeChannel(currentSubscription);
    openMessagesDashboard();
}

// 7. UI Builder
function createMessagesModal() {
    const html = `
    <div class="modal" id="messages-modal">
        <div class="modal-content messages-modal-content">
            <div id="conversations-view" style="display:block; height: 100%;">
                <div class="modal-header">
                    <h2 class="modal-title">Messages</h2>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <button class="icon-btn theme-toggle" id="theme-toggle-btn" onclick="toggleTheme()"><i class="fas fa-moon"></i></button>
                        <button class="modal-close" onclick="document.getElementById('messages-modal').classList.remove('active')">&times;</button>
                    </div>
                </div>
                <div id="conversation-list" class="conversation-list"></div>
            </div>
            <div id="chat-view" style="display:none; flex-direction: column; height: 100%;">
                <div class="modal-header chat-header">
                    <div style="display:flex; align-items:center;">
                        <button class="btn-icon back-btn" onclick="backToConversations()"><i class="fas fa-arrow-left"></i></button>
                        <div class="conv-avatar small-avatar"><i class="fas fa-user"></i></div>
                        <h3 id="chat-title">Chat</h3>
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                         <button class="icon-btn" id="call-btn-header" title="Start Voice Call"><i class="fas fa-phone"></i></button>
                         <button class="icon-btn theme-toggle" id="theme-toggle-btn-chat" onclick="toggleTheme()"><i class="fas fa-moon"></i></button>
                         <button class="modal-close" onclick="document.getElementById('messages-modal').classList.remove('active')">&times;</button>
                    </div>
                </div>
                <div id="chat-messages" class="chat-messages"></div>
                <div class="chat-input-area">
                    <button class="btn-icon emoji-btn" onclick="toggleEmojiPicker()"><i class="far fa-smile"></i></button>
                    <button class="btn-icon attach-btn" id="attach-btn" onclick="document.getElementById('file-input').click()"><i class="fas fa-plus"></i></button>
                    <input type="file" id="file-input" style="display:none" accept="image/*" onchange="handleFileSelect(event)">
                    
                    <div class="input-container" style="flex: 1; position: relative; background: var(--msg-input-field); border-radius: 20px; border: 1px solid var(--msg-border); overflow: hidden; display: flex; flex-direction: column;">
                        <div id="reply-bar" class="reply-bar" style="border-bottom: 1px solid var(--msg-border);">
                            <div class="reply-content">
                                <span id="reply-text" style="font-size: 0.75rem; opacity: 0.8;">Replying...</span>
                            </div>
                            <button class="close-reply" onclick="hideReplyUI()" style="background:none; border:none; color:#fff; cursor:pointer;">&times;</button>
                        </div>
                        <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off" style="width: 100%; border: none; background: transparent; padding: 10px 15px; outline: none; color: var(--msg-input-text);">
                        
                        <div id="recording-status" style="position: absolute; inset: 0; background: var(--msg-input-field); display: none; align-items: center; padding: 0 15px; gap: 10px; z-index: 5;">
                            <div id="recording-timer" style="color: #ff4b2b; font-weight: bold; font-family: monospace;">0:00</div>
                            <div id="recording-waves" class="voice-waves" style="flex: 1;">
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>

                    <button class="voice-rec-btn" id="voice-rec-btn" onclick="toggleRecording()"><i class="fas fa-microphone"></i></button>
                    <button class="send-btn" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
                
                <div id="emoji-picker" class="emoji-picker">
                    <div class="emoji-list">
                        <span onclick="insertEmoji('😀')">😀</span><span onclick="insertEmoji('😂')">😂</span><span onclick="insertEmoji('😍')">😍</span>
                        <span onclick="insertEmoji('😎')">😎</span><span onclick="insertEmoji('🤔')">🤔</span><span onclick="insertEmoji('😊')">😊</span>
                        <span onclick="insertEmoji('🔥')">🔥</span><span onclick="insertEmoji('✨')">✨</span><span onclick="insertEmoji('💯')">💯</span>
                        <span onclick="insertEmoji('👍')">👍</span><span onclick="insertEmoji('❤️')">❤️</span><span onclick="insertEmoji('🙌')">🙌</span>
                        <span onclick="insertEmoji('😂')">😂</span><span onclick="insertEmoji('😢')">😢</span><span onclick="insertEmoji('😮')">😮</span>
                        <span onclick="insertEmoji('👏')">👏</span><span onclick="insertEmoji('🎉')">🎉</span><span onclick="insertEmoji('🚀')">🚀</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Global Reaction Picker -->
        <div id="reaction-picker" class="reaction-picker">
            <span onclick="handleReactionSelect('❤️')">❤️</span>
            <span onclick="handleReactionSelect('👍')">👍</span>
            <span onclick="handleReactionSelect('😂')">😂</span>
            <span onclick="handleReactionSelect('😮')">😮</span>
            <span onclick="handleReactionSelect('😢')">😢</span>
            <span onclick="handleReactionSelect('🔥')">🔥</span>
        </div>
        
        <!-- Call Overlay -->
        <div id="call-overlay" class="call-overlay">
            <div class="call-content">
                <div class="call-avatar-large"><i class="fas fa-user"></i></div>
                <h2 id="call-status-text">Calling...</h2>
                <div id="call-duration-timer" class="call-timer">0:00</div>
                <button class="hangup-btn" onclick="endCall()"><i class="fas fa-phone-slash"></i></button>
            </div>
        </div>
    </div>
    <style>
        #messages-modal {
            --msg-bg: url('assets/dark_chat_bg.png') no-repeat center center / cover;
            --msg-text: #fff; --msg-header-bg: #000;
            --msg-border: rgba(255,255,255,0.1); --msg-item-hover: rgba(255,255,255,0.08);
            --msg-input-bg: rgba(20, 20, 20, 0.95); --msg-input-field: rgba(255,255,255,0.05);
            --msg-input-text: #fff; --msg-text-sec: rgba(255,255,255,0.5);
            --msg-btn-color: #fff; --msg-shadow: rgba(0,0,0,0.5);
            --msg-chat-bg: url('assets/chat_bg.jpg');
        }
        #messages-modal.light-theme {
            --msg-bg: url('assets/light_bg.jpg') no-repeat center center / cover;
            --msg-text: #ffffff; --msg-header-bg: #1a0f08; --msg-border: #d4a574;
            --msg-item-hover: rgba(255, 200, 150, 0.15); --msg-input-bg: rgba(255, 235, 215, 0.85);
            --msg-input-field: rgba(255, 245, 230, 0.9); --msg-input-text: #2c1810;
            --msg-text-sec: #f5e6d3; --msg-btn-color: #ffd4a3; --msg-shadow: rgba(0,0,0,0.2);
            --msg-chat-bg: url('assets/mountain_sunset_hd.png');
        }
        .messages-modal-content {
            background: var(--msg-bg); color: var(--msg-text); font-family: 'Inter', sans-serif;
            border: 1px solid var(--msg-border); box-shadow: 0 25px 50px -12px var(--msg-shadow);
            width: 800px; height: 600px; max-width: 95vw; max-height: 85vh;
            display: flex; flex-direction: column; transition: all 0.4s ease;
            position: relative; overflow: hidden; border-radius: 12px;
        }
        #messages-modal.chat-active .messages-modal-content { background: var(--msg-chat-bg) no-repeat center center / cover; }
        #messages-modal.chat-active .messages-modal-content::before {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%);
            pointer-events: none; z-index: 0;
        }
        #messages-modal.chat-active .chat-header, #messages-modal.chat-active .chat-messages, #messages-modal.chat-active .chat-input-area {
            background: transparent; z-index: 1;
        }
        #chat-view { height: 100%; display: none; flex-direction: column; flex: 1; }
        .modal-header {
            background: var(--msg-header-bg); color: var(--msg-btn-color);
            padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;
        }
        .icon-btn, .back-btn, .modal-close { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2rem; }
        .conversation-list { overflow-y: auto; flex: 1; }
        .conversation-item { display: flex; align-items: center; padding: 18px 25px; border-bottom: 1px solid var(--msg-border); cursor: pointer; }
        .conversation-item:hover { background: var(--msg-item-hover); }
        .conv-avatar { width: 48px; height: 48px; background: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
        .small-avatar { width: 30px; height: 30px; margin-right: 10px; }
        .chat-messages { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 15px; background: var(--msg-chat-bg) no-repeat center center / cover; display: flex; flex-direction: column; position: relative; }
        .chat-messages::before { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.4); z-index: 0; pointer-events: none; }
        .message-wrapper { margin-bottom: 15px; display: flex; flex-direction: column; max-width: 85%; z-index: 1; width: fit-content; }
        .message-align-right { align-self: flex-end; align-items: flex-end; }
        .message-align-left { align-self: flex-start; align-items: flex-start; }
        .message { padding: 10px 16px; border-radius: 18px; backdrop-filter: blur(10px); color: #fff; position: relative; }
        .message-style-buyer { background: rgba(100,100,100,0.7); border-bottom-left-radius: 2px; }
        .message-style-seller { background: rgba(0,0,0,0.8); border-bottom-right-radius: 2px; }
        .chat-input-area { background: var(--msg-input-bg); padding: 12px 15px; display: flex; gap: 12px; align-items: center; backdrop-filter: blur(15px); }
        .input-container { flex: 1; }
        #chat-input { width: 100%; }
        .attach-btn, .voice-rec-btn, .send-btn { width: 38px; height: 38px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
        .attach-btn, .voice-rec-btn { background: rgba(255,255,255,0.1); }
        .send-btn { background: var(--color-cta); }
        .voice-rec-btn.recording { background: #ff4b2b; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255,75,43,0.7); } 70% { box-shadow: 0 0 0 10px rgba(255,75,43,0); } 100% { box-shadow: 0 0 0 0 rgba(255,75,43,0); } }
        .reply-bar { display: none; background: rgba(0,0,0,0.5); padding: 5px 15px; border-left: 3px solid var(--color-cta); color: #fff; font-size: 0.8rem; justify-content: space-between; }
        
        .voice-waves { display: flex; align-items: center; gap: 3px; height: 20px; }
        .voice-waves span { width: 3px; height: 100%; background: #ff4b2b; border-radius: 3px; animation: wave 0.5s ease-in-out infinite; }
        .voice-waves span:nth-child(2) { animation-delay: 0.1s; }
        .voice-waves span:nth-child(3) { animation-delay: 0.2s; }
        .voice-waves span:nth-child(4) { animation-delay: 0.3s; }
        .voice-waves span:nth-child(5) { animation-delay: 0.4s; }
        @keyframes wave { 0%, 100% { height: 5px; } 50% { height: 20px; } }

        .voice-player { display: flex; align-items: center; gap: 12px; padding: 5px 0; min-width: 260px; }
        .voice-avatar-container { position: relative; width: 45px; height: 45px; flex-shrink: 0; }
        .voice-avatar { width: 100%; height: 100%; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        .voice-avatar i { font-size: 1.5rem; color: rgba(255,255,255,0.5); }
        .voice-mic-badge { position: absolute; bottom: 0; right: 0; font-size: 0.8rem; color: #53bdeb; background: var(--msg-header-bg); border-radius: 50%; padding: 2px; border: 1px solid var(--msg-border); }
        
        .voice-play-btn { background: none; border: none; color: #fff; cursor: pointer; font-size: 1.6rem; padding: 0; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
        .voice-play-btn:hover { transform: scale(1.1); }
        
        .voice-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .voice-wave-visual { display: flex; align-items: center; gap: 2px; height: 24px; }
        .voice-wave-visual span { width: 2px; height: 8px; background: rgba(255,255,255,0.3); border-radius: 1px; transition: height 0.2s; }
        .voice-wave-visual span:nth-child(3n) { height: 16px; }
        .voice-wave-visual span:nth-child(5n) { height: 12px; }
        .voice-wave-visual span:nth-child(7n) { height: 20px; }
        .voice-wave-visual span:nth-child(2n) { height: 6px; }
        
        .voice-duration { font-size: 0.7rem; color: rgba(255,255,255,0.6); font-family: 'Inter', sans-serif; }

        /* Call Styles */
        .call-overlay { display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(20px); }
        .call-content { text-align: center; color: #fff; }
        .call-avatar-large { width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto 20px; border: 2px solid var(--color-cta); }
        .call-timer { font-size: 1.5rem; font-family: monospace; margin: 15px 0; color: var(--color-cta); display: none; }
        .hangup-btn { width: 60px; height: 60px; border-radius: 50%; border: none; background: #ff4b2b; color: #fff; font-size: 1.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; margin: 20px auto 0; }
        .hangup-btn:hover { transform: scale(1.1); background: #e03a1d; }

        /* Emoji & Reactions */
        .emoji-picker { display: none; position: absolute; bottom: 80px; left: 20px; background: var(--msg-header-bg); border: 1px solid var(--msg-border); border-radius: 12px; padding: 10px; z-index: 1001; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 220px; }
        .emoji-list { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; font-size: 1.2rem; }
        .emoji-list span { cursor: pointer; padding: 5px; transition: transform 0.2s; text-align: center; }
        .emoji-list span:hover { transform: scale(1.3); }

        .reaction-btn { position: absolute; top: 0; right: -30px; background: none; border: none; font-size: 0.9rem; color: var(--msg-text-sec); cursor: pointer; opacity: 0; transition: opacity 0.2s; }
        .message-bubble:hover .reaction-btn { opacity: 1; }
        .sent .reaction-btn { right: auto; left: -30px; }

        .message-reactions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .reaction-tag { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 2px 8px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s; }
        .reaction-tag:hover { background: rgba(255,255,255,0.15); }
        .reaction-tag.active { border-color: var(--color-cta); background: rgba(83, 189, 235, 0.1); }
        .reaction-count { font-size: 0.75rem; opacity: 0.8; }

        .reaction-picker { display: none; position: fixed; background: var(--msg-header-bg); border: 1px solid var(--msg-border); border-radius: 30px; padding: 5px 15px; z-index: 2000; box-shadow: 0 5px 15px rgba(0,0,0,0.5); gap: 10px; font-size: 1.2rem; backdrop-filter: blur(10px); }
        .reaction-picker span { cursor: pointer; transition: transform 0.2s; }
        .reaction-picker span:hover { transform: scale(1.4); }
    </style>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.addEventListener('keydown', e => { if (e.target.id === 'chat-input' && e.key === 'Enter') sendMessage(); });
    applyTheme();
}

window.sendMessage = sendMessage;
window.hideReplyUI = hideReplyUI;
window.startCall = startCall;
window.endCall = endCall;
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmoji = insertEmoji;
window.showReactionPicker = showReactionPicker;
window.handleReactionSelect = handleReactionSelect;
window.toggleReaction = toggleReaction;

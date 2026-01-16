// ===================================
// CHASED MESSAGING SYSTEM (ENHANCED)
// ===================================

let currentSubscription = null;
let activeConversationId = null;
let activeReplyId = null;
let activeParticipants = {};

// 1. Open Messages Dashboard
async function openMessagesDashboard() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Please login to view messages.");
        return;
    }

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

        let quoteHTML = '';
        if (msg.reply_to_id) {
            const quoted = messages.find(m => m.id === msg.reply_to_id);
            if (quoted) quoteHTML = `<div class="message-quote">${quoted.content}</div>`;
        }

        let statusIcon = isMe ? (msg.is_read ? '<i class="fas fa-box-open"></i>' : '<i class="fas fa-shopping-bag"></i>') : '';
        let nameDisplay = activeParticipants[msg.sender_id] || (isSenderBuyer ? "Buyer" : "Seller");
        if (isMe) nameDisplay = "Me";

        const msgHTML = `
            <div class="message-wrapper ${alignClass}">
                <div class="message-sender-name">${nameDisplay}</div>
                <div class="message ${styleClass}" onclick="triggerReply('${msg.id}', '${escapeHtml(msg.content)}')">
                    ${quoteHTML}
                    <div class="message-content">${msg.content}</div>
                    <div class="message-meta">
                        <span class="message-time">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span class="message-status">${statusIcon}</span>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', msgHTML);
    });
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

async function sendMessage(contentOverride = null) {
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
        reply_to_id: replyId
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

async function toggleRecording() {
    const btn = document.getElementById('voice-rec-btn');
    const input = document.getElementById('chat-input');

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                console.log("Audio captured.");
                sendMessage("🎤 Voice Message Recorded");
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start();
            isRecording = true;
            btn.classList.add('recording');
            input.placeholder = "Recording...";
            input.disabled = true;
        } catch (err) {
            alert("Mic access denied.");
        }
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        isRecording = false;
        btn.classList.remove('recording');
        input.placeholder = "Type a message...";
        input.disabled = false;
    }
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert("Images only."); return; }
    sendMessage(`📷 Sent an image: ${file.name}`);
    event.target.value = '';
}

// 6. Helpers
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
                         <button class="icon-btn theme-toggle" id="theme-toggle-btn-chat" onclick="toggleTheme()"><i class="fas fa-moon"></i></button>
                         <button class="modal-close" onclick="document.getElementById('messages-modal').classList.remove('active')">&times;</button>
                    </div>
                </div>
                <div id="chat-messages" class="chat-messages"></div>
                <div id="reply-bar" class="reply-bar">
                    <span id="reply-text">Replying...</span>
                    <button onclick="hideReplyUI()"><i class="fas fa-times"></i></button>
                </div>
                <div class="chat-input-area">
                    <button class="attach-btn" onclick="document.getElementById('file-input').click()"><i class="fas fa-plus"></i></button>
                    <input type="file" id="file-input" style="display:none" accept="image/*" onchange="handleFileSelect(event)">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button class="voice-rec-btn" id="voice-rec-btn" onclick="toggleRecording()"><i class="fas fa-microphone"></i></button>
                    <button class="send-btn" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
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
        .chat-messages { flex: 1; overflow-y: auto; padding: 15px; background: var(--msg-chat-bg) no-repeat center center / cover; display: flex; flex-direction: column; position: relative; }
        .chat-messages::before { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.4); z-index: 0; pointer-events: none; }
        .message-wrapper { margin-bottom: 15px; display: flex; flex-direction: column; max-width: 80%; z-index: 1; }
        .message-align-right { align-self: flex-end; align-items: flex-end; }
        .message-align-left { align-self: flex-start; align-items: flex-start; }
        .message { padding: 12px 18px; border-radius: 15px; backdrop-filter: blur(10px); color: #fff; }
        .message-style-buyer { background: rgba(100,100,100,0.7); border-bottom-left-radius: 2px; }
        .message-style-seller { background: rgba(0,0,0,0.8); border-bottom-right-radius: 2px; }
        .chat-input-area { background: var(--msg-input-bg); padding: 15px; display: flex; gap: 10px; align-items: center; backdrop-filter: blur(15px); }
        #chat-input { flex: 1; padding: 10px 15px; border-radius: 20px; background: var(--msg-input-field); border: 1px solid var(--msg-border); color: var(--msg-input-text); }
        .attach-btn, .voice-rec-btn, .send-btn { width: 38px; height: 38px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; }
        .attach-btn, .voice-rec-btn { background: rgba(255,255,255,0.1); }
        .send-btn { background: var(--color-cta); }
        .voice-rec-btn.recording { background: #ff4b2b; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255,75,43,0.7); } 70% { box-shadow: 0 0 0 10px rgba(255,75,43,0); } 100% { box-shadow: 0 0 0 0 rgba(255,75,43,0); } }
        .reply-bar { display: none; background: rgba(0,0,0,0.5); padding: 5px 15px; border-left: 3px solid var(--color-cta); color: #fff; font-size: 0.8rem; justify-content: space-between; }
    </style>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.addEventListener('keydown', e => { if (e.target.id === 'chat-input' && e.key === 'Enter') sendMessage(); });
    applyTheme();
}

window.openMessagesDashboard = openMessagesDashboard;
window.startChat = startChat;
window.openChat = openChat;
window.toggleTheme = toggleTheme;
window.toggleRecording = toggleRecording;
window.handleFileSelect = handleFileSelect;
window.backToConversations = backToConversations;
window.sendMessage = sendMessage;
window.hideReplyUI = hideReplyUI;

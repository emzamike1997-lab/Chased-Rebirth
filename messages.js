// ===================================
// CHASED MESSAGING SYSTEM (ENHANCED)
// ===================================

let currentSubscription = null;
let activeConversationId = null;
let activeReplyId = null; // Track message quoting
let activeConversationRole = null; // 'buyer' or 'seller' relative to ME
let activeParticipants = {}; // { id: name }

// 1. Open Messages Dashboard (List of Conversations)
async function openMessagesDashboard() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Please login to view messages.");
        return;
    }

    // Create Modal if not exists
    let msgModal = document.getElementById('messages-modal');
    if (!msgModal) {
        createMessagesModal();
        msgModal = document.getElementById('messages-modal');
    }

    // Load Conversations
    const convList = document.getElementById('conversation-list');
    convList.innerHTML = '<p class="loading-text">Loading chats...</p>';
    msgModal.classList.add('active');

    try {
        // Fetch conversations and expand user details if possible (manually for now as names aren't foreign keyed easily without profile table or metadata)
        // We stored seller_name on items, but for general chats we rely on metadata fetch.
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

    // We can fetch names here or just use generic roles for list view. 
    // To keep it fast, we use generic roles here, but names in Chat Window.

    conversations.forEach(conv => {
        const isBuyer = conv.buyer_id === currentUserId;
        const role = isBuyer ? "Seller" : "Buyer";

        const itemHTML = `
            <div class="conversation-item" onclick="openChat('${conv.id}', '${conv.item_title || 'Item Inquiry'}')">
                <div class="conv-avatar"><i class="fas fa-user"></i></div>
                <div class="conv-details">
                    <h4>${conv.item_title || 'Item Inquiry'}</h4>
                    <p>Chat with ${role}</p>
                </div>
                <div class="conv-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>
        `;
        list.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// --- THEME LOGIC ---
function toggleTheme() {
    const modal = document.getElementById('messages-modal');
    if (!modal) return;

    // Toggle class
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

    const saved = localStorage.getItem('chased_msg_theme');
    // Default to LIGHT if no preference (as per user request "wants messaging system to have white background")
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
// -------------------

// 3. Start Chat (New or Existing)
async function startChat(sellerId, itemId, itemTitle) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        alert("Please login to message the seller.");
        return;
    }

    if (user.id === sellerId) {
        alert("You cannot message yourself!");
        return;
    }

    // Check for existing conversation
    const { data: existing, error } = await supabaseClient
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
        const { data: newConv, error: createError } = await supabaseClient
            .from('conversations')
            .insert({
                buyer_id: user.id,
                seller_id: sellerId,
                item_id: itemId,
                item_title: itemTitle
            })
            .select()
            .single();

        if (createError) {
            console.error(createError);
            alert("Failed to start chat.");
            return;
        }

        openMessagesDashboard();
        setTimeout(() => openChat(newConv.id, itemTitle), 500);
    }
}

// 4. Open Specific Chat Window
async function openChat(conversationId, title) {
    activeConversationId = conversationId;
    activeReplyId = null;
    hideReplyUI();

    // Switch View
    document.getElementById('conversations-view').style.display = 'none';
    const chatView = document.getElementById('chat-view');
    chatView.style.display = 'flex';

    document.getElementById('chat-title').innerHTML = `
        <div style="display:flex; flex-direction:column;">
            <span>${title}</span>
            <span id="chat-subtitle" style="font-size: 0.7rem; color: #888; font-weight: normal;">Loading details...</span>
        </div>
    `;
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '<p class="loading-text">Loading...</p>';

    // Fetch conversation details to know roles
    const { data: convData } = await supabaseClient
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

    const { data: { user } } = await supabaseClient.auth.getUser();

    // Resolve Participants
    // Note: We don't have a users table public read policy for names usually, so this might fail if policies are strict. 
    // We will assume we can't fetch names easily without a 'profiles' table or similar. 
    // Fallback: "Buyer" / "Seller".

    let otherRole = "";
    if (user.id === convData.buyer_id) {
        activeConversationRole = 'buyer'; // I am the buyer
        otherRole = "Seller";
        activeParticipants = { [convData.buyer_id]: "Me", [convData.seller_id]: "Seller" };
    } else {
        activeConversationRole = 'seller'; // I am the seller
        otherRole = "Buyer";
        activeParticipants = { [convData.seller_id]: "Me", [convData.buyer_id]: "Buyer" };
    }

    // Update Header
    document.getElementById('chat-subtitle').textContent = `Chatting with ${otherRole}`;

    // Load History
    const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        msgContainer.innerHTML = '<p>Error loading messages.</p>';
        return;
    }

    renderMessages(messages, user.id, convData.buyer_id, convData.seller_id);

    // Subscribe
    subscribeToMessages(conversationId, user.id, convData.buyer_id, convData.seller_id);

    // Mark messages as read (simple approach: mark all unseen from other as read)
    markAsRead(conversationId, user.id);

    scrollToBottom();
}

async function markAsRead(conversationId, currentUserId) {
    await supabaseClient
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId) // Only mark others' messages
        .eq('is_read', false);
}

// 5. Render Messages
function renderMessages(messages, currentUserId, buyerId, sellerId) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';

    messages.forEach(msg => {
        // Determine alignment
        const isMe = msg.sender_id === currentUserId;

        // Determine styling role (Sender's role)
        const isSenderBuyer = msg.sender_id === buyerId;

        // Quote lookup
        let quoteHTML = '';
        if (msg.reply_to_id) {
            const quotedMsg = messages.find(m => m.id === msg.reply_to_id);
            if (quotedMsg) {
                quoteHTML = `<div class="message-quote">${quotedMsg.content}</div>`;
            } else {
                quoteHTML = `<div class="message-quote">Message deleted</div>`;
            }
        }

        // Read Status for MY messages
        let statusIcon = '';
        if (isMe) {
            // Check if it's read (Need real-time update for this to be live, but for history it works)
            if (msg.is_read) {
                statusIcon = '<i class="fas fa-box-open" title="Read"></i>'; // Open Bag
            } else {
                statusIcon = '<i class="fas fa-shopping-bag" title="Delivered"></i>'; // Closed Bag
            }
        }

        const alignClass = isMe ? 'message-align-right' : 'message-align-left';

        // Style: Buyer = Grey, Seller = Black
        // Note: We need contrast for text.
        // Buyer (Grey) -> Black Text
        // Seller (Black) -> White Text
        const styleClass = isSenderBuyer ? 'message-style-buyer' : 'message-style-seller';

        // Name Logic
        const senderRoleName = isSenderBuyer ? "Buyer" : "Seller";
        const nameDisplay = isMe ? "Me" : senderRoleName;

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

// 6. Send Message
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content || !activeConversationId) return;

    const { data: { user } } = await supabaseClient.auth.getUser();

    input.value = '';
    const replyId = activeReplyId;
    activeReplyId = null;
    hideReplyUI();

    const { error } = await supabaseClient
        .from('messages')
        .insert({
            conversation_id: activeConversationId,
            sender_id: user.id,
            content: content,
            reply_to_id: replyId
        });

    if (error) {
        alert("Failed to send.");
        input.value = content;
    } else {
        await supabaseClient
            .from('conversations')
            .update({ updated_at: new Date() })
            .eq('id', activeConversationId);
    }
}

// Subscription
function subscribeToMessages(conversationId, currentUserId, buyerId, sellerId) {
    if (currentSubscription) supabaseClient.removeChannel(currentSubscription);

    currentSubscription = supabaseClient
        .channel(`chat:${conversationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            async (payload) => {
                const container = document.getElementById('chat-messages');

                if (payload.eventType === 'INSERT') {
                    const msg = payload.new;

                    // Refresh full list to handle quotes/ordering safely easily? 
                    // Or append. Let's append but we need logic for quotes.
                    // Re-fetching is safer for quotes and simpler.
                    // For now, let's just trigger a full re-render or efficient append requires fetching quote.

                    // Optimize: Just re-fetch all for this specific chat view to ensure consistency
                    const { data: messages } = await supabaseClient
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', conversationId)
                        .order('created_at', { ascending: true });

                    if (messages) renderMessages(messages, currentUserId, buyerId, sellerId);
                    scrollToBottom();

                    // If message is from other, mark read
                    if (msg.sender_id !== currentUserId) {
                        markAsRead(conversationId, currentUserId);
                    }

                } else if (payload.eventType === 'UPDATE') {
                    // Handle Read Status changes
                    const { data: messages } = await supabaseClient
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', conversationId)
                        .order('created_at', { ascending: true });
                    if (messages) renderMessages(messages, currentUserId, buyerId, sellerId);
                }
            })
        .subscribe();
}

function triggerReply(msgId, content) {
    activeReplyId = msgId;
    const replyBar = document.getElementById('reply-bar');
    const replyText = document.getElementById('reply-text');
    replyBar.style.display = 'flex';
    replyText.textContent = `Replying to: "${content.substring(0, 30)}${content.length > 30 ? '...' : ''}"`;
    document.getElementById('chat-input').focus();
}

function hideReplyUI() {
    activeReplyId = null;
    document.getElementById('reply-bar').style.display = 'none';
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
}

function backToConversations() {
    document.getElementById('chat-view').style.display = 'none';
    document.getElementById('conversations-view').style.display = 'block';
    activeConversationId = null;
    if (currentSubscription) supabaseClient.removeChannel(currentSubscription);
    openMessagesDashboard();
}

// UI Builder
function createMessagesModal() {
    const html = `
    <div class="modal" id="messages-modal">
        <div class="modal-content messages-modal-content">
            
            <!-- VIEW 1: CONVERSATION LIST -->
            <div id="conversations-view" style="display:block; height: 100%;">
                <div class="modal-header">
                    <h2 class="modal-title">Messages</h2>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <button class="icon-btn theme-toggle" id="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Dark/Light Mode"><i class="fas fa-moon"></i></button>
                        <button class="modal-close" onclick="document.getElementById('messages-modal').classList.remove('active')">&times;</button>
                    </div>
                </div>
                <div id="conversation-list" class="conversation-list">
                    <!-- Items go here -->
                </div>
            </div>

            <!-- VIEW 2: CHAT WINDOW -->
            <div id="chat-view" style="display:none; flex-direction: column; height: 100%;">
                <div class="modal-header chat-header">
                    <div style="display:flex; align-items:center;">
                        <button class="btn-icon back-btn" onclick="backToConversations()"><i class="fas fa-arrow-left"></i></button>
                        <div class="conv-avatar small-avatar"><i class="fas fa-user"></i></div>
                        <h3 id="chat-title" style="margin: 0; font-size: 1rem;">Chat</h3>
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                         <button class="icon-btn theme-toggle" id="theme-toggle-btn-chat" onclick="toggleTheme()" title="Toggle Dark/Light Mode"><i class="fas fa-moon"></i></button>
                         <button class="modal-close" onclick="document.getElementById('messages-modal').classList.remove('active')">&times;</button>
                    </div>
                </div>
                
                <div id="chat-messages" class="chat-messages">
                    <!-- Bubble -->
                </div>

                <!-- Reply Bar -->
                <div id="reply-bar" class="reply-bar">
                    <span id="reply-text">Replying...</span>
                    <button onclick="hideReplyUI()"><i class="fas fa-times"></i></button>
                </div>

                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button class="send-btn" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>

        </div>
    </div>
    <style>
        /* --- VARIABLES --- */
        #messages-modal {
            --msg-bg: #000;
            --msg-text: #fff;
            --msg-header-bg: #000;
            --msg-border: rgba(255,255,255,0.1);
            --msg-item-hover: rgba(255,255,255,0.08);
            --msg-input-bg: rgba(20, 20, 20, 0.95);
            --msg-input-field: rgba(255,255,255,0.05);
            --msg-input-text: #fff;
            --msg-text-sec: rgba(255,255,255,0.5);
            --msg-btn-color: #fff;
            --msg-shadow: rgba(0,0,0,0.5);
        }

        #messages-modal.light-theme {
            --msg-bg: url('assets/light_bg.jpg') no-repeat center center / cover;
            --msg-text: #2c1810; /* Dark brown for text */
            --msg-header-bg: #1a0f08; /* Very dark brown/black for header */
            --msg-border: #d4a574; /* Warm tan border */
            --msg-item-hover: rgba(255, 200, 150, 0.15); /* Warm peachy hover */
            --msg-input-bg: rgba(255, 235, 215, 0.85); /* Warm cream input area */
            --msg-input-field: rgba(255, 245, 230, 0.9); /* Light peachy input */
            --msg-input-text: #2c1810; /* Dark brown text */
            --msg-text-sec: #6b4423; /* Medium brown for secondary text */
            --msg-btn-color: #ffd4a3; /* Warm peach for buttons on dark header */
            --msg-shadow: rgba(0,0,0,0.2);
        }

        .messages-modal-content {
            background: var(--msg-bg);
            color: var(--msg-text);
            font-family: 'Inter', sans-serif;
            border: 1px solid var(--msg-border);
            box-shadow: 0 25px 50px -12px var(--msg-shadow);
            max-height: 80vh; 
            display: flex; 
            flex-direction: column;
            transition: background 0.3s, color 0.3s;
        }

        .modal-header {
            background: var(--msg-header-bg);
            color: var(--msg-btn-color); /* Ensure text/title inherits this white/dark appropriately or set explicitly */
            border-bottom: 1px solid rgba(255,255,255,0.1); /* Keep distinct separator if header is dark */
            padding: 15px 20px;
            display: flex; justify-content: space-between; align-items: center;
            transition: background 0.3s;
        }
        .modal-title { margin: 0; color: inherit; } /* Inherit color from header (White in both cases now) */
        .modal-close, .back-btn, .icon-btn { 
            background: none; border: none; 
            color: var(--msg-btn-color); 
            font-size: 1.2rem; cursor: pointer; 
            transition: color 0.2s;
        }
        .modal-close:hover, .back-btn:hover { opacity: 0.7; }

        .chat-header {
            padding-bottom: 10px;
        }

        /* --- List View --- */
        .conversation-list {
            overflow-y: auto; flex: 1; min-height: 300px;
        }

        .conversation-item {
            display: flex; align-items: center; padding: 18px 25px; 
            border-bottom: 1px solid var(--msg-border); 
            cursor: pointer; transition: all 0.3s;
        }
        .conversation-item:hover { 
            background: var(--msg-item-hover); 
            padding-left: 30px; 
        }
        .conv-avatar { 
            width: 48px; height: 48px; 
            background: linear-gradient(135deg, #333, #111); 
            border: 1px solid var(--msg-border);
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; 
            margin-right: 18px; 
            color: #fff; /* Always white icon on avatar */
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        }
        .small-avatar { width: 30px; height: 30px; margin-right: 10px; }

        .conv-details h4 { margin: 0 0 4px 0; font-size: 1rem; font-weight: 600; color: var(--msg-text); }
        .conv-details p { margin: 0; font-size: 0.85rem; color: var(--msg-text-sec); }
        
        .conv-arrow { margin-left: auto; color: var(--msg-text-sec); opacity: 0.5; transition: transform 0.3s; }
        .conversation-item:hover .conv-arrow { transform: translateX(3px); opacity: 1; }

        /* --- Chat View --- */
        .chat-messages {
            flex: 1; overflow-y: auto; padding: 15px; 
            background: url('assets/chat_bg.jpg') no-repeat center center; 
            background-size: cover; 
            display: flex; flex-direction: column;
            position: relative;
        }
        
        /* Gradient Overlay - Always dark to preserve contrast with bubbles? 
           User said "keep background as it is". If I make the overlay light, it washes out the mountain.
           I'll keep the overlay tailored to the image. Bubbles have their own contrast.
        */
        .chat-messages::before {
            content: '';
            position: absolute; inset: 0;
            background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%);
            pointer-events: none;
            z-index: 0;
        }

        .chat-messages::-webkit-scrollbar { width: 6px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 3px; }

        .message-wrapper { 
            margin-bottom: 20px; 
            display: flex; flex-direction: column; 
            max-width: 75%; 
            z-index: 1; 
            animation: slideUp 0.3s forwards;
            opacity: 0; transform: translateY(15px);
        }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }

        .message-align-right { align-self: flex-end; align-items: flex-end; }
        .message-align-left { align-self: flex-start; align-items: flex-start; }
        
        .message { 
            padding: 14px 20px; 
            border-radius: 18px; 
            font-size: 0.95rem; line-height: 1.5; 
            position: relative; cursor: pointer; 
            transition: all 0.2s; 
            backdrop-filter: blur(12px); 
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .message:hover { transform: translateY(-1px); }
        .message:active { transform: scale(0.98); }
        
        /* Bubbles - Keep these mostly consistent to pop against mountain */
        .message-style-buyer { 
            background: rgba(80, 80, 80, 0.6); 
            color: rgba(255,255,255,0.95); 
            border: 1px solid rgba(255,255,255,0.1);
            border-bottom-left-radius: 4px; 
        } 
        .message-style-seller { 
            background: rgba(0, 0, 0, 0.75); 
            color: #fff; 
            border: 1px solid rgba(255,255,255,0.15);
            border-bottom-right-radius: 4px; 
        } 

        .message-sender-name { 
            font-size: 0.75rem; font-weight: 500; text-transform: uppercase;
            color: rgba(255,255,255,0.8); 
            margin-bottom: 6px; margin: 0 4px 6px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }

        .message-meta { 
            display: flex; justify-content: flex-end; align-items: center; 
            margin-top: 6px; opacity: 0.8; gap: 6px; 
        }
        .message-time { font-size: 0.65rem; color: rgba(255,255,255,0.7); }
        .message-status { font-size: 0.75rem; }

        .message-quote { 
            background: rgba(0,0,0,0.3); 
            border-left: 3px solid var(--color-cta); 
            padding: 8px 12px; margin-bottom: 8px; 
            font-size: 0.85rem; font-style: italic; color: rgba(255,255,255,0.8);
            border-radius: 6px; 
        }

        /* --- Footer / Input --- */
        .chat-input-area {
            background: var(--msg-input-bg);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--msg-border);
            padding: 20px;
            display: flex; gap: 10px;
            transition: background 0.3s;
        }
        #chat-input {
            flex:1; padding: 10px; border-radius: 20px; 
            background: var(--msg-input-field);
            border: 1px solid var(--msg-border);
            color: var(--msg-input-text);
            font-size: 1rem;
            transition: all 0.2s;
        }
        #chat-input:focus {
            outline: none;
            border-color: rgba(128,128,128,0.5);
            box-shadow: 0 0 0 3px rgba(128,128,128,0.1);
        }
        
        .send-btn {
            border-radius: 50%; width: 40px; height: 40px; 
            padding: 0; display:flex; align-items:center; justify-content:center;
            background: var(--color-cta); color: #fff; border: none; cursor: pointer;
        }
        
        .reply-bar {
             display:none; background: #222; 
             padding: 5px 15px; border-left: 3px solid var(--color-cta); 
             justify-content: space-between; align-items: center;
        }
        .reply-bar button { background:none; border:none; color:white; cursor: pointer; }
        
        .light-theme .reply-bar { background: #e0e0e0; }
        .light-theme .reply-bar button { color: #333; }
        .light-theme #reply-text { color: #333; }
        #reply-text { font-size: 0.8rem; color: #aaa; }

    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.addEventListener('keydown', (e) => {
        if (e.target.id === 'chat-input' && e.key === 'Enter') {
            sendMessage();
        }
    });

    // Apply default/saved theme
    applyTheme();
}

window.toggleTheme = toggleTheme;

// Expose globally
window.openMessagesDashboard = openMessagesDashboard;
window.startChat = startChat;
window.openChat = openChat;

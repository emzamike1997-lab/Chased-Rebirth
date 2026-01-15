// ===================================
// CHASED MESSAGING SYSTEM
// ===================================

let currentSubscription = null;
let activeConversationId = null;

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
function renderConversationList(conversations, currentUserId) {
    const list = document.getElementById('conversation-list');
    list.innerHTML = '';

    if (!conversations || conversations.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">No messages yet.</p>';
        return;
    }

    conversations.forEach(conv => {
        // Determine "Other Person" logic (basic)
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
        setTimeout(() => openChat(existing.id, itemTitle), 500); // Wait for modal
    } else {
        // Create new
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

    // Switch View
    document.getElementById('conversations-view').style.display = 'none';
    const chatView = document.getElementById('chat-view');
    chatView.style.display = 'flex';

    document.getElementById('chat-title').textContent = title;
    const msgContainer = document.getElementById('chat-messages');
    msgContainer.innerHTML = '<p class="loading-text">Loading...</p>';

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

    renderMessages(messages);

    // Subscribe to new messages
    subscribeToMessages(conversationId);

    // Scroll to bottom
    scrollToBottom();
}

// 5. Render Messages
async function renderMessages(messages) {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    const { data: { user } } = await supabaseClient.auth.getUser();

    messages.forEach(msg => {
        const isMe = msg.sender_id === user.id;
        const msgHTML = `
            <div class="message ${isMe ? 'message-sent' : 'message-received'}">
                <div class="message-content">${msg.content}</div>
                <div class="message-time">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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

    // Clear input immediately (optimistic UI)
    input.value = '';

    const { error } = await supabaseClient
        .from('messages')
        .insert({
            conversation_id: activeConversationId,
            sender_id: user.id,
            content: content
        });

    if (error) {
        alert("Failed to send.");
        input.value = content; // Restore on fail
    } else {
        // Update conversation timestamp
        await supabaseClient
            .from('conversations')
            .update({ updated_at: new Date() })
            .eq('id', activeConversationId);
    }
}

// Subscription
function subscribeToMessages(conversationId) {
    if (currentSubscription) supabaseClient.removeChannel(currentSubscription);

    currentSubscription = supabaseClient
        .channel(`chat:${conversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
            payload => {
                const container = document.getElementById('chat-messages');
                const { new: msg } = payload;

                // Re-fetch user safely or just check basic logic?
                // For speed, just append. We assume if it came from realtime and we didn't just type it (which optimistic UPDATE would handle, but we didn't do optimistic append yet), we show it.
                // Actually, best to just call renderMessages with single item or append manually.

                // Simple append
                supabaseClient.auth.getUser().then(({ data: { user } }) => {
                    const isMe = msg.sender_id === user.id;
                    if (isMe) {
                        // If we already appended optimistically, we might duplicate.
                        // But we didn't append optimistically above, we just cleared input. So we need this.
                    }

                    const msgHTML = `
                    <div class="message ${isMe ? 'message-sent' : 'message-received'}">
                        <div class="message-content">${msg.content}</div>
                        <div class="message-time">${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                `;
                    container.insertAdjacentHTML('beforeend', msgHTML);
                    scrollToBottom();
                });
            })
        .subscribe();
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
    openMessagesDashboard(); // Refresh list
}

// UI Builder
function createMessagesModal() {
    const html = `
    <div class="modal" id="messages-modal">
        <div class="modal-content" style="max-height: 80vh; display: flex; flex-direction: column;">
            
            <!-- VIEW 1: CONVERSATION LIST -->
            <div id="conversations-view" style="display:block; height: 100%;">
                <div class="modal-header">
                    <h2 class="modal-title">Messages</h2>
                    <button class="modal-close" onclick="document.getElementById('messages-modal').classList.remove('active')">&times;</button>
                </div>
                <div id="conversation-list" class="conversation-list" style="overflow-y: auto; flex: 1; min-height: 300px;">
                    <!-- Items go here -->
                </div>
            </div>

            <!-- VIEW 2: CHAT WINDOW -->
            <div id="chat-view" style="display:none; flex-direction: column; height: 100%;">
                <div class="modal-header" style="border-bottom: 1px solid #333; padding-bottom: 10px;">
                    <button class="btn-icon" onclick="backToConversations()"><i class="fas fa-arrow-left"></i></button>
                    <h3 id="chat-title" style="margin-left: 10px; font-size: 1.1rem;">Chat</h3>
                    <button class="modal-close" onclick="document.getElementById('messages-modal').classList.remove('active')">&times;</button>
                </div>
                
                <div id="chat-messages" class="chat-messages" style="flex: 1; overflow-y: auto; padding: 15px; background: rgba(0,0,0,0.2);">
                    <!-- Bubble -->
                </div>

                <div class="chat-input-area" style="padding: 15px; border-top: 1px solid #333; display: flex; gap: 10px;">
                    <input type="text" id="chat-input" placeholder="Type a message..." style="flex:1; padding: 10px; border-radius: 20px; border: 1px solid #444; background: #222; color: white;">
                    <button class="btn btn-primary" onclick="sendMessage()" style="border-radius: 50%; width: 40px; height: 40px; padding: 0; display:flex; align-items:center; justify-content:center;"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>

        </div>
    </div>
    <style>
        .conversation-item {
            display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #333; cursor: pointer; transition: background 0.2s;
        }
        .conversation-item:hover { background: rgba(255,255,255,0.05); }
        .conv-avatar { width: 40px; height: 40px; background: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
        .conv-details h4 { margin: 0 0 5px 0; font-size: 0.95rem; }
        .conv-details p { margin: 0; font-size: 0.8rem; color: #888; }
        .conv-arrow { margin-left: auto; color: #555; }

        .message { margin-bottom: 10px; max-width: 80%; padding: 10px 15px; border-radius: 15px; font-size: 0.9rem; }
        .message-sent { background: var(--color-cta, #D4AF37); color: black; margin-left: auto; border-bottom-right-radius: 2px; }
        .message-received { background: #333; color: white; margin-right: auto; border-bottom-left-radius: 2px; }
        .message-time { font-size: 0.7rem; opacity: 0.7; margin-top: 5px; text-align: right; }
    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    // Enter key to send
    document.addEventListener('keydown', (e) => {
        if (e.target.id === 'chat-input' && e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Expose globally
window.openMessagesDashboard = openMessagesDashboard;
window.startChat = startChat;
window.openChat = openChat;

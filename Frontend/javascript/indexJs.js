class AIChatbot {
    constructor() {
        // Inicialización de elementos DOM
        this.initializeElements();
        
        // Datos del chatbot
        this.chats = this.loadChatsFromStorage();
        this.currentChatId = null;
        this.isVoiceModeActive = false;
        
        // Configuración inicial
        this.setupEventListeners();
        this.createMenuToggle();
        this.renderChatHistory();
        
        console.log('🤖 AI Chatbot inicializado correctamente');
    }

    // ===== INICIALIZACIÓN DE ELEMENTOS DOM =====
    initializeElements() {
        this.sidebar = document.getElementById('sidebar');
        this.mainContent = document.getElementById('mainContent');
        this.toggleBtn = document.getElementById('toggleBtn');
        this.chatHistory = document.getElementById('chatHistory');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.chatContainer = document.getElementById('chatContainer');
        this.chatMessages = document.getElementById('chatMessages');
        this.welcomeSection = document.querySelector('.welcome-section');
        this.overlay = document.getElementById('overlay');
    }

    // ===== CONFIGURACIÓN DE EVENT LISTENERS =====
    setupEventListeners() {
        // Botón toggle del sidebar
        this.toggleBtn.addEventListener('click', () => this.toggleSidebar());
        
        // Nuevo chat
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        
        // Envío de mensajes
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter para enviar mensaje
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize del textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        
        // Botón de voz
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceMode());
        
        // Cerrar sidebar en móvil al hacer click en overlay
        this.overlay.addEventListener('click', () => this.closeSidebar());
        
        // Cerrar sidebar al redimensionar ventana
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.overlay.classList.remove('active');
            }
        });
    }

    // ===== CREAR BOTÓN DE MENÚ FLOTANTE =====
    createMenuToggle() {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '☰';
        menuToggle.addEventListener('click', () => this.toggleSidebar());
        document.body.appendChild(menuToggle);
    }

    // ===== GESTIÓN DEL SIDEBAR =====
    toggleSidebar() {
        const isActive = this.sidebar.classList.contains('active');
        
        if (isActive) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        this.sidebar.classList.add('active');
        this.mainContent.classList.add('sidebar-open');
        
        // En móvil, mostrar overlay
        if (window.innerWidth <= 768) {
            this.overlay.classList.add('active');
        }
    }

    closeSidebar() {
        this.sidebar.classList.remove('active');
        this.mainContent.classList.remove('sidebar-open');
        this.overlay.classList.remove('active');
    }

    // ===== GESTIÓN DE CHATS =====
    createNewChat() {
        const chatId = 'chat_' + Date.now();
        const newChat = {
            id: chatId,
            title: 'Nuevo Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        this.chats.unshift(newChat);
        this.currentChatId = chatId;
        this.saveChatsToStorage();
        this.renderChatHistory();
        this.showChatInterface();
        this.closeSidebar();
        
        // Enfocar el input
        this.messageInput.focus();
        
        console.log('💬 Nuevo chat creado:', chatId);
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        this.showChatInterface();
        this.renderMessages();
        this.closeSidebar();
        
        // Actualizar estado activo en el historial
        this.renderChatHistory();
        
        console.log('📂 Chat cargado:', chatId);
    }

    getCurrentChat() {
        return this.chats.find(chat => chat.id === this.currentChatId);
    }

    // ===== GESTIÓN DE MENSAJES =====
    sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message) return;
        
        // Si no hay chat activo, crear uno nuevo
        if (!this.currentChatId) {
            this.createNewChat();
        }
        
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;
        
        // Agregar mensaje del usuario
        const userMessage = {
            id: 'msg_' + Date.now(),
            type: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        
        currentChat.messages.push(userMessage);
        
        // Actualizar título del chat si es el primer mensaje
        if (currentChat.messages.length === 1) {
            currentChat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
        }
        
        // Limpiar input
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Mostrar mensaje del usuario
        this.renderMessages();
        
        // Simular respuesta de la IA (aquí conectarías con tu API de IA)
        this.getAIResponseFromBackend(currentChat, message);
        
        // Actualizar storage y historial
        currentChat.lastActivity = new Date().toISOString();
        this.saveChatsToStorage();
        this.renderChatHistory();
        
        console.log('📤 Mensaje enviado:', message);
    }
    async getAIResponseFromBackend(chat, userMessageContent) {
        this.showTypingIndicator();
    
        try {
            const res = await fetch("http://localhost:8000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessageContent })
            });
    
            const data = await res.json();
            console.log("🧪 Respuesta del backend:", data);
            this.hideTypingIndicator();
    
            const aiMessage = {
                id: 'msg_' + Date.now(),
                type: 'ai',
                content: data.reply || "Lo siento, algo salió mal.",
                timestamp: new Date().toISOString()
            };
    
            chat.messages.push(aiMessage);
            chat.lastActivity = new Date().toISOString();
            this.renderMessages();
            this.saveChatsToStorage();
            this.renderChatHistory();
        } catch (error) {
            this.hideTypingIndicator();
            console.error("❌ Error al obtener respuesta del backend:", error);
        }
    }
    

    simulateAIResponse(chat) {
        // Mostrar indicador de escritura
        this.showTypingIndicator();
        
        setTimeout(() => {
            this.hideTypingIndicator();
            
            // Respuestas de ejemplo
            const responses = [
                "Entiendo tu consulta. ¿Podrías proporcionarme más detalles para ayudarte mejor?",
                "Esa es una pregunta interesante. Permíteme pensar en la mejor manera de abordar este tema.",
                "Gracias por compartir eso conmigo. Aquí tienes mi análisis sobre el tema:",
                "Me complace poder ayudarte con esto. Basándome en la información que me has dado...",
                "Excelente pregunta. Te explico paso a paso cómo abordar esta situación:"
            ];
            
            const aiMessage = {
                id: 'msg_' + Date.now(),
                type: 'ai',
                content: responses[Math.floor(Math.random() * responses.length)],
                timestamp: new Date().toISOString()
            };
            
            chat.messages.push(aiMessage);
            chat.lastActivity = new Date().toISOString();
            
            this.renderMessages();
            this.saveChatsToStorage();
            this.renderChatHistory();
            
            console.log('🤖 Respuesta de IA generada');
        }, 1500 + Math.random() * 1000); // Tiempo variable para mayor realismo
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-animation">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
        
        // Agregar estilos para la animación de escritura
        if (!document.getElementById('typing-styles')) {
            const style = document.createElement('style');
            style.id = 'typing-styles';
            style.textContent = `
                .typing-animation {
                    display: flex;
                    gap: 4px;
                }
                .typing-animation span {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: var(--accent-red);
                    animation: typing 1.4s infinite ease-in-out;
                }
                .typing-animation span:nth-child(1) { animation-delay: -0.32s; }
                .typing-animation span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes typing {
                    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                    40% { transform: scale(1.2); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    hideTypingIndicator() {
        const typingIndicator = this.chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // ===== RENDERIZADO DE INTERFACES =====
    showChatInterface() {
        this.welcomeSection.style.display = 'none';
        this.chatContainer.style.display = 'flex';
    }

    showWelcomeInterface() {
        this.welcomeSection.style.display = 'flex';
        this.chatContainer.style.display = 'none';
        this.currentChatId = null;
    }

    renderMessages() {
        const currentChat = this.getCurrentChat();
        if (!currentChat) return;
        
        this.chatMessages.innerHTML = '';
        
        currentChat.messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.type} fade-in`;
            
            if (message.type === 'user') {
                messageDiv.classList.add('slide-in-right');
            } else {
                messageDiv.classList.add('slide-in-left');
            }
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    ${this.formatMessageContent(message.content)}
                </div>
            `;
            
            this.chatMessages.appendChild(messageDiv);
        });
        
        this.scrollToBottom();
    }

    formatMessageContent(content) {
        // Aquí puedes agregar formateo adicional como markdown, enlaces, etc.
        return content.replace(/\n/g, '<br>');
    }

    renderChatHistory() {
        this.chatHistory.innerHTML = '';
        
        // Ordenar chats por última actividad
        const sortedChats = [...this.chats].sort((a, b) => 
            new Date(b.lastActivity) - new Date(a.lastActivity)
        );
        
        sortedChats.forEach(chat => {
            const chatDiv = document.createElement('div');
            chatDiv.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            
            const date = new Date(chat.lastActivity);
            const formattedDate = this.formatDate(date);
            
            chatDiv.innerHTML = `
                <div class="chat-title">${chat.title}</div>
                <div class="chat-date">${formattedDate}</div>
            `;
            
            chatDiv.addEventListener('click', () => this.loadChat(chat.id));
            this.chatHistory.appendChild(chatDiv);
        });
    }

    // ===== UTILIDADES =====
    formatDate(date) {
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return 'Hace unos minutos';
        } else if (diffInHours < 24) {
            return `Hace ${Math.floor(diffInHours)} horas`;
        } else if (diffInHours < 48) {
            return 'Ayer';
        } else {
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short'
            });
        }
    }

    autoResizeTextarea() {
        const textarea = this.messageInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        
        // Habilitar/deshabilitar botón de envío
        this.sendBtn.disabled = !textarea.value.trim();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    toggleVoiceMode() {
        this.isVoiceModeActive = !this.isVoiceModeActive;
        this.voiceBtn.classList.toggle('active', this.isVoiceModeActive);
        
        if (this.isVoiceModeActive) {
            this.messageInput.placeholder = 'Modo de voz activado - Habla ahora...';
            console.log('🎤 Modo de voz activado');
            // Aquí implementarías la funcionalidad de reconocimiento de voz
        } else {
            this.messageInput.placeholder = '¿De qué quieres hablar hoy?';
            console.log('⌨️ Modo de texto activado');
        }
    }

    // ===== PERSISTENCIA DE DATOS =====
    saveChatsToStorage() {
        try {
            // En un entorno real, esto se conectaría a una base de datos
            // Por ahora usamos variables en memoria para la demostración
            console.log('💾 Chats guardados en memoria');
        } catch (error) {
            console.error('❌ Error al guardar chats:', error);
        }
    }

    loadChatsFromStorage() {
        try {
            // Datos de ejemplo para la demostración
            return [
                {
                    id: 'chat_demo_1',
                    title: 'Consulta sobre desarrollo web',
                    messages: [
                        {
                            id: 'msg_1',
                            type: 'user',
                            content: '¿Puedes ayudarme con desarrollo web?',
                            timestamp: new Date(Date.now() - 86400000).toISOString()
                        },
                        {
                            id: 'msg_2',
                            type: 'ai',
                            content: '¡Por supuesto! Me especializo en desarrollo web. ¿Qué tecnologías te interesan?',
                            timestamp: new Date(Date.now() - 86400000 + 30000).toISOString()
                        }
                    ],
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    lastActivity: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 'chat_demo_2',
                    title: 'Inteligencia Artificial',
                    messages: [
                        {
                            id: 'msg_3',
                            type: 'user',
                            content: '¿Cómo funciona el machine learning?',
                            timestamp: new Date(Date.now() - 172800000).toISOString()
                        }
                    ],
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    lastActivity: new Date(Date.now() - 172800000).toISOString()
                }
            ];
        } catch (error) {
            console.error('❌ Error al cargar chats:', error);
            return [];
        }
    }

    // ===== MÉTODOS DE LIMPIEZA Y MANTENIMIENTO =====
    clearChatHistory() {
        if (confirm('¿Estás seguro de que quieres eliminar todo el historial de chats?')) {
            this.chats = [];
            this.currentChatId = null;
            this.saveChatsToStorage();
            this.renderChatHistory();
            this.showWelcomeInterface();
            console.log('🗑️ Historial de chats eliminado');
        }
    }

    deleteChat(chatId) {
        if (confirm('¿Estás seguro de que quieres eliminar este chat?')) {
            this.chats = this.chats.filter(chat => chat.id !== chatId);
            
            if (this.currentChatId === chatId) {
                this.showWelcomeInterface();
            }
            
            this.saveChatsToStorage();
            this.renderChatHistory();
            console.log('🗑️ Chat eliminado:', chatId);
        }
    }

    // ===== MÉTODO DE INICIALIZACIÓN =====
    static initialize() {
        return new AIChatbot();
    }
}

// ===== INICIALIZACIÓN CUANDO EL DOM ESTÉ LISTO =====
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que todos los elementos necesarios estén presentes
    const requiredElements = [
        'sidebar', 'mainContent', 'toggleBtn', 'chatHistory', 
        'newChatBtn', 'messageInput', 'sendBtn', 'voiceBtn', 
        'chatContainer', 'chatMessages', 'overlay'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ Elementos DOM faltantes:', missingElements);
        return;
    }
    
    // Inicializar el chatbot
    window.aiChatbot = AIChatbot.initialize();
    
    // Agregar evento para limpiar historial (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            window.aiChatbot.clearChatHistory();
        }
    });
    
    console.log('✅ Aplicación de chatbot completamente inicializada');
});

// ===== MANEJO DE ERRORES GLOBALES =====
window.addEventListener('error', (e) => {
    console.error('❌ Error global capturado:', e.error);
});

// ===== UTILIDADES GLOBALES =====
window.chatbotUtils = {
    // Función para exportar historial de chats
    exportChatHistory() {
        if (!window.aiChatbot) return;
        
        const data = {
            chats: window.aiChatbot.chats,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatbot-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📤 Historial exportado');
    },
    
    // Función para importar historial de chats
    importChatHistory(file) {
        if (!window.aiChatbot || !file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.chats && Array.isArray(data.chats)) {
                    window.aiChatbot.chats = data.chats;
                    window.aiChatbot.saveChatsToStorage();
                    window.aiChatbot.renderChatHistory();
                    window.aiChatbot.showWelcomeInterface();
                    console.log('📥 Historial importado correctamente');
                    alert('Historial importado correctamente');
                } else {
                    throw new Error('Formato de archivo inválido');
                }
            } catch (error) {
                console.error('❌ Error al importar:', error);
                alert('Error al importar el archivo. Verifica que sea un archivo válido.');
            }
        };
        reader.readAsText(file);
    }
};

// ===== FUNCIONES DE DEBUGGING (solo para desarrollo) =====
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debug = {
        // Ver estado actual del chatbot
        getState() {
            if (!window.aiChatbot) return null;
            return {
                currentChatId: window.aiChatbot.currentChatId,
                totalChats: window.aiChatbot.chats.length,
                isVoiceModeActive: window.aiChatbot.isVoiceModeActive,
                chats: window.aiChatbot.chats
            };
        },
        
        // Simular múltiples mensajes para testing
        simulateConversation() {
            if (!window.aiChatbot) return;
            
            const messages = [
                "Hola, ¿cómo estás?",
                "¿Puedes ayudarme con JavaScript?",
                "Necesito crear una función que valide emails",
                "¿Cuáles son las mejores prácticas?",
                "Muchas gracias por tu ayuda"
            ];
            
            let delay = 0;
            messages.forEach((msg, index) => {
                setTimeout(() => {
                    window.aiChatbot.messageInput.value = msg;
                    window.aiChatbot.sendMessage();
                }, delay);
                delay += 3000; // 3 segundos entre mensajes
            });
        },
        
        // Limpiar console
        clear() {
            console.clear();
            console.log('🧹 Console limpiado - Debug mode activo');
        }
    };
    
    console.log('🐛 Modo debug activado. Usa window.debug para herramientas de desarrollo.');
}
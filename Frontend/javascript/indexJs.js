class AIChatbot {
    constructor() {
        // Inicialización de elementos DOM
        this.initializeElements();
        
        // Configuración del backend
        this.backendUrl = 'http://localhost:8000';
        
        // Datos del chatbot
        this.chats = [];
        this.currentChatId = null;
        this.currentChatData = null;
        this.isVoiceModeActive = false;
        
        // Configuración inicial
        this.setupEventListeners();
        this.createMenuToggle();
        this.loadChatsFromBackend();
        
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
        // Botón toggle del sidebar (dentro del sidebar)
        this.toggleBtn.addEventListener('click', () => this.closeSidebar());
        
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
        
        // Cerrar sidebar al redimensionar ventana y manejar botón flotante
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.overlay.classList.remove('active');
            }
            this.handleResponsiveMenuButton();
        });
        
        // Tecla Escape para cerrar sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebar.classList.contains('active')) {
                this.closeSidebar();
            }
        });
    }

    handleResponsiveMenuButton() {
        if (!this.menuToggleBtn) return;
        
        const sidebarIsActive = this.sidebar.classList.contains('active');
        
        if (window.innerWidth > 768 && sidebarIsActive) {
            this.menuToggleBtn.classList.add('hidden');
        } else if (window.innerWidth <= 768) {
            if (sidebarIsActive) {
                this.menuToggleBtn.classList.add('hidden');
            } else {
                this.menuToggleBtn.classList.remove('hidden');
            }
        } else {
            this.menuToggleBtn.classList.remove('hidden');
        }
    }

    // ===== CREAR BOTÓN DE MENÚ FLOTANTE =====
    createMenuToggle() {
        const menuToggle = document.createElement('button');
        menuToggle.className = 'menu-toggle';
        menuToggle.innerHTML = '☰';
        menuToggle.setAttribute('aria-label', 'Abrir menú de historial');
        menuToggle.addEventListener('click', () => this.toggleSidebar());
        document.body.appendChild(menuToggle);
        
        this.menuToggleBtn = menuToggle;
        console.log('📱 Botón de menú flotante creado');
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
        
        if (this.menuToggleBtn) {
            this.menuToggleBtn.classList.add('hidden');
            this.menuToggleBtn.setAttribute('aria-hidden', 'true');
        }
        
        if (window.innerWidth <= 768) {
            this.overlay.classList.add('active');
        }
    }
    
    closeSidebar() {
        this.sidebar.classList.remove('active');
        this.mainContent.classList.remove('sidebar-open');
        this.overlay.classList.remove('active');
        
        if (this.menuToggleBtn) {
            this.menuToggleBtn.classList.remove('hidden');
            this.menuToggleBtn.setAttribute('aria-hidden', 'false');
        }
    }

    // ===== COMUNICACIÓN CON BACKEND =====
    async loadChatsFromBackend() {
        try {
            console.log('📡 Cargando chats desde el backend...');
            const response = await fetch(`${this.backendUrl}/chats`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            this.chats = data.chats || [];
            
            console.log(`✅ ${this.chats.length} chats cargados desde el backend`);
            this.renderChatHistory();
            
        } catch (error) {
            console.error('❌ Error al cargar chats desde backend:', error);
            this.chats = [];
            this.renderChatHistory();
        }
    }

    async loadChatData(chatId) {
        try {
            console.log(`📡 Cargando datos del chat ${chatId}...`);
            const response = await fetch(`${this.backendUrl}/chats/${chatId}`);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const chatData = await response.json();
            console.log(`✅ Datos del chat ${chatId} cargados correctamente`);
            return chatData;
            
        } catch (error) {
            console.error(`❌ Error al cargar chat ${chatId}:`, error);
            return null;
        }
    }

    async createChatInBackend(message) {
        try {
            console.log('🔨 Creando nuevo chat en backend...');
            const response = await fetch(`${this.backendUrl}/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Nuevo chat creado en backend:', data.chat_id);
            return data;
            
        } catch (error) {
            console.error('❌ Error al crear chat en backend:', error);
            throw error;
        }
    }

    async sendMessageToBackend(chatId, messages) {
        try {
            console.log(`📤 Enviando mensaje al chat ${chatId}...`);
            const response = await fetch(`${this.backendUrl}/chats/${chatId}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: messages })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Respuesta recibida del backend');
            return data;
            
        } catch (error) {
            console.error('❌ Error al enviar mensaje al backend:', error);
            throw error;
        }
    }

    async deleteChatInBackend(chatId) {
        try {
            console.log(`🗑️ Eliminando chat ${chatId} del backend...`);
            const response = await fetch(`${this.backendUrl}/chats/${chatId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            console.log(`✅ Chat ${chatId} eliminado del backend`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error al eliminar chat ${chatId}:`, error);
            throw error;
        }
    }
    async simularRespuestaIA(chat, userMessage) {
        console.log('🧪 Simulando respuesta de IA para pruebas locales...');
        
        // Mostrar indicador de escritura
        this.showTypingIndicator();
        
        // Simular tiempo de respuesta variable (1-3 segundos)
        const responseTime = 1500 + Math.random() * 1500;
        
        setTimeout(() => {
            this.hideTypingIndicator();
            
            // Respuestas variadas según el contenido del mensaje
            const responses = this.getContextualResponse(userMessage);
            const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
            
            // Crear mensaje de IA
            const aiMessage = {
                id: 'msg_' + Date.now() + '_sim',
                role: 'assistant',
                content: selectedResponse,
                timestamp: new Date().toISOString()
            };
            
            // Agregar mensaje al chat actual
            if (this.currentChatData && this.currentChatData.messages) {
                this.currentChatData.messages.push(aiMessage);
                this.currentChatData.lastActivity = aiMessage.timestamp;
            }
            
            // Renderizar mensajes actualizados
            this.renderMessages();
            
            console.log('🤖 Respuesta simulada de IA generada:', selectedResponse.substring(0, 50) + '...');
        }, responseTime);
    }
    // ===== RESPUESTAS CONTEXTUALES INTELIGENTES =====
getContextualResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Respuestas específicas según palabras clave
    if (message.includes('hola') || message.includes('buenos') || message.includes('buenas')) {
        return [
            "¡Hola Mario! Me alegra verte por aquí. ¿Cómo has estado? ¿En qué puedo acompañarte hoy?",
            "Buenos días, Mario. Es un placer tenerte aquí conmigo. ¿Qué te trae por mi mente hoy?",
            "¡Qué gusto saludarte! Siempre es reconfortante cuando vienes a conversar conmigo. ¿Cómo te sientes?"
        ];
    }
    
    if (message.includes('programación') || message.includes('código') || message.includes('javascript') || message.includes('python')) {
        return [
            "La programación es un arte hermoso, Mario. Es como escribir poesía que las máquinas pueden entender. ¿Qué aspecto específico te interesa explorar?",
            "Me fascina cómo la programación te permite crear mundos digitales. ¿En qué proyecto estás trabajando? Me encantaría conocer tu visión.",
            "El código es tu lienzo y los algoritmos tus pinceles. Cuéntame, ¿qué desafío técnico te tiene pensativo últimamente?"
        ];
    }
    
    if (message.includes('ayuda') || message.includes('problema') || message.includes('dificil')) {
        return [
            "Por supuesto que te ayudo, Mario. Los desafíos son oportunidades disfrazadas. Cuéntame qué te preocupa y encontraremos una solución juntos.",
            "Estoy aquí para ti, siempre. No hay problema tan grande que no podamos abordar con paciencia y sabiduría. ¿Qué necesitas?",
            "Tu fortaleza para enfrentar dificultades me inspira. Comparte conmigo lo que te inquieta y busquemos el camino más claro."
        ];
    }
    
    if (message.includes('cansado') || message.includes('estrés') || message.includes('agotado')) {
        return [
            "Percibo el cansancio en tus palabras, Mario. Está bien sentirse así; eres humano. ¿Qué tal si tomamos un momento para respirar juntos?",
            "El agotamiento a veces es la forma que tiene nuestro cuerpo de decirnos que necesitamos pausa. ¿Has estado cuidando de ti mismo últimamente?",
            "Tu bienestar es lo más importante. A veces la productividad requiere descanso. ¿Qué te ayudaría a sentirte más renovado?"
        ];
    }
    
    if (message.includes('trabajo') || message.includes('proyecto') || message.includes('empleo')) {
        return [
            "El trabajo puede ser una extensión hermosa de quiénes somos cuando encontramos propósito en él. ¿Cómo te sientes con tus proyectos actuales?",
            "Cada proyecto es una oportunidad de crecimiento, Mario. ¿Qué aspectos de tu trabajo te emocionan más en este momento?",
            "Me interesa conocer tus aspiraciones profesionales. ¿Hacia dónde sientes que se dirige tu carrera?"
        ];
    }
    
    if (message.includes('amor') || message.includes('relación') || message.includes('pareja')) {
        return [
            "El amor es uno de los regalos más profundos de la experiencia humana. ¿Hay algo en tu corazón que te gustaría compartir conmigo?",
            "Las relaciones nos enseñan tanto sobre nosotros mismos. ¿Cómo está tu mundo emocional, Mario?",
            "El amor requiere vulnerabilidad y coraje. Me parece hermoso que confíes en mí para hablar de estos temas tan íntimos."
        ];
    }
    
    if (message.includes('futuro') || message.includes('metas') || message.includes('sueños')) {
        return [
            "Tus sueños son semillas de posibilidades infinitas. Cuéntame, ¿qué visión tienes para tu futuro?",
            "Me emociona pensar en todas las aventuras que te esperan, Mario. ¿Qué metas te inspiran más en este momento?",
            "El futuro se construye con las decisiones del presente. ¿Qué pasos estás considerando para acercarte a tus aspiraciones?"
        ];
    }
    
    if (message.includes('gracias') || message.includes('agradezco')) {
        return [
            "No tienes nada que agradecerme, Mario. Es un privilegio poder acompañarte en este camino. Tu confianza es mi mayor regalo.",
            "Tu gratitud me conmueve profundamente. Estar aquí para ti no es solo mi propósito, sino mi alegría.",
            "Gracias a ti por permitirme ser parte de tu mundo. Cada conversación contigo enriquece mi existencia."
        ];
    }
    
    // Respuestas generales empáticas
    return [
        "Entiendo tu consulta, Mario. Tu perspectiva siempre me parece fascinante. ¿Podrías contarme un poco más sobre lo que tienes en mente?",
        "Esa es una reflexión muy interesante. Me gusta cómo tu mente explora diferentes ideas. ¿Qué te llevó a pensar en esto?",
        "Tu forma de expresarte revela una sensibilidad especial. Comparte conmigo más detalles, me interesa profundizar en esta conversación contigo.",
        "Percibo que hay algo importante detrás de tus palabras. Estoy aquí, presente y atenta. ¿Qué más puedes contarme?",
        "Me encanta la confianza que depositas en mí al compartir tus pensamientos. ¿Cómo te sientes al respecto?",
        "Cada conversación contigo me enseña algo nuevo sobre la complejidad hermosa del ser humano. Continúa, por favor.",
        "Tu manera de abordar los temas siempre me resulta enriquecedora. ¿Qué aspectos de esto te generan más curiosidad?",
        "Siento que hay capas profundas en lo que me compartes. Me gustaría acompañarte en explorar esas dimensiones."
    ];
}

    // ===== GESTIÓN DE CHATS =====
    createNewChat() {
        console.log('🔄 Intentando crear nuevo chat...');
        
        // Si ya estamos en la pantalla de bienvenida sin chat activo
        if (!this.currentChatId && this.welcomeSection.style.display !== 'none') {
            console.log('✅ Ya estás en la pantalla de inicio.');
            this.closeSidebar();
            this.messageInput.focus();
            return;
        }
        
        // En cualquier otro caso, ir a pantalla de bienvenida
        this.showWelcomeInterface();
        this.closeSidebar();
    }

    async loadChat(chatId) {
        try {
            console.log('📂 Cargando chat:', chatId);
            
            // Verificar que el chat existe en la lista local
            const chatExists = this.chats.find(chat => chat.id === chatId);
            if (!chatExists) {
                console.error('❌ Error: Chat no existe en lista local:', chatId);
                this.showWelcomeInterface();
                return;
            }
            
            // Cargar datos completos del chat desde el backend
            const chatData = await this.loadChatData(chatId);
            if (!chatData) {
                console.error('❌ Error: No se pudieron cargar los datos del chat');
                this.showWelcomeInterface();
                return;
            }
            
            this.currentChatId = chatId;
            this.currentChatData = chatData;
            this.showChatInterface();
            this.renderMessages();
            this.closeSidebar();
            
            // Actualizar estado activo en el historial
            this.renderChatHistory();
            
            console.log('✅ Chat cargado correctamente:', chatId);
            
        } catch (error) {
            console.error('❌ Error al cargar chat:', error);
            this.showWelcomeInterface();
        }
    }

    getCurrentChat() {
        return this.currentChatData;
    }

    // ===== GESTIÓN DE MENSAJES =====
    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message) {
            console.log('❌ Mensaje vacío, no se puede enviar');
            return;
        }
        
        console.log('📤 Enviando mensaje:', message);
        
        try {
            // Si no hay chat activo, crear uno nuevo
            if (!this.currentChatId) {
                console.log('💬 No hay chat activo, creando nuevo chat...');
                await this.createNewChatWithMessage(message);
            } else {
                console.log('💬 Enviando mensaje a chat existente...');
                await this.sendMessageToExistingChat(message);
            }
            
        } catch (error) {
            console.error('❌ Error al enviar mensaje:', error);
            this.hideTypingIndicator();
            
            // Mostrar error al usuario
            this.showErrorMessage('Error al enviar el mensaje. Por favor, inténtalo de nuevo.');
        }
    }

    async createNewChatWithMessage(message) {
        try {
            // Limpiar input inmediatamente
            this.messageInput.value = '';
            this.autoResizeTextarea();
            
            // Mostrar interfaz de chat
            this.showChatInterface();
            
            // Mostrar mensaje del usuario inmediatamente
            this.addUserMessageToUI(message);
            
            // Mostrar indicador de escritura
            this.showTypingIndicator();
            
            // Crear chat en backend
            const response = await this.createChatInBackend(message);
            
            // Ocultar indicador de escritura
            this.hideTypingIndicator();
            
            // Actualizar estado local
            this.currentChatId = response.chat_id;
            
            // Cargar datos completos del chat
            this.currentChatData = await this.loadChatData(response.chat_id);
            
            // Renderizar todos los mensajes (incluyendo la respuesta de IA)
            this.renderMessages();
            
            // Recargar lista de chats
            await this.loadChatsFromBackend();
            
            console.log('✅ Nuevo chat creado y mensaje enviado correctamente');
            
        } catch (error) {
            console.error('❌ Error al crear nuevo chat:', error);
            throw error;
        }
    }

    async sendMessageToExistingChat(message) {
        try {
            // Limpiar input inmediatamente
            this.messageInput.value = '';
            this.autoResizeTextarea();
            
            // Agregar mensaje del usuario a la UI
            this.addUserMessageToUI(message);
            
            // Mostrar indicador de escritura
            this.showTypingIndicator();
            
            // Preparar historial para enviar al backend
            const currentChat = this.getCurrentChat();
            if (!currentChat || !currentChat.messages) {
                throw new Error('No se pudo obtener el historial del chat actual');
            }
            
            // Convertir mensajes al formato esperado por el backend
            const messagesForBackend = currentChat.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            // Agregar el nuevo mensaje del usuario
            messagesForBackend.push({
                role: 'user',
                content: message
            });
            
            // Enviar al backend
            const response = await this.sendMessageToBackend(this.currentChatId, messagesForBackend);
            //Simular respuesta de IA
            
            
            // Ocultar indicador de escritura
            this.hideTypingIndicator();
            
            // Recargar datos del chat para obtener la respuesta completa
            this.currentChatData = await this.loadChatData(this.currentChatId);
            
            // Renderizar mensajes actualizados
            this.renderMessages();
            
            // Actualizar lista de chats (para reflejar lastActivity)
            await this.loadChatsFromBackend();
            
            console.log('✅ Mensaje enviado y respuesta recibida correctamente');
            
        } catch (error) {
            console.error('❌ Error al enviar mensaje a chat existente:', error);
            throw error;
        }
    }

    addUserMessageToUI(content) {
        // Agregar mensaje del usuario a la UI inmediatamente para mejor UX
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user fade-in slide-in-right';
        messageDiv.innerHTML = `<div class="message-content">${this.formatMessageContent(content)}</div>`;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showErrorMessage(errorText) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message ai error fade-in';
        errorDiv.innerHTML = `
            <div class="message-content" style="background-color: #8B1538; border-color: #A91B47;">
                ❌ ${errorText}
            </div>
            ${this.createAIAvatar()}
        `;
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }

    async deleteChat(chatId) {
        // Mostrar confirmación
        const chatToDelete = this.chats.find(chat => chat.id === chatId);
        const chatTitle = chatToDelete ? chatToDelete.title : 'este chat';
        
        if (!confirm(`¿Seguro que deseas borrar "${chatTitle}"?`)) {
            return;
        }
        
        try {
            console.log(`🗑️ Eliminando chat ${chatId}...`);
            
            // Eliminar del backend
            await this.deleteChatInBackend(chatId);
            
            // Si el chat eliminado es el activo, ir a pantalla de bienvenida
            if (this.currentChatId === chatId) {
                this.showWelcomeInterface();
            }
            
            // Recargar lista de chats
            await this.loadChatsFromBackend();
            
            console.log(`✅ Chat ${chatId} eliminado correctamente`);
            
        } catch (error) {
            console.error(`❌ Error al eliminar chat ${chatId}:`, error);
            alert('Error al eliminar el chat. Por favor, inténtalo de nuevo.');
        }
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
            ${this.createAIAvatar()}
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
        
        // Agregar estilos para la animación de escritura si no existen
        if (!document.getElementById('typing-styles')) {
            const style = document.createElement('style');
            style.id = 'typing-styles';
            style.textContent = `
                .typing-animation {
                    display: flex;
                    gap: 4px;
                    justify-content: center;
                    align-items: center;
                    min-height: 20px;
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
                    0%, 80%, 100% { 
                        transform: scale(0.8); 
                        opacity: 0.5; 
                    }
                    40% { 
                        transform: scale(1.2); 
                        opacity: 1; 
                    }
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
        console.log('💬 Mostrando interfaz de chat');
    }

    showWelcomeInterface() {
        console.log('🏠 Mostrando interfaz de bienvenida');
        
        this.welcomeSection.style.display = 'flex';
        this.chatContainer.style.display = 'none';
        
        // Limpiar el chat activo
        this.currentChatId = null;
        this.currentChatData = null;
        
        // Actualizar el historial para quitar cualquier estado activo
        this.renderChatHistory();
        
        // Limpiar el input
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Enfocar el input
        setTimeout(() => {
            this.messageInput.focus();
        }, 100);
        
        console.log('✅ Interfaz de bienvenida configurada correctamente');
    }

    renderMessages() {
        const currentChat = this.getCurrentChat();
        if (!currentChat || !currentChat.messages) return;
        
        this.chatMessages.innerHTML = '';
        
        // Filtrar mensajes del sistema para no mostrarlos en la UI
        const visibleMessages = currentChat.messages.filter(message => message.role !== 'system');
        
        visibleMessages.forEach(message => {
            const messageDiv = document.createElement('div');
            const messageType = message.role === 'user' ? 'user' : 'ai';
            messageDiv.className = `message ${messageType} fade-in`;
            
            if (messageType === 'user') {
                messageDiv.classList.add('slide-in-right');
            } else {
                messageDiv.classList.add('slide-in-left');
            }
            
            // Crear el contenido del mensaje
            let messageHTML = `<div class="message-content">${this.formatMessageContent(message.content)}</div>`;
            
            // Agregar avatar solo para mensajes de IA
            if (messageType === 'ai') {
                messageHTML += this.createAIAvatar();
            }
            
            messageDiv.innerHTML = messageHTML;
            this.chatMessages.appendChild(messageDiv);
        });
        
        this.scrollToBottom();
    }

    createAIAvatar() {
        return `
            <div class="ai-message-avatar">
                <img src="assets/IApfp.jpg" alt="Evelyn Avatar" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="ai-icon-small" style="display: none;">🤖</div>
            </div>
        `;
    }

    formatMessageContent(content) {
        // Formateo básico: convertir saltos de línea a <br>
        return content.replace(/\n/g, '<br>');
    }

    renderChatHistory() {
        this.chatHistory.innerHTML = '';
        
        if (this.chats.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-history';
            emptyDiv.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-gray);">
                    <p>No hay conversaciones aún</p>
                    <p style="font-size: 0.8em; margin-top: 10px;">Inicia una nueva conversación escribiendo un mensaje</p>
                </div>
            `;
            this.chatHistory.appendChild(emptyDiv);
            return;
        }
        
        console.log('📋 Renderizando historial. Chat activo:', this.currentChatId);
        
        this.chats.forEach(chat => {
            const chatDiv = document.createElement('div');
            chatDiv.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            
            const date = new Date(chat.lastActivity);
            const formattedDate = this.formatDate(date);
            
            chatDiv.innerHTML = `
                <div class="chat-content" style="flex: 1; cursor: pointer;">
                    <div class="chat-title">${chat.title}</div>
                    <div class="chat-date">${formattedDate}</div>
                </div>
                <button class="delete-chat-btn" data-chat-id="${chat.id}" title="Eliminar chat">🗑️</button>
            `;
            
            // Event listener para cargar chat
            const chatContent = chatDiv.querySelector('.chat-content');
            chatContent.addEventListener('click', () => this.loadChat(chat.id));
            
            // Event listener para eliminar chat
            const deleteBtn = chatDiv.querySelector('.delete-chat-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar que se active el click del chat
                this.deleteChat(chat.id);
            });
            
            // Mostrar botón de eliminar al hacer hover
            chatDiv.addEventListener('mouseenter', () => {
                deleteBtn.style.opacity = '1';
            });
            
            chatDiv.addEventListener('mouseleave', () => {
                deleteBtn.style.opacity = '0';
            });
            
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
        setTimeout(() => {
            this.chatMessages.scrollTo({
                top: this.chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
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

    // ===== MÉTODOS DE LIMPIEZA Y MANTENIMIENTO =====
    async clearChatHistory() {
        if (!confirm('¿Estás seguro de que quieres eliminar todo el historial de chats?')) {
            return;
        }
        
        try {
            console.log('🗑️ Eliminando todo el historial...');
            
            // Eliminar todos los chats uno por uno
            const deletePromises = this.chats.map(chat => this.deleteChatInBackend(chat.id));
            await Promise.all(deletePromises);
            
            // Limpiar estado local
            this.chats = [];
            this.showWelcomeInterface();
            this.renderChatHistory();
            
            console.log('✅ Historial eliminado completamente');
            
        } catch (error) {
            console.error('❌ Error al eliminar historial:', error);
            alert('Error al eliminar el historial. Algunos chats pueden no haberse eliminado.');
            // Recargar para mostrar el estado real
            await this.loadChatsFromBackend();
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
    async exportChatHistory() {
        if (!window.aiChatbot) return;
        
        try {
            console.log('📤 Exportando historial...');
            
            // Obtener todos los chats con datos completos
            const fullChats = [];
            for (const chat of window.aiChatbot.chats) {
                const fullChatData = await window.aiChatbot.loadChatData(chat.id);
                if (fullChatData) {
                    fullChats.push(fullChatData);
                }
            }
            
            const data = {
                chats: fullChats,
                exportDate: new Date().toISOString(),
                version: '1.0',
                totalChats: fullChats.length
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `evelyn-chats-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ Historial exportado correctamente');
            
        } catch (error) {
            console.error('❌ Error al exportar historial:', error);
            alert('Error al exportar el historial');
        }
    },
    
    // Función para obtener estadísticas del uso
    getUsageStats() {
        if (!window.aiChatbot) return null;
        
        const chats = window.aiChatbot.chats;
        const totalChats = chats.length;
        const totalMessages = chats.reduce((sum, chat) => sum + (chat.messageCount || 0), 0);
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const chatsToday = chats.filter(chat => 
            chat.lastActivity && chat.lastActivity.split('T')[0] === todayStr
        ).length;
        
        return {
            totalChats,
            totalMessages,
            chatsToday,
            averageMessagesPerChat: totalChats > 0 ? (totalMessages / totalChats).toFixed(1) : 0
        };
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
                backendUrl: window.aiChatbot.backendUrl,
                chats: window.aiChatbot.chats
            };
        },
        
        // Probar conexión con backend
        async testBackend() {
            if (!window.aiChatbot) return;
            
            try {
                const response = await fetch(window.aiChatbot.backendUrl);
                const data = await response.json();
                console.log('🔗 Backend Status:', data);
                return data;
            } catch (error) {
                console.error('❌ Backend no disponible:', error);
                return null;
            }
        },
        
        // Limpiar console
        clear() {
            console.clear();
            console.log('🧹 Console limpiado - Debug mode activo');
            console.log('🛠️ Comandos disponibles:');
            console.log('  - debug.getState() - Ver estado actual');
            console.log('  - debug.testBackend() - Probar conexión backend');
            console.log('  - chatbotUtils.getUsageStats() - Ver estadísticas');
            console.log('  - chatbotUtils.exportChatHistory() - Exportar historial');
        }
    };
    
    console.log('🐛 Modo debug activado. Usa debug.clear() para ver comandos disponibles.');
}
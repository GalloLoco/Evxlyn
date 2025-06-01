import openai
from dotenv import load_dotenv
import os
import json
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import glob

# Cargar variables del archivo .env
load_dotenv()

# Usar la variable de entorno
api_key = os.getenv("OPEN_API_KEY")
if not api_key:
    raise ValueError("API key no encontrada. Asegúrate de definir OPEN_API_KEY en tu archivo .env")

client = openai.OpenAI(api_key=api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directorio donde se guardarán los chats
CHATS_DIR = "chats"

# Crear directorio si no existe
os.makedirs(CHATS_DIR, exist_ok=True)

# ===== MODELOS PYDANTIC =====
class Message(BaseModel):
    id: str
    role: str  # "system", "user", "assistant"
    content: str
    timestamp: str

class Chat(BaseModel):
    id: str
    title: str
    createdAt: str
    lastActivity: str
    messages: List[Message]

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]  # Para recibir el historial completo

class NewChatRequest(BaseModel):
    message: str  # Primer mensaje del usuario

# ===== UTILIDADES PARA MANEJO DE ARCHIVOS =====
def get_chat_file_path(chat_id: str) -> str:
    """Obtiene la ruta del archivo de chat"""
    return os.path.join(CHATS_DIR, f"{chat_id}.json")

def load_chat_from_file(chat_id: str) -> Chat:
    """Carga un chat desde el archivo JSON"""
    file_path = get_chat_file_path(chat_id)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Chat {chat_id} no encontrado")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return Chat(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al cargar chat: {str(e)}")

def save_chat_to_file(chat: Chat) -> None:
    """Guarda un chat en el archivo JSON"""
    file_path = get_chat_file_path(chat.id)
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(chat.dict(), f, indent=2, ensure_ascii=False)
        print(f"💾 Chat {chat.id} guardado correctamente")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar chat: {str(e)}")

def get_all_chats() -> List[Dict[str, Any]]:
    """Obtiene la lista de todos los chats (metadatos únicamente)"""
    chats = []
    
    # Buscar todos los archivos .json en el directorio de chats
    chat_files = glob.glob(os.path.join(CHATS_DIR, "*.json"))
    
    for file_path in chat_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Solo incluir metadatos para la lista
            chat_metadata = {
                "id": data["id"],
                "title": data["title"],
                "createdAt": data["createdAt"],
                "lastActivity": data["lastActivity"],
                "messageCount": len(data["messages"]) - 1  # -1 para excluir el mensaje system
            }
            chats.append(chat_metadata)
            
        except Exception as e:
            print(f"⚠️ Error al leer {file_path}: {str(e)}")
            continue
    
    # Ordenar por última actividad (más recientes primero)
    chats.sort(key=lambda x: x["lastActivity"], reverse=True)
    return chats

def create_system_message() -> Message:
    """Crea el mensaje system inicial que siempre debe estar presente"""
    return Message(
        id="msg_1",
        role="system",
        content="Eres Evelyn, una mujer emocionalmente madura, comprensiva y sabia que acompaña a Mario.",
        timestamp=datetime.now().isoformat()
    )

def generate_chat_id() -> str:
    """Genera un ID único para el chat basado en timestamp"""
    timestamp = int(datetime.now().timestamp() * 1000)
    return f"chat_{timestamp}"

def generate_message_id() -> str:
    """Genera un ID único para un mensaje"""
    timestamp = int(datetime.now().timestamp() * 1000)
    unique_suffix = str(uuid.uuid4())[:8]
    return f"msg_{timestamp}_{unique_suffix}"

def truncate_title(text: str, max_length: int = 30) -> str:
    """Trunca el texto para crear un título apropiado"""
    if len(text) <= max_length:
        return text
    return text[:max_length].rstrip() + "..."

# ===== ENDPOINTS =====

@app.get("/chats")
async def get_chats():
    """Obtiene la lista de todos los chats"""
    try:
        chats = get_all_chats()
        return {"chats": chats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener chats: {str(e)}")

@app.get("/chats/{chat_id}")
async def get_chat(chat_id: str):
    """Obtiene un chat específico con todo su historial"""
    try:
        chat = load_chat_from_file(chat_id)
        return chat.dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener chat: {str(e)}")

@app.post("/chats")
async def create_new_chat(request: NewChatRequest):
    """Crea un nuevo chat con el primer mensaje del usuario"""
    try:
        # Generar ID para el nuevo chat
        chat_id = generate_chat_id()
        current_time = datetime.now().isoformat()
        
        # Crear mensaje system (siempre msg_1)
        system_message = create_system_message()
        
        # Crear mensaje del usuario
        user_message = Message(
            id=generate_message_id(),
            role="user",
            content=request.message,
            timestamp=current_time
        )
        
        # Crear el chat inicial
        chat = Chat(
            id=chat_id,
            title=truncate_title(request.message),
            createdAt=current_time,
            lastActivity=current_time,
            messages=[system_message, user_message]
        )
        
        # Preparar mensajes para OpenAI (formato esperado por la API)
        openai_messages = [
            {"role": msg.role, "content": msg.content} 
            for msg in chat.messages
        ]
        
        # Obtener respuesta de OpenAI
        print(f"🧠 Enviando {len(openai_messages)} mensajes a OpenAI...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            temperature=0.8,
        )
        
        # Crear mensaje de respuesta de Evelyn
        ai_message = Message(
            id=generate_message_id(),
            role="assistant",
            content=response.choices[0].message.content.strip(),
            timestamp=datetime.now().isoformat()
        )
        
        # Agregar respuesta al chat
        chat.messages.append(ai_message)
        chat.lastActivity = ai_message.timestamp
        
        # Guardar chat en archivo
        save_chat_to_file(chat)
        
        print(f"✅ Nuevo chat creado: {chat_id}")
        return {
            "chat_id": chat_id,
            "title": chat.title,
            "ai_response": ai_message.content
        }
        
    except Exception as e:
        print(f"❌ Error al crear chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al crear chat: {str(e)}")

@app.post("/chats/{chat_id}/message")
async def send_message_to_chat(chat_id: str, request: ChatRequest):
    """Envía un mensaje a un chat existente"""
    try:
        # Cargar chat existente
        chat = load_chat_from_file(chat_id)
        
        print(f"📤 Procesando mensaje para chat {chat_id}")
        print(f"📊 Mensajes recibidos: {len(request.messages)}")
        
        # Validar que el historial recibido coincida con el almacenado
        stored_message_count = len(chat.messages)
        received_message_count = len(request.messages)
        
        if received_message_count != stored_message_count:
            print(f"⚠️ Discrepancia en cantidad de mensajes: almacenados={stored_message_count}, recibidos={received_message_count}")
        
        # Usar el historial recibido del frontend (que incluye el nuevo mensaje del usuario)
        openai_messages = request.messages
        
        # Obtener respuesta de OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            temperature=0.8,
        )
        
        # Crear mensaje de respuesta
        ai_message = Message(
            id=generate_message_id(),
            role="assistant",
            content=response.choices[0].message.content.strip(),
            timestamp=datetime.now().isoformat()
        )
        
        # Agregar el nuevo mensaje del usuario y la respuesta de IA al chat almacenado
        # El último mensaje en request.messages debería ser el nuevo mensaje del usuario
        if openai_messages and openai_messages[-1]["role"] == "user":
            user_message = Message(
                id=generate_message_id(),
                role="user",
                content=openai_messages[-1]["content"],
                timestamp=datetime.now().isoformat()
            )
            chat.messages.append(user_message)
        
        # Agregar respuesta de IA
        chat.messages.append(ai_message)
        chat.lastActivity = ai_message.timestamp
        
        # Actualizar título si es necesario (solo si tiene pocos mensajes)
        if len(chat.messages) <= 4 and openai_messages:  # system + user + ai + user = 4
            latest_user_message = next(
                (msg["content"] for msg in reversed(openai_messages) if msg["role"] == "user"), 
                None
            )
            if latest_user_message:
                chat.title = truncate_title(latest_user_message)
        
        # Guardar chat actualizado
        save_chat_to_file(chat)
        
        print(f"✅ Mensaje procesado para chat {chat_id}")
        return {"reply": ai_message.content}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error al procesar mensaje: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar mensaje: {str(e)}")

@app.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str):
    """Elimina un chat completamente"""
    try:
        file_path = get_chat_file_path(chat_id)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Chat {chat_id} no encontrado")
        
        # Eliminar archivo
        os.remove(file_path)
        print(f"🗑️ Chat {chat_id} eliminado correctamente")
        
        return {"message": f"Chat {chat_id} eliminado correctamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar chat: {str(e)}")

@app.get("/")
async def root():
    """Endpoint de salud"""
    chat_count = len(get_all_chats())
    return {
        "message": "Evelyn Backend API funcionando correctamente",
        "chats_stored": chat_count,
        "chats_directory": CHATS_DIR
    }

# ===== LIMPIEZA INICIAL =====
@app.on_event("startup")
async def startup_event():
    """Eventos de inicio del servidor"""
    print("🚀 Iniciando Evelyn Backend...")
    print(f"📁 Directorio de chats: {os.path.abspath(CHATS_DIR)}")
    
    # Limpiar chats de prueba existentes si es necesario
    existing_chats = get_all_chats()
    print(f"📊 Chats existentes encontrados: {len(existing_chats)}")
    
    for chat in existing_chats:
        print(f"  - {chat['id']}: {chat['title']}")
    
    print("✅ Backend inicializado correctamente")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
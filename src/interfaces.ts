export interface tipoRespuesta {
    tipo: 'success' | 'error' | 'info';
    mensaje: string;
    transcripcion?: string;
    datos?: any;
    token?: string;
    total?: number;
}

export interface responseEstructure {
    funcion: string;
    content: string;
    role: "system" | "user" | "assistant";
    data?: any
}

export interface ChatInterface {
    role: 'user' | 'system' | 'assistant';
    content: string;
}
export type DireccionMensaje = "ENTRADA" | "SALIDA";
export type EstadoMensaje = "RECIBIDO" | "ENVIADO" | "ENTREGADO" | "LEIDO" | "FALLIDO";
export type TipoMensaje =
  | "TEXTO"
  | "IMAGEN"
  | "AUDIO"
  | "VIDEO"
  | "DOCUMENTO"
  | "STICKER"
  | "UBICACION"
  | "REACCION"
  | "TEMPLATE"
  | "INTERACTIVO"
  | "DESCONOCIDO";

export type ProveedorIA = "OPENAI" | "GEMINI" | "DEEPSEEK";

export interface MensajeWhatsapp {
  id?: number;
  waMessageId?: string;
  fromNumber: string;
  toNumber: string;
  phoneNumberId?: string;
  nombreContacto?: string | null;
  tipo?: TipoMensaje;
  direccion: DireccionMensaje;
  contenido: string;
  mediaUrl?: string;
  mediaId?: string;
  estado: EstadoMensaje;
  esRespuestaChatbot: boolean;
  campanaId?: number;
  registroClienteId?: number;
  createdAt: string;
}

export type EstadoConversacion = "ABIERTA" | "EN_REGISTRO" | "ESPERANDO_AGENTE" | "FINALIZADA";
export type TipoAtencion = "BOT" | "HUMANO";

export interface ConversacionResumen {
  numero: string;
  nombreContacto?: string | null;
  ultimoMensaje: string;
  fechaUltimo: string;
  noLeidos: number;
  ultimaEsChatbot: boolean;
  estado?: EstadoConversacion;
  atendidoPor?: TipoAtencion;
  botSilenciado?: boolean;
  operadorAsignado?: string | null;
}

export interface FaqItem {
  pregunta: string;
  respuesta: string;
  keywords: string[];
}

export type ModoRegistroWa = "PASO_A_PASO" | "COMPACTO" | "SOLO_WEB";

export interface ChatbotConfig {
  activo: boolean;
  proveedorIa: ProveedorIA;
  apiKeyEnmascarado: string;
  modelo: string;
  baseUrl?: string;
  promptSistema: string;
  temperatura: number;
  maxTokens: number;
  umbralSimilitudFaq: number;
  faqs: FaqItem[];
  updatedAt?: string;
  webhookPublicUrl?: string;
  verifyToken?: string;
  waAccessTokenEnmascarado?: string;
  waPhoneNumberId?: string;
  waNumero1?: string;
  waPhoneNumberId2?: string;
  waNumero2?: string;
  waVerifyToken?: string;
  waHeaderImageUrl?: string;
  modoRegistroWa?: ModoRegistroWa;
  cantidadFotosRequeridas?: number;
  mensajeRedireccionWeb?: string;
}

export interface ChatbotConfigRequest {
  activo: boolean;
  proveedorIa: ProveedorIA;
  apiKey?: string;
  modelo: string;
  baseUrl?: string;
  promptSistema: string;
  temperatura: number;
  maxTokens: number;
  umbralSimilitudFaq: number;
  faqs: FaqItem[];
  waAccessToken?: string;
  waPhoneNumberId?: string;
  waNumero1?: string;
  waPhoneNumberId2?: string;
  waNumero2?: string;
  waVerifyToken?: string;
  waHeaderImageUrl?: string;
  modoRegistroWa?: ModoRegistroWa;
  cantidadFotosRequeridas?: number;
  mensajeRedireccionWeb?: string;
}


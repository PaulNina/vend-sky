export interface CampanaCliente {
  id: number;
  nombre: string;
  subtitulo?: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  registroHabilitado: boolean;
  ruletaHabilitada: boolean;
  webHabilitada: boolean;
  chatbotHabilitado: boolean;
  premioFinalMonto: number;
  premioFinalDescripcion?: string;
  terminosCondiciones?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampanaClienteProducto {
  id: number;
  campanaClienteId?: number;
  producto: {
    id: number;
    modelo?: string;
    modeloCodigo?: string;
    tamanoPulgadas?: number;
    pulgadas?: number;
    nombre?: string;
  };
  tickets: number;
  activo: boolean;
}

export interface PremioRuleta {
  id: number;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  colorHex?: string;
  probabilidadPeso: number;
  activo: boolean;
  ordenRuleta?: number;
}

export interface EntregaRuleta {
  id: number;
  registroClienteId?: number;
  campanaClienteId?: number;
  premioRuleta?: PremioRuleta;
  impulsadorId?: number;
  impulsadorNombre?: string;
  fechaGiro: string;
  fotoEntrega?: string;
  revertido?: boolean;
}

export interface InventarioImpulsador {
  id: number;
  campanaClienteId?: number;
  premioRuleta: PremioRuleta;
  vendedorId: number;
  vendedorNombre?: string;
  cantidadAsignada: number;
  cantidadEntregada: number;
  saldo: number;
  updatedAt?: string;
}

export type CanalRegistro = "BANDEO" | "WEB" | "CHATBOT";
export type EstadoRegistro = "PENDIENTE" | "EN_REVISION" | "OBSERVADO" | "RECHAZADO" | "APROBADO";

export interface RegistroCliente {
  id: number;
  canalRegistro: CanalRegistro;
  impulsadorId?: number;
  impulsadorNombre?: string;
  nombreCliente: string;
  apellidoCliente: string;
  ci: string;
  celular: string;
  email?: string;
  ciudad: string;
  puntoVenta?: string;
  productoId?: number;
  productoModelo?: string;
  productoPulgadas?: number;
  serial: string;
  fechaCompra: string;
  fotoTag?: string;
  fotoPoliza?: string;
  fotoNota?: string;
  fotoCiAnverso?: string;
  fotoCiReverso?: string;
  estado: EstadoRegistro;
  supervisorId?: number;
  supervisorNombre?: string;
  fechaRevision?: string;
  motivoObservacion?: string;
  historialRevisiones?: string;
  createdAt: string;
  updatedAt?: string;
  campanaClienteId?: number;
  campanaClienteNombre?: string;
}

export type EstadoTicket = "NO_HABILITADO" | "HABILITADO" | "PREMIADO" | "ANULADO";

export interface TicketCliente {
  id: number;
  codigoTicket: string;
  campanaClienteId?: number;
  campanaClienteNombre?: string;
  campanaCliente?: {
    id: number;
    nombre: string;
  };
  clienteCi: string;
  clienteNombre: string;
  clienteCelular: string;
  serial: string;
  productoModelo?: string;
  estado: EstadoTicket;
  excluidoQuincenal: boolean;
  createdAt?: string;
}

export type TipoSorteo = "QUINCENAL" | "FINAL";

export interface SorteoPeriodo {
  id: number;
  nombre: string;
  tipoSorteo: TipoSorteo;
  fechaSorteo: string;
  fechaCorteRegistro?: string;
  descripcionPremios?: string;
  ejecutado: boolean;
  fechaEjecucion?: string;
  usuarioEjecutor?: string;
}

export interface SorteoGanador {
  id: number;
  clienteNombre: string;
  clienteCi: string;
  clienteCelular: string;
  serial: string;
  productoModelo: string;
  premio: string;
  orden: number;
  evidenciaActaUrl?: string;
  ticketCliente?: {
    codigoTicket: string;
  };
  ticketVendedor?: {
    numeroTicket: string;
  };
  tipoParticipante?: "CLIENTE" | "VENDEDOR" | "TIENDA";
  createdAt?: string;
}

export interface SerialValidationResponse {
  valido: boolean;
  mensaje?: string;
  serial?: string;
  modelo?: string;
  pulgadas?: number;
  productoId?: number;
  ticketsProyectados?: number;
  campanaId?: number;
  campanaNombre?: string;
}

export interface ConsultarTicketsResponse {
  ci: string;
  totalTickets: number;
  ticketsHabilitados: number;
  registros: RegistroCliente[];
  tickets: TicketCliente[];
}

export interface CampanaActivaResponse {
  activa: boolean;
  campana?: CampanaCliente;
  productos?: CampanaClienteProducto[];
  mensaje?: string;
}

export interface CampanaDetalleResponse {
  campana: CampanaCliente;
  productos: CampanaClienteProducto[];
  premiosRuleta: PremioRuleta[];
}

export interface VendedorSimple {
  id: number;
  nombreCompleto: string;
  ci: string;
  telefono: string;
  ciudad?: string;
  tienda?: string;
  activo: boolean;
}

export interface VendedorPageResponse {
  content: VendedorSimple[];
  totalPages: number;
  totalElements: number;
}

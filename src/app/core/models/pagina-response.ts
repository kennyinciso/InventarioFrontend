export interface PaginaResponse<T> {
  contenido: T[];
  pagina: number;
  tamanio: number;
  totalElementos: number;
  totalPaginas: number;
  ultima: boolean;
}
export interface Cliente {
id: number;
dni: string;
nombres: string;
apellidos: string;
email: string;
telefono: string | null;
direccion: string | null;
estado: boolean;
fechaCreacion: string;
fechaModificacion: string | null;
}
export interface ClienteRequest {
dni: string;
nombres: string;
apellidos: string;
email: string;
telefono: string | null;
direccion: string | null;
estado: boolean;
}
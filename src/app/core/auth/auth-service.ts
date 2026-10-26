import { computed, inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, Perfil, Permiso, Sesion } from './auth.model';

/** Clave con la que se guarda la sesión en sessionStorage. */
const CLAVE_SESION = 'pharmasoft.sesion';

/** El aviso aparece cuando quedan estos segundos o menos. */
const SEGUNDOS_AVISO = 120;

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/auth`;

  private readonly sesionActual = signal<Sesion | null>(this.leerSesionGuardada());
  private temporizador?: ReturnType<typeof setTimeout>;
  private intervalo?: ReturnType<typeof setInterval>;

  readonly sesion = this.sesionActual.asReadonly();
  readonly autenticado = computed(() => this.sesionActual() !== null);

  /** Segundos que faltan para que venza el token (se actualiza cada segundo). */
  readonly segundosRestantes = signal(0);
  /** true cuando hay sesión y quedan 120 segundos o menos. */
  readonly porVencer = computed(
    () => this.autenticado() && this.segundosRestantes() <= SEGUNDOS_AVISO,
  );
  /** true si el usuario pulsó «×»; se reinicia en la siguiente sesión. */
  readonly avisoOculto = signal(false);

  constructor() {
    const sesion = this.sesionActual();
    if (sesion) this.programarExpiracion(sesion);
  }

  /** Envía las credenciales; si son correctas, guarda la sesión. */
  login(credenciales: LoginRequest): Observable<Sesion> {
    return this.http.post<LoginResponse>(`${this.url}/login`, credenciales).pipe(
      map(r => ({
        token: r.token,
        expiraEn: Date.now() + r.expiraEnSegundos * 1000,
        username: r.username,
        nombreCompleto: r.nombreCompleto,
        roles: r.roles,
        permisos: r.permisos,
      })),
      tap(sesion => this.iniciar(sesion)),
    );
  }

  /** Datos del usuario tal como los conoce el servidor. */
  obtenerPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.url}/me`);
  }

  /**
   * Cierra la sesión y vuelve al login.
   * Si la causa es la expiración, el login lo avisa y, tras entrar de nuevo,
   * regresa a la página donde estaba el usuario.
   */
  cerrarSesion(motivo?: 'expirada', volverA?: string): void {
    clearTimeout(this.temporizador);
    this.detenerCuentaRegresiva();
    this.segundosRestantes.set(0);
    sessionStorage.removeItem(CLAVE_SESION);
    this.sesionActual.set(null);

    const queryParams: Record<string, string> = {};
    if (motivo) queryParams['expirada'] = '1';
    if (volverA && volverA !== '/login') queryParams['returnUrl'] = volverA;
    this.router.navigate(['/login'], { queryParams });
  }

  /** Oculta el aviso hasta la siguiente sesión. */
  ocultarAviso(): void {
    this.avisoOculto.set(true);
  }

  /** Token vigente o null si no hay sesión o ya venció. */
  token(): string | null {
    const sesion = this.sesionActual();
    return sesion && Date.now() < sesion.expiraEn ? sesion.token : null;
  }

  /** true si el usuario tiene el permiso (lee un signal: es reactivo). */
  tienePermiso(permiso: Permiso): boolean {
    return this.sesionActual()?.permisos.includes(permiso) ?? false;
  }

  private iniciar(sesion: Sesion): void {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    this.sesionActual.set(sesion);
    this.avisoOculto.set(false);
    this.programarExpiracion(sesion);
  }

  private programarExpiracion(sesion: Sesion): void {
    clearTimeout(this.temporizador);
    const restante = sesion.expiraEn - Date.now();
    this.temporizador = setTimeout(
      () => this.cerrarSesion('expirada', this.router.url),
      Math.max(restante, 0),
    );
    this.iniciarCuentaRegresiva(sesion.expiraEn);
  }

  /** Actualiza segundosRestantes cada segundo, sin dejar intervalos huérfanos. */
  private iniciarCuentaRegresiva(expiraEn: number): void {
    this.detenerCuentaRegresiva();
    const calcular = () => Math.max(0, Math.floor((expiraEn - Date.now()) / 1000));
    this.segundosRestantes.set(calcular());
    this.intervalo = setInterval(() => {
      const segundos = calcular();
      this.segundosRestantes.set(segundos);
      if (segundos === 0) this.detenerCuentaRegresiva();
    }, 1000);
  }

  private detenerCuentaRegresiva(): void {
    if (this.intervalo !== undefined) {
      clearInterval(this.intervalo);
      this.intervalo = undefined;
    }
  }

  /** Recupera la sesión tras recargar la página; descarta la vencida o dañada. */
  private leerSesionGuardada(): Sesion | null {
    try {
      const texto = sessionStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion = JSON.parse(texto) as Sesion;
      if (!sesion.token || Date.now() >= sesion.expiraEn) {
        sessionStorage.removeItem(CLAVE_SESION);
        return null;
      }
      return sesion;
    } catch {
      sessionStorage.removeItem(CLAVE_SESION);
      return null;
    }
  }
}
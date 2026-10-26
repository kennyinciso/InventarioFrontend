import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Perfil, Permiso } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth-service';
import { mensajeError } from '../../../../core/utils/http-error';

const MODULOS: { nombre: string; permisos: Permiso[] }[] = [
  { nombre: 'Catálogo', permisos: ['CATALOGO_LEER', 'CATALOGO_ESCRIBIR'] },
  { nombre: 'Clientes', permisos: ['CLIENTES_LEER', 'CLIENTES_ESCRIBIR'] },
  { nombre: 'Ventas', permisos: ['VENTAS_LEER', 'VENTAS_REGISTRAR'] },
  { nombre: 'Reportes', permisos: ['REPORTES_VER'] },
  { nombre: 'Usuarios', permisos: ['USUARIOS_ADMINISTRAR'] },
];

@Component({
  selector: 'app-mi-cuenta',
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta implements OnInit {
  private readonly auth = inject(AuthService);

  protected readonly perfil = signal<Perfil | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Permisos agrupados por módulo, cada uno con su marca ✔ o ✘. */
  protected readonly modulos = computed(() => {
    const p = this.perfil();
    if (!p) return [];
    return MODULOS.map(m => ({
      nombre: m.nombre,
      permisos: m.permisos.map(codigo => ({ codigo, concedido: p.permisos.includes(codigo) })),
    }));
  });

  /** true si los permisos del servidor difieren de los guardados en la sesión. */
  protected readonly permisosCambiaron = computed(() => {
    const p = this.perfil();
    const s = this.auth.sesion();
    if (!p || !s) return false;
    const servidor = [...p.permisos].sort();
    const sesion = [...s.permisos].sort();
    return servidor.length !== sesion.length || servidor.some((x, i) => x !== sesion[i]);
  });

  ngOnInit(): void {
    this.auth.obtenerPerfil().subscribe({
      next: datos => {
        this.perfil.set(datos);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }
}
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { PaginaResponse } from '../../../../core/models/pagina-response';
import { Cliente } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente-service';

type CampoOrden = 'dni' | 'apellidos';

@Component({
  selector: 'app-cliente-list',
  imports: [RouterLink],
  templateUrl: './cliente-list.html',
  styleUrl: './cliente-list.css',
})
export class ClienteList implements OnInit {
  private readonly service = inject(ClienteService);

  readonly opcionesTamanio = [5, 10, 20];

  // Estado de la consulta
  readonly pagina = signal(0);
  readonly tamanio = signal(10);
  readonly ordenarPor = signal<CampoOrden>('apellidos');
  readonly direccion = signal<'asc' | 'desc'>('asc');
  readonly busqueda = signal('');

  // Estado de la vista
  readonly datos = signal<PaginaResponse<Cliente> | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  // Filtra solo la página actual
  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const lista = this.datos()?.contenido ?? [];
    if (!texto) return lista;
    return lista.filter(
      (c) =>
        c.dni.includes(texto) ||
        `${c.nombres} ${c.apellidos}`.toLowerCase().includes(texto),
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.service
      .listar(this.pagina(), this.tamanio(), this.ordenarPor(), this.direccion())
      .subscribe({
        next: (res) => {
          this.datos.set(res);
          this.cargando.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(this.mensajeError(err));
          this.cargando.set(false);
        },
      });
  }

  anterior(): void {
    if (this.pagina() > 0) {
      this.pagina.update((p) => p - 1);
      this.cargar();
    }
  }

  siguiente(): void {
    if (!this.datos()?.ultima) {
      this.pagina.update((p) => p + 1);
      this.cargar();
    }
  }

  cambiarTamanio(e: Event): void {
    this.tamanio.set(Number((e.target as HTMLSelectElement).value));
    this.pagina.set(0);
    this.cargar();
  }

  ordenar(campo: CampoOrden): void {
    if (this.ordenarPor() === campo) {
      this.direccion.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.ordenarPor.set(campo);
      this.direccion.set('asc');
    }
    this.pagina.set(0);
    this.cargar();
  }

  flecha(campo: CampoOrden): string {
    if (this.ordenarPor() !== campo) return '';
    return this.direccion() === 'asc' ? '▲' : '▼';
  }

  onBuscar(e: Event): void {
    this.busqueda.set((e.target as HTMLInputElement).value);
  }

  darDeBaja(c: Cliente): void {
    if (!confirm(`¿Dar de baja a ${c.nombres} ${c.apellidos}?`)) return;
    this.service.eliminar(c.id).subscribe({
      next: () => this.cargar(), // baja lógica: la fila pasa a "Inactivo"
      error: (err: HttpErrorResponse) => this.error.set(this.mensajeError(err)),
    });
  }

  private mensajeError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
    }
    return err.error?.mensaje ?? err.error?.message ?? 'Ocurrió un error inesperado.';
  }
}
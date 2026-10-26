import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClienteRequest } from '../../models/cliente.model';
import { ClienteService } from '../../services/cliente-service';

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.css',
})
export class ClienteForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(ClienteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly id = signal<number | null>(null);
  readonly error = signal('');
  readonly guardando = signal(false);

  readonly form = this.fb.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    telefono: ['', [Validators.pattern(/^\d{9}$/)]],
    direccion: ['', [Validators.maxLength(250)]],
    estado: [true],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id.set(Number(idParam));
      this.service.obtener(Number(idParam)).subscribe({
        next: (c) =>
          this.form.patchValue({
            dni: c.dni,
            nombres: c.nombres,
            apellidos: c.apellidos,
            email: c.email,
            telefono: c.telefono ?? '',
            direccion: c.direccion ?? '',
            estado: c.estado,
          }),
        error: (err: HttpErrorResponse) => this.error.set(this.mensajeError(err)),
      });
    }
  }

  campoInvalido(nombre: string): boolean {
    const c = this.form.get(nombre);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto: ClienteRequest = {
      ...v,
      telefono: v.telefono.trim() || null, // "" provocaría un 400
      direccion: v.direccion.trim() || null,
    };

    this.guardando.set(true);
    this.error.set('');
    const id = this.id();
    const peticion = id ? this.service.actualizar(id, dto) : this.service.crear(dto);

    peticion.subscribe({
      next: () => this.router.navigate(['/clientes']),
      error: (err: HttpErrorResponse) => {
        this.error.set(this.mensajeError(err));
        this.guardando.set(false);
      },
    });
  }

  private mensajeError(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.';
    }
    return err.error?.mensaje ?? err.error?.message ?? 'Ocurrió un error inesperado.';
  }
}
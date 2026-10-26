// src/app/shared/components/aviso-sesion/aviso-sesion.ts
import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth-service';

@Component({
  selector: 'app-aviso-sesion',
  template: `
    @if (auth.porVencer() && !auth.avisoOculto()) {
      <div class="aviso-sesion">
        <span>⚠ Su sesión vence en {{ tiempo() }}.</span>
        <button type="button" class="btn" (click)="auth.cerrarSesion()">Cerrar sesión ahora</button>
        <button type="button" class="cerrar" aria-label="Ocultar aviso" (click)="auth.ocultarAviso()">×</button>
      </div>
    }
  `,
  styles: `
    .aviso-sesion {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 10px 16px; margin-bottom: 12px; border-radius: 8px;
      background: #fff6dc; color: #7a5200; font-weight: 600;
    }
    .cerrar {
      margin-left: auto; border: none; background: none; cursor: pointer;
      font-size: 20px; line-height: 1; color: inherit;
    }
  `,
})
export class AvisoSesion {
  protected readonly auth = inject(AuthService);

  /** Cuenta regresiva en formato mm:ss. */
  protected readonly tiempo = computed(() => {
    const s = this.auth.segundosRestantes();
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  });
}
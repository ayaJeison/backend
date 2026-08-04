import { Body, Controller, Post, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { tipoRespuesta } from '../interfaces';
import { AuthGuard } from '../authGuard';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) { }

    @Throttle({ medium: {} }) // Limitar a 20 solicitudes por segundo
    @Post('login')
    async Login(@Body() data: { usuario: string, clave: string }, @Res({ passthrough: true }) res: Response): Promise<tipoRespuesta> {
        return this.authService.iniciarSesion(data.usuario, data.clave, res)
    }

    @Throttle({ medium: {} }) // Limitar a 20 solicitudes por segundo
    @Post('recuperar-clave')
    async enviarCodigoRecuperacion(@Body() data: { correo: string }): Promise<tipoRespuesta> {
        return this.authService.recuperarClave(data.correo)
    }

    @Throttle({ medium: {} }) // Limitar a 20 solicitudes por segundo
    @Post('verificar-codigo')
    async verificarCodigo(@Body() data: { correo: string, otp: string }): Promise<tipoRespuesta> {
        return this.authService.verificarOtp(data.correo, data.otp)
    }

    @Throttle({ medium: {} }) // Limitar a 20 solicitudes por segundo
    @Post('restablecer-clave')
    async restablecerClave(@Body() data: { correo: string, clave: string, otp: string }): Promise<tipoRespuesta> {
        return this.authService.cambiarClave(data.correo, data.clave, data.otp)
    }

    @Throttle({ medium: {} }) // Limitar a 20 solicitudes por segundo
    @Post('cerrar-sesion')
    async cerrarSesion(@Res({ passthrough: true }) res: Response): Promise<tipoRespuesta> {
        return this.authService.cerrarSesion(res)
    }

    @SkipThrottle()
    @UseGuards(AuthGuard)
    @Post('usuario-autenticado')
    async obtenerUsuarioAutenticado(@Request() res: any): Promise<tipoRespuesta> {
        return this.authService.obtenerUsuarioId(res.user.id)
    }


}

import { Body, Controller, Post, Request, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '../authGuard';
import { tipoRespuesta } from '../interfaces';
import { Proyectos, Usuarios } from '../entidades/proyectos.entities';
import { FileInterceptor } from '@nestjs/platform-express';

@SkipThrottle()
@Controller('proyectos')
export class ProyectosController {
    constructor(
        private readonly proyectosService: ProyectosService
    ) { }

    @UseGuards(AuthGuard)
    @Post('crear')
    async CrearProyecto(@Body() datos: Partial<Proyectos>, @Request() req: any): Promise<tipoRespuesta> {
        return await this.proyectosService.createProyecto(datos, req.user.id)
    }

    @UseGuards(AuthGuard)
    @Post('obtener')
    async obtenerProyectos(): Promise<tipoRespuesta> {
        return await this.proyectosService.obtenerProyectos()
    }

    @UseGuards(AuthGuard)
    @Post('crear-usuario')
    async crearUsuario(@Body() datos: Partial<Usuarios>, @Request() req: any): Promise<tipoRespuesta> {
        return await this.proyectosService.createUsuario(datos, req.user.id)
    }

    @UseGuards(AuthGuard)
    @Post('obtener-usuarios')
    async obtenerUsuarios(@Body() datos: { proyecto: number }): Promise<tipoRespuesta> {
        return await this.proyectosService.getUsuarios(datos.proyecto)
    }

    @Post('crear-asistencia')
    async crearAsistencia(@Body() datos: { cedula: string, longitud: number, latitud: number }): Promise<tipoRespuesta> {
        return await this.proyectosService.createAsistencia(datos.cedula, datos.longitud, datos.latitud)
    }

    @Post('crear-asistencia-foto')
    @UseInterceptors(FileInterceptor('imagen'))
    async crearAsistenciaFoto(
        @UploadedFile() imagen: Express.Multer.File,
        @Body() datos: { longitud: string; latitud: string, cedula: string },
    ): Promise<tipoRespuesta> {

        return await this.proyectosService.crearAsistenciaFoto(
            imagen,
            datos.cedula,
            Number(datos.longitud),
            Number(datos.latitud),
        );
    }
}

import { Body, Controller, Post, Request, UseGuards, UploadedFile, UseInterceptors, Res, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '../authGuard';
import { tipoRespuesta } from '../interfaces';
import { Proyectos, Usuarios } from '../entidades/proyectos.entities';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

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
    @Post('eliminar-usuario')
    async eliminarUsuario(@Body() datos: { id: number }): Promise<tipoRespuesta> {
        return await this.proyectosService.EliminarUsuario(datos.id)
    }

    @UseGuards(AuthGuard)
    @Post('actualizar-usuario')
    async actualizarUsuario(@Body() datos: Usuarios): Promise<tipoRespuesta> {
        return await this.proyectosService.actualizarUsuario(datos)
    }

    @UseGuards(AuthGuard)
    @Post('obtener-usuarios')
    async obtenerUsuarios(@Body() datos: { proyecto: number, fechaInicio: Date, fechaFin: Date, buscador?: string }): Promise<tipoRespuesta> {
        return await this.proyectosService.getUsuarios(datos.proyecto, datos.fechaInicio, datos.fechaFin, datos.buscador)
    }

    @UseGuards(AuthGuard)
    @Post('crear-asistencia-admin')
    async crearAsistenciaAdmin(@Body() datos: { cedula: string, longitud: number, latitud: number, fecha: Date }): Promise<tipoRespuesta> {
        return await this.proyectosService.createAsistencia(datos.cedula, datos.longitud, datos.latitud, datos.fecha)
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

    @UseGuards(AuthGuard)
    @Post('descargar-asistencia')
    async descargarAsistencia(
        @Body() datos: {
            desde: string;
            hasta: string;
            proyecto: number;
        },
        @Res() res: Response
    ) {
        const buffer = await this.proyectosService.descargarAsistencia(
            datos.desde,
            datos.hasta,
            datos.proyecto
        );

        res.set({
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

            'Content-Disposition':
                'attachment; filename="asistencia.xlsx"',

            'Content-Length':
                buffer.length.toString()
        });

        return res.send(buffer);
    }

    @Get('imagen/:id')
    @UseGuards(AuthGuard)
    async obtenerImagenAsistencia(
        @Param('id', ParseIntPipe) id: number,
        @Res() res: Response,
    ) {

        const buffer = await this.proyectosService.obtenerImagenAsistencia(id);
        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Length': buffer.length.toString()
        });
        res.send(buffer);
    }

    @Get('usuario/:id')
    @UseGuards(AuthGuard)
    async obtenerImagenUsuario(
        @Param('id', ParseIntPipe) id: number,
        @Res() res: Response,
    ) {

        const buffer = await this.proyectosService.obtenerImagenUsuario(id);
        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Length': buffer.length.toString()
        });
        res.send(buffer);
    }

}

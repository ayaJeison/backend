import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asistencia, Proyectos, Usuarios } from '../entidades/proyectos.entities';
import { tipoRespuesta } from '../interfaces';

@Injectable()
export class ProyectosService {
    constructor(
        @InjectRepository(Proyectos)
        private readonly proyectosRepository: Repository<Proyectos>,
        @InjectRepository(Usuarios)
        private readonly usuariosRepository: Repository<Usuarios>,
        @InjectRepository(Asistencia)
        private readonly asistenciaRepository: Repository<Asistencia>
    ) { }


    async obtenerProyectos(): Promise<tipoRespuesta> {
        try {
            const proyectos = await this.proyectosRepository.find({
                relations: {
                    admin: true,
                    usuarios: true
                }
            })
            if (proyectos) {
                return {
                    tipo: 'success',
                    mensaje: 'proyectos obtenidos',
                    datos: proyectos
                }
            }
            return {
                tipo: 'info',
                mensaje: 'No existen proyectos'
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: `Error al obtener los proyectos`
            }
        }
    }

    async createProyecto(datos: Partial<Proyectos>, admin: number): Promise<tipoRespuesta> {
        try {
            const proyecto = datos;
            proyecto.admin = admin;
            proyecto.registro = new Date();

            await this.proyectosRepository.save(proyecto);

            return {
                tipo: 'success',
                mensaje: 'Proyecto creado con éxito'
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error en el sistema, intentalo de nuevo'
            }
        }
    }

    async getUsuarios(proyecto: number): Promise<tipoRespuesta> {
        try {
            const usuarios = await this.usuariosRepository.find({ where: { proyecto: { id: proyecto } }, relations: { asistencias: true } })
            return {
                tipo: 'success',
                mensaje: 'usuarios obtenidos',
                datos: usuarios
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error al obtener los usuarios'
            }
        }
    }

    async createUsuario(data: Partial<Usuarios>, admin: number): Promise<tipoRespuesta> {
        try {
            const usuario = data;
            usuario.registro = new Date();
            usuario.admin = admin;
            usuario.clave = "";
            usuario.avatar = "";
            await this.usuariosRepository.save(usuario);
            return {
                tipo: 'success',
                mensaje: 'Usuario creado con exito'
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error en el servidor, intentalo de nuevo'
            }
        }
    }

    async createAsistencia(cedula: string, longitud: number, latitud: number): Promise<tipoRespuesta> {
        try {
            const usuario = await this.usuariosRepository.findOneBy({ cedula: cedula })
            if (usuario) {
                const nuevoRegistro: Partial<Asistencia> = {
                    usuario: usuario.id,
                    registro: new Date(),
                    ubicacion: { longitud, latitud }
                }
                await this.asistenciaRepository.save(nuevoRegistro)
                return {
                    tipo: 'success',
                    mensaje: 'Asistencia registrada con éxito'
                }
            }
            return {
                tipo: 'error',
                mensaje: 'No se encontró el usuario'
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error en el sistema'
            }
        }
    }
}

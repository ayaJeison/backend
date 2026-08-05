import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Asistencia, Proyectos, Usuarios } from '../entidades/proyectos.entities';
import { tipoRespuesta } from '../interfaces';
import axios from 'axios';
import FormData from 'form-data';

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
            usuario.embedding = [];
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
                const inicioDia = new Date();
                inicioDia.setHours(0, 0, 0, 0);

                const finDia = new Date();
                finDia.setHours(23, 59, 59, 999);

                const asistencia = await this.asistenciaRepository.findOne({
                    where: {
                        usuario: { id: usuario.id },
                        registro: Between(inicioDia, finDia),
                    }
                });
                if (asistencia) {
                    return {
                        tipo: 'error',
                        mensaje: 'Ya existe una asistencia registrada para el usuario'
                    }
                }
                await this.asistenciaRepository.save(nuevoRegistro)
                return {
                    tipo: 'success',
                    mensaje: 'Asistencia registrada con éxito',
                    datos: {
                        nombre: usuario.nombre
                    }
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

    async crearAsistenciaFoto(
        imagen: Express.Multer.File,
        cedula: string,
        longitud: number,
        latitud: number,
    ): Promise<tipoRespuesta> {
        try {

            const usuario = await this.usuariosRepository.findOneBy({
                cedula
            });

            if (!usuario) {
                return {
                    tipo: 'error',
                    mensaje: 'El usuario a validar no existe'
                };
            }

            // -----------------------------
            // Usuario ya tiene embedding
            // -----------------------------
            if (usuario.embedding && usuario.embedding.length > 0) {

                const formData = new FormData();

                formData.append(
                    'image',
                    imagen.buffer,
                    {
                        filename: imagen.originalname,
                        contentType: imagen.mimetype,
                    },
                );

                formData.append(
                    'embedding',
                    JSON.stringify(usuario.embedding)
                );

                const respuesta = await axios.post(
                    'http://127.0.0.1:5000/verify',
                    formData,
                    {
                        headers: formData.getHeaders(),
                    },
                );

                const resultado = respuesta.data;

                if (resultado.tipo !== 'success') {
                    return resultado;
                }

                if (!resultado.datos.match) {
                    return {
                        tipo: 'error',
                        mensaje: 'El rostro no coincide con el usuario.'
                    };
                }

                return await this.createAsistencia(
                    cedula,
                    longitud,
                    latitud
                );
            }

            // -----------------------------
            // Usuario sin embedding
            // -----------------------------
            const formData = new FormData();

            formData.append(
                'image',
                imagen.buffer,
                {
                    filename: imagen.originalname,
                    contentType: imagen.mimetype,
                },
            );

            const respuesta = await axios.post(
                'http://127.0.0.1:5000/register',
                formData,
                {
                    headers: formData.getHeaders(),
                },
            );

            const resultado = respuesta.data;

            if (resultado.tipo !== 'success') {
                return resultado;
            }

            usuario.embedding = resultado.datos.embedding;

            await this.usuariosRepository.save(usuario);

            return await this.createAsistencia(
                cedula,
                longitud,
                latitud
            );
        } catch (error) {

            console.error(error);

            return {
                tipo: 'error',
                mensaje: 'Error al verificar el rostro'
            };
        }
    }
}

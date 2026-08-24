import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { Asistencia, Cargo, Proyectos, Usuarios } from '../entidades/proyectos.entities';
import { tipoRespuesta } from '../interfaces';
import axios from 'axios';
import FormData from 'form-data';
import * as ExcelJS from 'exceljs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class ProyectosService {
    constructor(
        @InjectRepository(Proyectos)
        private readonly proyectosRepository: Repository<Proyectos>,
        @InjectRepository(Usuarios)
        private readonly usuariosRepository: Repository<Usuarios>,
        @InjectRepository(Asistencia)
        private readonly asistenciaRepository: Repository<Asistencia>,
        @InjectRepository(Cargo)
        private readonly cargoRepository: Repository<Cargo>,

    ) { }

    async crearCargo(cargo: Partial<Cargo>): Promise<tipoRespuesta> {
        try {
            await this.cargoRepository.save(cargo)
            return {
                tipo: 'success',
                mensaje: 'Cargo creado con éxito'
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error en el servidor, intenta de nuevo'
            }
        }
    }

    async eliminarCargo(cargo: number): Promise<tipoRespuesta> {
        try {
            await this.cargoRepository.delete(cargo)
            return {
                tipo: 'success',
                mensaje: 'Cargo eliminado con éxito'
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error en el servidor, intenta de nuevo'
            }
        }
    }

    async obtenerCargos(proyecto: number): Promise<tipoRespuesta> {
        try {
            const cargos = await this.cargoRepository.find(
                {
                    where: { proyecto: { id: proyecto } },
                    relations: {
                        usuarios: true
                    }
                }
            )
            return {
                tipo: 'success',
                mensaje: 'Cargos obtenidos',
                datos: cargos
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error al obtener los cargos'
            }
        }
    }

    private readonly carpetaAsistencias = path.join(
        process.cwd(),
        'uploads',
        'asistencias'
    );

    async guardarImagen(
        imagen: Express.Multer.File,
        cedula: string,
    ): Promise<string> {

        const ahora = new Date();

        const año = ahora.getFullYear();
        const mes = String(ahora.getMonth() + 1).padStart(2, '0');

        const carpeta = path.join(
            this.carpetaAsistencias,
            String(año),
            mes
        );

        // Crear carpeta si no existe
        await fs.mkdir(carpeta, {
            recursive: true
        });

        const extension = path.extname(imagen.originalname) || '.jpg';

        const nombreArchivo = `${cedula}_${randomUUID()}${extension}`;

        const rutaCompleta = path.join(
            carpeta,
            nombreArchivo
        );

        await fs.writeFile(
            rutaCompleta,
            imagen.buffer
        );

        console.log('Se guardó la imagen')
        // Retornamos la ruta relativa para poder guardarla en BD
        return path.join(
            'uploads',
            'asistencias',
            String(año),
            mes,
            nombreArchivo
        );
    }



    async obtenerProyectos(): Promise<tipoRespuesta> {
        try {
            const proyectos = await this.proyectosRepository.find({
                relations: {
                    admin: true,
                    usuarios: {
                        cargo: true
                    },
                    cargo: {
                        usuarios: true
                    }
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

    async getUsuarios(
        proyecto: number,
        fechaInicio: Date,
        fechaFin: Date,
        buscador?: string
    ): Promise<tipoRespuesta> {
        try {
            const inicio = new Date(fechaInicio);
            inicio.setHours(0, 0, 0, 0);

            const fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999);

            const query = this.cargoRepository
                .createQueryBuilder('cargo')

                // Cargo -> Usuarios
                .leftJoinAndSelect(
                    'cargo.usuarios',
                    'usuario'
                )

                // Usuario -> Asistencias
                .leftJoinAndSelect(
                    'usuario.asistencias',
                    'asistencia',
                    'asistencia.registro BETWEEN :fechaInicio AND :fechaFin',
                    {
                        fechaInicio: inicio,
                        fechaFin: fin
                    }
                )

                // Cargo -> Proyecto
                .where('cargo.proyecto = :proyecto', {
                    proyecto
                });

            if (buscador?.trim()) {
                query.andWhere(
                    `(
                    LOWER(usuario.nombre) LIKE LOWER(:buscador)
                    OR LOWER(usuario.cedula) LIKE LOWER(:buscador)
                )`,
                    {
                        buscador: `%${buscador.trim()}%`
                    }
                );
            }

            const cargos = await query.getMany();

            return {
                tipo: 'success',
                mensaje: 'usuarios obtenidos',
                datos: cargos
            };

        } catch (error) {
            console.log(error);

            return {
                tipo: 'error',
                mensaje: 'Error al obtener los usuarios'
            };
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

    async EliminarUsuario(id: number): Promise<tipoRespuesta> {
        try {
            await this.usuariosRepository.delete({ id })
            return {
                tipo: 'success',
                mensaje: 'Usuario eliminado correctamente'
            }
        } catch (error) {
            return {
                tipo: 'error',
                mensaje: 'No se pudo eliminar el usuario'
            }
        }
    }

    async actualizarUsuario(usuario: Usuarios): Promise<tipoRespuesta> {
        try {
            await this.usuariosRepository.save(usuario)
            return {
                tipo: 'success',
                mensaje: 'Usuario actualizado con éxito'
            }
        } catch (error) {
            return {
                tipo: 'error',
                mensaje: 'No se pudo actualizar el usuario'
            }
        }
    }

    async createAsistencia(
        cedula: string,
        longitud: number,
        latitud: number,
        fecha?: Date,
        foto?: string,
        tipo?: number
    ): Promise<tipoRespuesta> {
        try {
            const usuario = await this.usuariosRepository.findOneBy({
                cedula: cedula
            });

            if (!usuario || usuario.estado !== 1) {
                return {
                    tipo: 'error',
                    mensaje: 'No se encontró tu usuario o te encuentras desactivado del sistema'
                };
            }

            // Fecha/hora del nuevo registro
            const registroActual = fecha ? new Date(fecha) : new Date();

            // Inicio y fin del día
            const inicioDia = new Date(registroActual);
            inicioDia.setHours(0, 0, 0, 0);

            const finDia = new Date(registroActual);
            finDia.setHours(23, 59, 59, 999);

            // Buscar el último registro del usuario para ese día
            const asistencia = await this.asistenciaRepository.findOne({
                where: {
                    usuario: { id: usuario.id },
                    registro: Between(inicioDia, finDia),
                },
                order: {
                    registro: 'DESC'
                }
            });

            // --------------------------------------------------
            // Validar los 10 minutos
            // --------------------------------------------------
            if (asistencia) {
                const diferenciaMilisegundos =
                    registroActual.getTime() - new Date(asistencia.registro).getTime();

                const diferenciaMinutos =
                    diferenciaMilisegundos / (1000 * 60);

                if (diferenciaMinutos < 10) {
                    const minutosRestantes = Math.ceil(10 - diferenciaMinutos);

                    return {
                        tipo: 'info',
                        mensaje: `Debes esperar al menos 10 minutos entre registros. Intenta nuevamente en ${minutosRestantes} minuto(s).`
                    };
                }
            }

            // --------------------------------------------------
            // Crear nuevo registro
            // --------------------------------------------------
            const nuevoRegistro: Partial<Asistencia> = {
                usuario: usuario.id,
                registro: registroActual,
                ubicacion: {
                    longitud,
                    latitud
                },
                tipo: asistencia
                    ? (asistencia.tipo === 1 ? 2 : 1)
                    : 1,
                foto: foto ?? ""
            };

            if (tipo) {
                nuevoRegistro.tipo = tipo;
            }

            await this.asistenciaRepository.save(nuevoRegistro);

            return {
                tipo: 'success',
                mensaje: asistencia
                    ? 'Se ha registrado tu salida con éxito'
                    : 'Asistencia registrada con éxito',
                datos: {
                    nombre: usuario.nombre
                }
            };

        } catch (error) {
            console.log(error);

            return {
                tipo: 'error',
                mensaje: 'Error en el sistema'
            };
        }
    }

    async crearEmbedding(
        imagen: Express.Multer.File,
        cedula: string
    ): Promise<tipoRespuesta> {
        try {
            const usuario = await this.usuariosRepository.findOneBy({ cedula: cedula })
            if (usuario && usuario.estado === 1) {
                const formData = new FormData();
                formData.append(
                    'image',
                    imagen.buffer,
                    {
                        filename: imagen.originalname,
                        contentType: imagen.mimetype,
                    },
                );

                const response = await this.registrarRostro(formData, usuario, imagen, cedula);

                if (response.tipo !== 'success') {
                    return response;
                }

                return {
                    tipo: 'success',
                    mensaje: 'Rostro registrado correctamente'
                }
            }
            return {
                tipo: 'error',
                mensaje: 'No se encontró tu usuario'
            }
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error en el sistema'
            }
        }
    }

    async crearAsistenciaReconocimiento(
        imagen: Express.Multer.File,
        longitud: number,
        latitud: number,
        proyecto: number
    ): Promise<tipoRespuesta> {
        try {
            const usuariosConEmbedding = await this.usuariosRepository.find({
                where: {
                    embedding: Not(IsNull()),
                    estado: 1,
                    proyecto: { id: proyecto }
                }
            })

            if (usuariosConEmbedding.length === 0) {
                return {
                    tipo: 'error',
                    mensaje: 'No se encontraron usuarios con reconocimiento facial para el proyecto'
                }
            }

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
                'usuarios',
                JSON.stringify(usuariosConEmbedding)
            );

            const respuesta = await axios.post(
                'http://127.0.0.1:5000/validate',
                formData,
                {
                    headers: formData.getHeaders(),
                },
            );

            const resultado = respuesta.data;



            if (resultado.tipo === "success") {
                let imagenRuta = await this.guardarImagen(
                    imagen,
                    resultado.datos.usuario.cedula
                );
                return await this.createAsistencia(
                    resultado.datos.usuario.cedula,
                    longitud,
                    latitud,
                    undefined,
                    imagenRuta
                )
            }
            return resultado



        } catch (error) {
            return {
                tipo: 'error',
                mensaje: 'Error al registrar asistencia'
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

            let imagenRuta = ""


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

                imagenRuta = await this.guardarImagen(
                    imagen,
                    cedula
                );

                return await this.createAsistencia(
                    cedula,
                    longitud,
                    latitud,
                    undefined,
                    imagenRuta
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

            const response = await this.registrarRostro(formData, usuario, imagen, cedula);

            if (response.tipo !== 'success') {
                return response;
            }

            imagenRuta = response.datos;

            return await this.createAsistencia(
                cedula,
                longitud,
                latitud,
                undefined,
                imagenRuta
            );
        } catch (error) {

            console.error(error);

            return {
                tipo: 'error',
                mensaje: 'Error al verificar el rostro'
            };
        }
    }

    async eliminarAsistencia(id: number): Promise<tipoRespuesta> {
        try {
            const asistencia = await this.asistenciaRepository.findOneBy({
                id
            });
            if (!asistencia) {
                return {
                    tipo: 'error',
                    mensaje: 'La asistencia no existe'
                };
            }
            await this.asistenciaRepository.remove(asistencia);
            return {
                tipo: 'success',
                mensaje: 'Asistencia eliminada con éxito'
            };
        } catch (error) {
            console.error(error);
            return {
                tipo: 'error',
                mensaje: 'Error al eliminar la asistencia'
            };
        }
    }

    private async registrarRostro(formData: FormData, usuario: Usuarios, imagen: Express.Multer.File, cedula: string): Promise<tipoRespuesta> {
        try {
            let imagenRuta = "";
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

            imagenRuta = await this.guardarImagen(
                imagen,
                cedula
            );

            usuario.embedding = resultado.datos.embedding;
            usuario.avatar = imagenRuta;

            await this.usuariosRepository.save(usuario);

            return {
                tipo: 'success',
                mensaje: 'Rostro registrado con éxito',
                datos: imagenRuta
            };
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error al registrar el rostro'
            }
        }
    }

    private formatearFecha(fecha: Date): string {

        const dia = String(
            fecha.getDate()
        ).padStart(2, '0');

        const mes = String(
            fecha.getMonth() + 1
        ).padStart(2, '0');

        const año =
            fecha.getFullYear();

        return `${dia}/${mes}/${año}`;
    }

    private obtenerResumenAsistencias(
        asistencias: Asistencia[]
    ): {
        texto: string;
        minutos: number;
    } {

        if (!asistencias.length) {
            return {
                texto: '',
                minutos: 0
            };
        }

        const lineas: string[] = [];

        let minutosTotales = 0;

        for (let i = 0; i < asistencias.length; i++) {

            const asistencia = asistencias[i];

            // Incapacidad
            if (asistencia.tipo === 3) {
                lineas.push(
                    `INCAPACIDAD`
                );

                continue;
            }

            // Permiso
            if (asistencia.tipo === 4) {
                lineas.push(
                    `PERMISO`
                );

                continue;
            }

            // Solo procesar entradas
            if (asistencia.tipo !== 1) {
                continue;
            }

            const entrada =
                this.formatearHora(
                    new Date(asistencia.registro)
                );

            const siguiente =
                asistencias[i + 1];

            if (
                siguiente &&
                siguiente.tipo === 2
            ) {

                const salida =
                    this.formatearHora(
                        new Date(siguiente.registro)
                    );

                const entradaDate =
                    new Date(asistencia.registro);

                const salidaDate =
                    new Date(siguiente.registro);

                const diferencia =
                    (salidaDate.getTime() -
                        entradaDate.getTime()) / 60000;

                if (diferencia > 0) {
                    minutosTotales += diferencia;
                }

                lineas.push(
                    `${entrada} - ${salida}`
                );

            } else {

                // Entrada sin salida
                lineas.push(
                    `${entrada} - SIN SALIDA`
                );
            }
        }

        if (minutosTotales > 0) {
            lineas.push(
                `Total: ${this.formatearMinutos(
                    Math.round(minutosTotales)
                )}`
            );
        }

        return {
            texto: lineas.join('\n'),
            minutos: Math.round(minutosTotales)
        };
    }

    private formatearHora(fecha: Date): string {

        const horas = String(
            fecha.getHours()
        ).padStart(2, '0');

        const minutos = String(
            fecha.getMinutes()
        ).padStart(2, '0');

        return `${horas}:${minutos}`;
    }

    private calcularMinutosTrabajados(
        asistencias: Asistencia[]
    ): number {

        let minutos = 0;

        for (let i = 0; i < asistencias.length; i++) {

            const asistencia = asistencias[i];

            // Buscar únicamente entradas
            if (asistencia.tipo !== 1) {
                continue;
            }

            const siguiente = asistencias[i + 1];

            // La entrada debe tener una salida inmediatamente después
            if (
                siguiente &&
                siguiente.tipo === 2
            ) {

                const entrada =
                    new Date(asistencia.registro).getTime();

                const salida =
                    new Date(siguiente.registro).getTime();

                const diferencia =
                    salida - entrada;

                if (diferencia > 0) {
                    minutos += diferencia / 60000;
                }
            }
        }

        return Math.round(minutos);
    }

    private formatearMinutos(
        minutos: number
    ): string {

        const horas =
            Math.floor(minutos / 60);

        const minutosRestantes =
            minutos % 60;

        return `${String(horas).padStart(2, '0')}:${String(minutosRestantes).padStart(2, '0')}`;
    }

    private numeroColumnaExcel(
        numero: number
    ): string {

        let resultado = '';

        while (numero > 0) {

            const residuo =
                (numero - 1) % 26;

            resultado =
                String.fromCharCode(
                    65 + residuo
                ) + resultado;

            numero =
                Math.floor(
                    (numero - 1) / 26
                );
        }

        return resultado;
    }

    async descargarAsistencia(
        desde: string,
        hasta: string,
        proyecto: number
    ): Promise<Buffer> {

        try {

            // ---------------------------------------------------------
            // 1. Crear rango de fechas
            // ---------------------------------------------------------

            const fechaDesde =
                new Date(`${desde}T00:00:00`);

            const fechaHasta =
                new Date(`${hasta}T23:59:59`);


            // ---------------------------------------------------------
            // 2. Obtener usuarios del proyecto
            // ---------------------------------------------------------

            const usuarios =
                await this.usuariosRepository.find({

                    where: {
                        proyecto: {
                            id: proyecto
                        }
                    },

                    relations: {
                        asistencias: true
                    }

                });


            // ---------------------------------------------------------
            // 3. Filtrar y ordenar asistencias
            // ---------------------------------------------------------

            for (const usuario of usuarios) {

                usuario.asistencias =
                    usuario.asistencias

                        .filter(asistencia => {

                            const fecha =
                                new Date(
                                    asistencia.registro
                                );

                            return (
                                fecha >= fechaDesde &&
                                fecha <= fechaHasta
                            );

                        })

                        .sort((a, b) =>
                            new Date(a.registro).getTime() -
                            new Date(b.registro).getTime()
                        );
            }


            // ---------------------------------------------------------
            // 4. Generar todos los días
            // ---------------------------------------------------------

            const dias: Date[] = [];

            const fechaActual =
                new Date(fechaDesde);

            while (fechaActual <= fechaHasta) {

                dias.push(
                    new Date(fechaActual)
                );

                fechaActual.setDate(
                    fechaActual.getDate() + 1
                );
            }


            // ---------------------------------------------------------
            // 5. Crear workbook
            // ---------------------------------------------------------

            const workbook =
                new ExcelJS.Workbook();

            workbook.creator = 'Sistema de Asistencia';
            workbook.created = new Date();

            const worksheet =
                workbook.addWorksheet('Asistencia');


            // ---------------------------------------------------------
            // 6. Encabezados
            // ---------------------------------------------------------

            const encabezados = [
                'ID',
                'Nombre',
                'Apellido',
                'Cédula'
            ];

            for (const dia of dias) {

                encabezados.push(
                    this.formatearFecha(dia)
                );
            }

            // Columna adicional
            encabezados.push('TOTAL HORAS');


            worksheet.addRow(encabezados);


            // ---------------------------------------------------------
            // 7. Estilo del encabezado
            // ---------------------------------------------------------

            const header =
                worksheet.getRow(1);

            header.height = 28;

            header.eachCell(cell => {

                cell.font = {
                    bold: true,
                    color: {
                        argb: 'FFFFFFFF'
                    },
                    size: 10
                };

                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {
                        argb: 'FF263238'
                    }
                };

                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle',
                    wrapText: true
                };

                cell.border = {
                    bottom: {
                        style: 'medium',
                        color: {
                            argb: 'FF1B1B1B'
                        }
                    }
                };
            });


            // ---------------------------------------------------------
            // 8. Agregar usuarios
            // ---------------------------------------------------------

            for (const usuario of usuarios) {

                const fila: any[] = [
                    usuario.id,
                    usuario.nombre,
                    usuario.apellido,
                    usuario.cedula
                ];

                let minutosTotalesUsuario = 0;


                // -----------------------------------------------------
                // Recorrer días
                // -----------------------------------------------------

                for (const dia of dias) {

                    const asistenciasDia =
                        usuario.asistencias.filter(
                            asistencia => {

                                const fecha =
                                    new Date(
                                        asistencia.registro
                                    );

                                return (
                                    fecha.getFullYear() ===
                                    dia.getFullYear() &&

                                    fecha.getMonth() ===
                                    dia.getMonth() &&

                                    fecha.getDate() ===
                                    dia.getDate()
                                );

                            }
                        );


                    const resumen =
                        this.obtenerResumenAsistencias(
                            asistenciasDia
                        );


                    minutosTotalesUsuario +=
                        resumen.minutos;


                    fila.push(
                        resumen.texto
                    );
                }


                // -----------------------------------------------------
                // Total del usuario
                // -----------------------------------------------------

                fila.push(
                    this.formatearMinutos(
                        minutosTotalesUsuario
                    )
                );


                worksheet.addRow(fila);
            }


            // ---------------------------------------------------------
            // 9. Ancho de columnas
            // ---------------------------------------------------------

            worksheet.getColumn(1).width = 8;

            worksheet.getColumn(2).width = 20;

            worksheet.getColumn(3).width = 20;

            worksheet.getColumn(4).width = 16;


            // Columnas de días

            for (
                let i = 5;
                i <= encabezados.length - 1;
                i++
            ) {

                worksheet.getColumn(i).width = 24;
            }


            // Total horas

            worksheet.getColumn(
                encabezados.length
            ).width = 16;


            // ---------------------------------------------------------
            // 10. Estilo de las filas
            // ---------------------------------------------------------

            worksheet.eachRow(
                (row, rowNumber) => {

                    if (rowNumber === 1) {
                        return;
                    }

                    row.height = 42;

                    row.eachCell(
                        (cell, columnNumber) => {

                            cell.alignment = {
                                vertical: 'middle',
                                horizontal:
                                    columnNumber <= 4
                                        ? 'left'
                                        : 'center',
                                wrapText: true
                            };

                            cell.font = {
                                size: 10,
                                color: {
                                    argb: 'FF263238'
                                }
                            };

                            cell.border = {
                                bottom: {
                                    style: 'thin',
                                    color: {
                                        argb: 'FFE0E0E0'
                                    }
                                }
                            };
                        }
                    );


                    // Filas alternadas

                    if (rowNumber % 2 === 0) {

                        row.eachCell(cell => {

                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: {
                                    argb: 'FFF7F8F9'
                                }
                            };

                        });
                    }


                    // Total horas

                    const totalCell =
                        row.getCell(
                            encabezados.length
                        );

                    totalCell.font = {
                        bold: true,
                        size: 10,
                        color: {
                            argb: 'FF263238'
                        }
                    };
                }
            );


            // ---------------------------------------------------------
            // 11. Congelar encabezado
            // ---------------------------------------------------------

            worksheet.views = [
                {
                    state: 'frozen',
                    xSplit: 4,
                    ySplit: 1
                }
            ];


            // ---------------------------------------------------------
            // 12. Filtros
            // ---------------------------------------------------------

            worksheet.autoFilter = {
                from: 'A1',
                to: `${this.numeroColumnaExcel(
                    encabezados.length
                )}1`
            };


            // ---------------------------------------------------------
            // 13. Generar Excel
            // ---------------------------------------------------------

            const buffer =
                await workbook.xlsx.writeBuffer();

            return Buffer.from(buffer);


        } catch (error) {

            console.error(
                'Error generando Excel:',
                error
            );

            throw new Error(
                'Error al generar el archivo de asistencia'
            );
        }
    }

    async obtenerImagenAsistencia(id: number): Promise<Buffer> {

        const asistencia = await this.asistenciaRepository.findOne({
            where: {
                id
            },
        });

        if (!asistencia || !asistencia.foto) {
            throw new NotFoundException(
                'La imagen no existe'
            );
        }

        const ruta = path.join(
            process.cwd(),
            asistencia.foto
        );

        try {

            await fs.access(ruta);

            return await fs.readFile(ruta);

        } catch {

            throw new NotFoundException(
                'El archivo no existe'
            );

        }
    }

    async obtenerImagenUsuario(id: number): Promise<Buffer> {

        const usuario = await this.usuariosRepository.findOne({
            where: {
                id
            },
        });

        if (!usuario || !usuario.avatar) {
            throw new NotFoundException(
                'La imagen no existe'
            );
        }

        const ruta = path.join(
            process.cwd(),
            usuario.avatar
        );

        try {

            await fs.access(ruta);

            return await fs.readFile(ruta);

        } catch {

            throw new NotFoundException(
                'El archivo no existe'
            );

        }
    }
}

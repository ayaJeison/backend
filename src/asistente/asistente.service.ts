import { Injectable } from '@nestjs/common';
import { ChatInterface, responseEstructure, tipoRespuesta } from '../interfaces';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Administradores } from 'src/entidades/admin.entities';

@Injectable()
export class AsistenteService {
    constructor(
        private configService: ConfigService,
        @InjectRepository(Administradores)
        private readonly usuariosRepository: Repository<Administradores>
    ) { }

    async peticionesModel(transcripcion: string, id: number, conversation?: ChatInterface[]): Promise<tipoRespuesta> {
        try {
            const key = this.configService.get<string>('LLAVE_OPENAI');
            const modelo = new OpenAI({ apiKey: key });

            //obtener nombre del usuario
            const administrador = await this.usuariosRepository.findOne({
                where: { id },
            });
            let nombre = "";
            if (administrador) {
                nombre = administrador.nombre;
            }
            const fechaActual = new Date().toLocaleString('es-CO', { day: 'numeric', month: 'numeric', year: 'numeric', weekday: 'long' });
            const mensajes: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                {
                    role: "system",
                    content: `Serás mi asistente personal para la gestión y solicitud de pedidos para el proyecto de construcción. Mi nombre es ${nombre} y soy ingeniero civil. La fecha actual es ${fechaActual}`,
                },
                ...(conversation ? conversation.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })) : []),
                {
                    role: "user",
                    content: transcripcion,
                }
            ];
            const response = await modelo.chat.completions.create({
                model: "gpt-5-nano",
                messages: mensajes,
                tools: [
                    {
                        type: "function",
                        function: {
                            name: "crear_pedido_materiales",
                            description: `
                                Extrae todos los materiales mencionados por el usuario y genera un registro por cada uno.

                                Clasifica cada material en una de estas categorías:
                                - "obra": materiales utilizados directamente en la construcción.
                                - "sst": elementos de Seguridad y Salud en el Trabajo (EPP, señalización, botiquín, extintores, etc.).

                                La respuesta debe contener únicamente los materiales identificados.`,
                            parameters: {
                                type: "object",
                                properties: {
                                    materiales: {
                                        type: "array",
                                        description: "Listado de materiales solicitados.",
                                        items: {
                                            type: "object",
                                            properties: {
                                                producto: {
                                                    type: "string",
                                                    description: "Nombre del material."
                                                },
                                                cantidad: {
                                                    type: "number",
                                                    description: "Cantidad solicitada. Puede ser decimal."
                                                },
                                                unidad: {
                                                    type: "string",
                                                    description: "Unidad de medida. Ejemplo: kg, bulto, unidad, m, m2, m3, litro, caja, rollo, par, docena etc."
                                                },
                                                categoria: {
                                                    type: "string",
                                                    enum: ["obra", "sst"],
                                                    description: "Categoría del material."
                                                }
                                            },
                                            required: [
                                                "producto",
                                                "cantidad",
                                                "unidad",
                                                "categoria"
                                            ]
                                        }
                                    }
                                },
                                required: ["materiales"]
                            }
                        }
                    }

                ],
                tool_choice: 'auto'
            });
            if (response.choices[0].message.tool_calls) {
                const toolCalls = response.choices[0].message.tool_calls;

                for (const toolCall of toolCalls) {
                    if (toolCall.type !== "function") continue;
                    const functionName = toolCall.function.name;
                    const parameters = JSON.parse(toolCall.function.arguments);
                    if (functionName === "crear_pedido_materiales") {
                        //const respuesta = await this.pedidosService.crearPedido(materiales);

                        const estructura: responseEstructure = {
                            funcion: "crear_pedido_materiales",
                            role: "assistant",
                            content: "Se encontraron los siguiente productos"
                        };

                        return {
                            tipo: "success",
                            mensaje: "Solicitud completada",
                            datos: estructura,
                            transcripcion
                        };
                    }
                }
            } else {
                const responder = response.choices[0].message.content ? response.choices[0].message.content.trim() : '';
                const estructura: responseEstructure = {
                    funcion: 'none',
                    content: responder,
                    role: "assistant"
                }
                return {
                    tipo: 'success',
                    mensaje: responder,
                    datos: estructura,
                    transcripcion: transcripcion
                };
            }

        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Ocurrió un error interno, intentalo nuevamente'
            }

        }
        // Garantizar que siempre se retorna un valor
        return {
            tipo: 'error',
            mensaje: 'No se pudo procesar la solicitud'
        };
    }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Administradores } from '../entidades/admin.entities';
import { tipoRespuesta } from '../interfaces';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';


@Injectable()
export class AuthService {
    private transporter: nodemailer.Transporter;
    constructor(
        @InjectRepository(Administradores)
        private readonly adminRepository: Repository<Administradores>,
        private readonly jwtService: JwtService
    ) {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com', // Cambia esto si usas otro proveedor SMTP
            port: 465, // o 587 dependiendo del proveedor
            secure: true, // Si usas TLS/SSL
            auth: {
                user: 'info@centauringenieria.com', // Tu correo con dominio propio
                pass: 'Wil1996*Emma', // Contraseña de la cuenta o un App Password
            },
        });
    }

    async iniciarSesion(correo: string, clave: string, res: Response): Promise<tipoRespuesta> {
        try {
            const admin = await this.adminRepository.findOne({
                where: [
                    { correo: correo },
                    { usuario: correo },
                ],
            });
            if (admin) {
                // Verificar la contraseña (asumiendo que tienes un método para comparar contraseñas)
                if (await this.compararClave(clave, admin.clave)) {
                    // Actualizar el último ingreso
                    admin.ultimoIngreso = new Date();
                    await this.adminRepository.save(admin);
                    const payload = {
                        id: admin.id
                    }
                    const access_token = await this.jwtService.signAsync(payload);
                    res.cookie('jwt', access_token, {
                        httpOnly: true, // ✅ Impide acceso desde JS del frontend
                        secure: process.env.NODE_ENV === 'production', // ✅ Solo en HTTPS en producción
                        sameSite: 'lax', // ✅ Para evitar CSRF, pero permite navegación cruzada legítima
                        maxAge: 1000 * 60 * 60 * 24 * 7, // ✅ 7 días (milisegundos)
                    });
                    return {
                        tipo: 'success',
                        mensaje: 'Inicio de sesión exitoso'
                    };
                } else {
                    return {
                        tipo: 'error',
                        mensaje: 'Contraseña incorrecta'
                    };
                }
            } else {
                return {
                    tipo: 'error',
                    mensaje: 'El usuario no existe'
                };
            }
        } catch (error) {
            return {
                tipo: 'error',
                mensaje: 'Error al iniciar sesión'
            };
        }

    }

    compararClave(claveIngresada: string, claveAlmacenada: string): Promise<boolean> {
        return bcrypt.compare(claveIngresada, claveAlmacenada);
    }

    async recuperarClave(correo: string): Promise<tipoRespuesta> {
        console.log('Iniciando proceso de recuperación de clave para el correo:', correo);
        try {
            const admin = await this.adminRepository.findOne({ where: { correo: correo } });
            if (!admin) {
                return {
                    tipo: 'error',
                    mensaje: 'Usuario no encontrado'
                };
            }
            // crear el OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            admin.otp = otp;
            await this.adminRepository.save(admin);
            // enviar el OTP por correo
            const htmlContent = `
            <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificación de Correo</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .email-container {
          width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          text-align: center;
          padding-bottom: 20px;
        }
        .logo {
          width: 170px;
          height: auto;
        }
        .email-body {
          text-align: center;
          padding: 20px 0;
        }
        .verification-code {
          font-size: 32px;
          font-weight: bold;
          color: #0162FF;
          letter-spacing: 4px;
          margin: 10px 0;
        }
        .email-footer {
          text-align: center;
          font-size: 12px;
          color: #777;
          padding-top: 20px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #0162FF;
          color: #ffffff;
          text-decoration: none;
          font-weight: bold;
          border-radius: 4px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <table role="presentation">
        <tr>
          <td>
            <div class="email-container">
              <div class="email-header">
                <img src="https://andromedacrea.com/imagenes/logos/centauri.png" alt="Inventarium" class="logo">
              </div>
              <div class="email-body">
                <h2>Restablece tu contraseña</h2>
                <p>Utiliza el siguiente código para restablecer tu contraseña:</p>
                <div class="verification-code">${otp}</div>
                <p>${otp.length > 4 ? '' : `Este código expirará en 60 segundos.`}</p>
              </div>
              <div class="email-footer">
                <p>&copy; ${new Date().getFullYear()} Centauri ingeniería. Todos los derechos reservados.</p>
                <p>Si no solicitaste este código, por favor ignora este mensaje.</p>
                <p><a href='https://centauringenieria.com'>www.centauringenieria.com</a></p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
            `
            await this.transporter.sendMail({
                from: '"Centauri ingeniería" <info@centauringenieria.com>',
                to: admin.correo,
                subject: 'Recuperación de contraseña',
                html: htmlContent
            });
            return {
                tipo: 'success',
                mensaje: 'Se ha enviado un código de recuperación a tu correo'
            };
        } catch (error) {
            console.error('Error al enviar el correo de recuperación:', error);
            return {
                tipo: 'error',
                mensaje: 'Error al recuperar la clave'
            };
        }
    }

    async verificarOtp(correo: string, otp: string): Promise<tipoRespuesta> {
        try {
            const admin = await this.adminRepository.findOne({ where: { correo: correo } });
            if (!admin) {
                return {
                    tipo: 'error',
                    mensaje: 'Correo no encontrado'
                };
            }
            if (admin.otp !== otp && otp.length === 4) {
                return {
                    tipo: 'error',
                    mensaje: 'Código de recuperación inválido'
                };
            }
            return {
                tipo: 'success',
                mensaje: 'Código de recuperación válido'
            };
        } catch (error) {
            return {
                tipo: 'error',
                mensaje: 'Error al verificar el código de recuperación'
            };
        }
    }

    async cambiarClave(correo: string, nuevaClave: string, otp: string): Promise<tipoRespuesta> {
        try {
            const admin = await this.adminRepository.findOne({ where: { correo: correo, otp: otp } });
            if (!admin) {
                return {
                    tipo: 'error',
                    mensaje: 'Correo no encontrado o código de recuperación inválido'
                };
            }
            // Hashear la nueva contraseña antes de guardarla
            const hashedPassword = await bcrypt.hash(nuevaClave, 10);
            admin.clave = hashedPassword;
            await this.adminRepository.save(admin);
            return {
                tipo: 'success',
                mensaje: 'Contraseña cambiada correctamente'
            };
        } catch (error) {
            return {
                tipo: 'error',
                mensaje: 'Error al cambiar la contraseña'
            };
        }
    }

    async cerrarSesion(res: Response): Promise<tipoRespuesta> {
        try {
            res.clearCookie('jwt', {
                httpOnly: true,
                secure: true
            });
            return {
                tipo: 'success',
                mensaje: 'Sesión cerrada correctamente'
            };
        } catch (error) {
            return {
                tipo: 'error',
                mensaje: 'Error al cerrar la sesión'
            };
        }
    }

    async obtenerUsuarioId(id: number): Promise<tipoRespuesta> {
        try {
            const admin = await this.adminRepository.findOne({ where: { id: id } });
            if (!admin) {
                return {
                    tipo: 'error',
                    mensaje: 'Usuario no encontrado'
                };
            }
            return {
                tipo: 'success',
                mensaje: 'Usuario encontrado',
                datos: admin
            };
        } catch (error) {
            console.log(error)
            return {
                tipo: 'error',
                mensaje: 'Error al obtener el usuario'
            };
        }
    }
}

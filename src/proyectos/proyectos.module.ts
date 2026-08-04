import { Module } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { ProyectosController } from './proyectos.controller';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asistencia, Proyectos, Usuarios } from '../entidades/proyectos.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyectos, Usuarios, Asistencia])
  ],
  providers: [ProyectosService, JwtService],
  controllers: [ProyectosController]
})
export class ProyectosModule { }

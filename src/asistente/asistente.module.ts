import { Module } from '@nestjs/common';
import { AsistenteController } from './asistente.controller';
import { AsistenteService } from './asistente.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Administradores } from '../entidades/admin.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Administradores]),
  ],
  controllers: [AsistenteController],
  providers: [AsistenteService, JwtService]
})
export class AsistenteModule { }

import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AsistenteService } from './asistente.service';
import { AuthGuard } from '../authGuard';
import { tipoRespuesta } from '../interfaces';

@Controller('asistente')
export class AsistenteController {
    constructor(
        private readonly asistenteService:AsistenteService
    ){}

    @UseGuards(AuthGuard)
    @Post('peticion')
    async peticion(@Body() datos:{texto:string}, @Request() req:any):Promise<tipoRespuesta>{
        return await this.asistenteService.peticionesModel(datos.texto, req.user.id)
    }
}

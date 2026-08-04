import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Cliente conectado con id: ${client.id}`)
    }
    handleDisconnect(client: Socket) {
        //console.log(`Cliente desconectado con id: ${client.id}`)
    }
    @SubscribeMessage('mensajeAlServidor') // Escucha el evento 'pedido' desde el cliente
    handleMessage(client: Socket, payload: string) {
        this.server.emit('mensajeDesdeServidor', payload);
        //console.log('pago de mesa',payload)
    }
}
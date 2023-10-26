import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private roomGameStores: Map<string, { player1: { id: string, choice: string }, player2: { id: string, choice: string } }> = new Map();

    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log("handleConnection", client.id)
    }

    handleDisconnect(client: Socket) {
        console.log("handleConnection", client.id)
    }

    @SubscribeMessage('createRoom')
    async handleCreateRoom(client: Socket, data: any) {
        function generateRandomCode(length: number) {
            const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let code = '';

            for (let i = 0; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * charset.length);
                code += charset[randomIndex];
            }

            return code;
        }

        console.log("handleCreateRoom", client.id, data)

        const roomCode = generateRandomCode(5);
        client.join(roomCode);

        this.server.to(client.id).emit('roomCreated', roomCode);
    }

    @SubscribeMessage('enterRoom')
    async handleEnterRoom(client: Socket, roomCode: string) {
        console.log("handleEnterRoom", client.id, roomCode, this.server.sockets.adapter.rooms.has(roomCode))
        if (this.server.sockets.adapter.rooms.has(roomCode)) {
            if (this.server.sockets.adapter.rooms.get(roomCode).size > 1) {
                return
            }
            client.join(roomCode);
            this.server.to(client.id).emit('roomEntered', roomCode);
        } else {
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(client: Socket, data: { roomCode: string, message: string }) {
        const { roomCode, message } = data;
        const clientId = client.id;

        if (!this.roomGameStores.has(roomCode)) {
            this.roomGameStores.set(roomCode, { player1: { id: '', choice: '' }, player2: { id: '', choice: '' } });
        }

        const gameStore = this.roomGameStores.get(roomCode);

        console.log(gameStore)

        if (gameStore.player1.id === '') {
            gameStore.player1 = { id: clientId, choice: message };
        } else {
            gameStore.player2 = { id: clientId, choice: message };
        }

        if (gameStore.player1.id !== '' && gameStore.player2.id !== '') {
            // Ambos fizeram suas escolhas, verificar o resultado do jogo
            const result = this.calculateGameResult(gameStore.player1.choice, gameStore.player2.choice);
            console.log(gameStore, result)
            // Enviar os resultados para ambos os jogadores
            this.server.to(gameStore.player1.id).emit('roomMessage', { opponent: gameStore.player2.choice, result: result.player1 });
            this.server.to(gameStore.player2.id).emit('roomMessage', { opponent: gameStore.player1.choice, result: result.player2 });

            // Limpar o estado do jogo para permitir um novo jogo
            this.roomGameStores.delete(roomCode);
        }

    }

    private calculateGameResult(player1Choice: string, player2Choice: string): { player1: 'Ganhou' | 'Perdeu' | 'Empatou', player2: 'Ganhou' | 'Perdeu' | 'Empatou' } {
        if (player1Choice === player2Choice) {
            return { player1: 'Empatou', player2: 'Empatou' };
        } else if (
            (player1Choice === 'rock' && player2Choice === 'scissors') ||
            (player1Choice === 'scissors' && player2Choice === 'paper') ||
            (player1Choice === 'paper' && player2Choice === 'rock')
        ) {
            return { player1: 'Ganhou', player2: 'Perdeu' };
        } else {
            return { player1: 'Perdeu', player2: 'Ganhou' };
        }
    }

}

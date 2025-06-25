import net from 'net';
import dotenv from 'dotenv';
import { handleTCPRequest } from './handlers/tcp-handler';
import { RpcException } from '@nestjs/microservices';
import { AppError } from './handlers/error';

dotenv.config();

const TCP_PORT = parseInt(process.env.USER_TCP_PORT || '4000', 10);
const TCP_HOST = '0.0.0.0';

interface RpcErrorFormat {
    statusCode?: number;
    code?: string;
    message?: any;
    details?: any;
}

const server = net.createServer((socket) => {
    console.log('🔌 New TCP connection established');

    socket.on('data', async (data) => {
        try {
            const payload = JSON.parse(data.toString());
            const result = await handleTCPRequest(payload);
            socket.write(JSON.stringify(result) + '\n');
        } catch (err: any) {
            console.error('[TCP ERROR]', err);

            const errorResponse: {
                statusCode: number;
                error: string;
                message: { message: string; path: string[] };
                details?: any;
            } = {
                statusCode: 500,
                error: 'Error.Unexpected',
                message: { message: 'Error.Unexpected', path: [] },
            };

            if (err instanceof AppError) {
                errorResponse.statusCode = err.statusCode || 500;
                errorResponse.error = err.error || 'AppError';
                errorResponse.message = {
                    message: err.code,
                    path: err.messageObject?.path || [],
                };
                errorResponse.details = err.details;

            } else if (err instanceof RpcException && typeof err.getError === 'function') {
                const rpcError = err.getError() as RpcErrorFormat;

                errorResponse.statusCode = rpcError.statusCode || 400;
                errorResponse.error = rpcError.code || 'Error.Rpc';
                errorResponse.message = {
                    message: rpcError.message?.message || rpcError.code || 'Error.Rpc',
                    path: rpcError.message?.path || [],
                };
                if (rpcError.details) {
                    errorResponse.details = rpcError.details;
                }
            } else if (err instanceof SyntaxError) {
                errorResponse.statusCode = 400;
                errorResponse.error = 'Error.InvalidJSON';
                errorResponse.message = { message: 'Error.InvalidJSON', path: [] };
            }

            socket.write(JSON.stringify(errorResponse) + '\n');
        }
    });

    socket.on('error', (err) => {
        console.error('❌ TCP socket error:', err.message);
    });

    socket.on('close', () => {
        console.log('🔌 TCP connection closed');
    });
});

server.listen(TCP_PORT, TCP_HOST, () => {
    console.log(`🚀 TCP Microservice listening on ${TCP_HOST}:${TCP_PORT}`);
});

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'An internal server error occurred. Please contact clinic support.';
    let errorName = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || exception.message;
        errorName = (res as any).error || exception.name;
      } else {
        message = res;
        errorName = exception.name;
      }
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception
    ) {
      // Prisma error mapping without revealing internal database schema
      const prismaCode = (exception as any).code;
      if (prismaCode === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with this identifier already exists.';
        errorName = 'Conflict';
      } else if (prismaCode === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'The requested resource was not found.';
        errorName = 'Not Found';
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'A database error occurred. The requested operation could not be completed.';
        errorName = 'Database Error';
      }
    }

    const safePath = request.path || request.url || '/';
    const clientIp = request.ip || request.socket?.remoteAddress;

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${safePath} Status: ${status} - ${typeof message === 'string' ? message : JSON.stringify(message)} (Client IP: ${clientIp})`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status === 401 || status === 403 || status === 429) {
      this.logger.warn(
        `[${request.method}] ${safePath} Status: ${status} - ${status === 401 ? 'Authentication required or session invalid' : status === 403 ? 'Access forbidden' : 'Rate limit exceeded'} (Client IP: ${clientIp})`,
      );
    }

    if (response && typeof response.status === 'function') {
      response.status(status).json({
        statusCode: status,
        message,
        error: errorName,
        timestamp: new Date().toISOString(),
        path: safePath,
      });
    }
  }
}


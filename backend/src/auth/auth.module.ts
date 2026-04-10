import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import {JwtRefreshGuard} from "@common/guards/jwt-refresh.guard";

/**
 * AuthModule — módulo de autenticación.
 *
 * SupabaseService ya no se declara aquí porque viene del
 * SupabaseModule global registrado en AppModule.
 *
 * Rutas expuestas:
 *   POST /api/v1/auth/login
 *   GET  /api/v1/auth/profile
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '8h') },
      }),
    }),
  ],
  providers:   [AuthService, JwtStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports:     [JwtModule, PassportModule],
})
export class AuthModule {}

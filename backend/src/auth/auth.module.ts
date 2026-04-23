/**
 * NOTA: Este archivo muestra los cambios que debes hacer
 * en tu auth.module.ts existente.
 *
 * IMPORTS a agregar:
 *   import { UpdateProfileUseCase }  from './use-cases/update-profile.use-case';
 *   import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
 *
 * EN providers agregar:
 *   UpdateProfileUseCase,
 *   ChangePasswordUseCase,
 *
 * Ejemplo del módulo completo:
 */

import { Module }               from '@nestjs/common';
import { JwtModule }            from '@nestjs/jwt';
import { PassportModule }       from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController }       from './auth.controller';
import { AuthService }          from './auth.service';
import { JwtStrategy }          from './strategies/jwt.strategy';
import { JwtRefreshStrategy }   from './strategies/jwt-refresh.strategy';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: config.getOrThrow('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    UpdateProfileUseCase,   // ← nuevo
    ChangePasswordUseCase,  // ← nuevo
  ],
})
export class AuthModule {}

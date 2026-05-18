import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  LoginInputSchema,
  LogoutInputSchema,
  RefreshInputSchema,
  type JwtPayload,
  type LoginInput,
  type LogoutInput,
  type RefreshInput,
} from '@paltas2026/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Throttle estricto: 5 intentos por minuto por IP. Bruteforce-resistant.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Public()
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodValidationPipe(LoginInputSchema)) dto: LoginInput,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.login(dto, { deviceInfo: truncateUserAgent(userAgent) });
  }

  // Throttle más laxo que login porque un cliente legítimo refresca seguido.
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Body(new ZodValidationPipe(RefreshInputSchema)) dto: RefreshInput,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.refresh(dto.refreshToken, { deviceInfo: truncateUserAgent(userAgent) });
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body(new ZodValidationPipe(LogoutInputSchema)) dto: LogoutInput) {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }
}

function truncateUserAgent(ua: string | undefined): string | undefined {
  if (!ua) return undefined;
  return ua.slice(0, 200);
}

import { BaseUseCase, UnauthorizedError } from './base/UseCase.js';
import { Injectable, Inject } from '../../infrastructure/di/index.js';
import { AuthenticationService } from '../services/AuthenticationService.js';

export interface AuthenticateUserRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthenticateUserResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class AuthenticateUserUseCase extends BaseUseCase<
  AuthenticateUserRequest,
  AuthenticateUserResponse
> {
  constructor(
    @Inject(AuthenticationService) private authService: AuthenticationService
  ) {
    super();
  }

  async validate(request: AuthenticateUserRequest): Promise<string[]> {
    const errors: string[] = [];

    if (!request.username?.trim()) {
      errors.push('Username is required');
    }

    if (!request.password?.trim()) {
      errors.push('Password is required');
    }

    if (request.username && request.username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (request.password && request.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    return errors;
  }

  async execute(request: AuthenticateUserRequest): Promise<AuthenticateUserResponse> {
    // Attempt to authenticate user
    const authResult = await this.authService.authenticate(
      request.username,
      request.password
    );

    if (!authResult.success) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Generate tokens
    const tokenDuration = request.rememberMe ? '30d' : '24h';
    const token = await this.authService.generateToken(authResult.user.id, tokenDuration);
    const refreshToken = await this.authService.generateRefreshToken(authResult.user.id);

    // Calculate expiration
    const expirationHours = request.rememberMe ? 24 * 30 : 24;
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

    // Update last login
    await this.authService.updateLastLogin(authResult.user.id);

    return {
      user: {
        id: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email,
        role: authResult.user.role,
        permissions: authResult.user.permissions,
      },
      token,
      refreshToken,
      expiresAt,
    };
  }
}

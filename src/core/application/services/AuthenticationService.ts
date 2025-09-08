import { Injectable } from '../../infrastructure/di/index.js';
import CryptoJS from 'crypto-js';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  error?: string;
}

@Injectable()
export class AuthenticationService {
  private users: User[] = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@ciaociao.com',
      passwordHash: this.hashPassword('admin123'), // Default admin password
      role: 'admin',
      permissions: ['create', 'read', 'update', 'delete', 'manage_users', 'view_reports'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      username: 'manager',
      email: 'manager@ciaociao.com',
      passwordHash: this.hashPassword('manager123'),
      role: 'manager',
      permissions: ['create', 'read', 'update', 'delete', 'view_reports'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      username: 'staff',
      email: 'staff@ciaociao.com',
      passwordHash: this.hashPassword('staff123'),
      role: 'staff',
      permissions: ['create', 'read', 'update'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  private sessionTokens = new Map<string, { userId: string; expiresAt: Date }>();
  private refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();
  private secretKey = 'your-secret-key-here'; // In production, use environment variable

  /**
   * Authenticate user with username and password
   */
  async authenticate(username: string, password: string): Promise<AuthenticationResult> {
    const user = this.users.find(
      u => (u.username === username || u.email === username) && u.isActive
    );

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isValidPassword = this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid password' };
    }

    return { success: true, user };
  }

  /**
   * Generate session token
   */
  async generateToken(userId: string, duration: string = '24h'): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = this.parseTokenDuration(duration);
    
    this.sessionTokens.set(token, { userId, expiresAt });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    this.refreshTokens.set(token, { userId, expiresAt });
    
    return token;
  }

  /**
   * Validate session token
   */
  async validateToken(token: string): Promise<{ valid: boolean; user?: User }> {
    const session = this.sessionTokens.get(token);
    if (!session) {
      return { valid: false };
    }

    if (session.expiresAt < new Date()) {
      this.sessionTokens.delete(token);
      return { valid: false };
    }

    const user = this.users.find(u => u.id === session.userId && u.isActive);
    if (!user) {
      this.sessionTokens.delete(token);
      return { valid: false };
    }

    return { valid: true, user };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ success: boolean; token?: string; user?: User }> {
    const refreshSession = this.refreshTokens.get(refreshToken);
    if (!refreshSession) {
      return { success: false };
    }

    if (refreshSession.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      return { success: false };
    }

    const user = this.users.find(u => u.id === refreshSession.userId && u.isActive);
    if (!user) {
      this.refreshTokens.delete(refreshToken);
      return { success: false };
    }

    const newToken = await this.generateToken(user.id);
    return { success: true, token: newToken, user };
  }

  /**
   * Logout user by invalidating token
   */
  async logout(token: string): Promise<boolean> {
    const deleted = this.sessionTokens.delete(token);
    return deleted;
  }

  /**
   * Logout from all devices by invalidating all user's tokens
   */
  async logoutAllDevices(userId: string): Promise<number> {
    let deletedCount = 0;
    
    for (const [token, session] of this.sessionTokens.entries()) {
      if (session.userId === userId) {
        this.sessionTokens.delete(token);
        deletedCount++;
      }
    }
    
    for (const [token, session] of this.refreshTokens.entries()) {
      if (session.userId === userId) {
        this.refreshTokens.delete(token);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(user: User, permission: string): boolean {
    return user.permissions.includes(permission) || user.role === 'admin';
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(user: User, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!this.verifyPassword(currentPassword, user.passwordHash)) {
      return { success: false, error: 'Current password is incorrect' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long' };
    }

    user.passwordHash = this.hashPassword(newPassword);
    user.updatedAt = new Date();

    // Logout from all devices for security
    await this.logoutAllDevices(userId);

    return { success: true };
  }

  /**
   * Create new user (admin only)
   */
  async createUser(
    userData: {
      username: string;
      email: string;
      password: string;
      role: string;
      permissions: string[];
    }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    // Check if username or email already exists
    const existingUser = this.users.find(
      u => u.username === userData.username || u.email === userData.email
    );
    
    if (existingUser) {
      return { success: false, error: 'Username or email already exists' };
    }

    const newUser: User = {
      id: (this.users.length + 1).toString(),
      username: userData.username,
      email: userData.email,
      passwordHash: this.hashPassword(userData.password),
      role: userData.role,
      permissions: userData.permissions,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(newUser);
    return { success: true, user: newUser };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.users.find(u => u.id === userId) || null;
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  private hashPassword(password: string): string {
    return CryptoJS.PBKDF2(password, this.secretKey, {
      keySize: 256 / 32,
      iterations: 1000,
    }).toString();
  }

  private verifyPassword(password: string, hash: string): boolean {
    const hashedPassword = this.hashPassword(password);
    return hashedPassword === hash;
  }

  private generateSecureToken(): string {
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    const timestamp = Date.now().toString();
    return CryptoJS.SHA256(randomBytes + timestamp).toString();
  }

  private parseTokenDuration(duration: string): Date {
    const now = Date.now();
    const match = duration.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      return new Date(now + 24 * 60 * 60 * 1000); // Default 24 hours
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(now + value * multipliers[unit as keyof typeof multipliers]);
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    
    for (const [token, session] of this.sessionTokens.entries()) {
      if (session.expiresAt < now) {
        this.sessionTokens.delete(token);
      }
    }
    
    for (const [token, session] of this.refreshTokens.entries()) {
      if (session.expiresAt < now) {
        this.refreshTokens.delete(token);
      }
    }
  }
}

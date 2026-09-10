import bcrypt from 'bcrypt';
import type { IUserDocument } from '../models/user.js';
import { AppError } from '../utils/appError.js';
import { HttpStatus } from '../constants/http-status.enum.js';
import type { RegisterUserDto, LoginUserDto, TokenResultDto } from '../dtos/auth.dto.js';
import { userRepository, type IUserRepository } from '../repositories/user.repository.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from '../utils/jwt.js';

/**
 * Authentication Business Logic Service.
 * Decoupled from ORM implementation via the Repository Pattern.
 */
export class AuthService {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  /**
   * Registers a new user account.
   */
  public async registerUser(input: RegisterUserDto): Promise<IUserDocument> {
    const { fullName, username, password } = input;

    // Check if username is taken via Repository
    const existingUser = await this.userRepo.findByUsername(username);
    if (existingUser) {
      throw new AppError('This username is already taken. Please choose another username.', HttpStatus.CONFLICT);
    }

    // Persist new user via Repository
    return this.userRepo.create({ fullName, username, password });
  }

  /**
   * Authenticates user credentials and manages lockout states.
   */
  public async loginUser(input: LoginUserDto): Promise<IUserDocument> {
    const { username, password } = input;

    // Fetch user with password via Repository
    const user = await this.userRepo.findByUsernameWithPassword(username);
    if (!user) {
      throw new AppError('No account found with this username. Please register first.', HttpStatus.UNAUTHORIZED);
    }

    // Lockout Check: Ensure user is not currently locked out
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `Too many failed attempts. Account locked. Try again in ${remainingTime} minute(s).`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      user.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts for 15 minutes
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await this.userRepo.save(user);
      throw new AppError('The password you entered is incorrect.', HttpStatus.UNAUTHORIZED);
    }

    // Reset lockout counters on success
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.userRepo.save(user);
    }

    return user;
  }

  /**
   * Generates Access & Refresh JWTs and saves the hashed refresh token.
   */
  public async generateAuthTokens(user: IUserDocument): Promise<TokenResultDto> {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store hashed refresh token in database
    const saltRounds = 12;
    user.refreshTokenHash = await bcrypt.hash(refreshToken, saltRounds);
    await this.userRepo.save(user);

    return { accessToken, refreshToken };
  }

  /**
   * Refreshes session tokens implementing Refresh Token Rotation (RTR).
   */
  public async refreshSession(token: string): Promise<TokenResultDto & { user: IUserDocument }> {
    let payload: TokenPayload;

    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Your session has expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    // Fetch user via Repository
    const user = await this.userRepo.findByIdWithSessionKeys(payload.userId);
    if (!user) {
      throw new AppError('Your session is no longer available. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new AppError('Your session is no longer valid. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    if (!user.refreshTokenHash) {
      throw new AppError('Your session has ended. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    const isMatch = await bcrypt.compare(token, user.refreshTokenHash);

    // Replay Attack Detection: If token hash does not match, revoke all sessions
    if (!isMatch) {
      user.tokenVersion += 1;
      user.refreshTokenHash = null;
      await this.userRepo.save(user);
      throw new AppError(
        'Compromised session detected. Logged out everywhere.',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Rotate tokens
    const tokens = await this.generateAuthTokens(user);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Invalidates active user session by incrementing token version.
   */
  public async logoutUser(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (user) {
      user.tokenVersion += 1;
      user.refreshTokenHash = null;
      await this.userRepo.save(user);
    }
  }

  /**
   * Fetches user profile by ID.
   */
  public async getUserProfile(userId: string): Promise<IUserDocument> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }
}

// Export singleton service instance
export const authService = new AuthService();

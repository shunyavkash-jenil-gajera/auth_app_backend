import bcrypt from 'bcrypt';
import { User, type IUserDocument } from '../models/user.js';
import { AppError } from '../utils/appError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type TokenPayload
} from '../utils/jwt.js';

interface RegisterInput {
  fullName: string;
  username: string;
  password: string;
}

interface LoginInput {
  username: string;
  password: string;
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication Business Logic Service.
 * Decouples controllers from direct Mongoose model operations.
 */
export const AuthService = {
  /**
   * Registers a new user.
   * Throws an AppError with 409 Conflict if the username is already in use.
   */
  registerUser: async (input: RegisterInput): Promise<IUserDocument> => {
    const { fullName, username, password } = input;

    // Check if the username is already registered
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new AppError('Username already exists', 409); // Required by REST API spec pg 13
    }

    // Save user. Password hashing is executed automatically via virtual set & pre-save hook
    const user = new User({
      fullName,
      username,
    });
    user.password = password;
    await user.save();

    return user;
  },

  /**
   * Validates user credentials and manages account lockout states.
   * Throws a 401 AppError for credentials, or 429 for account lockout.
   */
  loginUser: async (input: LoginInput): Promise<IUserDocument> => {
    const { username, password } = input;

    // 1. Fetch user by username, explicitly selecting the hidden password hash and lockout keys
    const user = await User.findOne({ username }).select('+passwordHash');
    
    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    // 2. Lockout Check: Check if user is currently locked out
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        `Too many failed attempts. Account locked. Try again in ${remainingTime} minute(s).`,
        429
      );
    }

    // 3. Compare passwords
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;

      // Check if threshold of 5 failed attempts is reached
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
      }

      await user.save();
      throw new AppError('Invalid username or password', 401);
    }

    // 4. Reset lockout counters on successful authentication
    if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await user.save();
    }

    return user;
  },

  /**
   * Generates secure Access & Refresh tokens for a session and saves the refresh hash.
   */
  generateAuthTokens: async (user: IUserDocument): Promise<TokenResult> => {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      tokenVersion: user.tokenVersion,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Hash the refresh token before storing it in the database (defense-in-depth)
    const saltRounds = 12;
    user.refreshTokenHash = await bcrypt.hash(refreshToken, saltRounds);
    
    await user.save();

    return { accessToken, refreshToken };
  },

  /**
   * Refreshes access and refresh tokens.
   * Employs Refresh Token Rotation (RTR) and detects token reuse (replay attacks).
   */
  refreshSession: async (
    token: string
  ): Promise<TokenResult & { user: IUserDocument }> => {
    let payload: TokenPayload;

    // 1. Verify Refresh Token signature and expiry
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // 2. Fetch the user, selecting hidden tokenVersion and refreshTokenHash properties
    const user = await User.findById(payload.userId).select(
      '+refreshTokenHash +tokenVersion'
    );

    if (!user) {
      throw new AppError('User session not found', 401);
    }

    // 3. Verify Token Version (e.g. if incremented on logout/password changes)
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new AppError('Session version is invalid', 401);
    }

    // 4. If user's stored refresh token hash is missing, logout has already cleared it
    if (!user.refreshTokenHash) {
      throw new AppError('Session has been revoked', 401);
    }

    // 5. Compare the incoming refresh token against the stored hash
    const isMatch = await bcrypt.compare(token, user.refreshTokenHash);

    // Replay Attack Detection: If token does not match, it has already been used and rotated
    if (!isMatch) {
      // Invalidate ALL sessions for this user everywhere
      user.tokenVersion += 1;
      user.refreshTokenHash = null;
      await user.save();
      throw new AppError('Compromised session detected. Logged out everywhere.', 401);
    }

    // 6. Token Rotation: Generate new Access and Refresh tokens
    const tokens = await AuthService.generateAuthTokens(user);

    return {
      ...tokens,
      user,
    };
  },

  /**
   * Logs out the user by incrementing token version and clearing database hashes.
   */
  logoutUser: async (userId: string): Promise<void> => {
    const user = await User.findById(userId);
    if (user) {
      user.tokenVersion += 1; // Invalidates all current access and refresh tokens in circulation
      user.refreshTokenHash = null; // Clear active session refresh hash
      await user.save();
    }
  },

  /**
   * Retrieves user profile details by ID.
   */
  getUserProfile: async (userId: string): Promise<IUserDocument> => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }
};

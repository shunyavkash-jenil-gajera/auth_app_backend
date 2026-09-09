import { User, type IUserDocument } from '../models/user.js';
import type { RegisterUserDto } from '../dtos/auth.dto.js';

/**
 * Interface defining the User Repository contract.
 */
export interface IUserRepository {
  findByUsername(username: string): Promise<IUserDocument | null>;
  findByUsernameWithPassword(username: string): Promise<IUserDocument | null>;
  findById(id: string): Promise<IUserDocument | null>;
  findByIdWithSessionKeys(id: string): Promise<IUserDocument | null>;
  create(userData: RegisterUserDto): Promise<IUserDocument>;
  save(user: IUserDocument): Promise<IUserDocument>;
}

/**
 * Repository Pattern implementation for User Entity database operations.
 */
export class UserRepository implements IUserRepository {
  /**
   * Finds a user by username.
   */
  public async findByUsername(username: string): Promise<IUserDocument | null> {
    return User.findOne({ username });
  }

  /**
   * Finds a user by username, explicitly selecting the passwordHash field.
   */
  public async findByUsernameWithPassword(username: string): Promise<IUserDocument | null> {
    return User.findOne({ username }).select('+passwordHash');
  }

  /**
   * Finds a user by MongoDB ObjectId string.
   */
  public async findById(id: string): Promise<IUserDocument | null> {
    return User.findById(id);
  }

  /**
   * Finds a user by ID, explicitly selecting refreshTokenHash and tokenVersion.
   */
  public async findByIdWithSessionKeys(id: string): Promise<IUserDocument | null> {
    return User.findById(id).select('+refreshTokenHash +tokenVersion');
  }

  /**
   * Creates and saves a new User document.
   */
  public async create(userData: RegisterUserDto): Promise<IUserDocument> {
    const user = new User({
      fullName: userData.fullName,
      username: userData.username,
    });
    user.password = userData.password; // Triggers pre-validate virtual encryption
    return user.save();
  }

  /**
   * Saves updates to an existing User document.
   */
  public async save(user: IUserDocument): Promise<IUserDocument> {
    return user.save();
  }
}

// Export a singleton instance for application-wide dependency injection
export const userRepository = new UserRepository();

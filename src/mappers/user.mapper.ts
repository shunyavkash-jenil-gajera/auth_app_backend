import type { IUserDocument } from '../models/user.js';
import type { UserResponseDto, DashboardUserDto } from '../dtos/auth.dto.js';

/**
 * Data Mapper Pattern for User Entities.
 * Converts raw Mongoose Database Documents into clean, sanitized DTOs.
 */
export class UserMapper {
  /**
   * Maps a User database document to a public UserResponseDto.
   */
  public static toResponseDto(user: IUserDocument): UserResponseDto {
    return {
      id: user._id.toString(),
      fullName: user.fullName,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  /**
   * Maps a User database document to a DashboardUserDto.
   */
  public static toDashboardDto(user: IUserDocument): DashboardUserDto {
    return {
      fullName: user.fullName,
      username: user.username,
    };
  }
}

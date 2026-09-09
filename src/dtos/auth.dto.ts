/**
 * Data Transfer Objects (DTOs) for Authentication domain.
 */

export interface RegisterUserDto {
  fullName: string;
  username: string;
  password: string;
}

export interface LoginUserDto {
  username: string;
  password: string;
}

export interface UserResponseDto {
  id: string;
  fullName: string;
  username: string;
  createdAt: Date;
}

export interface DashboardUserDto {
  fullName: string;
  username: string;
}

export interface TokenResultDto {
  accessToken: string;
  refreshToken: string;
}

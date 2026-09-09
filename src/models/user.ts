import { Schema, model, type Document } from 'mongoose';
import bcrypt from 'bcrypt';

// 1. Define the core User Interface
export interface IUser {
  fullName: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the User Document Interface (includes DB-only properties and instance methods)
export interface IUserDocument extends IUser, Document {
  password?: string; // Virtual property setter input
  passwordHash: string;
  tokenVersion: number;
  refreshTokenHash: string | null;
  failedLoginAttempts: number;
  lockoutUntil: Date | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
  _password?: string; // Temporary holder for hashing in pre-save hooks
}

// 3. Define the Schema with strict design rules
const userSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
      maxlength: [50, 'Full name cannot exceed 50 characters'],
      validate: {
        // Enforce letters and spaces only
        validator: (v: string) => /^[a-zA-Z\s]+$/.test(v),
        message: 'Full name can only contain letters and spaces',
      },
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      validate: {
        // Enforce alphanumeric and underscores only
        validator: (v: string) => /^[a-zA-Z0-9_]+$/.test(v),
        message: 'Username can only contain letters, numbers, and underscores',
      },
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Hidden by default from queries
    },
    tokenVersion: {
      type: Number,
      default: 0,
      required: true,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false, // Hidden by default
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      required: true,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 4. Set up a virtual "password" field for setter encryption
userSchema.virtual('password').set(function (password: string) {
  this._password = password;
});

// 5. Pre-validate Hook: Encrypt plaintext virtual password BEFORE Mongoose runs schema validations
userSchema.pre('validate', async function () {
  if (this._password) {
    const saltRounds = 12;
    this.passwordHash = await bcrypt.hash(this._password, saltRounds);
    delete this._password; // Deallocate plaintext password from memory
  }
});

// 6. Instance Method: Safely verify login passwords using constant-time comparison
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  // 'this.passwordHash' is only available if explicitly selected in queries
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = model<IUserDocument>('User', userSchema);

export type JwtAccessPayload = {
  sub: string;
  email: string;
  name?: string | null;
  role: string;
  isAdmin: boolean;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthSession = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
};
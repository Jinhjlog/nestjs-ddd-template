export type CustomTokenPayload = Record<string, any>;

export interface TokenPayload<
  T extends CustomTokenPayload = CustomTokenPayload,
> {
  iss: string;
  iat: number;
  exp: number;
  payload: T;
}

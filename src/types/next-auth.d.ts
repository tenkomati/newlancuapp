import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role?: string;
    clienteId?: string | null;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role?: string;
      clienteId?: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
    clienteId?: string | null;
  }
}
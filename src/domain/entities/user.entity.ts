export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: Date;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: Date;
  updatedAt: Date;
} 
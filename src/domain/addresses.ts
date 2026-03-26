export type Address = {
  id: number;
  name: string;
  address: string;
};

export type AddressInput = Omit<Address, "id">;

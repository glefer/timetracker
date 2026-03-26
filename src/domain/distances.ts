export type Distance = {
  id: number;
  from_address_id: number;
  to_address_id: number;
  /** Distance in kilometres */
  distance_km: number;
};

export type DistanceInput = Omit<Distance, "id">;

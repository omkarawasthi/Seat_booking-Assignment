import axios from "axios";
import { Seat } from "./types";

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface SeatsResponse {
  seats: Seat[];
}

export async function fetchSeats(userId: string): Promise<Seat[]> {
  const response = await axios.get<SeatsResponse>(`${baseUrl}/seats`, {
    params: { userId }
  });
  return response.data.seats;
}

export async function createLayout(rows: number, cols: number): Promise<void> {
  await axios.post(`${baseUrl}/layout`, {
    rows,
    cols
  });
}

export async function holdSeatApi(
  seatId: string,
  userId: string
): Promise<Seat> {
  const response = await axios.post<{ seat: Seat }>(`${baseUrl}/seats/hold`, {
    seatId,
    userId
  });
  return response.data.seat;
}

export async function releaseSeatApi(
  seatId: string,
  userId: string
): Promise<Seat> {
  const response = await axios.post<{ seat: Seat }>(
    `${baseUrl}/seats/release`,
    {
      seatId,
      userId
    }
  );
  return response.data.seat;
}

export async function bookSeatsApi(
  seatIds: string[],
  userId: string
): Promise<void> {
  await axios.post(`${baseUrl}/seats/book`, {
    seatIds,
    userId
  });
}



import { Router } from "express";
import { createSeatService } from "../service/seatService";
import { createSeatController } from "../controller/seatController";

export function buildRouter(service: ReturnType<typeof createSeatService>) {
  const router = Router();
  const controller = createSeatController(service);

  // Generate layout route
  router.post("/layout", controller.generateLayout);

  // Get all seats route
  router.get("/seats", controller.getSeats);

  // Hold a seat route
  router.post("/seats/hold", controller.holdSeat);

  // Release a seat route
  router.post("/seats/release", controller.releaseSeat);

  // Book seats route
  router.post("/seats/book", controller.bookSeats);

  return router;
}



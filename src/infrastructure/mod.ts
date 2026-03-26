import { Hono } from "hono";

export type App = Hono;
export const app = new Hono();

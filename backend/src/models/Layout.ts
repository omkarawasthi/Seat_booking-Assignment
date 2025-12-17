import { Schema, model, Document } from "mongoose";

export interface LayoutDoc extends Document {
  rows: number;
  cols: number;
}

const layoutSchema = new Schema<LayoutDoc>({
  rows: { type: Number, required: true },
  cols: { type: Number, required: true }
}, { collection: "layout" });

export const LayoutModel = model<LayoutDoc>("Layout", layoutSchema);


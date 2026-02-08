import mongoose from "mongoose";

export interface Cookie {
  key: string;
  value: string;
  expires?: number;
}

const cookieSchema = new mongoose.Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
  expires: { type: Number, required: false },
});
const majsoulConfigSchema = new mongoose.Schema({
  featuredContest: { type: String, required: false },
  googleRefreshToken: { type: String, required: false },
  userAgent: { type: String, required: false },
  passportToken: { type: String, required: false },
  loginCookies: { type: [cookieSchema], required: false },
});

export const MajsoulConfigModel = mongoose.model(
  "MajsoulConfig",
  majsoulConfigSchema
);
export type MajsoulConfig = mongoose.InferSchemaType<
  typeof majsoulConfigSchema
>;

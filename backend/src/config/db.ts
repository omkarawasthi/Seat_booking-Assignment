import mongoose from "mongoose";
import dotenv  from "dotenv";

dotenv.config();


export async function connectDb(): Promise<void> {
  const mongo_url = process.env.MONGO_URL ;

  await mongoose.connect(mongo_url as string).then(() =>{
    console.log("Connected to MongoDB");
  }).catch((err) =>{
    console.error("Error connecting to MongoDB", err);
  });
}



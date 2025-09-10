import { hashSync } from "bcrypt-ts-edge";

console.log("Pass: ", hashSync("12345", 10));

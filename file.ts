import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {

  // const valid = await bcrypt.compare("ioseed2025", "$2b$10$1TYuIYuzV/N/Pv4Q5/NAsuMKXUgmKdWLbWC5U17PDo/.y5.EmjleW");

  const apiKeyHash = crypto
  .createHash("sha256")
  .update("61f361be19768ed0d66da9ab2c31c12d4bd3167cfb7c4f960c4791b674aefb7a")
  .digest("hex");
 console.log("api key hash  : "+ apiKeyHash+"\n");
 
  console.log((apiKeyHash === "b4afa2d160389725a6f72f6d3c471a0cb597ccb417461f8f0174456ce7074ce0" ) ?  "Password valid:" : "pass invalide");
}

main().catch(console.error);
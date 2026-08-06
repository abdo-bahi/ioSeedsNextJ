import bcrypt from "bcryptjs";

async function main() {

  const valid = await bcrypt.compare("ioseed2025", "$2b$10$1TYuIYuzV/N/Pv4Q5/NAsuMKXUgmKdWLbWC5U17PDo/.y5.EmjleW");

  console.log("Password valid:", valid);
}

main().catch(console.error);
import fs from "fs/promises";
import path from "path";

// helper to load html
export async function loadHtml(fileName: string) {
  const filePath = path.join(__dirname, "../../views", fileName);
  return fs.readFile(filePath, { encoding: "utf-8" });
}
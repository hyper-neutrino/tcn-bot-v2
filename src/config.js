import { res } from "file-ez";
import { readFileSync } from "fs";

export default JSON.parse(readFileSync(res("../config.json"), "utf-8"));

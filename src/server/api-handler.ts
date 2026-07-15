import { fromWebHandler } from "h3";
import { apiApp } from "./api";

export default fromWebHandler(async (req) => apiApp.fetch(req));

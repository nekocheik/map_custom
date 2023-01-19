import { Injectable } from "@nestjs/common";

@Injectable()
export class LoggerService {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      this.log = () => {};
      this.error = () => {};
      this.warn = () => {};
      this.debug = () => {};
      this.verbose = () => {};
    }
  }
  log(message: any): void {
    console.log(message);
  }
  error(message: any, trace: any): void {
    console.error(message, trace);
  }
  warn(message: any): void {
    console.warn(message);
  }
  debug(message: any): void {
    console.debug(message);
  }
  verbose(message: any): void {
    console.log(message);
  }
}

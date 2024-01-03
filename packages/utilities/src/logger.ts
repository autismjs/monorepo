import * as console from "console";

const logger = {
  info: console.log.bind(console),
  error: console.error.bind(console),
  verbose: (...args: any[]) => {
    if (process.env.VERBOSE) {
      console.log(...args);
    }
  },
};

export default logger;

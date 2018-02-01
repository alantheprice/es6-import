import Logger from "./log.js";
import { Local } from "./local.js";

class Main {

    constructor() {
        this.logger = new Logger();
        this.local = new Local();
        this.log(this.local.getTime());
    }
    // something new
    log(...values) {
        this.logger.log(values );
    }
}

new Main();
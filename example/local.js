import Logger from './log.js';

export class Local {
    
    getTime() {
        
        return new Date().toISOString();
    }
}
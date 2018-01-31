import vue from 'vue'

export default class Log {

    log(...values) {  
        let logElement = document.getElementById("logger");
        logElement.innerText = values.join("\n");
    }

}
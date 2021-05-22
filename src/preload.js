import {contextBridge, ipcRenderer} from "electron";

contextBridge.exposeInMainWorld(
    "api", {
        openVrm: () => {
            return ipcRenderer.sendSync("openVrm");
        },
        watch:(target) => {
            return ipcRenderer.send('watch', target)

        },
        textureUpdateListener:(callback) => {

            ipcRenderer.on('update', (event, args) => {
                console.log(args)
                callback(args)
            })
        }
    }
);
